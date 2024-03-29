import {
  Client as NotionClient,
  isFullBlock,
  isFullPage,
  iteratePaginatedAPI,
} from "@notionhq/client";
import {
  BlockObjectResponse,
  ListBlockChildrenResponse,
  PageObjectResponse,
  QueryDatabaseParameters,
  QueryDatabaseResponse,
} from "@notionhq/client/build/src/api-endpoints";
import { defaultPostQueryFilter, defaultPostsQueryFilter } from "./filters";
import { defaultPostParser } from "./parsers";
import { Post } from "./index_old";

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
    (response) => defaultPostParser(response),
    (block) => {
      if (!isFullBlock(block)) return;
      return block.type + " ";
    }
  );

  const NotionPosts = createNotionPosts(
    notionClient,
    databaseId,
    defaultPostsQueryFilter,
    (response) => response.results.filter(isFullPage),
    (response) => defaultPostParser(response),
    (block) => {
      if (!isFullBlock(block)) return;
      return block.type;
    }
  );

  return { NotionPost, NotionPosts };
}

function createNotionPosts<
  T extends Record<string, any> = Post,
  U extends QueryDatabaseResponse["results"][number] = PageObjectResponse
>(
  client: NotionClient,
  databaseId: string,
  queryFilter: QueryDatabaseParameters["filter"],
  queryDbResponseFilter: (response: QueryDatabaseResponse) => U[],
  responseParser: (response: U) => T,
  blockParser: (
    response: ListBlockChildrenResponse["results"][number]
  ) => React.ReactNode
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
    response: ListBlockChildrenResponse["results"][number]
  ) => React.ReactNode
) {
  return async ({
    id,
    renderPost,
  }: {
    id: string;
    renderPost: (post: Prettify<Entry<T>>) => React.ReactNode;
  }) => {
    const entry = await getNotionEntries(
      client,
      databaseId,
      queryFilter,
      queryDbResponseFilter,
      responseParser,
      blockParser,
      id
    );
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
  queryDbResponseFilter:
    | ((response: QueryDatabaseResponse) => U)
    | ((response: QueryDatabaseResponse) => U[]),
  responseParser: (response: U) => T,
  blockParser: (
    response: ListBlockChildrenResponse["results"][number]
  ) => React.ReactNode,
  args?: V
): Promise<
  ReturnType<typeof queryDbResponseFilter> extends any[] ? Entry<T>[] : Entry<T>
> {
  const queryDbResponse = await client.databases.query({
    database_id: databaseId,
    filter: typeof queryFilter === "function" ? queryFilter(args) : queryFilter,
  });

  const response = queryDbResponseFilter(queryDbResponse);
  const queryDbResponseFilterReturnedAnArray = Array.isArray(response);
  const responseArray = queryDbResponseFilterReturnedAnArray
    ? response
    : [response];

  const entries: Entry<T>[] = [];
  for (const res of responseArray) {
    const properties = responseParser(res);
    const content: React.ReactNode[] = [];
    for await (const block of iteratePaginatedAPI(client.blocks.children.list, {
      block_id: res.id,
    })) {
      content.push(blockParser(block));
    }
    entries.push({ ...properties, content });
  }

  if (entries.length === 0) return [];
  if (!queryDbResponseFilterReturnedAnArray) return entries[0];
  return entries;
}

type Entry<T> = T & {
  content: React.ReactNode;
};

type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

function f<U extends any[] | any>(
  g: (s: string) => U
): U extends any[] ? U[] : U {
  const x = g("foo");
  const y = Array.isArray(x) ? x : [x];

  if (y.length === 0) return [];
  if (!Array.isArray(x)) return y[0];
  return y;
}
