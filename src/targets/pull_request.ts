import { Context, ProbotOctokit } from "probot";
import { Labels } from "../values.js";

export const prAll = async (context: Context<"pull_request">) => await pr(context, false);
export const prReview = async (context: Context<"pull_request_review">) => await pr(context, true);

async function pr(context: Context<"pull_request" | "pull_request_review">, isReviewEvent: boolean) {
    const payload = context.payload;
    const action = payload.action;
    const pr = payload.pull_request;
    console.info(`#${pr.number} ${action}: ${pr.title} [${pr.user!.login}]`);
    // check sender type
    const sender = payload.sender!;
    if (sender.type !== "User") {
        console.debug(`Ignored non-user sender: ${sender.login} (${sender.type})`);
        return;
    }
    // check status
    const octokit = context.octokit.rest;
    const labelsToSet = [];
    let bypassSetLabels = false;
    let labelToSetOnIssues: number | undefined;
    if (action === "closed") {
        if ((pr as any).merged) labelsToSet.push(Labels.done);
        else {
            console.info(`Removing all labels`);
            await octokit.issues.removeAllLabels(context.issue());
            bypassSetLabels = true;
            labelToSetOnIssues = Labels.waitprocess;
        }
    } else if (pr.draft) {
        labelsToSet.push(Labels.processing);
        labelToSetOnIssues = Labels.processing;
    } else {
        if (await checkMergeable(context)) {
            labelsToSet.push(Labels.waitmerge);
            labelToSetOnIssues = Labels.waitmerge;
        } else {
            labelsToSet.push(Labels.reviewing);
            labelToSetOnIssues = Labels.processing;
        }
    }
    // set label on referenced issues
    if (labelToSetOnIssues) {
        console.info(`Setting label on issues: ${labelToSetOnIssues}`);
        await markReferencedIssues(context, labelToSetOnIssues);
    }
    if (bypassSetLabels) return;
    // count changing size
    if (isReviewEvent) {
        const labels = (await octokit.issues.listLabelsOnIssue(context.issue())).data;
        const sizeLabelIndex = labels.findIndex(l => Labels.isSizeLabel(l.id));
        if (sizeLabelIndex !== -1) {
            labelsToSet.push(labels[sizeLabelIndex].id);
            console.debug(`Size label: ${labels[sizeLabelIndex].name} // f* you GitHub API`);
        }
    } else {
        const prc = pr as { additions: number, deletions: number };
        const changes = prc.additions + prc.deletions;
        console.debug(`Changes: ${changes} (additions: ${prc.additions}, deletions: ${prc.deletions})`);
        let sizeLabelId: number;
        if (changes < 10) sizeLabelId = Labels.size_xs;
        else if (changes < 30) sizeLabelId = Labels.size_s;
        else if (changes < 100) sizeLabelId = Labels.size_m;
        else if (changes < 500) sizeLabelId = Labels.size_l;
        else if (changes < 1000) sizeLabelId = Labels.size_xl;
        else sizeLabelId = Labels.size_xxl;
        labelsToSet.push(sizeLabelId);
    }
    // set labels
    if (labelsToSet.length > 0) {
        const labelNames = await context.label(...labelsToSet);
        console.info(`Setting label(s): ${labelNames.join(", ")}`);
        await octokit.issues.setLabels(context.issue({ labels: labelNames }));
    }
}

interface PullRequestGraphQLResponse {
    repository: {
        pullRequest: {
            mergeStateStatus: 'BLOCKED' | 'BEHIND' | 'CLEAN' | 'DIRTY' | 'DRAFT' | 'HAS_HOOKS' | 'UNKNOWN' | 'UNSTABLE';
            reviewDecision: 'APPROVED' | 'CHANGES_REQUESTED' | 'REVIEW_REQUIRED' | null;
            mergeable: 'CONFLICTING' | 'MERGEABLE' | 'UNKNOWN';
        } | null;
    };
}

async function checkMergeable(context: Context<"pull_request">) {
    const { owner, repo } = context.repo();
    const prNumber = context.payload.pull_request.number;

    const query = `
        query ($owner: String!, $repo: String!, $prNumber: Int!) {
            repository(owner: $owner, name: $repo) {
                pullRequest(number: $prNumber) {
                    mergeStateStatus
                    reviewDecision
                    mergeable
                }
            }
        }
    `;

    const response = await context.octokit.graphql<PullRequestGraphQLResponse>(
        query,
        {
            owner,
            repo,
            prNumber,
        }
    );

    const pr = response.repository.pullRequest;

    if (!pr) {
        return false;
    }

    if (pr.mergeStateStatus === 'CLEAN') {
        return true;
    }

    return pr.reviewDecision === 'APPROVED' &&
        pr.mergeable === 'MERGEABLE';
}

async function markReferencedIssues(context: Context, labelId: number) {
    const octokit = context.octokit.rest;
    const referencedIssues = await getClosingIssuesReferences(context.octokit, context.issue());
    if (referencedIssues.length > 0) {
        console.info(`Referenced issue(s): #${referencedIssues.join(", #")}`);
        for (const issueNumber of referencedIssues) {
            console.info(`Processing #${issueNumber}`);
            // add waiting merge label (self)
            const self = labelId;
            await octokit.issues.addLabels(context.repo({ issue_number: issueNumber, labels: await context.label(self) }));
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
