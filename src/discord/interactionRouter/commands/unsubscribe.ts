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
import { commonOptions, getGrantAndRepo, getOpts } from "./subunsub/util";
import { importOauthKey } from "../../../encrypter";

export const command: RESTPostAPIChatInputApplicationCommandsJSONBody = {
    name: "unsubscribe",
    description: "Stop sending updates from your Github projects to the channel.",
    options: commonOptions!,
};

const handleInner = async (
    client: BotClient,
    interaction: APIChatInputApplicationCommandGuildInteraction,
    env: Env,
): Promise<void> => {
    const key = await importOauthKey(env.OAUTH_ENCRYPTION_KEY);
    const store = new Store(env.USER_DB, key);

    const { member } = interaction;

    const { options } = interaction.data;
    if (!options) throw "missing options";
    const { owner, repoName } = getOpts(options);
    let msg: RESTPatchAPIInteractionFollowupJSONBody;
    try {
        const { repo } = await getGrantAndRepo(env, store, owner, repoName, member.user.id);
        await store.removeSub(repo.id);

        // TODO: design embeds etc
        msg = {
            content: `OK, no longer sending updates from ${owner}/${repoName} to <#${env.PUBLISH_CHANNEL_ID}>`,
        };
    } catch (e) {
        const errorMsg = (e as string) || "an unknown error occurred";
        msg = {
            content: `Failed to unsubscribe: ${errorMsg}`,
        };
    }

    const { application_id: applicationId, token } = interaction;
    await client.editFollowup(applicationId, token, msg);
}

export const handler = async (
    ctx: ExecutionContext,
    client: BotClient,
    interaction: APIChatInputApplicationCommandGuildInteraction,
    env: Env,
): Promise<(APIInteractionResponse | null)> => {
    ctx.waitUntil(handleInner(client, interaction, env));
    return {
        type: InteractionResponseType.DeferredChannelMessageWithSource,
        data: { flags: MessageFlags.Ephemeral },
    };
}
