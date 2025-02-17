import {
    APIChatInputApplicationCommandGuildInteraction,
    APIInteractionResponse,
    InteractionResponseType,
    MessageFlags,
    RESTPostAPIChatInputApplicationCommandsJSONBody,
} from "discord-api-types/v10";

import { Env } from "../../../env";
import { BotClient } from "../../client/bot";
import { Store } from "../../../store";
import { Octokit } from "octokit";
import { Endpoints } from "@octokit/types";
import { importOauthKey } from "../../../encrypter";
import { createOAuthUserAuth } from "@octokit/auth-app";

export const command: RESTPostAPIChatInputApplicationCommandsJSONBody = {
    name: "linked-account",
    description: "View the Github user linked to your account",
};

function formatOrg(user: Endpoints["GET /user"]["response"]["data"]): string {
    const { name, html_url: url } = user!;
    return `[${name}](${url})`;
}

const handleInner = async (
    _client: BotClient,
    interaction: APIChatInputApplicationCommandGuildInteraction,
    env: Env,
): Promise<string> => {

    const userId = interaction.member.user.id;
    const key = await importOauthKey(env.OAUTH_ENCRYPTION_KEY);
    const store = new Store(env.USER_DB, key);
    const grant = await store.findOauthGrant(userId);

    const appId = env.GITHUB_APP_ID;
    const privateKey = env.GITHUB_PRIVATE_KEY;

    let content;
    if (!grant)
        content = "No linked account found. Run `/setup` to get started";
    else {
        const { oauthToken } = grant;
        const octokit = new Octokit({
            authStrategy: createOAuthUserAuth,
            auth: {
                appId,
                privateKey,
                oauthToken,
                type: "oauth-user",
            },
        });
        const { status, data } = await octokit.request("GET /user");
        if (status === 200) {
            content = `Linked account: ${formatOrg(data)}`;
        } else if (status >= 400 && status < 500) {
            console.error("error fetching user", data);
            content = "permission expired, try /unlink?";
        } else if (status >= 500 && status < 600) {
            content = `github appears to be down right now (status ${status})`;
        } else {
            content = `unhandled error: github status ${status}`;
        }
    }

    return content;
}

export const handler = async (
    ctx: ExecutionContext,
    client: BotClient,
    interaction: APIChatInputApplicationCommandGuildInteraction,
    env: Env,
): Promise<(APIInteractionResponse | null)> => {
    const callback = async () => {
        let content: string;
        try {
            content = await handleInner(client, interaction, env);
        } catch (e) {
            content = `error displaying linked accounts: ${e}`;
        }

        const { application_id: applicationId, token } = interaction;
        await client.editFollowup(applicationId, token, { content });
    }

    ctx.waitUntil(callback());
    return {
        type: InteractionResponseType.DeferredChannelMessageWithSource,
        data: { flags: MessageFlags.Ephemeral },
    }
}
