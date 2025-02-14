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
import { createAppAuth } from "@octokit/auth-app";
import { Octokit } from "octokit";

export const command: RESTPostAPIChatInputApplicationCommandsJSONBody = {
    name: "unsubscribe",
    description: "Stop sending updates from your Github projects to the channel.",
};

export const handler = async (
    _c: BotClient,
    interaction: APIChatInputApplicationCommandGuildInteraction,
    env: Env,
    _s: Sentry,
): Promise<(APIInteractionResponse | null)> => {
    const { member } = interaction;
    const store = new Store(env.USER_DB);

    const entities = await store.findEntities(member.user.id);
    if (!entities)
        return {
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
                content: "No associated Github account found for your user. Try running `/link`",
                flags: MessageFlags.Ephemeral & MessageFlags.Urgent,
            },
        };

    // TODO: parse these from command
    const owner = "denbeigh2000";
    const repo = ".dotfiles";

    let installationOctokit;
    let repoObject;
    // Use each registered application linked to this discord user to try and
    // fetch this repo. We can confirm the correct entity is linked once we
    // identify the repo and its owner/owning org.
    for (const entity of entities) {
        installationOctokit = new Octokit({
            authStrategy: createAppAuth,
            auth: {
                appId: env.GITHUB_APP_ID,
                privateKey: env.GITHUB_PRIVATE_KEY,
                installationId: entity.githubInstallationID,
            },
        });
        const { status, data } = await installationOctokit.request("GET /repos/{owner}/{repo}", {
            owner,
            repo
        });

        if (status === 200) {
            repoObject = data;
            break;
        } else if (status >= 400 && status < 500)
            continue;
        else if (status >= 500 && status < 600)
            return {
                type: InteractionResponseType.ChannelMessageWithSource,
                data: {
                    content: `Github returned error code ${status}, try again later(?)`,
                    flags: MessageFlags.Ephemeral & MessageFlags.Urgent,
                }
            };
    }

    if (!repoObject)
        return {
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
                content: "Could not find this repo (may not exist, or may have permission issues?)",
                flags: MessageFlags.Ephemeral & MessageFlags.Urgent,
            },
        };

    const owningEntity = repoObject.organization || repoObject.owner;
    const entityLink = entities.find(e => e.githubID === owningEntity.id);
    if (!entityLink)
        return {
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
                content: `You are not linked to the owning ${owningEntity.type}, try \`/link\``,
                flags: MessageFlags.Ephemeral & MessageFlags.Urgent,
            }
        };

    /* TODO: remove copypasta above */

    await store.removeSub(repoObject.id);

    // TODO: design embeds etc
    return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
            content: `OK, no longer sending updates from ${owner}/${repo} to <#${env.PUBLISH_CHANNEL_ID}>`,
            flags: MessageFlags.Ephemeral,
        }
    };
}
