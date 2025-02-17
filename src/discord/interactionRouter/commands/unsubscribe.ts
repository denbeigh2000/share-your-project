import {
    APIChatInputApplicationCommandGuildInteraction,
    APIInteractionResponse,
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
import { createOAuthUserAuth } from "@octokit/auth-oauth-user";
import { Octokit } from "octokit";

export const command: RESTPostAPIChatInputApplicationCommandsJSONBody = {
    name: "unsubscribe",
    description: "Stop sending updates from your Github projects to the channel.",
    options: commonOptions!,
};

const handleInner = async (
    interaction: APIChatInputApplicationCommandGuildInteraction,
    env: Env,
): Promise<RESTPatchAPIInteractionFollowupJSONBody> => {
    const key = await importOauthKey(env.OAUTH_ENCRYPTION_KEY);
    const store = new Store(env.USER_DB, key);

    const { member, data: { options } } = interaction;

    const grant = await store.findOauthGrant(member.user.id);
    if (!grant)
        return reply("No associated Github account found for your user. Try running `/link`");

    if (!options) throw "missing options";
    const { owner, repoName } = getOpts(options);
    const octokitUser = new Octokit({
        authStrategy: createOAuthUserAuth,
        auth: {
            clientId: env.GITHUB_CLIENT_ID,
            clientSecret: env.GITHUB_CLIENT_SECRET,
            token: grant.oauthToken,
            clientType: "oauth-app",
        },
    });

    const { data: repo, status } = await octokitUser.request("GET /repos/{owner}/{repo}", {
        owner,
        repo: repoName,
    });

    if (status !== 200)
        return reply(ghStatusResponse(status));

    await store.removeSub(repo.id);
    return {
        content: `OK, no longer sending updates from ${owner}/${repoName} to <#${env.PUBLISH_CHANNEL_ID}>`,
    };
}

export const handler = async (
    ctx: ExecutionContext,
    client: BotClient,
    interaction: APIChatInputApplicationCommandGuildInteraction,
    env: Env,
): Promise<(APIInteractionResponse | null)> => {
    const callback = async () => {
        const msg = await handleInner(interaction, env);

        const { application_id: applicationId, token } = interaction;
        await client.editFollowup(applicationId, token, msg);
    };

    ctx.waitUntil(callback());
    return {
        type: InteractionResponseType.DeferredChannelMessageWithSource,
        data: { flags: MessageFlags.Ephemeral },
    };
}
