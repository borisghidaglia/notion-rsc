import { DatabaseParsers, PageParsers } from ".notion-rsc/generatedTypes";
import { notionData } from ".notion-rsc/notionData";
import { NotionDatabaseSatisfiesType, NotionPageSatisfiesType } from "../types";
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
        const pageTypeName = getPageTypeName(
          pageData as TypeOrNotionPageSatisfiesType<typeof pageData>
        );
        return [
          pageTypeName,
          createPageComponent(
            pageTypeName,
            parsers?.pages?.[pageTypeName],
            parsers?.databases
          ),
        ];
      })
    ) as Record<keyof PageParsers, () => React.ReactNode>,

    databases:
      Object.keys(notionData.databases).length === 0
        ? null
        : (Object.fromEntries(
            Object.entries(notionData.databases).map(
              ([databaseId, databaseData]) => {
                const databaseTypeName = getDatabaseTypeName(
                  databaseData as NotionDatabaseSatisfiesType
                );
                return [
                  databaseTypeName,
                  createDatabaseComponent(
                    databaseTypeName,
                    parsers?.databases?.[databaseTypeName]
                  ),
                ];
              }
            )
          ) as Record<keyof DatabaseParsers, () => React.ReactNode>),
  };
}

// TODO: is it possible to get rid of this monstruosity?
type TypeOrNotionPageSatisfiesType<T> = T extends unknown
  ? NotionPageSatisfiesType
  : T;
