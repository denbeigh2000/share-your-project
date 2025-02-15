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
import { Octokit } from "octokit";
import { Endpoints } from "@octokit/types";

export const command: RESTPostAPIChatInputApplicationCommandsJSONBody = {
    name: "linked-accounts",
    description: "View the Github users/orgs linked to your account",
};

function formatOrg(user: Endpoints["GET /user"]["response"]["data"]): string {
    const { name, html_url: url } = user!;
    return `[${name}](${url})`;
}

export const handler = async (
    _c: BotClient,
    interaction: APIChatInputApplicationCommandGuildInteraction,
    env: Env,
    _s: Sentry,
): Promise<(APIInteractionResponse | null)> => {

    const userId = interaction.member.user.id;
    const store = new Store(env.USER_DB);
    const entities = await store.findEntities(userId);

    const appId = env.GITHUB_APP_ID;
    const privateKey = env.GITHUB_PRIVATE_KEY;

    const ents = [];
    for (const ent of entities) {
        const installationId = ent.githubInstallationID;
        const octokit = new Octokit({ appId, privateKey, installationId });
        const { status, data } = await octokit.request("GET /user");
        // TODO: improve 4xx/5xx handling
        if (status !== 200) throw `bad status ${status}`;
        ents.push(data);
    }

    let content;
    switch (ents.length) {
        case 0:
            content = "No linked accounts found. Run `/setup` to get started";
            break;

        case 1:
            const e = ents[0];
            content = `Found one linked ${e.type}: ${formatOrg(e)}`;
            break;

        default:
            const entityMessage = ents.map(e => `- ${formatOrg(e)} (${e.type})`).join("\n");
            content = `
${ents.length} linked accounts:
${entityMessage}
`;
    }

    return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: { content, flags: MessageFlags.Ephemeral },
    }
}
