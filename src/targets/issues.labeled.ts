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
    const isUnlabeled = payload.action === "unlabeled";
    console.info(`#${issue.number} ${isUnlabeled ? "unlabeled" : "labeled"}: ${label.name} (${label.id})`);
    // check sender type
    const sender = payload.sender;
    if (sender.type !== "User") {
        console.debug(`Ignored non-user sender: ${sender.login} (${sender.type})`);
        return;
    }
    // handle label event
    // const labelName = await context.label(Labels.done);
    // return context.octokit.issues.addLabels(context.issue({ labels: labelName }))
}
