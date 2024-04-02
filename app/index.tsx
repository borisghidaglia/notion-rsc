import {
  Client as NotionClient,
  collectPaginatedAPI,
  isFullPage,
} from "@notionhq/client";
import {
  BlockObjectResponse,
  PageObjectResponse,
  PartialBlockObjectResponse,
  QueryDatabaseParameters,
  QueryDatabaseResponse,
} from "@notionhq/client/build/src/api-endpoints";
import { defaultPostQueryFilter, defaultPostsQueryFilter } from "./filters";
import { Post } from "./index_old";
import { defaultNotionBlocksParser, defaultPostParser } from "./parsers";

export function init(auth: string, databaseId: string) {
  const notionClient = new NotionClient({
    auth,
    // Forwarding local fetch to leverage caching
    // https://nextjs.org/docs/app/building-your-application/data-fetching#automatic-fetch-request-deduping
    fetch: fetch,
  });

  const NotionPost = createNotionPost(
    notionClient,
    databaseId,
    defaultPostQueryFilter,
    (response) => response.results.filter(isFullPage)[0],
    defaultPostParser,
    defaultNotionBlocksParser
  );

  const NotionPosts = createNotionPosts(
    notionClient,
    databaseId,
    defaultPostsQueryFilter,
    (response) => response.results.filter(isFullPage),
    defaultPostParser,
    defaultNotionBlocksParser
  );

  return { NotionPost, NotionPosts };
}

function createNotionPosts<
  T extends Record<string, any>,
  U extends QueryDatabaseResponse["results"][number] = PageObjectResponse
>(
  client: NotionClient,
  databaseId: string,
  queryFilter: QueryDatabaseParameters["filter"],
  queryDbResponseFilter: (response: QueryDatabaseResponse) => U[],
  responseParser: (response: U) => T,
  blockParser: (
    client: NotionClient,
    blocks: (BlockObjectResponse | PartialBlockObjectResponse)[]
  ) => Promise<React.ReactNode[]>
) {
  return async ({
    renderPost,
  }: {
    renderPost: (post: Prettify<Entry<T>>) => React.ReactNode;
  }) => {
    const entries = await getNotionEntries(
      client,
      databaseId,
      queryFilter,
      queryDbResponseFilter,
      responseParser,
      blockParser
    );
    // Seems we can't return renderPost or await renderPost immediately without
    // throwing the following error:
    // Type is referenced directly or indirectly in the fulfillment callback of its own 'then' method
    return entries.map((entry) => renderPost(entry));
  };
}

function createNotionPost<
  T extends Record<string, any> = Post,
  U extends QueryDatabaseResponse["results"][number] = PageObjectResponse
>(
  client: NotionClient,
  databaseId: string,
  queryFilter: (id: string) => QueryDatabaseParameters["filter"],
  queryDbResponseFilter: (response: QueryDatabaseResponse) => U,
  responseParser: (response: U) => T,
  blockParser: (
    client: NotionClient,
    blocks: (BlockObjectResponse | PartialBlockObjectResponse)[]
  ) => Promise<React.ReactNode[]>
) {
  return async ({
    id,
    renderPost,
  }: {
    id: string;
    renderPost: (post: Prettify<Entry<T>>) => React.ReactNode;
  }) => {
    const entry = await getNotionEntry(
      client,
      databaseId,
      queryFilter,
      queryDbResponseFilter,
      responseParser,
      blockParser,
      id
    );
    if (!entry) return null;
    // Seems we can't return renderPost or await renderPost immediately without
    // throwing the following error:
    // Type is referenced directly or indirectly in the fulfillment callback of its own 'then' method
    const node = await renderPost(entry);
    return node;
  };
}

async function getNotionEntries<
  V,
  T extends Record<string, any> = Post,
  U extends QueryDatabaseResponse["results"][number] = PageObjectResponse
>(
  client: NotionClient,
  databaseId: string,
  queryFilter:
    | QueryDatabaseParameters["filter"]
    | ((...args: any[]) => QueryDatabaseParameters["filter"]),
  queryDbResponseFilter: (response: QueryDatabaseResponse) => U[],
  responseParser: (response: U) => T,
  blockParser: (
    client: NotionClient,
    blocks: (BlockObjectResponse | PartialBlockObjectResponse)[]
  ) => Promise<React.ReactNode[]>,
  args?: V
) {
  const queryDbResponse = await client.databases.query({
    database_id: databaseId,
    filter: typeof queryFilter === "function" ? queryFilter(args) : queryFilter,
  });

  const response = queryDbResponseFilter(queryDbResponse);
  const entries: Entry<T>[] = [];
  for (const res of response) {
    console.log({ res });

    const properties = responseParser(res);
    const blocks = await collectPaginatedAPI(client.blocks.children.list, {
      block_id: res.id,
    });
    const content = await blockParser(client, blocks);
    entries.push({ ...properties, content });
  }

  return entries;
}

async function getNotionEntry<
  V,
  T extends Record<string, any> = Post,
  U extends QueryDatabaseResponse["results"][number] = PageObjectResponse
>(
  client: NotionClient,
  databaseId: string,
  queryFilter:
    | QueryDatabaseParameters["filter"]
    | ((...args: any[]) => QueryDatabaseParameters["filter"]),
  queryDbResponseFilter: (response: QueryDatabaseResponse) => U,
  responseParser: (response: U) => T,
  blockParser: (
    client: NotionClient,
    blocks: (BlockObjectResponse | PartialBlockObjectResponse)[]
  ) => Promise<React.ReactNode[]>,
  args?: V
) {
  const entries = await getNotionEntries(
    client,
    databaseId,
    queryFilter,
    (response) => [queryDbResponseFilter(response)],
    responseParser,
    blockParser,
    args
  );
  if (entries.length > 0) return entries[0];
  throw "wtf";
}

type Entry<T> = T & {
  content: React.ReactNode[];
};

type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};
