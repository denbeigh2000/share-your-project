import { Endpoints } from "@octokit/types";

import { APIApplicationCommandInteractionDataOption, ApplicationCommandOptionType, RESTPostAPIChatInputApplicationCommandsJSONBody } from "discord-api-types/v10";
import { Entity, Store } from "../../../../store";
import { Env } from "../../../../env";
import { Octokit } from "octokit";
import { createAppAuth } from "@octokit/auth-app";

export const commonOptions: RESTPostAPIChatInputApplicationCommandsJSONBody['options'] = [
    {
        name: "owner",
        required: true,
        type: ApplicationCommandOptionType.String,
        description: "Github user/org that owns this repo",
    },
    {
        name: "repo",
        required: true,
        type: ApplicationCommandOptionType.String,
        description: "Name of the Github repo",
    },
]

type listUserReposResponse = Endpoints["GET /repos/{owner}/{repo}"]["response"];

export interface EntityAndRepo {
    entity: Entity,
    repo: listUserReposResponse["data"],
}

export async function getEntityAndRepo(env: Env, store: Store, owner: string, repo: string, discordID: string): Promise<EntityAndRepo> {
    const entities = await store.findEntities(discordID);
    if (!entities)
        throw "No associated Github account found for your user. Try running `/link`";

    // Use each registered application linked to this discord user to try and
    // fetch this repo. We can confirm the correct entity is linked once we
    // identify the repo and its owner/owning org.
    for (const entity of entities) {
        const installationOctokit = new Octokit({
            authStrategy: createAppAuth,
            auth: {
                appId: env.GITHUB_APP_ID,
                privateKey: env.GITHUB_PRIVATE_KEY,
                installationId: entity.githubInstallationID,
            },
        });
        const { status, data } = await installationOctokit.request("GET /repos/{owner}/{repo}", {
            owner,
            repo,
        });

        if (status === 200) {
            const owningEntity = data.organization || data.owner;
            const entityLink = entities.find(e => e.githubID === owningEntity.id);
            if (!entityLink)
                throw `You are not linked to the owning ${owningEntity.type}, try \`/link\``;

            return {
                entity: entityLink,
                repo: data,
            };
        } else if (status >= 400 && status < 500)
            continue;
        else if (status >= 500 && status < 600)
            throw `Github returned error code ${status}, try again later(?)`;
    }

    throw "Could not find this repo (may not exist, or may have permission issues?)";
}

export interface Opts {
    owner: string,
    repoName: string,
    defaultBranchOnly: boolean,
    quiet: boolean,
}

export function getOpts(data: APIApplicationCommandInteractionDataOption[]): Opts {
    let owner: string | null = null;
    let repo: string | null = null;
    let defaultBranchOnly = true;
    let quiet = false;

    for (let i = 0; i < data.length; i++) {
        const datum = data[i];
        switch (datum.name) {
            case "owner":
                if (datum.type !== ApplicationCommandOptionType.String)
                    throw `bad data type for owner ${datum.type}`;
                owner = datum.value;
                break;

            case "repo":
                if (datum.type !== ApplicationCommandOptionType.String)
                    throw `bad data type for repo ${datum.type}`;
                repo = datum.value;
                break;

            case "default_branch_only":
                if (datum.type !== ApplicationCommandOptionType.Boolean)
                    throw `bad data type for default_branch_only ${datum.type}`;
                defaultBranchOnly = datum.value;
                break;

            case "quiet":
                if (datum.type !== ApplicationCommandOptionType.Boolean)
                    throw `bad data type for quiet ${datum.type}`;
                quiet = datum.value;
                break;

            default:
                throw `unknown option ${datum.name} (type ${datum.type})`;
        }
    }

    if (!owner) throw "`owner` not provided";
    if (!repo) throw "`repo` not provided";

    return { owner, repoName: repo, defaultBranchOnly, quiet };
}

