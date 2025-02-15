import {
    APIChatInputApplicationCommandGuildInteraction,
    APIInteractionResponse,
    ApplicationCommandOptionType,
    InteractionResponseType,
    MessageFlags,
    RESTPostAPIChatInputApplicationCommandsJSONBody,
} from "discord-api-types/v10";

import { Env } from "../../../env";
import { Sentry } from "../../../sentry";
import { BotClient } from "../../client/bot";
import { Store } from "../../../store";
import { commonOptions, getEntityAndRepo, getOpts } from "./subunsub/util";

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

export const handler = async (
    _c: BotClient,
    interaction: APIChatInputApplicationCommandGuildInteraction,
    env: Env,
    _s: Sentry,
): Promise<(APIInteractionResponse | null)> => {
    const store = new Store(env.USER_DB);

    const { member } = interaction;

    const { options } = interaction.data;
    if (!options) throw "missing options";
    const { owner, repoName, defaultBranchOnly } = getOpts(options);

    try {
        const { entity, repo } = await getEntityAndRepo(env, store, owner, repoName, member.user.id);

        await store.upsertSub(repo.id, entity.githubID, repo.default_branch, defaultBranchOnly);

        // TODO: design embeds etc
        return {
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
                content: `OK, updates from ${owner}/${repoName} will be sent to <#${env.PUBLISH_CHANNEL_ID}>`,
                flags: MessageFlags.Ephemeral,
            }
        };
    } catch (e) {
        return {
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
                content: (e as string) || "an unknown error occurred",
                flags: MessageFlags.Ephemeral & MessageFlags.Urgent,
            },
        };
    }

}
