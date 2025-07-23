import { Context } from "probot";

export default async function(context: Context<"issues.labeled">) {
    const issue = context.payload.issue;
    const label = context.payload.label;
    if (!label) {
        context.log.warn(`No label in the payload (issue #${issue.number})`);
        return;
    }
    context.log.info(`Issue #${issue.number} labeled: ${label.name} (${label.id})`);
    // additional logic
}
