import { QueryDatabaseParameters } from "@notionhq/client/build/src/api-endpoints";

export const defaultPostQueryFilter = (
  id: string
): QueryDatabaseParameters["filter"] => ({
  and: [
    { property: "published", checkbox: { equals: true } },
    { property: "slug", title: { equals: id } },
  ],
});

export const defaultPostsQueryFilter: QueryDatabaseParameters["filter"] = {
  property: "published",
  checkbox: { equals: true },
};
