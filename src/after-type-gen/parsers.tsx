import { Client, isFullPageOrDatabase } from "@notionhq/client";
import {
  BlockObjectResponse,
  DatabaseObjectResponse,
  PageObjectResponse,
  RichTextItemResponse,
} from "@notionhq/client/build/src/api-endpoints";
import { hash } from "crypto";
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "fs";
import { join, parse } from "path";
import { Fragment } from "react";

import { DatabaseParsers } from ".notion-rsc/generatedTypes";
import { notionData } from ".notion-rsc/notionData";
import { BlockWithChildren, NotionDatabaseSatisfiesType } from "../types";
import { getDatabaseTypeName } from "../utils";
import { createDatabaseComponent } from "./createDatabaseComponent";

export function defaultParser<T extends { blocks: BlockWithChildren[] }>({
  blocks,
}: T) {
  return (
    <div className="prose prose-invert">
      {defaultNotionBlocksParser(blocks)}
    </div>
  );
}

type FullPageOrDbWithBlocks = (PageObjectResponse | DatabaseObjectResponse) & {
  blocks: BlockWithChildren[];
};
export function defaultDatabaseParser(
  dbQueryResults: NotionDatabaseSatisfiesType["query"]["results"]
) {
  // TODO: let the user know we filtered out partial results ?
  const pageOrDbArray = dbQueryResults.filter(
    (res): res is FullPageOrDbWithBlocks => isFullPageOrDatabase(res)
  );
  return (
    <table>
      <thead>
        <tr>
          {Object.keys(pageOrDbArray[0].properties).map((k) => (
            <th key={k}>{k}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {pageOrDbArray.map((pageOrDb) => (
          <tr key={pageOrDb.id}>
            {Object.values(pageOrDb.properties).map(
              (v: (typeof pageOrDb.properties)[1]) => (
                <td key={v.id}>{JSON.stringify(v)}</td>
              )
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export const defaultNotionBlocksParser = (
  blocks: BlockWithChildren[],
  databaseParsers?: DatabaseParsers,
  verbose: boolean = false
): React.ReactNode => {
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

  for (const block of blocks) {
    if (
      (!lastTypeSeen || lastTypeSeen === block.type) &&
      isGroupedBlock(block)
    ) {
      groupBlock.push(block);
      lastTypeSeen = block.type;
      continue;
    }

    if (groupBlock.length > 0) {
      parsedBlocks.push(
        defaultNotionBlockParser(
          {
            groupType: groupBlock[0].type,
            groupedBlocks: groupBlock,
          },
          databaseParsers,
          verbose
        )
      );
      groupBlock = [];
      lastTypeSeen = undefined;
    }

    parsedBlocks.push(
      defaultNotionBlockParser(block, databaseParsers, verbose)
    );
  }

  if (groupBlock.length > 0) {
    parsedBlocks.push(
      defaultNotionBlockParser(
        {
          groupType: groupBlock[0].type,
          groupedBlocks: groupBlock,
        },
        databaseParsers,
        verbose
      )
    );
  }
  return parsedBlocks;
};

export const defaultNotionBlockParser = (
  block: Block,
  databaseParsers?: DatabaseParsers,
  verbose?: boolean
) => {
  if ("groupType" in block) {
    if (block.groupType === "numbered_list_item")
      return (
        <ol key={block.groupedBlocks.map((b) => b.id).join("-")}>
          {block.groupedBlocks.map((b) =>
            defaultNotionBlockParser(b, databaseParsers, verbose)
          )}
        </ol>
      );
    if (block.groupType === "bulleted_list_item")
      return (
        <ul key={block.groupedBlocks.map((b) => b.id).join("-")}>
          {block.groupedBlocks.map((b) =>
            defaultNotionBlockParser(b, databaseParsers, verbose)
          )}
        </ul>
      );
    return verbose ? (
      <div style={{ backgroundColor: "darkred", margin: "10px 0px 10px 0px" }}>
        {block.groupType}
      </div>
    ) : undefined;
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
      <Fragment key={block.id}>
        <p>{parseRichTextArray(block.paragraph.rich_text)}</p>
        {block.children && defaultNotionBlocksParser(block.children)}
      </Fragment>
    );
  }
  if (block.type === "numbered_list_item")
    return (
      <Fragment key={block.id}>
        <li>{parseRichTextArray(block.numbered_list_item.rich_text)}</li>
        {block.children && defaultNotionBlocksParser(block.children)}
      </Fragment>
    );
  if (block.type === "bulleted_list_item")
    return (
      <Fragment key={block.id}>
        <li>{parseRichTextArray(block.bulleted_list_item.rich_text)}</li>
        {block.children && defaultNotionBlocksParser(block.children)}
      </Fragment>
    );
  if (block.type === "quote")
    return (
      <Fragment key={block.id}>
        <blockquote>{parseRichTextArray(block.quote.rich_text)}</blockquote>
        {block.children && defaultNotionBlocksParser(block.children)}
      </Fragment>
    );
  if (block.type === "code") {
    return <CodeComponent block={block} key={block.id} />;
  }
  if (block.type === "table") {
    return (
      <table key={block.id}>
        <tbody>
          {block.children && defaultNotionBlocksParser(block.children)}
        </tbody>
      </table>
    );
  }
  if (block.type === "table_row") {
    return (
      <tr key={block.id}>
        {block.table_row.cells.map((cell) => (
          <td key={crypto.randomUUID()}>{parseRichTextArray(cell)}</td>
        ))}
      </tr>
    );
  }
  if (block.type === "divider") return <hr key={block.id} />;
  if (block.type === "image") {
    if (block.image.type === "external")
      return <img key={block.id} src={block.image.external.url} />;
    if (block.image.type === "file") {
      return <LocalImage url={block.image.file.url} key={block.id} />;
    }
  }
  if (block.type === "child_database") {
    console.log({
      nd: notionData.databases,
      id: block.id.replace(/[\s-]/g, ""),
    });

    const db = notionData.databases[
      block.id.replace(/[\s-]/g, "") as keyof typeof notionData.databases
    ] as NotionDatabaseSatisfiesType | undefined;
    if (!db)
      throw new Error(
        `Database ${block.id} not found in notionData. Did you run "npx notion-rsc sync"`
      );
    const dbTypeName = getDatabaseTypeName(db);
    const specificDbParser = databaseParsers?.[dbTypeName];

    return specificDbParser
      ? createDatabaseComponent(dbTypeName, specificDbParser)()
      : defaultDatabaseParser(db.query.results);
  }
  return verbose ? (
    <div style={{ backgroundColor: "darkred", margin: "10px 0px 10px 0px" }}>
      {block.type}
    </div>
  ) : undefined;
};

export const parseRichTextArray = (rta: RichTextItemResponse[]) =>
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

function getFullFileName(dir: string, baseName: string) {
  if (!existsSync(dir)) return;
  const files = readdirSync(dir);
  for (const file of files) {
    if (parse(file).base === baseName) return parse(file).base;
  }
}

export const LocalImage = async ({
  url,
  notionPublicFolder = `${process.cwd()}/public/notion-files`,
}: {
  url: string;
  notionPublicFolder?: string;
}) => {
  const fileName = hash("sha256", url);

  // TODO
  // Check if remote and local file are the same.
  // Here we might miss a new file to download just because they have the same name
  // TODO
  // Find a way to fill alt attr. Maybe using Notion captions?
  const knownFileName = getFullFileName(notionPublicFolder, fileName);
  if (knownFileName !== undefined) {
    return <img key={url} src={`/notion-files/${knownFileName}`} alt="" />;
  }

  const res = await fetch(url);

  const contentType = res.headers.get("content-type");
  const type = contentType ? contentType.split("/")[1] : "jpg"; // Default to jpg if not available
  const fullFileName = `${fileName}.${type}`;

  if (!existsSync(notionPublicFolder)) {
    mkdirSync(notionPublicFolder, { recursive: true });
  }
  const localPath = join(notionPublicFolder, fullFileName);
  writeFileSync(localPath, new Uint8Array(await res.arrayBuffer()));
  return <img key={url} src={`/notion-files/${fullFileName}`} alt="" />;
};

const CodeComponent = async ({
  block,
}: {
  block: Extract<Block, { type: "code" }>;
}) => {
  const { Code } = await import("bright");
  Code.theme = "github-dark";
  return (
    // Hack: if language is not supported by Notion, you can set it by writing it in the caption
    // Note: for now we are ignoring rich text features on code blocks
    <Code lang={block.code.caption[0]?.plain_text ?? block.code.language}>
      {block.code.rich_text.map((rt) => rt.plain_text).toString()}
    </Code>
  );
};

export type Block =
  | BlockWithChildren
  | {
      groupType: "numbered_list_item" | "bulleted_list_item";
      groupedBlocks: BlockWithChildren[];
    };

export type BlocksParser = (
  client: Client,
  blockId: string,
  blockParser: (block: Block) => React.ReactNode
) => Promise<React.ReactNode[]>;

export type PostParser<T> = (
  client: Client,
  page: PageObjectResponse,
  blocksParser: BlocksParser
) => Promise<T>;
