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
import { commonOptions, getGrantAndRepo, getOpts } from "./subunsub/util";
import { importOauthKey } from "../../../encrypter";
import { Sentry } from "../../../sentry";

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

    let grant, repo;
    try {
        const data = await getGrantAndRepo(env, store, owner, repoName, member.user.id);
        grant = data.grant;
        repo = data.repo;
        await store.upsertSub(repo.id, grant.githubID, repo.default_branch, defaultBranchOnly);
    } catch (e) {
        const errorMsg = (e as string) || "an unknown error occurred";
        return {
            content: `Failed to subscribe: ${errorMsg}`,
        };
    }

    if (repo && !quiet)
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
