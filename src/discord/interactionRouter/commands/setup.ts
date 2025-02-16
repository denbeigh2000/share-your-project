import {
    APIChatInputApplicationCommandGuildInteraction,
    APIInteractionResponse,
    InteractionResponseType,
    MessageFlags,
    RESTPostAPIChatInputApplicationCommandsJSONBody,
} from "discord-api-types/v10";

import { Env } from "../../../env";
import { BotClient } from "../../client/bot";

export const command: RESTPostAPIChatInputApplicationCommandsJSONBody = {
    name: "setup",
    description: "Show instructions for how to setup the integration.",
};

export const handler = async (
    _ctx: ExecutionContext,
    _c: BotClient,
    _i: APIChatInputApplicationCommandGuildInteraction,
    env: Env,
): Promise<(APIInteractionResponse | null)> => {
    return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
            content: `
Set up this integration to publish updates from your own Github repos to <#${env.PUBLISH_CHANNEL_ID}!

1. Install the application here: https://github.com/apps/${env.GITHUB_APPLICATION_NAME}
2. Run \`/link\` to connect your Discord account to Github
            `,
            flags: MessageFlags.Ephemeral,
        },
    }
}
