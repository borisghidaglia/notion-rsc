import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { Fragment, Suspense } from "react";

import { Client, isFullBlock, iteratePaginatedAPI } from "@notionhq/client";
import {
  BlockObjectResponse,
  PageObjectResponse,
  RichTextItemResponse,
} from "@notionhq/client/build/src/api-endpoints";
import { Code } from "bright";
import { Post } from ".";

Code.theme = "github-dark";

const LocalImage = async ({
  url,
  notionPublicFolder = `${process.cwd()}/public/notion-files`,
}: {
  url: string;
  notionPublicFolder?: string;
}) => {
  const _url = new URL(url);
  const pathName = _url.pathname;
  const fileName = pathName.split("/")[pathName.split("/").length - 1];
  const localPath = join(notionPublicFolder, fileName);
  // TODO
  // Check if remote and local file are the same.
  // Here we might miss a new file to download just because they have the same name
  if (existsSync(localPath))
    return <img key={url} src={join("/notion-files", fileName)} alt="" />;
  const res = await fetch(url);
  if (!existsSync(notionPublicFolder)) {
    mkdirSync(notionPublicFolder, { recursive: true });
  }
  writeFileSync(localPath, new Uint8Array(await res.arrayBuffer()));
  return <img key={url} src={join("/notion-files", fileName)} alt="" />;
};

export const defaultPostParser = async (
  client: Client,
  page: PageObjectResponse
): Promise<Post> => ({
  content: await defaultNotionBlocksParser(client, page.id),
  slug: (page.properties.slug as any).title[0].plain_text,
  title: (page.properties.title as any).rich_text[0].plain_text,
  published: (page.properties.published as any).checkbox,
  createdAt: page.created_time.split("T")[0],
});

export const defaultNotionBlocksParser = async (
  client: Client,
  blockId: string,
  parser: (block: Block) => React.ReactNode = defaultNotionBlockParser
) => {
  const parsedBlocks: React.ReactNode[] = [];
  const typesToGroup = ["numbered_list_item", "bulleted_list_item"] as const;
  type GroupedBlock = Extract<
    BlockWithChildren,
    { type: (typeof typesToGroup)[number] }
  >;
  const isGroupedBlock = (block: BlockWithChildren): block is GroupedBlock =>
    typesToGroup.includes(block.type as GroupedBlock["type"]);

  let groupBlock: GroupedBlock[] = [];
  let lastTypeSeen: BlockObjectResponse["type"] | undefined = undefined;

  for await (const block of iteratePaginatedAPI(client.blocks.children.list, {
    block_id: blockId,
  })) {
    if (!isFullBlock(block)) continue;

    const blockWithChildren = {
      ...block,
      children: block.has_children
        ? await defaultNotionBlocksParser(client, block.id)
        : undefined,
    };

    if (
      (!lastTypeSeen || lastTypeSeen === blockWithChildren.type) &&
      isGroupedBlock(blockWithChildren)
    ) {
      groupBlock.push(blockWithChildren);
      lastTypeSeen = blockWithChildren.type;
      continue;
    }

    if (groupBlock.length > 0) {
      parsedBlocks.push(
        parser({
          groupType: groupBlock[0].type,
          groupedBlocks: groupBlock,
        })
      );
      groupBlock = [];
      lastTypeSeen = undefined;
    }

    parsedBlocks.push(parser(blockWithChildren));
  }

  if (groupBlock.length > 0) {
    parsedBlocks.push(
      parser({
        groupType: groupBlock[0].type,
        groupedBlocks: groupBlock,
      })
    );
  }
  return parsedBlocks;
};

export const defaultNotionBlockParser = (block: Block) => {
  if ("groupType" in block) {
    if (block.groupType === "numbered_list_item")
      return (
        <ol>{block.groupedBlocks.map((b) => defaultNotionBlockParser(b))}</ol>
      );
    if (block.groupType === "bulleted_list_item")
      return (
        <ul>{block.groupedBlocks.map((b) => defaultNotionBlockParser(b))}</ul>
      );
    return <div style={{ backgroundColor: "red" }}>{block.groupType}</div>;
  }

  if (block.type === "heading_1")
    return (
      <h1 key={block.id}>{parseRichTextArray(block.heading_1.rich_text)}</h1>
    );
  if (block.type === "heading_2")
    return (
      <h2 key={block.id}>{parseRichTextArray(block.heading_2.rich_text)}</h2>
    );
  if (block.type === "heading_3")
    return (
      <h3 key={block.id}>{parseRichTextArray(block.heading_3.rich_text)}</h3>
    );
  if (block.type === "paragraph") {
    return (
      <p key={block.id}>
        {parseRichTextArray(block.paragraph.rich_text)}
        {block.children}
      </p>
    );
  }
  if (block.type === "numbered_list_item")
    return (
      <li key={block.id}>
        {parseRichTextArray(block.numbered_list_item.rich_text)}
        {block.children}
      </li>
    );
  if (block.type === "bulleted_list_item")
    return (
      <li key={block.id}>
        {parseRichTextArray(block.bulleted_list_item.rich_text)}
        {block.children}
      </li>
    );
  if (block.type === "quote")
    return (
      <blockquote key={block.id}>
        {parseRichTextArray(block.quote.rich_text)}
        {block.children}
      </blockquote>
    );
  if (block.type === "code") {
    return (
      // Hack: if language is not supported by Notion, you can set it by writing it in the caption
      // Note: for now we are ignoring rich text features on code blocks
      <Code lang={block.code.caption[0]?.plain_text ?? block.code.language}>
        {block.code.rich_text.map((rt) => rt.plain_text).toString()}
      </Code>
    );
  }
  if (block.type === "table") {
    return (
      <table>
        <tbody>{block.children}</tbody>
      </table>
    );
  }
  if (block.type === "table_row") {
    return (
      <tr>
        {block.table_row.cells.map((cell) => (
          <td key={crypto.randomUUID()}>{parseRichTextArray(cell)}</td>
        ))}
      </tr>
    );
  }
  if (block.type === "divider") return <hr key={block.id} />;
  if (block.type === "child_page") {
    return <p>{block.child_page.title}</p>;
  }
  if (block.type === "image") {
    if (block.image.type === "external")
      return <img key={block.id} src={block.image.external.url} />;
    if (block.image.type === "file") {
      return <LocalImage url={block.image.file.url} />;
    }
  }
  return (
    <div style={{ backgroundColor: "darkred", margin: "10px 0px 10px 0px" }}>
      {block.type}
    </div>
  );
};

const parseRichTextArray = (rta: RichTextItemResponse[]) =>
  rta.map((rt) => (
    <Fragment key={crypto.randomUUID()}>{parseRichText(rt)}</Fragment>
  ));

const parseRichText = (rt: RichTextItemResponse) => {
  if (rt.type !== "text") return rt.plain_text;
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
  | BlockWithChildren
  | {
      groupType: "numbered_list_item" | "bulleted_list_item";
      groupedBlocks: BlockWithChildren[];
    };

type BlockWithChildren = BlockObjectResponse & {
  children?: React.ReactNode[];
};
