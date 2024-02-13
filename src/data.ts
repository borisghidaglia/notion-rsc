import { existsSync, readFileSync, writeFileSync } from "fs";
import { Client } from "@notionhq/client";
import { join } from "path";
import {
  GetPageResponse,
  QueryDatabaseResponse,
} from "@notionhq/client/build/src/api-endpoints";
import { cwd } from "process";

export const NOTION_DATA_PATH = join(
  cwd(),
  "/node_modules/.notion-rsc/notion-data.json"
);

export function getNotionData() {
  if (!existsSync(NOTION_DATA_PATH))
    throw new Error(
      "Notion data not found. Please run the 'npx notion-rsc sync' command."
    );

  const data: {
    pages: Record<string, GetPageResponse>;
    databases: Record<string, QueryDatabaseResponse>;
  } = JSON.parse(readFileSync(NOTION_DATA_PATH).toString());
  return data;
}

export async function fetchNotionData(
  client: Client,
  pageIds: string[],
  databaseIds: string[]
) {
  const pagesData = await fetchPagesData(client, pageIds);
  const databasesData = await fetchDatabasesData(client, databaseIds);
  const data = { pages: pagesData, databases: databasesData };
  writeFileSync(NOTION_DATA_PATH, JSON.stringify(data));
  return data;
}

async function fetchPagesData(client: Client, ids: string[]) {
  const data: Record<string, GetPageResponse> = {};
  for (const id of ids) {
    data[id] = await client.pages.retrieve({ page_id: id });
  }
  return data;
}

async function fetchDatabasesData(client: Client, ids: string[]) {
  const data: Record<string, QueryDatabaseResponse> = {};
  for (const id of ids) {
    data[id] = await client.databases.query({ database_id: id });
  }
  return data;
}

export type NotionData = Awaited<ReturnType<typeof getNotionData>>;
