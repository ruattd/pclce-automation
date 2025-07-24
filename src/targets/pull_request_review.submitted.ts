import { Context } from "probot";
import { Labels } from "../values";

export default async function (context: Context<"pull_request_review.submitted">) {
    const payload = context.payload;
    const review = payload.review;
    const state = review.state;
    const pr = payload.pull_request;
    console.info(`#${pr.number} review submitted: ${state} by '${payload.sender.login}'`);
    // set waiting merge label if approved
    const octokit = context.octokit;
    if (state === "approved") {
        const labelName = await context.label(Labels.waitmerge);
        console.info(`Setting label: ${labelName[0]}`);
        await octokit.issues.setLabels(context.issue({ labels: labelName }));
    }
}
