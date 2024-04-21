import { DatabaseParsers, PageParsers } from ".notion-rsc/generated-types";
import { notionData } from ".notion-rsc/notion-data";
import { defaultParser } from "../parsers";
import { getDatabaseName, getPageName } from "../utils";

export function createNotionComponents(parsers?: {
  pages?: PageParsers;
  databases?: DatabaseParsers;
}) {
  const pageComponents: [keyof PageParsers, () => React.ReactNode][] = [];
  Object.entries(notionData.pages).map(([k, v]) => {
    if (!("properties" in v)) return null;
    const parser =
      parsers?.pages?.[
        `Page${getPageName(notionData, k)}` as keyof PageParsers
      ] || defaultParser;
    pageComponents.push([
      `Page${getPageName(notionData, k)}` as keyof PageParsers,
      () => parser(v.properties as Parameters<typeof parser>[0]),
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
        const properties = v.query.results.map((res) => {
          if (!("properties" in res)) return null;
          return res.properties;
        });
        return parser(properties as Parameters<typeof parser>[0]);
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
