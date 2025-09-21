import { Context } from "probot";
import { Labels } from "../values.js";

export default async function (context: Context<"issues.reopened">) {
    const payload = context.payload;
    const issue = payload.issue;
    console.info(`#${issue.number} reopened: ${issue.title} [${issue.user!.login}]`);
    // check sender type
    const sender = payload.sender;
    if (sender.type !== "User") {
        console.debug(`Ignored non-user sender: ${sender.login} (${sender.type})`);
        return;
    }
    // remove not planned & duplicate label
    const octokit = context.octokit.rest;
    const issueLabelIds = issue.labels?.map(l => l!.id) || [];
    const labelsToRemove = [];
    for (const l of issueLabelIds)
        if (Labels.isNotPlannedLabel(l) || Labels.isDuplicateLabel(l)) labelsToRemove.push(l);
    if (labelsToRemove.length > 0) {
        const labelNames = await context.label(...labelsToRemove);
        console.info(`Removing label(s): ${labelNames.join(", ")}`);
        for (const n of labelNames) await octokit.issues.removeLabel(context.issue({ name: n }));
    }
}
