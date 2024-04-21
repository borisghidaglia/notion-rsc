import { GetDatabaseResponse } from "@notionhq/client/build/src/api-endpoints";

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
