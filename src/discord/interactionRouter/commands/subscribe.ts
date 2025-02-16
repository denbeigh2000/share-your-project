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
    try {
        const { entity, repo } = await getEntityAndRepo(env, store, owner, repoName, member.user.id);

        await store.upsertSub(repo.id, entity.githubID, repo.default_branch, defaultBranchOnly);
        // TODO: design embeds etc
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
