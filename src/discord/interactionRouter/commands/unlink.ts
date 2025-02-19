import { APIChatInputApplicationCommandGuildInteraction, APIInteractionResponse, ApplicationCommandOptionType, InteractionResponseType, MessageFlags, RESTPostAPIChatInputApplicationCommandsJSONBody } from "discord-api-types/v10";
import { Env } from "../../../env";
import { Store } from "../../../store";
import { Octokit } from "octokit";
import { BotClient } from "../../client/bot";
import { importOauthKey } from "../../../encrypter";
import { createOAuthUserAuth } from "@octokit/auth-app";

export const command: RESTPostAPIChatInputApplicationCommandsJSONBody = {
    name: "unlink",
    description: "Unlink a linked Github user or org.",
    options: [
        {
            name: "name",
            type: ApplicationCommandOptionType.String,
            required: true,
            description: "Identifier of the Github user or org to unlink.",
        },
    ],
};

export const handler = async (
    _ctx: ExecutionContext,
    _c: BotClient,
    interaction: APIChatInputApplicationCommandGuildInteraction,
    env: Env,
): Promise<(APIInteractionResponse | null)> => {
    const userId = interaction.member.user.id;
    const key = await importOauthKey(env.OAUTH_ENCRYPTION_KEY);
    const store = new Store(env.USER_DB, key);
    const grant = await store.deleteOauthGrant(userId);

    if (!grant)
        return {
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
                content: "Did not find linked account",
                flags: MessageFlags.Ephemeral & MessageFlags.Urgent,
            }
        }

    const { oauthToken: token } = grant;
    const octokit = new Octokit({
        authStrategy: createOAuthUserAuth,
        auth: {
            clientId: env.GITHUB_CLIENT_ID,
            clientSecret: env.GITHUB_CLIENT_ID,
            token,
            clientType: "oauth-app",
        },
    });

    const { data: user } = await octokit.request("GET /user");
    await octokit.request("DELETE /applications/{client_id}/grant", {
        client_id: env.GITHUB_CLIENT_ID,
        access_token: token,
    });

    const name = user.name || user.login;
    const userLink = `[${name}](${user.html_url})`
    return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
            content: `Successfully unlinked ${userLink} from this account, run \`/link\` to link a new one.

-# NOTE: this does not stop push notifications!
`,
            flags: MessageFlags.Ephemeral,
        }
    }
}
