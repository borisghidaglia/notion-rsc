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
import { defaultPostQueryFilter } from "./filters";
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
      return block.type;
    }
  );
  return { NotionPost };
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
    const entry = await getNotionEntry(
      id,
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
    const node = await renderPost(entry);
    return node;
  };
}

async function getNotionEntry<
  T extends Record<string, any> = Post,
  U extends QueryDatabaseResponse["results"][number] = PageObjectResponse
>(
  id: string,
  client: NotionClient,
  databaseId: string,
  queryFilter: (id: string) => QueryDatabaseParameters["filter"],
  queryDbResponseFilter: (response: QueryDatabaseResponse) => U,
  responseParser: (response: U) => T,
  blockParser: (
    response: ListBlockChildrenResponse["results"][number]
  ) => React.ReactNode
) {
  const queryDbResponse = await client.databases.query({
    database_id: databaseId,
    filter: queryFilter(id),
  });
  const response = queryDbResponseFilter(queryDbResponse);
  const properties = responseParser(response);
  const content: React.ReactNode[] = [];
  for await (const block of iteratePaginatedAPI(client.blocks.children.list, {
    block_id: response.id,
  })) {
    content.push(blockParser(block));
  }
  return { ...properties, content };
}

type Entry<T> = T & {
  content: React.ReactNode;
};

type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};
