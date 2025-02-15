import { EmitterWebhookEvent } from "@octokit/webhooks";
import { GREY_LIGHT, formatSimpleUser, getRefInfo } from "./embeds";

import { APIEmbed } from "discord-api-types/v10";

type CreateEvent = EmitterWebhookEvent<"create">["payload"];

export default (event: CreateEvent): APIEmbed => {
    const { thing, name } = getRefInfo(event);

    return {
        author: formatSimpleUser(event.sender),
        title: `New ${thing} created: ${name}`,
        color: GREY_LIGHT,
    };
}

