import {
    APIChatInputApplicationCommandGuildInteraction,
    APIInteractionResponse,
    InteractionResponseType,
    MessageFlags,
    RESTPostAPIChatInputApplicationCommandsJSONBody,
} from "discord-api-types/v10";

import { Env } from "../../../env";
import { BotClient } from "../../client/bot";
import { StateStore } from "../../../stateStore";

const SCOPES = ["read:org"];

export const command: RESTPostAPIChatInputApplicationCommandsJSONBody = {
    name: "link",
    description: "Link your Discord account to a Github user or org.",
};

export const handler = async (
    _ctx: ExecutionContext,
    _c: BotClient,
    interaction: APIChatInputApplicationCommandGuildInteraction,
    env: Env,
): Promise<(APIInteractionResponse | null)> => {
    const userId = interaction.member.user.id;

    const stateStore = new StateStore(env.OAUTH);

    const { state, expiration } = await stateStore.put(userId);
    const scopes = encodeURIComponent(SCOPES.join(" "));
    const queryParams = new URLSearchParams({
        client_id: env.GITHUB_CLIENT_ID,
        state,
        scopes,
    });
    const url = `https://github.com/login/oauth/authorize?${queryParams}`;
    return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
            content: `
<@${userId}>: Click [here](${url}) to link your Discord account to a Github org.

This link expires at <t:${expiration}:f> (<t:${expiration}:R>).

**This is a private link, and shouldn't be shared**.
            `,
            flags: MessageFlags.Ephemeral,
        },
    }
}

