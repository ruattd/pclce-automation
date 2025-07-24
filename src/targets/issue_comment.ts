import { Context, ProbotOctokit } from "probot";
import { Labels } from "../values";

export default async function (context: Context<"issue_comment">) {
    const payload = context.payload;
    const issue = payload.issue;
    const action = payload.action;
    const sender = payload.sender.login;
    const comment = payload.comment;
    console.info(`#${issue.number} comment: ${comment.id} ${action} by '${sender}'`);
    if (action === "deleted") {
        console.debug("Ignored delete action");
        return;
    }
    // process commands
    const content = comment.body.trim();
    if (!content.startsWith("/")) {
        console.debug("Not a command, ignored");
        return;
    }
    const commandLine = content.slice(1).trim();
    console.info(`Processing command line: ${commandLine}`);
    const split = commandLine.split(" ");
    const command = split[0].toLowerCase();
    const args = [];
    let stringOpened = false;
    if (split.length > 1) for (const s of split.slice(1)) if (s.length > 0) {
        if (s.startsWith('"') && !stringOpened) {
            if (s.endsWith('"')) {
                args.push(s.slice(1, -1));
            } else {
                stringOpened = true;
                args.push(s.slice(1));
            }
        } else if (s.endsWith('"') && stringOpened) {
            stringOpened = false;
            args[args.length - 1] += " " + s.slice(0, -1);
        } else if (stringOpened) {
            args[args.length - 1] += " " + s;
        } else {
            args.push(s);
        }
    }
    console.info(`Result: ${command} ["${args.join('", "')}"]`);
    // command logic
    const octokit = context.octokit;
    switch (command) {
        case "ping":
            await octokit.issues.createComment(context.issue({ body: `Pong! @${sender}` }));
            break;
        case "duplicate":
            const pl = await octokit.repos.getCollaboratorPermissionLevel(context.repo({ username: sender }));
            const permission = pl.data.permission
            console.debug(`${sender}'s permission: ${permission}`)
            if (permission === "none" || permission === "read") {
                console.warn("Permission denied");
                break;
            }
            if (args.length < 1) {
                console.warn("Invalid argument");
                break;
            }
            const dup = Number.parseInt(args[0]);
            if (Number.isNaN(dup)) {
                console.warn(`${args[0]} is not a number`);
                break;
            }
            if (dup === issue.number) {
                console.warn("Cannot mark issue as duplicate of itself");
                break;
            }
            await octokit.issues.createComment(context.issue({ body: `本 issue 与 #${dup} 重复，请参考原 issue 相关信息。` }));
            console.info(`Closing issue as duplicate of #${dup}`);
            await markIssueAsDuplicate(octokit, context.issue({ duplicate_of: dup }));
            await octokit.issues.removeAllLabels(context.issue());
            await octokit.issues.addLabels(context.issue({ labels: await context.label(Labels.duplicate) }));
            break;
        default:
            console.warn(`Unknown command: ${command}`);
    }
}

async function markIssueAsDuplicate(
    octokit: ProbotOctokit,
    data: { owner: string, repo: string, issue_number: number, duplicate_of: number },
) {
    const owner = data.owner;
    const repo = data.repo;
    const issueNumber = data.issue_number;
    const duplicateOf = data.duplicate_of;
    // get issue ids
    interface GetIdsResponse {
        repository: {
            targetIssue: { id: string, stateReason?: string, duplicateOf?: { id: string } };
            canonicalIssue: { id: string };
        };
    }
    const GET_IDS = `
        query getIssueIds(
            $owner: String!,
            $repo: String!,
            $issueNumber: Int!,
            $duplicateOf: Int!
        ) {
            repository(owner: $owner, name: $repo) {
                targetIssue: issue(number: $issueNumber) {
                    id
                    stateReason
                    duplicateOf { id }
                }
                canonicalIssue: issue(number: $duplicateOf) {
                    id
                }
            }
        }
    `;
    const {
        repository: {
            targetIssue: { id: targetIssueId, stateReason, duplicateOf: currentDuplicateOf },
            canonicalIssue: { id: canonicalIssueId },
        },
    } = await octokit.graphql<GetIdsResponse>(GET_IDS, {
        owner,
        repo,
        issueNumber,
        duplicateOf
    });
    try {
        // unmark as duplicate if already marked
        if (stateReason === "DUPLICATE" && currentDuplicateOf) {
            const UNMARK_AS_DUPLICATE = `
                mutation unmarkAsDuplicate($input: UnmarkIssueAsDuplicateInput!) {
                    unmarkIssueAsDuplicate(input: $input) {
                        duplicate { __typename }
                    }
                }
            `;
            await octokit.graphql(UNMARK_AS_DUPLICATE, {
                input: {
                    duplicateId: targetIssueId,
                    canonicalId: currentDuplicateOf.id,
                },
            });
        }
        // close as duplicate
        const CLOSE_AS_DUPLICATE = `
            mutation closeAsDuplicate($input: CloseIssueInput!) {
                closeIssue(input: $input) {
                    issue { id }
                }
            }
        `;
        await octokit.graphql(CLOSE_AS_DUPLICATE, {
            input: {
                issueId: targetIssueId,
                duplicateIssueId: canonicalIssueId,
                stateReason: "DUPLICATE",
            },
        });
    } catch (error) {
        console.error("Error: ", error);
    }
}
