import { IRequest, Router } from "itty-router";
import { Env } from "../env";
import { Sentry } from "../sentry";
import { respondNotFound } from "../util/http";
import { handler as handleDiscordInteraction } from "./discord/interaction";
import { handler as handleGithubWebhook } from "./github/webhook";
import { handler as handleGithubPostauth } from "./github/postauth";

type RequestType = [Env, ExecutionContext, Sentry];

export const router = Router<IRequest, RequestType>()
    .post("/discord/interaction", handleDiscordInteraction)
    .post("/github/webhook", handleGithubWebhook)
    .get("/github/postauth", handleGithubPostauth)
    .all("*", respondNotFound);
