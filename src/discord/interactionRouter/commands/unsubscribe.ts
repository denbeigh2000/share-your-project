import {
    APIChatInputApplicationCommandGuildInteraction,
    APIInteractionResponse,
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
    name: "unsubscribe",
    description: "Stop sending updates from your Github projects to the channel.",
    options: commonOptions!,
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
    const { owner, repoName } = getOpts(options);
    try {
        const { repo } = await getEntityAndRepo(env, store, owner, repoName, member.user.id);

        await store.removeSub(repo.id);

        // TODO: design embeds etc
        return {
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
                content: `OK, no longer sending updates from ${owner}/${repo} to <#${env.PUBLISH_CHANNEL_ID}>`,
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
