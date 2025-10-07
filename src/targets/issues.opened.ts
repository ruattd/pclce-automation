import { Context } from "probot";
import { Labels } from "../values.js";

export default async function(context: Context<"issues.opened">) {
    const issue = context.payload.issue;
    console.info(`#${issue.number} opened: ${issue.title} [${issue.user!.login}]`);
    // rubbish killer
    const killerKeyword = "- [x] 我确认只是全部选中而没有[仔细确认]";
    const octokit = context.octokit.rest;
    if (issue.body?.includes(killerKeyword)) {
        console.info("Rubbish killer triggered, closing issue as not planned");
        const issues = octokit.issues;
        await issues.update(context.issue({ state: "closed", state_reason: "not_planned", labels: await context.label(Labels.ignored) }));
        await issues.createComment(context.issue({ body: "好的呢！帮你关掉了，不用谢喵～" }));
    }
}
