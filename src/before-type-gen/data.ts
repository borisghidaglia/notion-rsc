import {
  Client,
  isFullBlock,
  isFullPage,
  iteratePaginatedAPI,
} from "@notionhq/client";
import { execSync } from "child_process";
import { writeFileSync } from "fs";
import { join } from "path";
import { format } from "prettier";

import {
  BlockWithChildren,
  NotionData,
  NotionDatabaseSatisfiesType,
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
): Promise<NotionData> {
  let pageIdsLoop = pageIds;
  let allPagesData = {};
  let allDatabasesData = {};
  while (pageIdsLoop.length > 0) {
    const { pagesData, databaseIds: databaseIdsFoundInPages } =
      await fetchPagesData(client, pageIdsLoop);
    const { data: databasesData, pages: newPagesDiscovered } =
      await fetchDatabasesData(
        client,
        databaseIds.concat(databaseIdsFoundInPages)
      );
    pageIdsLoop = newPagesDiscovered;
    allPagesData = { ...allPagesData, ...pagesData };
    allDatabasesData = { ...allDatabasesData, ...databasesData };
  }

  const data = { pages: allPagesData, databases: allDatabasesData };
  const notionDataStr = `
    import { NotionDatabaseSatisfiesType, NotionPageSatisfiesType } from ".notion-rsc/types";

    export const notionData = {
      pages: {
        ${Object.entries(data.pages).map(([k, v]) => `"${k}": ${JSON.stringify(v)} satisfies NotionPageSatisfiesType`)}
      },
      databases: {
        ${Object.entries(data.databases).map(([k, v]) => `"${k}": ${JSON.stringify(v)} satisfies NotionDatabaseSatisfiesType`)}
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
  const pagesData: Record<string, NotionPageSatisfiesType> = {};
  const databaseIds: string[] = [];
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
    for (const block of blocks) {
      if (block.type === "child_database") {
        // We remove the "-" because ids might be used as default type names
        // and types can't contain "-"
        // Also, ids in the notion-rsc config will most likely be without "-"
        // because ids are displayed without them in Notion urls
        databaseIds.push(block.id.replace(/-/g, ""));
      }
    }
    pagesData[id] = { ...page, blocks };
  }
  return { pagesData, databaseIds };
}

async function fetchDatabasesData(client: Client, ids: string[]) {
  const data: Record<string, NotionDatabaseSatisfiesType> = {};
  const newPagesDiscovered = [];
  for (const id of ids) {
    console.log(`Fetching database ${id}...`);
    // Today QueryDatabaseResponse (which the query function returns) is
    // missing request_id. This explains the type assertion.
    // TODO: remove this when Notion types are fixed
    //
    // https://github.com/makenotion/notion-sdk-js/issues/505
    const queryDbResponse = (await client.databases.query({
      database_id: id,
    })) as NotionDatabaseSatisfiesType["query"];
    const resultsWithBlocks: NotionDatabaseSatisfiesType["query"]["results"] =
      [];
    for (const res of queryDbResponse.results) {
      console.log(res);
      if (isFullPage(res) && "title" in res.properties)
        newPagesDiscovered.push(res.id);
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
      })) as NotionDatabaseSatisfiesType["retrieve"],
    };
  }
  return { data, pages: newPagesDiscovered };
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
