import {
    APIChatInputApplicationCommandGuildInteraction,
    APIInteractionResponse,
    ApplicationCommandOptionType,
    InteractionResponseType,
    MessageFlags,
    RESTPatchAPIInteractionFollowupJSONBody,
    RESTPostAPIChatInputApplicationCommandsJSONBody,
} from "discord-api-types/v10";

import { Env } from "../../../env";
import { BotClient } from "../../client/bot";
import { Store } from "../../../store";
import { commonOptions, getOpts, ghStatusResponse, reply } from "./subunsub/util";
import { importOauthKey } from "../../../encrypter";
import { Sentry } from "../../../sentry";
import { Octokit } from "octokit";
import { createAppAuth, createOAuthUserAuth } from "@octokit/auth-app";

export const command: RESTPostAPIChatInputApplicationCommandsJSONBody = {
    name: "subscribe",
    description: "Send updates from a Github project to the channel.",
    options: [
        ...commonOptions!,
        {
            name: "default_branch_only",
            required: false,
            type: ApplicationCommandOptionType.Boolean,
            description: "If provided and false, show commit pushes from non-default branches",
        },
        {
            name: "quiet",
            required: false,
            type: ApplicationCommandOptionType.Boolean,
            description: "If provided and true, will not publish a message about subscription",
        },
    ],
};

const handleInner = async (
    client: BotClient,
    interaction: APIChatInputApplicationCommandGuildInteraction,
    env: Env,
    sentry: Sentry,
): Promise<RESTPatchAPIInteractionFollowupJSONBody> => {
    const key = await importOauthKey(env.OAUTH_ENCRYPTION_KEY);
    const store = new Store(env.USER_DB, key);

    const { member } = interaction;

    const { options } = interaction.data;
    if (!options) throw "missing options";
    const { owner, repoName, defaultBranchOnly, quiet } = getOpts(options);

    // Get the user's token, so we can get details about the requested
    // repository. If we 404/fail here, we shouldn't allow subscription
    // (because the user can't see the repo!)
    const grant = await store.findOauthGrant(member.user.id);
    if (!grant)
        return reply("No associated Github account found for your user. Try running `/link`");

    const octokitUser = new Octokit({
        authStrategy: createOAuthUserAuth,
        auth: {
            clientId: env.GITHUB_CLIENT_ID,
            clientSecret: env.GITHUB_CLIENT_SECRET,
            token: grant.oauthToken,
            clientType: "oauth-app",
        },
    });

    const reposResp = await octokitUser.request("GET /repos/{owner}/{repo}", {
        owner,
        repo: repoName,
    });

    if (reposResp.status !== 200)
        return reply(ghStatusResponse(reposResp.status));

    const repo = reposResp.data;

    const installation = await store.findInstallation(repo.owner.id);

    if (!installation)
        return reply(`The ${repo.owner.type} ${repo.owner.login} does not have this application installed`);

    const octokitInstall = new Octokit({
        authStrategy: createAppAuth,
        auth: {
            appId: env.GITHUB_APP_ID,
            privateKey: env.GITHUB_PRIVATE_KEY,
            installationId: installation.githubInstallationID,
        },
    });

    const { data: user } = await octokitUser.request("GET /user");
    // If the repo is not owned by a user, confirm that the user has
    // read permissions (at minimum) on this repo.
    if (repo.owner.type !== "User") {
        const { data } = await octokitInstall.request("GET /repos/{owner}/{repo}/collaborators/{username}/permission", {
            owner: repo.owner.login,
            repo: repo.name,
            username: user.login,
        });

        const permissions = data.user?.permissions;
        if (!permissions || !(permissions.pull || permissions.push || permissions.maintain || permissions.admin))
            return reply("You do not have sufficient org privileges to do this");
    } else {
        // Confirm the requester owns this repo.
        if (user.id !== repo.owner.id)
            return reply("You are not the owner of this repo.");

        // Confirm this repo is one that has actually been exposed to the
        // application. We only have to do this in the case of user-owned
        // repos, because org-owned repos will fail on the check above where we
        // try to fetch collaborator permissions for that repo.
        try {
            const visibleRepos = await octokitInstall.paginate("GET /installation/repositories");
            if (!visibleRepos.find(r => r.id === repo.id))
                return reply("That repo either doesn't exist, or isn't exposed to this application");
        } catch (e) {
            // TODO: we probably want to capture these messages better ourselves?
            return reply(`${e}`);
        }
    }

    // Now that we've confirmed that the user has reasonable permissions to do
    // so, create our subscription.
    await store.upsertSub(repo.id, installation.githubID, defaultBranchOnly);

    if (!quiet)
        try {
            await client.createMessage(env.PUBLISH_CHANNEL_ID, {
                content: `
<@${interaction.member.user.id}> has started publishing updates from [${repo.name}](${repo.html_url})! :balloon:
`,
            });
        } catch (e) {
            sentry.captureException(e);
        }
    return {
        content: `OK, updates from ${owner}/${repoName} will be sent to <#${env.PUBLISH_CHANNEL_ID}>`,
    };
}

export const handler = async (
    ctx: ExecutionContext,
    client: BotClient,
    interaction: APIChatInputApplicationCommandGuildInteraction,
    env: Env,
    sentry: Sentry,
): Promise<(APIInteractionResponse | null)> => {

    const callback = async () => {
        const msg = await handleInner(client, interaction, env, sentry);

        const { application_id: applicationId, token } = interaction;
        await client.editFollowup(applicationId, token, msg);
    };
    ctx.waitUntil(callback());

    return {
        type: InteractionResponseType.DeferredChannelMessageWithSource,
        data: { flags: MessageFlags.Ephemeral },
    };
}
