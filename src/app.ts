import type { Probot } from "probot";
import issuesOpened from "./targets/issues.opened";
import issuesLabeled from "./targets/issues.labeled";

export default (app: Probot) => {
    app.log.info("Hello from PCL CE Automation");
    app.onAny(async (context) => {
        const payload = context.payload as any;
        console.debug(`${context.name}.${payload?.action} by '${payload?.sender?.login}' on '${payload?.repository?.full_name}'`);
    });
    // register event targets
    app.on("issues.opened", issuesOpened);
    app.on("issues.labeled", issuesLabeled);
};
