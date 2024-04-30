import { PageParsers } from ".notion-rsc/generatedTypes";
import { notionData } from ".notion-rsc/notionData";
import { defaultNotionBlocksParser, defaultParser } from "../parsers";

export function createPageComponent<T extends keyof PageParsers>(
  pageId: T,
  parser: PageParsers[T]
): () => React.ReactNode {
  const pageData = Object.entries(notionData.pages).find(
    ([_pageId, _]) => _pageId === pageId
  )?.[1];

  if (!pageData)
    throw new Error(
      `Page ${pageId} does not exist on notionData. Did you run "npx notion-rsc sync" ?`
    );

  const _parser = parser ?? defaultParser;
  return () =>
    _parser({
      ...pageData.properties,
      content: defaultNotionBlocksParser(pageData.blocks),
      blocks: pageData.blocks,
    });
}
