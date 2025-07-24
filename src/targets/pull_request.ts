import { Context } from "probot";
import { Labels } from "../values";

export default async function (context: Context<"pull_request">) {
    const payload = context.payload;
    const action = payload.action;
    const pr = payload.pull_request;
    console.info(`#${pr.number} ${action}: ${pr.title} [${pr.user.login}]`);
    // check sender type
    const sender = payload.sender;
    if (sender.type !== "User") {
        console.debug(`Ignored non-user sender: ${sender.login} (${sender.type})`);
        return;
    }
    // check status
    const octokit = context.octokit;
    const labelsToSet = [];
    if (action === "closed") {
        if (pr.merged) labelsToSet.push(Labels.done);
        else {
            console.info(`Removing all labels`);
            await octokit.issues.removeAllLabels(context.issue());
        }
    } else if (pr.draft) {
        labelsToSet.push(Labels.processing);
    } else {
        if (pr.mergeable) labelsToSet.push(Labels.waitmerge);
        else labelsToSet.push(Labels.reviewing);
    }
    // count changing size
    const changes = pr.additions + pr.deletions;
    console.debug(`Changes: ${changes} (additions: ${pr.additions}, deletions: ${pr.deletions})`);
    let sizeLabelId: number;
    if (changes < 10) sizeLabelId = Labels.size_xs;
    else if (changes < 30) sizeLabelId = Labels.size_s;
    else if (changes < 100) sizeLabelId = Labels.size_m;
    else if (changes < 500) sizeLabelId = Labels.size_l;
    else if (changes < 1000) sizeLabelId = Labels.size_xl;
    else sizeLabelId = Labels.size_xxl;
    labelsToSet.push(sizeLabelId);
    // set label
    if (labelsToSet.length > 0) {
        const labelNames = await context.label(...labelsToSet);
        console.info(`Setting label(s): ${labelNames.join(", ")}`);
        await octokit.issues.setLabels(context.issue({ labels: labelNames }));
    }
}
