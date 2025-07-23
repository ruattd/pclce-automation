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
    // positive -> remove negative labels; reopen issue, or close issue if done
    if (Labels.isPositiveLabel(labelId)) {
        for (const l of issueLabelIds) if (Labels.isNegativeLabel(l)) labelsToRemove.push(l);
        if (Labels.isDoneLabel(labelId) && (issue.state === "open" || issue.state_reason !== "completed")) {
            console.info(`Closing issue as completed`);
            await octokit.issues.update(context.issue({ state: "closed", state_reason: "completed" }));
        }
        if (Labels.isProcessLabel(labelId) && issue.state === "closed") {
            console.info(`Reopening issue for process label added`);
            await octokit.issues.update(context.issue({ state: "open", state_reason: "reopened" }));
        }
    }
    // negative -> remove positive labels; close issue if not planned
    else if (Labels.isNegativeLabel(labelId)) {
        if (Labels.isNotPlannedLabel(labelId) && issue.state === "open") {
            for (const l of issueLabelIds) if (l !== labelId) labelsToRemove.push(l);
            console.info(`Closing issue as not planned`);
            await octokit.issues.update(context.issue({ state: "closed", state_reason: "not_planned" }));
        } else {
            for (const l of issueLabelIds) if (Labels.isPositiveLabel(l)) labelsToRemove.push(l);
        }
    }
    // remove label(s)
    if (labelsToRemove.length > 0) {
        const labelNames = await context.label(...labelsToRemove);
        console.info(`Removing label(s): ${labelNames.join(", ")}`);
        for (const n of labelNames) await octokit.issues.removeLabel(context.issue({ name: n }));
    }
}
