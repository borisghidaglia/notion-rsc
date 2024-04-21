#!/usr/bin/env node --no-deprecation
// TODO: remove --no-deprecation when punycode warning is fixed

import { Command } from "commander";
import { readFileSync, unlinkSync, writeFileSync } from "fs";
import { join } from "path";
import { cwd } from "process";

import { execSync } from "child_process";
import * as dotenv from "dotenv";
import { createSchema } from "./createSchema";

const program = new Command();

program.name("notion-rsc");

program
  .command("init")
  .description("Create notion-rsc config file.")
  .action(() => {
    console.log("Initializing...");
    init();
  });

program
  .command("sync")
  .description(
    "Retrieve data from pages and databases listed in the notion-rsc.config.ts file and generate their corresponding types."
  )
  .action(async () => {
    console.log("Syncing...");
    // Load the .env.local file to get the notion api key
    dotenv.config({ path: join(cwd(), ".env.local") });

    // Compile user config and move the result to our module directory
    execSync(`tsc ${join(cwd(), "/notion-rsc.config.ts")}`);
    const config = readFileSync(join(cwd(), "/notion-rsc.config.js"));
    unlinkSync(join(cwd(), "/notion-rsc.config.js"));
    writeFileSync(join(__dirname, "/notion-rsc.config.js"), config);

    // Create the types
    await createSchema();

    // Rebuild the module so that the types are accurately reflected
    // in the .d.ts generated files
    console.log("Rebuilding module...");
    execSync("npm run build", { cwd: join(__dirname, "../../") });

    console.log("Everything done ✅");
  });

program.parse();

function init() {
  const initialConfig = readFileSync(
    join(__dirname, "../src/notion-rsc.config.ts")
  );
  writeFileSync(join(cwd(), "/notion-rsc.config.ts"), initialConfig);
}
