import { Env } from "../../env";
import { Sentry } from "../../sentry";

import { InteractionRouter } from ".";
import { handler as pingHandler, command as pingDesc } from "./commands/ping";
import { handler as linkHandler, command as linkDesc } from "./commands/link";
import { handler as setupHandler, command as setupDesc } from "./commands/setup";
import { handler as subscribeHandler, command as subscribeDesc } from "./commands/subscribe";
import { handler as unsubscribeHandler, command as unsubscribeDesc } from "./commands/unsubscribe";

export function getRouter(env: Env, sentry: Sentry): InteractionRouter {
    const router = new InteractionRouter(env, sentry);

    router.registerCommand("ping", pingHandler, pingDesc);
    router.registerCommand("setup", setupHandler, setupDesc);
    router.registerCommand("link", linkHandler, linkDesc);
    router.registerCommand("subscribe", subscribeHandler, subscribeDesc);
    router.registerCommand("unsubscribe", unsubscribeHandler, unsubscribeDesc);

    return router;
}
