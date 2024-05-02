import { Client, isFullBlock, iteratePaginatedAPI } from "@notionhq/client";
import { execSync } from "child_process";
import { writeFileSync } from "fs";
import { join } from "path";
import { format } from "prettier";

import {
  BlockWithChildren,
  NotionDatabaseSatisfies,
  NotionPageSatisfiesType,
} from "../types";
import {
  dotNotionRscSourceModulePath,
  dotNotionRscUserPath,
  notionDataFileName,
} from "./cli";

export async function fetchNotionData(
  client: Client,
  pageIds: string[],
  databaseIds: string[]
) {
  const pagesData = await fetchPagesData(client, pageIds);
  const databasesData = await fetchDatabasesData(client, databaseIds);
  const data = { pages: pagesData, databases: databasesData };
  const notionDataStr = `
    import { NotionDatabaseSatisfies, NotionPageSatisfiesType } from ".notion-rsc/types";

    export const notionData = {
      pages: {
        ${Object.entries(data.pages).map(([k, v]) => `"${k}": ${JSON.stringify(v)} satisfies NotionPageSatisfiesType`)}
      },
      databases: {
        ${Object.entries(data.databases).map(([k, v]) => `"${k}": ${JSON.stringify(v)} satisfies NotionDatabaseSatisfies`)}
      }
    };`;

  const formattedDataStr = await format(notionDataStr, {
    parser: "typescript",
  });

  writeFileSync(
    join(dotNotionRscUserPath, notionDataFileName),
    formattedDataStr
  );

  execSync(`tsc ${notionDataFileName}`, {
    cwd: dotNotionRscUserPath,
  });

  if (process.env.NOTION_RSC_ENV === "dev") {
    writeFileSync(
      join(dotNotionRscSourceModulePath, notionDataFileName),
      formattedDataStr
    );
    execSync(`tsc ${notionDataFileName}`, {
      cwd: dotNotionRscSourceModulePath,
    });
  }

  return data;
}

async function fetchPagesData(client: Client, ids: string[]) {
  const data: Record<string, NotionPageSatisfiesType> = {};
  for (const id of ids) {
    console.log(`Fetching page ${id}...`);
    // Today GetPageResponse (which the retrieve function returns) is
    // missing request_id. This explains the type assertion.
    // TODO: remove this when Notion types are fixed
    //
    // https://github.com/makenotion/notion-sdk-js/issues/505
    const page = (await client.pages.retrieve({
      page_id: id,
    })) as NotionPageSatisfiesType;
    const blocks = await getBlocksRecursively(client, id);
    data[id] = { ...page, blocks };
  }
  return data;
}

async function fetchDatabasesData(client: Client, ids: string[]) {
  const data: Record<string, NotionDatabaseSatisfies> = {};
  for (const id of ids) {
    console.log(`Fetching database ${id}...`);
    // Today QueryDatabaseResponse (which the query function returns) is
    // missing request_id. This explains the type assertion.
    // TODO: remove this when Notion types are fixed
    //
    // https://github.com/makenotion/notion-sdk-js/issues/505
    const queryDbResponse = (await client.databases.query({
      database_id: id,
    })) as NotionDatabaseSatisfies["query"];
    const resultsWithBlocks: NotionDatabaseSatisfies["query"]["results"] = [];
    for (const res of queryDbResponse.results) {
      const blocks = await getBlocksRecursively(client, res.id);
      resultsWithBlocks.push({ ...res, blocks });
    }
    data[id] = {
      query: { ...queryDbResponse, results: resultsWithBlocks },
      // Today GetDatabaseResponse (which the retrieve function returns) is
      // missing request_id. This explains the type assertion.
      // TODO: remove this when Notion types are fixed
      //
      // https://github.com/makenotion/notion-sdk-js/issues/505
      retrieve: (await client.databases.retrieve({
        database_id: id,
      })) as NotionDatabaseSatisfies["retrieve"],
    };
  }
  return data;
}

async function getBlocksRecursively(client: Client, blockId: string) {
  const blocks: BlockWithChildren[] = [];
  for await (const block of iteratePaginatedAPI(client.blocks.children.list, {
    block_id: blockId,
  })) {
    if (isFullBlock(block)) {
      blocks.push({
        ...block,
        children: block.has_children
          ? await getBlocksRecursively(client, block.id)
          : undefined,
      });
    }
  }
  return blocks;
}
