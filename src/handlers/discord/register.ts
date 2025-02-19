import { Env } from "../../env";
import { Sentry } from "../../sentry";
import { returnStatus } from "../../util/http";
import { getRouter } from "../../discord/interactionRouter/registry";
import { BotClient } from "../../discord/client/bot";

export async function handler(
    request: Request,
    env: Env,
    _ctx: ExecutionContext,
    sentry: Sentry
) {
    if (!env.REGISTER_PRE_SHARED_KEY)
        return returnStatus(500, "Error");

    if (request.headers.get("Authorization") !== env.REGISTER_PRE_SHARED_KEY) {
        return returnStatus(401, "Unauthorised");
    }

    const router = getRouter(env, sentry);
    const client = new BotClient(env.BOT_TOKEN, sentry);

    await client.bulkRegisterCommands(
        env.CLIENT_ID,
        env.GUILD_ID,
        router.getCommandSpec()
    );

    return returnStatus(200, "OK");
}
