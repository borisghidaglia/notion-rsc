export const defaultPostQueryFilter = (id: string) => ({
  and: [
    { property: "published", checkbox: { equals: true } },
    { property: "slug", title: { equals: id } },
  ],
});

export const defaultPostsQueryFilter = {
  property: "published",
  checkbox: { equals: true },
};