import {
  Client as NotionClient,
  isFullPage,
  isFullPageOrDatabase,
} from "@notionhq/client";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "fs";
import { format } from "prettier";

import { getDatabaseName, getPageName } from ".";
import { fetchNotionData } from "./data";
import { PageObjectReponseProperties } from "./notion-properties";
import { NotionRscConfig } from "./types";

export async function createSchema() {
  const config: { default: NotionRscConfig } = require("./notion-rsc.config");
  const {
    default: { notionIntegrationSecret: auth, pageIds, databaseIds },
  } = config;

  const notionClient = new NotionClient({
    auth,
    // Forwarding local fetch to leverage caching
    // https://nextjs.org/docs/app/building-your-application/data-fetching#automatic-fetch-request-deduping
    fetch: fetch,
  });

  if (!existsSync("./node_modules/.notion-rsc/")) {
    mkdirSync("./node_modules/.notion-rsc/");
  }

  const notionData = await fetchNotionData(notionClient, pageIds, databaseIds);

  writeFileSync("./node_modules/.notion-rsc/generated-types.ts", "");

  const tsCodeStr: string[] = [];

  // Parsers
  tsCodeStr.push(`export type PageParsers = {`);
  for (const id of pageIds) {
    const pageName = getPageName(notionData, id);
    tsCodeStr.push(
      `Page${pageName}?: (page: Page${pageName}) => React.ReactNode;`
    );
  }
  tsCodeStr.push(`};\n\n`);
  tsCodeStr.push(`export type DatabaseParsers = {`);
  for (const id of databaseIds) {
    const databaseName = getDatabaseName(notionData, id);
    tsCodeStr.push(
      `Database${databaseName}?: (entries: Database${databaseName}[]) => React.ReactNode;`
    );
  }
  tsCodeStr.push(`};\n\n`);

  // Page Types
  for (const id of pageIds) {
    tsCodeStr.push(`type Page${getPageName(notionData, id)} = {`);
    const pageData = notionData.pages[id];
    if (!isFullPage(pageData)) return;
    for (const property of Object.keys(pageData.properties)) {
      const propertyType = pageData.properties[property].type;
      const typeStr =
        PageObjectReponseProperties[
          propertyType as keyof typeof PageObjectReponseProperties
        ];
      tsCodeStr.push(`"${property}": ${typeStr};`);
    }
    tsCodeStr.push("};\n\n");
  }

  // Database Types
  for (const id of databaseIds) {
    tsCodeStr.push(`type Database${getDatabaseName(notionData, id)} = {`);
    const databaseData = notionData.databases[id].query.results[0];
    if (!isFullPageOrDatabase(databaseData)) return;
    for (const property of Object.keys(databaseData.properties)) {
      const propertyType = databaseData.properties[property].type;
      const typeStr =
        PageObjectReponseProperties[
          propertyType as keyof typeof PageObjectReponseProperties
        ];
      tsCodeStr.push(`"${property}": ${typeStr};`);
    }
    tsCodeStr.push("};\n\n");
  }

  // Notion Types
  tsCodeStr.push("// Notion Types\n\n");
  tsCodeStr.push(
    readFileSync(
      "./node_modules/@notionhq/client/build/src/api-endpoints.d.ts"
    ).toString()
  );

  const formattedTsCodeStr = await format(tsCodeStr.join(""), {
    parser: "typescript",
  });

  appendFileSync(
    "./node_modules/.notion-rsc/generated-types.ts",
    formattedTsCodeStr,
    {
      encoding: "utf-8",
    }
  );
}
