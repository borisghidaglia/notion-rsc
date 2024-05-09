import { DatabaseParsers, PageParsers } from ".notion-rsc/generatedTypes";
import { NotionDatabaseSatisfiesType, NotionPageSatisfiesType } from "./types";

// TODO: can we get rid of this assertion?
export const getPageTypeName = (
  page: NotionPageSatisfiesType
): keyof PageParsers => `Page${getPageName(page)}` as keyof PageParsers;

const getPageName = (page: NotionPageSatisfiesType) => {
  return "properties" in page &&
    page.properties.title.type === "title" &&
    page.properties.title.title[0].plain_text
    ? page.properties.title.title[0].plain_text.replace(/[\s-]/g, "")
    : page.id.replace(/-/g, "");
};

// TODO: can we get rid of this assertion?
export const getDatabaseTypeName = (
  database: NotionDatabaseSatisfiesType
): keyof DatabaseParsers =>
  `Database${getDatabaseName(database)}` as keyof DatabaseParsers;

const getDatabaseName = (database: NotionDatabaseSatisfiesType) => {
  return "title" in database.retrieve
    ? database.retrieve.title[0].plain_text.replace(/[\s-]/g, "")
    : database.retrieve.id.replace(/-/g, "");
};
