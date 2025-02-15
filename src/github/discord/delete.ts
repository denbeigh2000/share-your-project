import { EmitterWebhookEvent } from "@octokit/webhooks";
import { GREY_LIGHT, getRefInfo, formatSimpleUser } from "./embeds";

import { APIEmbed } from "discord-api-types/v10";

type DeleteEvent = EmitterWebhookEvent<"delete">["payload"];

export default (event: DeleteEvent): APIEmbed => {
    const { thing, name } = getRefInfo(event);
    const titleThing = thing[0].toUpperCase() + thing.substring(1);

    return {
        author: formatSimpleUser(event.sender),
        title: `${titleThing} deleted: ${name}`,
        color: GREY_LIGHT,
    };
}
