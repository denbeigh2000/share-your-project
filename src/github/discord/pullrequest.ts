import { GREEN, GREY, RED, YELLOW, ellipsis, getAuthor } from "./embeds";

import { PullRequestEvent } from "@octokit/webhooks-types";
import { APIEmbed } from "discord-api-types/v10";

const MAX_PR_LENGTH = 800;

export default (event: PullRequestEvent): APIEmbed | null => {
    switch (event.action) {
        case "assigned":
            return formatPR(event, "assigned", GREY);

        case "closed":
            return formatPR(event, "closed", RED);

        case "converted_to_draft":
            return formatPR(event, "converted to draft", GREY);
        case "edited":
            return formatPR(event, "edited", GREY);

        case "opened":
            return formatPR(event, "opened", GREEN);

        case "ready_for_review":
            return formatPR(event, "is ready for review", GREEN);

        case "reopened":
            return formatPR(event, "reopened", GREEN);

        case "review_request_removed":
            return formatPR(event, "removed a request for review", YELLOW);

        case "review_requested":
            return formatPR(event, "requested a review on", YELLOW);

        case "unassigned":
            return formatPR(event, "unassigned", YELLOW);

        case "synchronize":
        case "auto_merge_enabled":
        case "auto_merge_disabled":
        case "labeled":
        case "unlabeled":
        case "locked":
        case "unlocked":
        case "milestoned":
        case "demilestoned":
        case "enqueued":
        case "dequeued":
            return null;
    }
}

const formatPR = (event: PullRequestEvent, adjective: string, color: number): APIEmbed => {
    const { repository, pull_request } = event;
    const title = `#${pull_request.number} ${pull_request.title}`;

    const description = pull_request.body && pull_request.body.length > MAX_PR_LENGTH
        ? ellipsis(pull_request.body, MAX_PR_LENGTH)
        : (pull_request.body || "");

    return {
        author: getAuthor(event.sender),
        title: `[${repository.full_name}] Pull request ${adjective}: ${title}`,
        url: pull_request.url,
        color,
        description,
    }
}
