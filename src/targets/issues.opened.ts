import { Context } from "probot";

export default async function(context: Context<"issues.opened">) {
    const result = context.issue({ body: `Received context: ${context}` });
    return context.octokit.issues.createComment(result);
}
