import { Context } from "probot";

export default async function(context: Context<"issues.labeled">) {
    const issue = context.payload.issue;
    const label = context.payload.label;
    if (!label) {
        console.warn(`No label in the payload (issue #${issue.number})`);
        return;
    }
    console.info(`Issue #${issue.number} labeled: ${label.name} (${label.id})`);
    // additional logic
}
