import { PageParsers } from ".notion-rsc/generatedTypes";
import { notionData } from ".notion-rsc/notionData";
import { defaultNotionBlocksParser, defaultParser } from "../parsers";
import { NotionPageSatisfiesType } from "../types";
import { getPageTypeName } from "../utils";

export function createPageComponent<T extends keyof PageParsers>(
  pageTypeName: T,
  parser?: PageParsers[T]
): () => React.ReactNode {
  const narrowPageData = Object.entries(notionData.pages).find(
    ([_pageId, _]) =>
      getPageTypeName(
        notionData.pages[_pageId as keyof typeof notionData.pages]
      ) === pageTypeName
  )?.[1];

  if (!narrowPageData)
    throw new Error(
      `Page ${pageTypeName} does not exist on notionData. Did you run "npx notion-rsc sync" ?`
    );

  // We widen pageData in order to handle the more generic case possible.
  // For example, without this we wouldn't have been able to detect that
  // pageData might not contain "properties" at this point.
  const widePageData = narrowPageData as NotionPageSatisfiesType;

  if (!("properties" in widePageData))
    throw new Error(
      `Page ${widePageData.id} is a partial page. It can't be parsed.`
    );

  const _parser = parser ?? defaultParser;
  // TODO: is it possible to get rid of the assertion?
  return () =>
    _parser({
      ...(widePageData.properties as typeof narrowPageData.properties),
      content: defaultNotionBlocksParser(widePageData.blocks),
      blocks: widePageData.blocks,
    });
}
