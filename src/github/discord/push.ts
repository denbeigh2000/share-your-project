
import { BRANCH_PREFIX, COMMIT_DISPLAY_LENGTH, GREY_LIGHT, RED, ellipsis, getAuthor } from "./embeds";

import { PushEvent } from "@octokit/webhooks-types";
import { APIEmbed } from "discord-api-types/v10";

const COMMIT_MESSAGE_LEN = 68;

const title = (event: PushEvent): string => {
    if (!event.ref.startsWith(BRANCH_PREFIX)) {
        // Unsure how to deal with a push to a non-branch
        throw new Error(`unhandled ref: ${event.ref}`);
    }

    const branch = event.ref.substring(BRANCH_PREFIX.length);
    const { name } = event.repository;
    const commit = event.after.substring(0, COMMIT_DISPLAY_LENGTH);
    if (event.forced) {
        return `[${name}] Branch ${branch} was force-pushed to \`${commit}\``;
    }

    const n = event.commits.length;
    const suffix = n === 1 ? "" : "s";
    return `[${name}:${branch}] ${n} new commit${suffix}`;
}

const content = (event: PushEvent): string => {
    if (event.forced) {
        return `[Compare changes](${event.compare})`
    }

    return event.commits.map(c => {
        const hash = c.id.substring(0, COMMIT_DISPLAY_LENGTH);
        const user = c.committer.username ? c.committer.username : c.committer.name;
        const commitLine = c.message.split("\n")[0];
        const msg = (commitLine.length > COMMIT_MESSAGE_LEN)
            ? ellipsis(commitLine, COMMIT_MESSAGE_LEN)
            : commitLine;
        return `[\`${hash}\`](${c.url}) ${msg} - ${user}`;
    }).join("\n");
}

export default (event: PushEvent): APIEmbed => {
    return {
        author: getAuthor(event.sender),
        title: title(event),
        url: event.head_commit ? event.head_commit.url : event.repository.url,
        color: event.forced ? RED : GREY_LIGHT,
        description: content(event),
    };
}
