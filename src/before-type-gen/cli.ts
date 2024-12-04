#!/usr/bin/env node --no-deprecation
// TODO: remove --no-deprecation when punycode warning is fixed

import { execSync } from "child_process";
import { Command } from "commander";
import * as dotenv from "dotenv";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "fs";
import { join } from "path";
import { cwd } from "process";

import { createSchema } from "./createSchema";

export const dotNotionRscUserPath = join(cwd(), "./node_modules/.notion-rsc/");
const sourceModulePath = join(cwd(), "./node_modules/notion-rsc");
export const dotNotionRscSourceModulePath = join(
  sourceModulePath,
  "/node_modules/.notion-rsc"
);
export const generatedTypesFileName = "generatedTypes.ts";
export const notionDataFileName = "notionData.ts";

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

    // Create the .notion-rsc directory and copy the types file
    if (!existsSync(dotNotionRscUserPath)) {
      mkdirSync(dotNotionRscUserPath);
      copyTypesFileTo(dotNotionRscUserPath);
    }
    // In dev, we will create generated-types.ts and notionData.ts both
    // in user's node_modules and in notion-rsc node_modules.
    //
    // That's because when notion-rsc has been installed using:
    //
    // npm install <path> --prefix .
    //
    // Then when importing generatedTypes or notioData from .notion-rsc/
    // inside createNotionComponents.tsx, the import is relative to the
    // module instead of the user directory.
    if (process.env.NOTION_RSC_ENV === "dev") {
      if (!existsSync(dotNotionRscSourceModulePath)) {
        mkdirSync(dotNotionRscSourceModulePath);
        copyTypesFileTo(dotNotionRscSourceModulePath);
      }
    }

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
    join(sourceModulePath, "./src/notion-rsc.config.ts")
  );
  writeFileSync(join(cwd(), "/notion-rsc.config.ts"), initialConfig);
}

function copyTypesFileTo(to: string) {
  const types = readFileSync(join(sourceModulePath, "./src/types.ts"));
  const path = join(to, "/types.ts");
  writeFileSync(path, types);
}
