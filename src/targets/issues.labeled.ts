import { Context } from "probot";
import { Labels } from "../values";

export default async function(context: Context<"issues.labeled" | "issues.unlabeled">) {
    const payload = context.payload;
    const issue = payload.issue;
    const label = payload.label;
    if (!label) {
        console.warn(`No label delivered (#${issue.number})`);
        return;
    }
    const labelId = label.id;
    const isUnlabeled = payload.action === "unlabeled";
    console.info(`#${issue.number} ${isUnlabeled ? "unlabeled" : "labeled"}: ${label.name} (${labelId})`);
    // check sender type
    const sender = payload.sender;
    if (sender.type !== "User") {
        console.debug(`Ignored non-user sender: ${sender.login} (${sender.type})`);
        return;
    }
    // handle label event
    if (isUnlabeled) return;
    const octokit = context.octokit;
    const issueLabelIds = issue.labels?.map(l => l.id) || [];
    const labelsToRemove = [];
    const updateIssue = (data: {}) => octokit.issues.update(context.issue(data));
    // positive -> remove negative labels; reopen issue, or close as completed
    if (Labels.isPositiveLabel(labelId)) {
        for (const l of issueLabelIds) if (Labels.isNegativeLabel(l)) labelsToRemove.push(l);
        if ((issue.state === "open" || issue.state_reason !== "completed") && Labels.isDoneLabel(labelId)) {
            console.info(`Closing issue as completed`);
            await updateIssue({ state: "closed", state_reason: "completed" });
        } else if (issue.state === "closed" && Labels.isProcessLabel(labelId)) {
            if (issueLabelIds.includes(Labels.done)) labelsToRemove.push(Labels.done);
            console.info(`Reopening issue for process label added`);
            await updateIssue({ state: "open", state_reason: "reopened" });
        }
    }
    // negative -> remove all labels except self & markup; reopen issue, or close as not planned
    else if (Labels.isNegativeLabel(labelId)) {
        for (const l of issueLabelIds) if (l !== labelId && !Labels.isMarkupLabel(l)) labelsToRemove.push(l);
        if (issue.state === "open" && Labels.isNotPlannedLabel(labelId)) {
            console.info(`Closing issue as not planned`);
            await updateIssue({ state: "closed", state_reason: "not_planned" });
        } else if (issue.state === "closed" && Labels.isNeedingLabel(labelId)) {
            console.info(`Reopening issue for needing label added`);
            await updateIssue({ state: "open", state_reason: "reopened" });
        }
    }
    // remove label(s)
    if (labelsToRemove.length > 0) {
        const labelNames = await context.label(...labelsToRemove);
        console.info(`Removing label(s): ${labelNames.join(", ")}`);
        for (const n of labelNames) await octokit.issues.removeLabel(context.issue({ name: n }));
    }
}
