import { Context, ProbotOctokit } from "probot";
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
        // process referenced issues
        const referencedIssues = await getClosingIssuesReferences(octokit, context.issue());
        if (referencedIssues.length > 0) {
            console.info(`Referenced issue(s): #${referencedIssues.join(", #")}`);
            for (const issueNumber of referencedIssues) {
                console.info(`Processing #${issueNumber}`);
                // add waiting merge label (self)
                const self = Labels.waitmerge;
                octokit.issues.addLabels(context.issue({ labels: await context.label(self) }));
                // remove all labels except markup and self
                const labels = await octokit.issues.listLabelsOnIssue(context.repo({ issue_number: issueNumber }));
                const labelsToRemove = labels.data.filter(l => !Labels.isMarkupLabelOrSelf(l.id, self));
                if (labelsToRemove.length == 0) continue;
                const labelNames = labelsToRemove.map(l => l.name);
                console.info(`Removing label(s): ${labelNames.join(", ")}`);
                for (const l of labelNames)
                    await octokit.issues.removeLabel(context.repo({ issue_number: issueNumber, name: l }));
            }
        }
    }
}

async function getClosingIssuesReferences(
    octokit: ProbotOctokit,
    pr: { owner: string, repo: string, issue_number: number },
) {
    interface ClosingIssuesResponse {
        repository: {
            pullRequest: {
                closingIssuesReferences: {
                    nodes: { number: number }[];
                }
            };
        };
    }
    const GET_ISSUE_REFERENCES = `
        query(
            $owner: String!
            $repo: String!
            $pullNumber: Int!
            $first: Int!
        ) {
            repository(owner: $owner, name: $repo) {
                pullRequest(number: $pullNumber) {
                    closingIssuesReferences(first: $first) {
                        nodes { number }
                    }
                }
            }
        }
    `;
    const {
        repository: {
            pullRequest: { closingIssuesReferences: { nodes: issues } },
        },
    } = await octokit.graphql<ClosingIssuesResponse>(GET_ISSUE_REFERENCES, {
        owner: pr.owner,
        repo: pr.repo,
        pullNumber: pr.issue_number,
        first: 100,
    });
    return issues.map(issue => issue.number);
}
