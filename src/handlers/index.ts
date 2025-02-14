import { IRequest, Router } from "itty-router";
import { Env } from "../env";
import { Sentry } from "../sentry";
import { respondNotFound } from "../util/http";
import { handler as handleDiscordInteraction } from "./discord/interaction";

type RequestType = [Env, ExecutionContext, Sentry];

export const router = Router<IRequest, RequestType>()
    .get("/discord/interaction", handleDiscordInteraction)
    .all("*", respondNotFound);
