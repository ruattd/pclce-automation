import { Context } from "probot";

export default async function(context: Context<"issues.labeled">) {
    context.log.info("Issue labeled: ", context.payload.label?.name);
}
