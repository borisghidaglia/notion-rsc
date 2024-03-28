import React from "react";

import { Client, isFullPage } from "@notionhq/client";
import { QueryDatabaseParameters } from "@notionhq/client/build/src/api-endpoints";
import { notFound } from "next/navigation";

import { defaultPostQueryFilter, defaultPostsQueryFilter } from "./filters";
import {
  Block,
  BlocksParser,
  PostParser,
  defaultNotionBlockParser,
  defaultNotionBlocksParser,
  defaultPostParser,
} from "./parsers";

// Can't we do something about this huge overloading?
export function createNotionComponents(
  auth: string,
  dbId: string,
  options?: {
    parsePost?: PostParser<Post>;
    parseBlocks?: BlocksParser;
    parseBlock?: (block: Block) => React.ReactNode;
    postQueryFilter?: (id: string) => QueryDatabaseParameters["filter"];
    postsQueryFilter?: QueryDatabaseParameters["filter"];
    postsQuerySorts?: QueryDatabaseParameters["sorts"];
  }
): CreateNotionComponentsReturnType<Post>;
export function createNotionComponents<T extends object>(
  auth: string,
  dbId: string,
  options?: {
    parsePost?: PostParser<T>;
    parseBlocks?: BlocksParser;
    parseBlock?: (block: Block) => React.ReactNode;
    postQueryFilter?: (id: string) => QueryDatabaseParameters["filter"];
    postsQueryFilter?: QueryDatabaseParameters["filter"];
    postsQuerySorts?: QueryDatabaseParameters["sorts"];
  }
): CreateNotionComponentsReturnType<T>;
export function createNotionComponents<T extends object = Post>(
  auth: string,
  dbId: string,
  options?: {
    parsePost?: PostParser<T>;
    parseBlocks?: BlocksParser;
    parseBlock?: (block: Block) => React.ReactNode;
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
    parsePost: PostParser<T>;
    parseBlocks?: BlocksParser;
    parseBlock?: (block: Block) => React.ReactNode;
    postQueryFilter?: (id: string) => QueryDatabaseParameters["filter"];
    postsQueryFilter?: QueryDatabaseParameters["filter"];
    postsQuerySorts?: QueryDatabaseParameters["sorts"];
  }
) {
  const parseBlock = options.parseBlock ?? defaultNotionBlockParser;
  const f: BlocksParser = (client, block_id) =>
    defaultNotionBlocksParser(client, block_id, parseBlock);
  const parseBlocks = options.parseBlocks ?? f;
  const parsePost = options.parsePost;
  const postQueryFilter = options.postQueryFilter ?? defaultPostQueryFilter;
  const postsQueryFilter = options.postsQueryFilter ?? defaultPostsQueryFilter;

  const notionClient = new Client({
    auth,
    // Forwarding local fetch to leverage caching
    // https://nextjs.org/docs/app/building-your-application/data-fetching#automatic-fetch-request-deduping
    fetch: fetch,
  });

  const getPost = async (id: string) => {
    try {
      const page = (
        await notionClient.databases.query({
          database_id: dbId,
          filter: postQueryFilter(id),
        })
      ).results.filter(isFullPage)[0];
      if (page === undefined) notFound();
      return parsePost(notionClient, page, parseBlocks);
    } catch {
      return notFound();
    }
  };

  const getPosts = async () => {
    const pages = await notionClient.databases.query({
      database_id: dbId,
      filter: postsQueryFilter,
      sorts: options.postsQuerySorts,
    });
    const posts: Promise<T>[] = [];
    for (const page of pages.results.filter(isFullPage)) {
      posts.push(parsePost(notionClient, page, parseBlocks));
    }
    return Promise.all(posts);
  };

  return {
    NotionPost: async ({
      id,
      renderPost,
    }: {
      id: string;
      renderPost: (post: T) => React.ReactNode;
    }) => {
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
  Client,
  defaultNotionBlockParser as parseNotionBlock,
  defaultNotionBlocksParser as parseNotionBlocks,
  defaultPostParser as parseNotionPost,
};
