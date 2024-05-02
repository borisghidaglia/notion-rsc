import { DatabaseParsers, PageParsers } from ".notion-rsc/generatedTypes";
import { notionData } from ".notion-rsc/notionData";
import { defaultNotionBlocksParser, defaultParser } from "../parsers";
import {
  BlockWithChildren,
  NotionDatabaseSatisfies,
  NotionPageSatisfiesType,
} from "../types";
import { getDatabaseTypeName, getPageTypeName } from "../utils";

export function createNotionComponents(parsers?: {
  pages?: PageParsers;
  databases?: DatabaseParsers;
}) {
  const pageComponents: [keyof PageParsers, () => React.ReactNode][] = [];
  // Assertion used to widen notionData.pages type so we don't overfit
  // on current data
  Object.entries(
    notionData.pages as Record<
      keyof typeof notionData.pages,
      NotionPageSatisfiesType
    >
  ).map(([pageId, pageData]) => {
    if (!("properties" in pageData))
      throw new Error(`Page ${pageId} is a partial page. It can't be parsed.`);

    // Assertion used because Oject.entries above loses the key type
    const pageTypeName = getPageTypeName(
      notionData.pages[pageId as keyof typeof notionData.pages]
    );

    const parser = parsers?.pages?.[pageTypeName] || defaultParser;

    pageComponents.push([
      pageTypeName,
      // TODO: is it possible to get rid of the assertion?
      // For reference, but most probably not the only problem here:
      // https://github.com/microsoft/TypeScript/issues/39998#issuecomment-1592665259
      () =>
        parser({
          ...pageData.properties,
          content: defaultNotionBlocksParser(pageData.blocks),
          blocks: pageData.blocks,
        } as Parameters<typeof parser>[0]),
    ]);
  });

  const databaseComponents: [keyof DatabaseParsers, () => React.ReactNode][] =
    [];
  // Assertion used to widen notionData.databases type so we don't overfit
  // on current data
  Object.entries(
    notionData.databases as Record<
      keyof typeof notionData.databases,
      NotionDatabaseSatisfies
    >
  ).map(([databaseId, databaseData]) => {
    // Assertion used because Oject.entries above loses the key type
    const databaseTypeName = getDatabaseTypeName(
      notionData.databases[databaseId as keyof typeof notionData.databases]
    );

    const parser = parsers?.databases?.[databaseTypeName] || defaultParser;
    databaseComponents.push([
      databaseTypeName,
      () => {
        const params = databaseData.query.results.map((entry) => {
          if (
            (entry.object === "page" && !("properties" in entry)) ||
            (entry.object === "database" && !("title" in entry))
          )
            throw new Error(
              `Entry ${entry.id} is a partial ${entry.object}. It can't be parsed.`
            );

          entry;
          return {
            ...entry.properties,
            content: defaultNotionBlocksParser(entry.blocks),
            blocks: entry.blocks,
          };
        });
        return parser(params as Parameters<typeof parser>[0]);
      },
    ]);
  });

  // Assertions used because Object.fromEntries above loses the key type
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
