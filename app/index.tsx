import React from "react";

import { Client } from "@notionhq/client";
import {
  PageObjectResponse,
  QueryDatabaseParameters,
} from "@notionhq/client/build/src/api-endpoints";

import { defaultPostQueryFilter, defaultPostsQueryFilter } from "./filters";
import { getPostFactory, getPostsFactory } from "./getters";
import {
  defaultNotionBlockParser,
  defaultNotionBlocksParser,
  defaultPostParser,
} from "./parsers";

// Can't we do something about this huge overloading?
export function createNotionComponents(
  auth: string,
  dbId: string,
  options?: {
    parsePost?: (client: Client, page: PageObjectResponse) => Promise<Post>;
    postQueryFilter?: (id: string) => QueryDatabaseParameters["filter"];
    postsQueryFilter?: QueryDatabaseParameters["filter"];
    postsQuerySorts?: QueryDatabaseParameters["sorts"];
  }
): CreateNotionComponentsReturnType<Post>;
export function createNotionComponents<T extends object>(
  auth: string,
  dbId: string,
  options?: {
    parsePost?: (client: Client, page: PageObjectResponse) => Promise<T>;
    postQueryFilter?: (id: string) => QueryDatabaseParameters["filter"];
    postsQueryFilter?: QueryDatabaseParameters["filter"];
    postsQuerySorts?: QueryDatabaseParameters["sorts"];
  }
): CreateNotionComponentsReturnType<T>;
export function createNotionComponents<T extends object = Post>(
  auth: string,
  dbId: string,
  options?: {
    parsePost?: (client: Client, page: PageObjectResponse) => Promise<T>;
    postQueryFilter?: (id: string) => QueryDatabaseParameters["filter"];
    postsQueryFilter?: QueryDatabaseParameters["filter"];
    postsQuerySorts?: QueryDatabaseParameters["sorts"];
  }
) {
  if (options?.parsePost === undefined) {
    return _createNotionComponents(auth, dbId, {
      ...options,
      parsePost: defaultPostParser,
    });
  }
  return _createNotionComponents(auth, dbId, {
    ...options,
    parsePost: options.parsePost,
  });
}
function _createNotionComponents<T extends object>(
  auth: string,
  dbId: string,
  options: {
    parsePost: (client: Client, page: PageObjectResponse) => Promise<T>;
    postQueryFilter?: (id: string) => QueryDatabaseParameters["filter"];
    postsQueryFilter?: QueryDatabaseParameters["filter"];
    postsQuerySorts?: QueryDatabaseParameters["sorts"];
  }
) {
  const parsePost = options.parsePost;
  const postQueryFilter = options.postQueryFilter ?? defaultPostQueryFilter;
  const postsQueryFilter = options.postsQueryFilter ?? defaultPostsQueryFilter;

  const notionClient = new Client({
    auth,
    // Forwarding local fetch to leverage caching
    // https://nextjs.org/docs/app/building-your-application/data-fetching#automatic-fetch-request-deduping
    fetch: fetch,
  });

  const getPost = getPostFactory(
    dbId,
    notionClient,
    postQueryFilter,
    parsePost
  );
  const getPosts = getPostsFactory(
    dbId,
    notionClient,
    postsQueryFilter,
    parsePost,
    options.postsQuerySorts
  );

  return {
    NotionPost: async ({
      id,
      renderPost,
    }: {
      id: string;
      renderPost: (post: T) => React.ReactNode;
    }) => {
      // Cannot use destructured params here to be able to do props[options.uniqueColumnName]
      // without throwing an error
      const post = await getPost(id);
      // Seems we can't return renderPost or await renderPost immediately without
      // throwing the following error:
      // Type is referenced directly or indirectly in the fulfillment callback of its own 'then' method
      const node = await renderPost(post);
      return node;
    },
    NotionPosts: async ({
      renderPost,
    }: {
      renderPost: (post: T) => React.ReactNode;
    }) => {
      const posts = await getPosts();
      return posts.map((post) => renderPost(post));
    },
    getPost,
    getPosts,
  };
}

type CreateNotionComponentsReturnType<T> = {
  NotionPost: ({
    id,
    renderPost,
  }: {
    id: string;
    renderPost: (post: T) => React.ReactNode;
  }) => Promise<React.ReactNode>;
  NotionPosts: ({
    renderPost,
  }: {
    renderPost: (post: T) => React.ReactNode;
  }) => Promise<React.ReactNode[]>;
  getPost: (id: string) => Promise<T>;
  getPosts: () => Promise<Awaited<T>[]>;
};

export type Post = {
  content: React.ReactNode[];
  published: boolean;
  slug: string;
  title: string;
  createdAt: string;
};

export {
  defaultNotionBlockParser as parseNotionBlock,
  defaultNotionBlocksParser as parseNotionBlocks,
  defaultPostParser as parseNotionPost,
};
