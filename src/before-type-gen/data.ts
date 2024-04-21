import { Client } from "@notionhq/client";
import {
  GetDatabaseResponse,
  GetPageResponse,
  QueryDatabaseResponse,
} from "@notionhq/client/build/src/api-endpoints";
import { execSync } from "child_process";
import { writeFileSync } from "fs";
import { join } from "path";
import { format } from "prettier";
import { cwd } from "process";

export const NOTION_DATA_PATH = join(
  cwd(),
  "/node_modules/.notion-rsc/notion-data.ts"
);

export async function fetchNotionData(
  client: Client,
  pageIds: string[],
  databaseIds: string[]
) {
  const pagesData = await fetchPagesData(client, pageIds);
  const databasesData = await fetchDatabasesData(client, databaseIds);
  const data = { pages: pagesData, databases: databasesData };
  const formattedDataStr = await format(
    `export const notionData = ${JSON.stringify(data)} as const;`,
    { parser: "typescript" }
  );
  writeFileSync(NOTION_DATA_PATH, formattedDataStr);
  execSync(`tsc ${NOTION_DATA_PATH}`);
  return data;
}

async function fetchPagesData(client: Client, ids: string[]) {
  const data: Record<string, GetPageResponse> = {};
  for (const id of ids) {
    console.log(`Fetching page ${id}...`);
    data[id] = await client.pages.retrieve({ page_id: id });
  }
  return data;
}

async function fetchDatabasesData(client: Client, ids: string[]) {
  const data: Record<
    string,
    { query: QueryDatabaseResponse; retrieve: GetDatabaseResponse }
  > = {};
  for (const id of ids) {
    console.log(`Fetching database ${id}...`);
    data[id] = {
      query: await client.databases.query({ database_id: id }),
      retrieve: await client.databases.retrieve({ database_id: id }),
    };
  }
  return data;
}
