import { GREY_LIGHT, getAuthor, getRefInfo } from "./embeds";

import { DeleteEvent } from "@octokit/webhooks-types";
import { APIEmbed } from "discord-api-types/v10";


export default (event: DeleteEvent): APIEmbed => {
    const { thing, name } = getRefInfo(event);
    const titleThing = thing[0].toUpperCase() + thing.substring(1);

    return {
        author: getAuthor(event.sender),
        title: `${titleThing} deleted: ${name}`,
        color: GREY_LIGHT,
    };
}
