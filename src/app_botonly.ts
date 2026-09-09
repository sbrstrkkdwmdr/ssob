import { begin as begin_bot } from "./bot";

import { setup } from "./setup";

console.log("Running bot-only mode");
setup();
begin_bot();
