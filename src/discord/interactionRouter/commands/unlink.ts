import { APIChatInputApplicationCommandGuildInteraction, APIInteractionResponse, ApplicationCommandOptionType, InteractionResponseType, MessageFlags, RESTPostAPIChatInputApplicationCommandsJSONBody } from "discord-api-types/v10";
import { Sentry } from "../../../sentry";
import { Env } from "../../../env";
import { Store } from "../../../store";
import { Octokit } from "octokit";
import { BotClient } from "../../client/bot";

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

    const opt = interaction.data.options!.find(e => e.name === "name");
    if (!opt) throw "missing `name` option in /unlink";
    if (opt.type !== ApplicationCommandOptionType.String) throw `/unlink name option has bad type ${opt.type}`;

    for (const entity of entities) {
        const installationId = entity.githubInstallationID;
        const octokit = new Octokit({ appId, privateKey, installationId });
        const { status, data } = await octokit.request("GET /user");

        // TODO: improve this error handling - maybe we should remove this
        // entry?
        if (status !== 200) throw `failed to fetch for GH user ${entity.githubID}`;
        if (data.name === opt.value) {
            await store.removeInstallation(installationId);
            return {
                type: InteractionResponseType.ChannelMessageWithSource,
                data: {
                    content: `OK, unlinked account ${opt.value}`,
                    flags: MessageFlags.Ephemeral,
                }
            }
        }
    }

    return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
            content: `Did not find linked account for ${opt.value}`,
            flags: MessageFlags.Ephemeral & MessageFlags.Urgent,
        }
    }
}
