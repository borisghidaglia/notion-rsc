import { DatabaseParsers } from ".notion-rsc/generatedTypes";
import { notionData } from ".notion-rsc/notionData";
import { NotionDatabaseSatisfiesType } from "../types";
import { getDatabaseTypeName } from "../utils";
import { defaultNotionBlocksParser, defaultParser } from "./parsers";

export function createDatabaseComponent<T extends keyof DatabaseParsers>(
  databaseTypeName: T,
  parser?: DatabaseParsers[T]
): () => React.ReactNode {
  const narrowDatabaseData = Object.entries(notionData.databases).find(
    ([_databaseId, _]) =>
      getDatabaseTypeName(
        notionData.databases[_databaseId as keyof typeof notionData.databases]
      ) === databaseTypeName
  )?.[1];

  if (!narrowDatabaseData)
    throw new Error(
      `Database ${databaseTypeName} does not exist on notionData. Did you run "npx notion-rsc sync" ?`
    );

  // We widen narrowDatabaseData in order to handle the more generic case possible.
  // For example, without this we wouldn't have been able to detect that
  // narrowDatabaseData might not contain "properties" at this point.
  const wideDatabaseData = narrowDatabaseData as NotionDatabaseSatisfiesType;

  const entries = wideDatabaseData.query.results.map((entry) => {
    if (
      (entry.object === "page" && !("properties" in entry)) ||
      (entry.object === "database" && !("title" in entry))
    )
      throw new Error(
        `Entry ${entry.id} is a partial ${entry.object}. It can't be parsed.`
      );

    return {
      ...entry?.properties,
      content: defaultNotionBlocksParser(entry.blocks),
      blocks: entry.blocks,
    };
  });

  const _parser =
    parser ??
    ((entries: Parameters<typeof defaultParser>[0][]) =>
      entries.map((e) => defaultParser(e)));

  // TODO: I give up 😭
  return () => _parser(entries as any);
}
