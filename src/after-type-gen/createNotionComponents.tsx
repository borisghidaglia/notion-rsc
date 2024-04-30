import { DatabaseParsers, PageParsers } from ".notion-rsc/generatedTypes";
import { notionData } from ".notion-rsc/notionData";
import { defaultNotionBlocksParser, defaultParser } from "../parsers";
import { BlockWithChildren } from "../types";
import { getDatabaseName, getPageName } from "../utils";

export function createNotionComponents(parsers?: {
  pages?: PageParsers;
  databases?: DatabaseParsers;
}) {
  const pageComponents: [keyof PageParsers, () => React.ReactNode][] = [];
  Object.entries(notionData.pages).map(([pageId, pageData]) => {
    if (!("properties" in pageData)) return null;
    const parser =
      parsers?.pages?.[
        `Page${getPageName(notionData, pageId)}` as keyof PageParsers
      ] || defaultParser;
    pageComponents.push([
      `Page${getPageName(notionData, pageId)}` as keyof PageParsers,
      () =>
        parser({
          ...pageData.properties,
          content: defaultNotionBlocksParser(
            pageData.blocks as unknown as BlockWithChildren[]
          ),
          blocks: pageData.blocks,
        } as Parameters<typeof parser>[0]),
    ]);
  });

  const databaseComponents: [keyof DatabaseParsers, () => React.ReactNode][] =
    [];
  Object.entries(notionData.databases).map(([k, v]) => {
    const parser =
      parsers?.databases?.[
        `Database${getDatabaseName(notionData as unknown as Parameters<typeof getDatabaseName>[0], k)}` as keyof DatabaseParsers
      ] || defaultParser;
    databaseComponents.push([
      `Database${getDatabaseName(notionData as unknown as Parameters<typeof getDatabaseName>[0], k)}` as keyof DatabaseParsers,
      () => {
        const params = v.query.results.map((res) => {
          if (!("properties" in res)) return null;
          return {
            ...res.properties,
            content: defaultNotionBlocksParser(
              res.blocks as unknown as BlockWithChildren[]
            ),
            blocks: res.blocks,
          };
        });
        return parser(params as Parameters<typeof parser>[0]);
      },
    ]);
  });

  return {
    pages: Object.fromEntries(pageComponents) as Record<
      keyof PageParsers,
      () => React.ReactNode
    >,
    databases: Object.fromEntries(databaseComponents) as Record<
      keyof DatabaseParsers,
      () => React.ReactNode
    >,
  };
}
