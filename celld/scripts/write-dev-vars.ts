import { writeFileSync } from "node:fs";
import { loadApplicationEnvironment, selectWorkerEnvironment, serializeDevVars } from "./env";

const vars = selectWorkerEnvironment(loadApplicationEnvironment());
writeFileSync(".dev.vars", serializeDevVars(vars), { encoding: "utf8", mode: 0o600 });
