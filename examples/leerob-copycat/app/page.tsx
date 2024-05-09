import { createDatabaseComponent, createPageComponent } from "notion-rsc";
import {
  defaultNotionBlocksParser,
  defaultParser,
} from "notion-rsc/src/after-type-gen/parsers";

export default function Home() {
  const PageLeeRobinson = createPageComponent("PageLeeRobinson", (page) =>
    defaultNotionBlocksParser(page.blocks, true)
  );
  return (
    <main className="prose prose-invert m-auto py-20 prose-h3:font-normal prose-table:[word-break:break-word]">
      <PageLeeRobinson />
    </main>
  );
}
