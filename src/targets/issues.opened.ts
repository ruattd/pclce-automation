import { Context } from "probot";

export default async function(context: Context<"issues.opened">) {
    const issue = context.payload.issue;
    console.info(`#${issue.number} opened: ${issue.title} [${issue.user.login}]`);
    // additional logic
}
