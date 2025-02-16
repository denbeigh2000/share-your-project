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
import { Octokit } from "octokit";
import { Endpoints } from "@octokit/types";
import { importOauthKey } from "../../../encrypter";
import { createOAuthUserAuth } from "@octokit/auth-app";

export const command: RESTPostAPIChatInputApplicationCommandsJSONBody = {
    name: "linked-accounts",
    description: "View the Github users/orgs linked to your account",
};

function formatOrg(user: Endpoints["GET /user"]["response"]["data"]): string {
    const { name, html_url: url } = user!;
    return `[${name}](${url})`;
}

const handleInner = async (
    client: BotClient,
    interaction: APIChatInputApplicationCommandGuildInteraction,
    env: Env,
): Promise<string> => {

    const userId = interaction.member.user.id;
    const key = await importOauthKey(env.OAUTH_ENCRYPTION_KEY);
    const store = new Store(env.USER_DB, key);
    const entities = await store.findEntities(userId);

    const appId = env.GITHUB_APP_ID;
    const privateKey = env.GITHUB_PRIVATE_KEY;

    const ents = [];
    for (const ent of entities) {
        const installationId = ent.githubInstallationID;
        const token = ent.oauthToken;
        const octokit = new Octokit({
            authStrategy: createOAuthUserAuth,
            auth: {
                appId,
                privateKey,
                installationId,
                token,
                type: "oauth-user",
            },
        });
        const { status, data } = await octokit.request("GET /user");
        // TODO: improve 4xx/5xx handling
        if (status !== 200) throw `bad status ${status}`;
        ents.push(data);
    }

    let content;
    switch (ents.length) {
        case 0: {
            content = "No linked accounts found. Run `/setup` to get started";
            break;
        }

        case 1: {
            const e = ents[0];
            content = `Found one linked ${e.type}: ${formatOrg(e)}`;
            break;
        }

        default: {
            const entityMessage = ents.map(e => `- ${formatOrg(e)} (${e.type})`).join("\n");
            content = `
${ents.length} linked accounts:
${entityMessage}
`;
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
            content = "error displaying linked accounts: {e}";
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
