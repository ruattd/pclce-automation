import type { Probot } from "probot";
import issuesOpened from "./targets/issues.opened";
import issuesLabeled from "./targets/issues.labeled";

export default (app: Probot) => {
    app.log.info("Hello from PCL CE Automation");
    app.on("issues.opened", issuesOpened);
    app.on("issues.labeled", issuesLabeled);
};
