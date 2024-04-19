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
      (defaultPageParsers[("Page" + k) as keyof PageParsers] = (page: any) => (
        <pre>{JSON.stringify(page, null, 2)}</pre>
      ))
  );
  const defaultDatabaseParsers = {} as DatabaseParsers;
  Object.keys(notionData.databases).map(
    (k) =>
      (defaultDatabaseParsers[("Database" + k) as keyof DatabaseParsers] = (
        entries: any
      ) => <pre>{JSON.stringify(entries, null, 2)}</pre>)
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
    // if parser is not defined, we use JSON.stringify instead
    const parser =
      pageParsers[("Page" + k) as keyof PageParsers] || JSON.stringify;
    pageComponents.push([
      `Page${k}`,
      () => parser(v.properties as Parameters<typeof parser>[0]),
    ]);
  });

  const databaseComponents: [
    keyof typeof notionData.databases,
    () => React.ReactNode,
  ][] = [];
  // if parser is not defined, we use JSON.stringify instead
  Object.entries(notionData.databases).map(([k, v]) => {
    const parser =
      databaseParsers[("Database" + k) as keyof DatabaseParsers] ||
      JSON.stringify;
    databaseComponents.push([
      `Database${k}`,
      () => {
        const properties = v.results.map((res) => {
          if (!("properties" in res)) return;
          return res.properties;
        });
        return parser(properties as Parameters<typeof parser>[0]);
      },
    ]);
  });

  return {
    pages: Object.fromEntries(pageComponents),
    databases: Object.fromEntries(databaseComponents),
  };
}
