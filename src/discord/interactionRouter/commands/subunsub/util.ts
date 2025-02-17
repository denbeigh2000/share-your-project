import { APIApplicationCommandInteractionDataOption, ApplicationCommandOptionType, RESTPatchAPIInteractionFollowupJSONBody, RESTPostAPIChatInputApplicationCommandsJSONBody } from "discord-api-types/v10";

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

export function reply(msg: string): RESTPatchAPIInteractionFollowupJSONBody {
    const content = `Error: ${msg}`;
    return { content };
}

export function ghStatusResponse(status: number): string {
    if (status >= 400 && status < 500)
        return "Either this repo doesn't exist, or you don't have read permissions for it.";
    else if (status >= 500 && status < 600)
        return `Github returned error code ${status}, try again later(?)`;
    else if (status !== 200)
        return `Unhandled status code ${status} from Github`;

    return "OK";
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

