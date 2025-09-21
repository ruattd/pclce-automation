import { Context } from "probot";
import { Labels } from "../values.js";
import {hasWritePermission, isNotUserEvent} from "../utils.js";

export default async function (context: Context<"issues.closed">) {
    const payload = context.payload;
    const issue = payload.issue;
    console.info(`#${issue.number} closed: ${issue.title} [${issue.user.login}]`);
    // check sender type
    const sender = payload.sender;
    if (isNotUserEvent(sender)) return;
    // add label
    const octokit = context.octokit.rest;
    let labelToSet: number | undefined;
    switch (issue.state_reason) {
        case "completed":
            if (await hasWritePermission(context, sender.login)) {
                labelToSet = Labels.done;
            } else {
                labelToSet = Labels.ignored;
                console.info(`Closing as not planned`);
                await octokit.issues.update(context.issue({ state: "closed", state_reason: "not_planned" }));
            }
            break;
        case "not_planned": labelToSet = Labels.ignored; break;
        case "duplicate": labelToSet = Labels.duplicate; break;
    }
    if (labelToSet) {
        const labelName = await context.label(labelToSet);
        console.info(`Setting label: ${labelName[0]}`);
        await octokit.issues.setLabels(context.issue({ labels: labelName }));
    }
}
