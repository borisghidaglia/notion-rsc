import { DatabaseParsers, PageParsers } from ".notion-rsc/generatedTypes";
import { notionData } from ".notion-rsc/notionData";
import { getDatabaseTypeName, getPageTypeName } from "../utils";
import { createDatabaseComponent } from "./createDatabaseComponent";
import { createPageComponent } from "./createPageComponent";

export function createNotionComponents(parsers?: {
  pages?: PageParsers;
  databases?: DatabaseParsers;
}) {
  // Assertions used because Oject.fromEntries and Object.entries below lose the key type
  return {
    pages: Object.fromEntries(
      Object.entries(notionData.pages).map(([pageId, pageData]) => {
        const pageTypeName = getPageTypeName(pageData);
        return [
          pageTypeName,
          createPageComponent(pageTypeName, parsers?.pages?.[pageTypeName]),
        ];
      })
    ) as Record<keyof PageParsers, () => React.ReactNode>,

    databases: Object.fromEntries(
      Object.entries(notionData.databases).map(([databaseId, databaseData]) => {
        const databaseTypeName = getDatabaseTypeName(databaseData);
        return [
          databaseTypeName,
          createDatabaseComponent(
            databaseTypeName,
            parsers?.databases?.[databaseTypeName]
          ),
        ];
      })
    ) as Record<keyof DatabaseParsers, () => React.ReactNode>,
  };
}
