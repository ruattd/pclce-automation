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
    // check logic
    const octokit = context.octokit;
    const labelsToSet = [];
    if (action === "closed") {
        if (pr.merged) labelsToSet.push(Labels.done);
        else octokit.issues.removeAllLabels(context.issue());
    }
    else if (pr.draft) labelsToSet.push(Labels.processing);
    else labelsToSet.push(Labels.reviewing);
    // set label
    if (labelsToSet.length > 0) {
        const labelNames = await context.label(...labelsToSet);
        console.info(`Setting label(s): ${labelNames.join(", ")}`);
        await octokit.issues.setLabels(context.issue({ labels: labelNames }));
    }
}
