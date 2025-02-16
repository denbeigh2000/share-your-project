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
import { commonOptions, getEntityAndRepo, getOpts } from "./subunsub/util";
import { importOauthKey } from "../../../encrypter";

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
): Promise<void> => {
    const key = await importOauthKey(env.OAUTH_ENCRYPTION_KEY);
    const store = new Store(env.USER_DB, key);

    const { member } = interaction;

    const { options } = interaction.data;
    if (!options) throw "missing options";
    const { owner, repoName, defaultBranchOnly } = getOpts(options);

    let msg: RESTPatchAPIInteractionFollowupJSONBody;
    let entity, repo;
    let successful = false;
    try {
        const data = await getEntityAndRepo(env, store, owner, repoName, member.user.id);
        entity = data.entity;
        repo = data.repo;

        await store.upsertSub(repo.id, entity.githubID, repo.default_branch, defaultBranchOnly);
        successful = true;
        msg = {
            content: `OK, updates from ${owner}/${repoName} will be sent to <#${env.PUBLISH_CHANNEL_ID}>`,
        };
    } catch (e) {
        const errorMsg = (e as string) || "an unknown error occurred";
        msg = {
            content: `Failed to subscribe: ${errorMsg}`,
        };
    }

    const { application_id: applicationId, token } = interaction;
    await client.editFollowup(applicationId, token, msg);
    if (repo && successful)
        await client.createMessage(env.PUBLISH_CHANNEL_ID, {
            content: `
<@${interaction.member.user.id}> has started publishing updates from [${repo.name}](${repo.html_url})! :balloon:
`,
        });
}

export const handler = async (
    ctx: ExecutionContext,
    client: BotClient,
    interaction: APIChatInputApplicationCommandGuildInteraction,
    env: Env,
): Promise<(APIInteractionResponse | null)> => {
    ctx.waitUntil(handleInner(client, interaction, env));
    return {
        type: InteractionResponseType.DeferredChannelMessageWithSource,
        data: { flags: MessageFlags.Ephemeral },
    };
}
