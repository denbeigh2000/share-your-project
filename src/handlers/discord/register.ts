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
    const router = getRouter(env, sentry);
    const client = new BotClient(env.BOT_TOKEN, sentry);

    await client.bulkRegisterCommands(
        env.CLIENT_ID,
        env.GUILD_ID,
        router.getCommandSpec()
    );

    return returnStatus(200, "OK");
}
