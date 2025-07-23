import { Context } from "probot";

export default async function(context: Context<"issues.opened">) {
    const issue = context.payload.issue;
    context.log.info(`Issue #${issue.number} opened: ${issue.title} by ${issue.user.login}, URL: ${issue.url}`);
    // additional logic
}
