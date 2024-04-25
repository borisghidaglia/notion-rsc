import { Client, isFullBlock, iteratePaginatedAPI } from "@notionhq/client";
import {
  BlockObjectResponse,
  GetDatabaseResponse,
  GetPageResponse,
  QueryDatabaseResponse,
} from "@notionhq/client/build/src/api-endpoints";
import { execSync } from "child_process";
import { writeFileSync } from "fs";
import { join } from "path";
import { format } from "prettier";
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
  const formattedDataStr = await format(
    `export const notionData = ${JSON.stringify(data)} as const;`,
    { parser: "typescript" }
  );

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
  const data: Record<
    string,
    GetPageResponse & { blocks: BlockObjectResponseWithChildren[] }
  > = {};
  for (const id of ids) {
    console.log(`Fetching page ${id}...`);
    const page = await client.pages.retrieve({ page_id: id });
    const blocks = await getBlocksRecursively(client, id);
    data[id] = {
      ...page,
      blocks,
    };
  }
  return data;
}

async function fetchDatabasesData(client: Client, ids: string[]) {
  const data: Record<
    string,
    {
      query: QueryDatabaseResponse & {
        results: (QueryDatabaseResponse["results"][number] & {
          blocks?: BlockObjectResponseWithChildren[];
        })[];
      };
      retrieve: GetDatabaseResponse;
    }
  > = {};
  for (const id of ids) {
    console.log(`Fetching database ${id}...`);
    const queryDbResponse = await client.databases.query({ database_id: id });
    const resultsWithBlocks: (QueryDatabaseResponse["results"][number] & {
      blocks?: BlockObjectResponseWithChildren[];
    })[] = [];
    for (const res of queryDbResponse.results) {
      const blocks = await getBlocksRecursively(client, res.id);
      resultsWithBlocks.push({ ...res, blocks });
    }
    data[id] = {
      query: { ...queryDbResponse, results: resultsWithBlocks },
      retrieve: await client.databases.retrieve({ database_id: id }),
    };
  }
  return data;
}

async function getBlocksRecursively(client: Client, blockId: string) {
  const blocks: BlockObjectResponseWithChildren[] = [];
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

type BlockObjectResponseWithChildren = BlockObjectResponse & {
  children?: BlockObjectResponse[];
};
