import { Context } from "probot";
import { Labels } from "../values";

export default async function (context: Context<"issues.closed">) {
    const payload = context.payload;
    const issue = payload.issue;
    console.info(`#${issue.number} closed: ${issue.title} [${issue.user.login}]`);
    // check sender type
    const sender = payload.sender;
    if (sender.type !== "User") {
        console.debug(`Ignored non-user sender: ${sender.login} (${sender.type})`);
        return;
    }
    // add label
    const octokit = context.octokit;
    let labelToSet: number | undefined;
    switch (issue.state_reason) {
        case "completed": labelToSet = Labels.done; break;
        case "not_planned": labelToSet = Labels.ignored; break;
        case "duplicate": labelToSet = Labels.duplicate; break;
    }
    if (labelToSet) {
        const labelName = await context.label(labelToSet);
        console.info(`Setting label: ${labelName[0]}`);
        await octokit.issues.setLabels(context.issue({ labels: labelName }));
    }
}
