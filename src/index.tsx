import React from "react";
import { getNotionData } from "./data";
import { DatabaseParsers, PageParsers } from ".notion-rsc/generated-types";

export function createNotionComponents(parsers?: {
  pages?: PageParsers;
  databases?: DatabaseParsers;
}) {
  const notionData = getNotionData();

  const defaultPageParsers = {} as PageParsers;
  Object.keys(notionData.pages).map(
    (k) =>
      (defaultPageParsers["Page" + k] = (page: any) => (
        <pre>{JSON.stringify(page, null, 2)}</pre>
      ))
  );
  const defaultDatabaseParsers = {} as DatabaseParsers;
  Object.keys(notionData.databases).map(
    (k) =>
      (defaultDatabaseParsers["Database" + k] = (entries: any) => (
        <pre>{JSON.stringify(entries, null, 2)}</pre>
      ))
  );
  return _createNotionComponents(defaultPageParsers, defaultDatabaseParsers);
}

function _createNotionComponents(
  pageParsers: PageParsers,
  databaseParsers: DatabaseParsers
) {
  const notionData = getNotionData();

  const pageComponents: [
    keyof typeof notionData.databases,
    () => React.ReactNode,
  ][] = [];

  Object.entries(notionData.pages).map(([k, v]) => {
    if (!("properties" in v)) return;
    const parser = pageParsers["Page" + k];
    pageComponents.push([`Page${k}`, () => parser(v.properties)]);
  });

  const databaseComponents: [
    keyof typeof notionData.databases,
    () => React.ReactNode,
  ][] = [];

  Object.entries(notionData.databases).map(([k, v]) => {
    const parser = databaseParsers["Database" + k];
    databaseComponents.push([
      `Database${k}`,
      () => {
        const properties = v.results.map((res) => {
          if (!("properties" in res)) return;
          return res.properties;
        });
        return parser(properties);
      },
    ]);
  });

  return {
    pages: Object.fromEntries(pageComponents),
    databases: Object.fromEntries(databaseComponents),
  };
}
