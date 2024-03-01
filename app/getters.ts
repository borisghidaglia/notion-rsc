import { Client, isFullPage } from "@notionhq/client";
import {
  PageObjectResponse,
  QueryDatabaseParameters,
} from "@notionhq/client/build/src/api-endpoints";
import { notFound } from "next/navigation";

export const getPostFactory =
  <T>(
    dbId: string,
    client: Client,
    filter: (id: string) => QueryDatabaseParameters["filter"],
    parser: (client: Client, page: PageObjectResponse) => Promise<T>
  ) =>
  async (id: string) => {
    try {
      const page = (
        await client.databases.query({
          database_id: dbId,
          filter: filter(id),
        })
      ).results.filter(isFullPage)[0];
      if (page === undefined) notFound();
      return parser(client, page);
    } catch {
      return notFound();
    }
  };

export const getPostsFactory =
  <T>(
    dbId: string,
    client: Client,
    filter: QueryDatabaseParameters["filter"],
    parser: (client: Client, page: PageObjectResponse) => Promise<T>,
    sorts?: QueryDatabaseParameters["sorts"]
  ) =>
  async () => {
    const pages = await client.databases.query({
      database_id: dbId,
      filter,
      sorts: sorts,
    });
    const posts: Promise<T>[] = [];
    for (const page of pages.results.filter(isFullPage)) {
      posts.push(parser(client, page));
    }
    return Promise.all(posts);
  };
