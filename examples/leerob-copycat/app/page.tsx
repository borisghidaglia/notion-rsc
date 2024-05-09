import { createPageComponent } from "notion-rsc";
import { notionData } from ".notion-rsc/notionData";
import { DatabaseParsers } from ".notion-rsc/generatedTypes";
import {
  defaultNotionBlockParser,
  defaultNotionBlocksParser,
} from "notion-rsc/src/after-type-gen/parsers";
import { getDatabaseTypeName } from "notion-rsc/src/utils";

export default function Home() {
  const PageLeeRobinson = createPageComponent("PageLeeRobinson", (page) => {
    return defaultNotionBlocksParser(
      page.blocks,
      (block, verbose) => {
        if ("groupType" in block)
          return defaultNotionBlockParser(block, verbose);
        if (block.type === "child_database") {
          const db =
            notionData.databases[
              block.id.replace(
                /[\s-]/g,
                ""
              ) as keyof typeof notionData.databases
            ];
          if (!db)
            throw new Error(
              `Database ${block.id} not found in notionData. Did you run "npx notion-rsc sync"`
            );
          const dbTypeName = getDatabaseTypeName(db);
          if (dbTypeName === "DatabaseArticleCards") {
            const renderArticleCards: DatabaseParsers[typeof dbTypeName] = (
              articleCards
            ) => {
              return (
                <div className="not-prose my-8 flex w-full flex-col space-y-4">
                  {articleCards.map((articleCard) => (
                    <a
                      href={articleCard.href.url ?? undefined}
                      className="flex w-full items-center justify-between rounded border border-neutral-200 bg-neutral-50 px-3 py-4 dark:border-neutral-700 dark:bg-neutral-800"
                    >
                      <div className="flex flex-col">
                        <p className="font-medium text-neutral-900 dark:text-neutral-100">
                          {articleCard.title.title[0].plain_text}
                        </p>
                        <p className="text-neutral-600 dark:text-neutral-400">
                          {articleCard.views.number &&
                            Intl.NumberFormat("en-US").format(
                              articleCard.views.number
                            )}{" "}
                          views
                        </p>
                      </div>
                      <div className="transform text-neutral-700 transition-transform duration-300 group-hover:-rotate-12 dark:text-neutral-300">
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 12 12"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M2.07102 11.3494L0.963068 10.2415L9.2017 1.98864H2.83807L2.85227 0.454545H11.8438V9.46023H10.2955L10.3097 3.09659L2.07102 11.3494Z"
                            fill="currentColor"
                          ></path>
                        </svg>
                      </div>
                    </a>
                  ))}
                </div>
              );
            };
            return renderArticleCards(
              db.query.results.map(
                (e) =>
                  ({
                    ...e.properties,
                    content: defaultNotionBlocksParser(e.blocks),
                    blocks: e.blocks,
                  }) as any
              )
            );
          }
          return db.query.results
            .map((e) => Object.keys(e.properties).join(" "))
            .join("\n");
        }
        return defaultNotionBlockParser(block, verbose);
      },
      true
    );
  });
  return (
    <main className="prose prose-invert m-auto py-20 prose-h3:font-normal prose-table:[word-break:break-word]">
      <PageLeeRobinson />
    </main>
  );
}
