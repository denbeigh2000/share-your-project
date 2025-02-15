import { GREY_LIGHT, getAuthor, getRefInfo } from "./embeds";

import { CreateEvent } from "@octokit/webhooks-types";
import { APIEmbed } from "discord-api-types/v10";

export default (event: CreateEvent): APIEmbed => {
    const { thing, name } = getRefInfo(event);

    return {
        author: getAuthor(event.sender),
        title: `New ${thing} created: ${name}`,
        color: GREY_LIGHT,
    };
}

