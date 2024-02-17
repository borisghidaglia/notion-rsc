import { Client, isFullBlock, iteratePaginatedAPI } from "@notionhq/client";
import {
  BlockObjectResponse,
  PageObjectResponse,
  RichTextItemResponse,
} from "@notionhq/client/build/src/api-endpoints";
import { Code } from "bright";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { Post, isType } from ".";
import { Fragment } from "react";

Code.theme = "github-dark";

export const defaultPostParser = async (
  client: Client,
  page: PageObjectResponse
): Promise<Post> => ({
  content: await defaultNotionPageParser(client, page.id),
  slug: (page.properties.slug as any).title[0].plain_text,
  title: (page.properties.title as any).rich_text[0].plain_text,
  published: (page.properties.published as any).checkbox,
  createdAt: page.created_time.split("T")[0],
});

const defaultGetNotionBlocksFromPage = async (
  client: Client,
  blockId: string
) => {
  const blocks: Block[] = [];
  let groupBlock: Block[] = [];

  for await (const block of iteratePaginatedAPI(client.blocks.children.list, {
    block_id: blockId,
  })) {
    if (!isFullBlock(block)) continue;

    const blockWithChildren = {
      ...block,
      children: block.has_children
        ? await defaultGetNotionBlocksFromPage(client, block.id)
        : undefined,
    };

    if (blockWithChildren.type === "numbered_list_item") {
      groupBlock.push(blockWithChildren);
      continue;
    }

    if (groupBlock.length > 0) {
      blocks.push({
        groupType: "numbered_list",
        groupedBlocks: groupBlock,
      });
      groupBlock = [];
      continue;
    }

    blocks.push(blockWithChildren);
  }
  return blocks;
};

export const defaultNotionPageParser = async (
  client: Client,
  blockId: string
) => {
  const pageContent: React.ReactNode[] = [];
  for await (const block of iteratePaginatedAPI(client.blocks.children.list, {
    block_id: blockId,
  })) {
    if (!isFullBlock(block)) continue;
    const reactNode = await defaultNotionBlockParser(block);
    if (!reactNode) continue;
    pageContent.push(reactNode);
    if (block.has_children) {
      const children = await defaultNotionPageParser(client, block.id);
      pageContent.push(
        isType(block, "bulleted_list_item") ||
          isType(block, "numbered_list_item") ? (
          <ul>{children}</ul>
        ) : (
          children
        )
      );
    }
  }
  return pageContent;
};

export const defaultNotionBlockParser = async (
  block: BlockObjectResponse,
  notionPublicFolder: string = `${process.cwd()}/public/notion-files`
) => {
  if (isType(block, "heading_1")) {
    const node = parseRichTextArray(block.heading_1.rich_text);
    return <h1 key={block.id}>{node}</h1>;
  }
  if (isType(block, "heading_2"))
    return (
      <h2 key={block.id}>{parseRichTextArray(block.heading_2.rich_text)}</h2>
    );
  if (isType(block, "heading_3"))
    return (
      <h3 key={block.id}>{parseRichTextArray(block.heading_3.rich_text)}</h3>
    );
  if (isType(block, "paragraph")) {
    return (
      <p key={block.id}>{parseRichTextArray(block.paragraph.rich_text)}</p>
    );
  }
  if (isType(block, "numbered_list_item"))
    return (
      <li key={block.id}>
        {parseRichTextArray(block.numbered_list_item.rich_text)}
      </li>
    );
  if (isType(block, "bulleted_list_item"))
    return (
      <li key={block.id}>
        {parseRichTextArray(block.bulleted_list_item.rich_text)}
      </li>
    );
  if (isType(block, "quote"))
    return (
      <blockquote key={block.id}>
        {parseRichTextArray(block.quote.rich_text)}
      </blockquote>
    );
  if (isType(block, "code")) {
    return (
      // Hack: if language is not supported by Notion, you can set it by writing it in the caption
      <Code lang={block.code.caption[0]?.plain_text ?? block.code.language}>
        {parseRichTextArray(block.code.rich_text).toString()}
      </Code>
    );
  }
  // if (isType(block, "table"))
  //   return <table>{block.table.table_width}</table>;
  if (isType(block, "divider")) return <hr key={block.id} />;
  if (isType(block, "image")) {
    if (isType(block.image, "external"))
      return <img key={block.id} src={block.image.external.url} />;
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

const parseRichTextArray = (rta: RichTextItemResponse[]) =>
  rta.map((rt) => <Fragment key={rt.href}>{parseRichText(rt)}</Fragment>);

const parseRichText = (rt: RichTextItemResponse) => {
  if (!isType(rt, "text")) return rt.plain_text;
  let node: React.ReactNode = rt.plain_text;
  // regular text annotations
  if (rt.annotations.bold) node = <b>{node}</b>;
  if (rt.annotations.italic) node = <i>{node}</i>;
  if (rt.annotations.strikethrough) node = <s>{node}</s>;
  if (rt.annotations.underline) node = <u>{node}</u>;

  // block-ish-er text annotation
  if (rt.annotations.code) node = <code>{node}</code>;

  // wrapping in a link
  if (rt.href) node = <a href={rt.href}>{node}</a>;

  // Find a way to make tailwind work here?
  return rt.annotations.color !== "default" ? (
    <span style={{ color: rt.annotations.color }}>{node}</span>
  ) : (
    node
  );
};

type Block =
  | (BlockObjectResponse & {
      children?: Block[];
    })
  | { groupType: "numbered_list"; groupedBlocks: Block[] };
