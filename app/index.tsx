import { Client as NotionClient, isFullPage } from "@notionhq/client";
import {
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
    async (response) => await defaultPostParser(notionClient, response)
  );
  return { NotionPost };
}

function createNotionPost<
  T = Post,
  U extends QueryDatabaseResponse["results"][number] = PageObjectResponse
>(
  client: NotionClient,
  databaseId: string,
  queryFilter: (id: string) => QueryDatabaseParameters["filter"],
  queryDbResponseFilter: (response: QueryDatabaseResponse) => U,
  responseParser: (response: U) => T
) {
  return async ({
    id,
    renderPost,
  }: {
    id: string;
    renderPost: (post: T) => React.ReactNode;
  }) => {
    const queryDbResponse = await client.databases.query({
      database_id: databaseId,
      filter: queryFilter(id),
    });
    const response = await queryDbResponseFilter(queryDbResponse);
    const post = await responseParser(response);
    // Seems we can't return renderPost or await renderPost immediately without
    // throwing the following error:
    // Type is referenced directly or indirectly in the fulfillment callback of its own 'then' method
    const node = await renderPost(post);
    return node;
  };
}
