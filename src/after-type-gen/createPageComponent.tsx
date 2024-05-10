import { PageParsers } from ".notion-rsc/generatedTypes";
import { notionData } from ".notion-rsc/notionData";
import { NotionData, PageParserParams } from "../types";
import { getPageTypeName } from "../utils";
import { defaultNotionBlocksParser, defaultParser } from "./parsers";

// We keep all the ugly assertions contained in this function.
// It also allows us to expose a properly typed function to the user
// and to handle the most generic case inside _createPageComponents
// (with the widest types) instead of overfitting on the current notionData
//
// I hope I got this correct 🤞, but I also feel something more type safe
// could be possible.
export function createPageComponent<T extends keyof PageParsers>(
  pageTypeName: T,
  parser?: PageParsers[T]
): () => React.ReactNode {
  return _createPageComponents(
    notionData as NotionData,
    pageTypeName,
    parser as unknown as (page: PageParserParams) => React.ReactNode
  );
}

function _createPageComponents(
  data: NotionData,
  pageTypeName: string,
  parser?: (page: PageParserParams) => React.ReactNode
) {
  const page = Object.entries(data.pages).find(
    ([_pageId, _]) => getPageTypeName(data.pages[_pageId]) === pageTypeName
  )?.[1];

  if (!page)
    throw new Error(
      `Page ${pageTypeName} does not exist on notionData. Did you run "npx notion-rsc sync" ?`
    );

  const _parser = parser ?? defaultParser;

  return () =>
    _parser({
      ...("properties" in page ? page.properties : {}),
      content: defaultNotionBlocksParser(page.blocks),
      blocks: page.blocks,
    } as PageParserParams);
}
