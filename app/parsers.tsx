import { iteratePaginatedAPI, isFullBlock, Client } from "@notionhq/client";
import {
  BlockObjectResponse,
  PageObjectResponse,
} from "@notionhq/client/build/src/api-endpoints";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { Post, isType } from ".";

export const defaultPostParser = async (
  client: Client,
  page: PageObjectResponse
): Promise<Post> => ({
  content: await defaultNotionPageParser(client, page),
  slug: (page.properties.slug as any).title[0].plain_text,
  title: (page.properties.title as any).rich_text[0].plain_text,
  published: (page.properties.published as any).checkbox,
  createdAt: page.created_time.split("T")[0],
});

export const defaultNotionPageParser = async (
  client: Client,
  page: PageObjectResponse
) => {
  const pageContent: React.ReactNode[] = [];
  for await (const block of iteratePaginatedAPI(client.blocks.children.list, {
    block_id: page.id,
  })) {
    if (!isFullBlock(block)) continue;
    const reactNode = await defaultNotionBlockParser(block);
    if (!reactNode) continue;
    pageContent.push(reactNode);
  }
  return pageContent;
};

export const defaultNotionBlockParser = async (
  block: BlockObjectResponse,
  notionPublicFolder: string = `${process.cwd()}/public/notion-files`
) => {
  if (isType(block, "heading_1"))
    return <h1 key={block.id}>{block.heading_1.rich_text[0].plain_text}</h1>;
  if (isType(block, "paragraph"))
    return <p key={block.id}>{block.paragraph.rich_text[0].plain_text}</p>;
  if (isType(block, "image")) {
    if (isType(block.image, "file")) {
      const url = new URL(block.image.file.url);
      const pathName = url.pathname;
      const fileName = pathName.split("/")[pathName.split("/").length - 1];
      const localPath = join(notionPublicFolder, fileName);
      // TODO
      // Check if remote and local file are the same.
      // Here we might miss a new file to download just because they have the same name
      if (existsSync(localPath))
        return (
          <img key={block.id} src={join("/notion-files", fileName)} alt="" />
        );
      const res = await fetch(block.image.file.url);
      if (!existsSync(notionPublicFolder)) {
        mkdirSync(notionPublicFolder, { recursive: true });
      }
      writeFileSync(localPath, new Uint8Array(await res.arrayBuffer()));
      return (
        <img key={block.id} src={join("/notion-files", fileName)} alt="" />
      );
    }
  }
};
