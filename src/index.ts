import { router } from "./handlers";
import { Sentry } from "./sentry";
import { returnStatus } from "./util/http";
import { Env } from "./env";

export default {
    async fetch(request, env, ctx): Promise<Response> {
        const sentry = new Sentry(request, env as Env, ctx);
        try {
            return await router.handle(request, env, ctx, sentry);
        } catch (e) {
            sentry.captureException(e);
            return returnStatus(500, "Internal Error");
        }
    },
} satisfies ExportedHandler<Env>;
