import {
  Client as NotionClient,
  isFullPage,
  isFullPageOrDatabase,
} from "@notionhq/client";
import { appendFileSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { format } from "prettier";

import { PageObjectReponseProperties } from "../notion-properties";
import { NotionRscConfig } from "../types";
import { getDatabaseTypeName, getPageTypeName } from "../utils";
import {
  dotNotionRscSourceModulePath,
  dotNotionRscUserPath,
  generatedTypesFileName,
} from "./cli";
import { fetchNotionData } from "./data";

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

  const notionData = await fetchNotionData(notionClient, pageIds, databaseIds);

  writeFileSync(join(dotNotionRscUserPath, generatedTypesFileName), "");

  if (process.env.NOTION_RSC_ENV === "dev") {
    writeFileSync(
      join(dotNotionRscSourceModulePath, generatedTypesFileName),
      ""
    );
  }

  const tsCodeStr: string[] = [];

  // Parsers
  tsCodeStr.push(`export type PageParsers = {`);
  for (const id of Object.keys(notionData.pages)) {
    const page = notionData.pages[id];
    const pageName = getPageTypeName(page);
    const databasesInPage = Object.entries(notionData.databases)
      .filter(
        ([dbId, dbData]) =>
          "parent" in dbData.retrieve &&
          dbData.retrieve.parent.type === "page_id" &&
          dbData.retrieve.parent.page_id.replace(/-/g, "") === id
      )
      ?.map(([dbId, dbData]) => dbId);
    let databasesStr = "{";
    for (const id of databasesInPage) {
      const databaseName = getDatabaseTypeName(notionData.databases[id]);
      databasesStr += `${databaseName}?: (entries: ${databaseName}[]) => React.ReactNode;`;
    }
    databasesStr += "}";
    tsCodeStr.push(
      `${pageName}?: { pageParser: (page: ${pageName}) => React.ReactNode, databaseParsers?: ${databasesStr} }`
    );
  }
  tsCodeStr.push(`};\n\n`);
  tsCodeStr.push(`export type DatabaseParsers = {`);
  for (const id of Object.keys(notionData.databases)) {
    const databaseName = getDatabaseTypeName(notionData.databases[id]);
    tsCodeStr.push(
      `${databaseName}?: (entries: ${databaseName}[]) => React.ReactNode;`
    );
  }
  tsCodeStr.push(`};\n\n`);

  // Page Types
  for (const id of Object.keys(notionData.pages)) {
    tsCodeStr.push(`type ${getPageTypeName(notionData.pages[id])} = {`);
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
    tsCodeStr.push(`content: React.ReactNode;`);
    tsCodeStr.push(
      `blocks: (BlockObjectResponse & { children?: BlockObjectResponse[] })[];`
    );
    tsCodeStr.push("};\n\n");
  }

  // Database Types
  for (const id of Object.keys(notionData.databases)) {
    tsCodeStr.push(`type ${getDatabaseTypeName(notionData.databases[id])} = {`);
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
    tsCodeStr.push(`content: React.ReactNode;`);
    tsCodeStr.push(
      `blocks: (BlockObjectResponse & { children?: BlockObjectResponse[] })[];`
    );
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
    join(dotNotionRscUserPath, generatedTypesFileName),
    formattedTsCodeStr,
    {
      encoding: "utf-8",
    }
  );

  if (process.env.NOTION_RSC_ENV === "dev") {
    appendFileSync(
      join(dotNotionRscSourceModulePath, generatedTypesFileName),
      formattedTsCodeStr,
      {
        encoding: "utf-8",
      }
    );
  }
}
