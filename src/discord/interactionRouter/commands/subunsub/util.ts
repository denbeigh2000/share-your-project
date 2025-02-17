import { Endpoints } from "@octokit/types";

import { APIApplicationCommandInteractionDataOption, ApplicationCommandOptionType, RESTPostAPIChatInputApplicationCommandsJSONBody } from "discord-api-types/v10";
import { OauthGrant, Store } from "../../../../store";
import { Env } from "../../../../env";
import { Octokit } from "octokit";
import { createOAuthUserAuth } from "@octokit/auth-app";

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

export interface GrantAndRepo {
    grant: OauthGrant,
    repo: listUserReposResponse["data"],
}

export async function getGrantAndRepo(env: Env, store: Store, owner: string, repo: string, discordID: string): Promise<GrantAndRepo> {
    const grant = await store.findOauthGrant(discordID);
    if (!grant)
        throw "No associated Github account found for your user. Try running `/link`";

    const octokitUser = new Octokit({
        authStrategy: createOAuthUserAuth,
        auth: {
            clientId: env.GITHUB_CLIENT_ID,
            clientSecret: env.GITHUB_CLIENT_SECRET,
            token: grant.oauthToken,
            clientType: "oauth-app",
        },
    });

    const { status, data } = await octokitUser.request("GET /repos/{owner}/{repo}", {
        owner,
        repo
    });

    if (status === 200)
        return { grant, repo: data }
    else if (status >= 400 && status < 500)
        throw "Either this repo doesn't exist, or you don't have read permissions for it.";
    else if (status >= 500 && status < 600)
        throw `Github returned error code ${status}, try again later(?)`;
    else
        throw `Unhandled status code ${status} from Github`;
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

