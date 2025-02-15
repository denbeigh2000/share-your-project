import { User } from "@octokit/webhooks-types";
import { APIEmbedAuthor } from "discord-api-types/v10";

export const COMMIT_DISPLAY_LENGTH = 7;

// #F83F23
export const RED = 16269091;
// #FDF5F5
export const RED_LIGHT = 16643573;
// #FFBA11
export const YELLOW = 16759313;
// #FFF8E7
export const YELLOW_LIGHT = 16775399;
// #00BE13
export const GREEN = 48659;
// #FAFDFA
export const GREEN_LIGHT = 16449018;
// #C2CACE
export const GREY = 12765902;
// #F9FAFB
export const GREY_LIGHT = 16382715;

export const BRANCH_PREFIX = "refs/heads/";
export const TAG_PREFIX = "refs/tags/";

export const getAuthor = (author: User): APIEmbedAuthor => {
    return {
        name: author.name ? author.name : author.login,
        url: author.url,
        icon_url: author.avatar_url,
    };
}

export const isTag = (ref: string) => ref.startsWith(TAG_PREFIX);
export const isBranch = (ref: string) => ref.startsWith(BRANCH_PREFIX);

export const getTagName = (ref: string) => ref.substring(0, TAG_PREFIX.length);
export const getBranchName = (ref: string) => ref.substring(0, BRANCH_PREFIX.length);

export interface RefInfo {
    thing: "tag" | "branch",
    name: string,
}

export interface RefArgs {
    ref: string,
    ref_type?: "branch" | "tag",
}

export const getRefInfo = (args: RefArgs): RefInfo => {
    const { ref, ref_type: refType } = args;
    if (isBranch(ref)) {
        return {
            thing: "branch",
            name: getBranchName(ref),
        };
    } else if (isTag(ref)) {
        return {
            thing: "tag",
            name: getTagName(ref),
        };
    } else if (refType === "branch") {
        return {
            thing: "branch",
            name: ref,
        };
    } else if (refType === "tag") {
        return {
            thing: "tag",
            name: ref,
        };
    } else {
        throw new Error(`${ref} is neither a tag nor a branch ref`);
    }
}

export const ellipsis = (input: string, maxLength: number): string => {
    return input.substring(0, maxLength - 3) + "...";
}
