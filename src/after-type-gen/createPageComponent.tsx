import { PageParsers } from ".notion-rsc/generatedTypes";
import { notionData } from ".notion-rsc/notionData";
import { defaultNotionBlocksParser, defaultParser } from "../parsers";
import { getPageTypeName } from "../utils";

export function createPageComponent<T extends keyof PageParsers>(
  pageTypeName: T,
  parser: PageParsers[T]
): () => React.ReactNode {
  const pageData = Object.entries(notionData.pages).find(
    ([_pageId, _]) =>
      getPageTypeName(
        notionData.pages[_pageId as keyof typeof notionData.pages]
      ) === pageTypeName
  )?.[1];

  if (!pageData)
    throw new Error(
      `Page ${pageTypeName} does not exist on notionData. Did you run "npx notion-rsc sync" ?`
    );

  const _parser = parser ?? defaultParser;
  return () =>
    _parser({
      ...pageData.properties,
      content: defaultNotionBlocksParser(pageData.blocks),
      blocks: pageData.blocks,
    });
}
