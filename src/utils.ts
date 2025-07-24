import { Context } from "probot";

export async function hasWritePermission(context: Context, username: string) {
    const pl = await context.octokit.repos.getCollaboratorPermissionLevel(context.repo({ username }));
    const permission = pl.data.permission
    const output = `${username}'s permission: ${permission}`;
    if (permission === "write" || permission === "admin") {
        console.debug(output);
        return true;
    }
    console.warn(`${output}, denied`);
    return false;
}

export function isNotUserEvent(sender: { login: string, type: string }) {
    if (sender.type === "User") return false;
    console.debug(`Ignored non-user sender: ${sender.login} (${sender.type})`);
    return true;
}
