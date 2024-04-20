import { DatabaseParsers, PageParsers } from ".notion-rsc/generated-types";
import { notionData } from ".notion-rsc/notion-data";
import { defaultParser } from "./parsers";

export function createNotionComponents(parsers?: {
  pages?: PageParsers;
  databases?: DatabaseParsers;
}) {
  const pageComponents: [
    `Page${keyof typeof notionData.pages}`,
    () => React.ReactNode,
  ][] = [];
  Object.entries(notionData.pages).map(([k, v]) => {
    if (!("properties" in v)) return null;
    // if parser is not defined, we use JSON.stringify instead
    const parser =
      parsers?.pages?.[("Page" + k) as keyof PageParsers] || defaultParser;
    pageComponents.push([
      `Page${k as keyof typeof notionData.pages}`,
      () => parser(v.properties as Parameters<typeof parser>[0]),
    ]);
  });

  const databaseComponents: [
    `Database${keyof typeof notionData.databases}`,
    () => React.ReactNode,
  ][] = [];
  // if parser is not defined, we use JSON.stringify instead
  Object.entries(notionData.databases).map(([k, v]) => {
    const parser =
      parsers?.databases?.[("Database" + k) as keyof DatabaseParsers] ||
      defaultParser;
    databaseComponents.push([
      `Database${k as keyof typeof notionData.databases}`,
      () => {
        const properties = v.results.map((res) => {
          if (!("properties" in res)) return null;
          return res.properties;
        });
        return parser(properties as Parameters<typeof parser>[0]);
      },
    ]);
  });

  return {
    pages: Object.fromEntries(pageComponents) as Record<
      `Page${keyof typeof notionData.pages}`,
      () => React.ReactNode
    >,
    databases: Object.fromEntries(databaseComponents) as Record<
      `Database${keyof typeof notionData.databases}`,
      () => React.ReactNode
    >,
  };
}
