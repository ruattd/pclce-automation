import type { Probot } from "probot";
import issuesOpened from "./targets/issues.opened";
import issuesClosed from "./targets/issues.closed";
import issuesReopened from "./targets/issues.reopened";
import issuesLabeled from "./targets/issues.labeled";
import issueCommentAll from "./targets/issue_comment";
import { prAll, prReview } from "./targets/pull_request";

export default (app: Probot) => {
    app.log.info("Hello from PCL CE Automation");
    app.onAny(async (context) => {
        const payload = context.payload as any;
        console.debug(`${context.name}.${payload?.action} by '${payload?.sender?.login}' on '${payload?.repository?.full_name}'`);
    });
    // register event targets
    app.on("issues.opened", issuesOpened);
    app.on("issues.closed", issuesClosed);
    app.on("issues.reopened", issuesReopened);
    app.on(["issues.labeled", "issues.unlabeled"], issuesLabeled);
    app.on("issue_comment", issueCommentAll);
    app.on([
        "pull_request.closed", "pull_request.opened", "pull_request.reopened",
        "pull_request.ready_for_review", "pull_request.converted_to_draft", "pull_request.synchronize",
    ], prAll);
    app.on("pull_request_review", prReview);
};
