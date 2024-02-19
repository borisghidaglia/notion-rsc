import { notFound } from "next/navigation";
import React from "react";

import { Client, isFullPage } from "@notionhq/client";
import {
  PageObjectResponse,
  QueryDatabaseParameters,
} from "@notionhq/client/build/src/api-endpoints";

import { defaultPostQueryFilter, defaultPostsQueryFilter } from "./filters";
import {
  defaultNotionBlockParser,
  defaultNotionBlocksParser,
  defaultPostParser,
} from "./parsers";

export function createNotionComponents<T extends object = Post>(
  auth: string,
  dbId: string,
  options?: {
    parsePost?: (client: Client, page: PageObjectResponse) => Promise<T>;
    postQueryFilter?: (id: string) => QueryDatabaseParameters["filter"];
    postsQueryFilter?: QueryDatabaseParameters["filter"];
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
  }
) {
  const parsePost = options.parsePost;
  const postQueryFilter = options?.postQueryFilter ?? defaultPostQueryFilter;
  const postsQueryFilter = options?.postsQueryFilter ?? defaultPostsQueryFilter;

  const notionClient = new Client({
    auth,
    // Forwarding local fetch to leverage caching
    // https://nextjs.org/docs/app/building-your-application/data-fetching#automatic-fetch-request-deduping
    fetch: fetch,
  });

  async function getPosts() {
    const pages = await notionClient.databases.query({
      database_id: dbId,
      filter: postsQueryFilter,
    });
    const posts: ReturnType<typeof parsePost>[] = [];
    for (const page of pages.results.filter(isFullPage)) {
      posts.push(parsePost(notionClient, page));
    }
    return Promise.all(posts);
  }

  async function getPost(id: string) {
    const page = (
      await notionClient.databases.query({
        database_id: dbId,
        filter: postQueryFilter(id),
      })
    ).results.filter(isFullPage)[0];
    if (page === undefined) notFound();
    return parsePost(notionClient, page);
  }

  async function NotionPost({
    id,
    renderPost,
  }: {
    id: string;
    renderPost: (post: T) => React.ReactNode;
  }) {
    const post = await getPost(id);
    // The reason why we are using fragments here
    // https://github.com/vercel/next.js/issues/49280
    // Problem: It returns JSX.Element instead of React.ReactNode
    return <>{renderPost(post)}</>;
  }

  async function NotionPosts({
    renderPost,
  }: {
    renderPost: (post: T) => React.ReactNode;
  }) {
    const posts = await getPosts();
    return posts.map((post) => renderPost(post));
  }

  return {
    NotionPost: ({
      id,
      renderPost,
    }: {
      id: string;
      renderPost: (post: T) => React.ReactNode;
    }) => <NotionPost id={id} renderPost={renderPost} />,
    NotionPosts: ({
      renderPost,
    }: {
      renderPost: (post: T) => React.ReactNode;
    }) => <NotionPosts renderPost={renderPost} />,
    getPost,
    getPosts,
  };
}

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
