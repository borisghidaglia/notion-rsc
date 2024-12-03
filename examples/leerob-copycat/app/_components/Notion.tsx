import {
  LocalImage,
  createNotionComponents,
  parseRichTextArray,
} from "notion-rsc";
import { DatabaseParsers } from ".notion-rsc/generatedTypes";

const renderArticleCards: DatabaseParsers["DatabaseArticleCards"] = (
  articleCards
) => (
  <div className="not-prose my-8 flex w-full flex-col space-y-4">
    {articleCards.map((articleCard) => (
      <a
        key={articleCard.href.url}
        href={articleCard.href.url ?? undefined}
        className="flex w-full items-center justify-between rounded border border-neutral-200 bg-neutral-50 px-3 py-4 dark:border-neutral-700 dark:bg-neutral-800"
      >
        <div className="flex flex-col">
          <p className="font-medium text-neutral-900 dark:text-neutral-100">
            {articleCard.title.title[0].plain_text}
          </p>
          <p className="text-neutral-600 dark:text-neutral-400">
            {articleCard.views.number &&
              Intl.NumberFormat("en-US").format(articleCard.views.number)}{" "}
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

const { pages, databases } = createNotionComponents({
  pages: {
    PageLeeRobinson: {
      pageParser: (page) => page.content,
      databaseParsers: {
        DatabaseArticleCards: renderArticleCards,
        Databaseexternallinks: (externalLinks) =>
          externalLinks.map((e) => e.href.url),
        DatabaseMainImages: (mainImages) => (
          <div className="grid grid-cols-2 grid-rows-4 sm:grid-rows-3 sm:grid-cols-3 gap-4 my-8">
            {mainImages
              .sort(
                (a, b) =>
                  a.order.number?.valueOf()! - b.order.number?.valueOf()!
              )
              .map((i) => {
                return (
                  i.img.files[0].type === "external" && (
                    <div
                      key={i.img.files[0].name}
                      className={`relative [&>img]:m-0 [&>img]:absolute [&>img]:rounded-lg [&>img]:w-full [&>img]:h-full [&>img]:object-cover ${
                        i.type.select?.name === "portrait"
                          ? "row-span-2"
                          : "h-40"
                      }`}
                    >
                      <LocalImage url={i.img.files[0].external.url} />
                    </div>
                  )
                );
              })}
          </div>
        ),
        DatabaseVCCards: (vcCards) => vcCards.map((v) => v.content?.toString()),
        DatabaseYoutubeCards: (ytCards) =>
          ytCards.map((y) => parseRichTextArray(y.tag.title)),
      },
    },
  },
  databases: {}, // can be used for default database rendering, when used accross several pages
});

export { pages, databases };
