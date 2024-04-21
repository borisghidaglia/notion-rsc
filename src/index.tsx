import { DatabaseParsers, PageParsers } from ".notion-rsc/generated-types";
import { notionData } from ".notion-rsc/notion-data";
import { GetDatabaseResponse } from "@notionhq/client/build/src/api-endpoints";
import { defaultParser } from "./parsers";

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

export const getPageName = <T extends { pages: Record<string, any> }>(
  data: T,
  pageId: keyof typeof data.pages
) => {
  const page = data.pages[pageId];
  return "properties" in page &&
    page.properties.title.type === "title" &&
    page.properties.title.title[0].plain_text
    ? page.properties.title.title[0].plain_text.replaceAll(" ", "")
    : pageId;
};

export const getDatabaseName = <
  T extends {
    databases: Record<
      string,
      { retrieve: GetDatabaseResponse } & Record<string, any>
    >;
  },
>(
  data: T,
  databaseId: keyof typeof data.databases
) => {
  const database = data.databases[databaseId];
  return "title" in database.retrieve
    ? database.retrieve.title[0].plain_text.replace(/\s/g, "")
    : databaseId;
};
