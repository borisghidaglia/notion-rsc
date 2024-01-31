# `notion-rsc`

Your [Next.js](https://nextjs.org/) blog with [Notion](https://www.notion.so/) as a [CMS](https://en.wikipedia.org/wiki/Content_management_system), made easy. And even better with [tailwindcss](https://tailwindcss.com/).

> [!WARNING]  
> `notion-rsc` is not affiliated with nor endorsed by **Notion Labs, Inc.**
> Also, these RSC are made as an experiment: I use them on my personal blog. If you decide to use them in production, it is at your own risk.

## Getting Started

```bash
$ npm install notion-rsc
```

```ts
const { NotionPost, NotionPosts, getPost, getPosts } = createNotionComponents(
  "Notion API key",
  "Notion blog database id"
);
```

To allow the Notion API to access you database, you must create an [Internal Integration](https://developers.notion.com/docs/getting-started#internal-integrations).

It boils down to creating a new integration at [notion.so/my-integrations](https://www.notion.so/my-integrations) and then [add a connection with it on your database page](https://www.notion.so/help/add-and-manage-connections-with-the-api#add-connections-to-pages).

The API key used by `createNotionComponents` is the _Internal Integration Secret_ you will find on the page of your integration.

## Basic usage

If you don't give any more parameters to `createNotionComponents`, it will use a default Post type, which is the following:

```ts
type Post = {
  content: React.ReactNode[];
  createdAt: string;
  published: boolean;
  slug: string;
  title: string;
};
```

Thus, your Notion database should contain the appropriate fields: slug (main column), title (text), publish (checkbox), Created Time (default Created Time type). Content corresponds to the nested notion page you will create for each given database row.

You can duplicate [this page](https://sirobg.notion.site/d11eae5d40484f56be943cec312f3657?v=551b43ce276c476ebf1dbdcc4bdb3ba0&pvs=4) as a template to start right away.

The `NotionPost` and `NotionPosts` components are used like that:

```tsx
<NotionPosts renderPost={(post) => <p>{post.title}</p>} />
```

`NotionPosts` is the component made to list your posts. It takes only one parameter: `renderPost`. You keep the full control UI control.

```tsx
<NotionPost
  id={slug}
  renderPost={(post) => <article>{post.content}</article>}
/>
```

> [!NOTE]  
> As you probably noticed, `content` is of type `React.ReactNode[]`. Check out the [What's under the hood](#whats-under-the-hood) section to see what it renders to and a great tip to make it a fully designed blog in seconds thanks to [@tailwindcss/typography](https://tailwindcss.com/docs/typography-plugin).

`NotionPost` is the component made to render individual posts. It takes two parameters: `id` and `renderPost`. By default, the `id` used is the post slug. And again, `renderPost` gives you full UI control.

Finally, `getPost` and `getPosts` are exposed in case you would need it. Let's say you wanted to [statically generate your blog routes at build time](https://nextjs.org/docs/app/api-reference/functions/generate-static-params):

```ts
export async function generateStaticParams() {
  const posts = await getPosts();

  return posts.map((post) => ({
    slug: post.slug,
  }));
}
```

## What's under the hood?

Under the hood, `notion-rsc`:

1. Fetches your posts from your notion database using [@notionhq/client](https://github.com/makenotion/notion-sdk-js)...
2. ...while applying a filter to get only the ones marked as `published` and another filter to get the post corresponding to the `id` you gave to `<NotionPost />` (taking the first one, if ids are not unique in your database)
3. Parses each post/row of your database to get you back a proper `Post` object you can then make part of your UI using the `renderPost` prop...
4. ...while parsing the `content` of your post (which is the Notion page nested inside each post/row of your database) to make it proper HTML. Example: Notion's `# This is a heading 1` becomes `<h1>This is a heading 1</h1>`

> [!TIP]  
> The very cool thing with getting your Notion page as HTML is that now you can leverage [@tailwindcss/typography](https://tailwindcss.com/docs/typography-plugin) to instantly "add beautiful typographic defaults" to your blog. Instant dark theme out of the box as well. And fully customizable.

## API Reference

### `createNotionComponents(auth, dbId, options)`

It is the entrypoint of the package. It returns `{ NotionPost, NotionPosts, getPost, getPosts }`. It is a generic function. Its signature with type params is:

```ts
function createNotionComponents<T extends object = Post>(
  auth: string,
  dbId: string,
  options?: {
    parsePost?: (client: Client, page: PageObjectResponse) => Promise<T>;
    postQueryFilter?: (id: string) => QueryDatabaseParameters["filter"];
    postsQueryFilter?: QueryDatabaseParameters["filter"];
  }
);
```

Check `Client` type in [Notion's code](https://github.com/makenotion/notion-sdk-js/blob/b66c67dbdadc7c72312869311ea735063db758b1/src/Client.ts#L117). Useful to use [utility functions](https://github.com/makenotion/notion-sdk-js?tab=readme-ov-file#utility-functions).  
Check `PageObjectReponse` type in [Notion's code](https://github.com/makenotion/notion-sdk-js/blob/b66c67dbdadc7c72312869311ea735063db758b1/src/api-endpoints.ts#L4520). You can check [here](https://developers.notion.com/reference/page-property-values) all the page properties you can use.  
Check `QueryDatabaseParameters["filter"]` type in [Notion's code](https://github.com/makenotion/notion-sdk-js/blob/b66c67dbdadc7c72312869311ea735063db758b1/src/api-endpoints.ts#L10864). It is the type of a database filter, as Notion explains [here](https://developers.notion.com/reference/post-database-query-filter).

#### `auth` - type: `string`

See [Getting started](#getting-started) to know how to get it.

#### `dbId` - type: `string`

Follow [this section](https://developers.notion.com/reference/retrieve-a-database#:~:text=To%20find%20a%20database%20ID,a%2032%20characters%20alphanumeric%20string.) of Notion documentation to get it.

#### `options.parsePost` (optional)

```ts
(client: Client, page: PageObjectResponse) => Promise<T>;

// Default:
const defaultPostParser = async (
  client: Client,
  page: PageObjectResponse
): Promise<Post> => ({
  content: await defaultNotionPageParser(client, page),
  slug: (page.properties.slug as any).title[0].plain_text,
  title: (page.properties.title as any).rich_text[0].plain_text,
  published: (page.properties.published as any).checkbox,
  createdAt: page.created_time.split("T")[0],
});
```

Allows to turn pages to a js object with the shape you want.
You also have acces to the notion `client` to leverage [utility functions](https://github.com/makenotion/notion-sdk-js?tab=readme-ov-file#utility-functions) if you want to.

In the default, we use the client in `defaultNotionPageParser` to iterate over each block in the page and parse them.

#### `options.postQueryFilter` (optional)

```ts
(id: string) => QueryDatabaseParameters["filter"];

// Default:
const defaultPostQueryFilter = (id: string) => ({
  and: [
    { property: "published", checkbox: { equals: true } },
    { property: "slug", title: { equals: id } },
  ],
});
```

Allows to filter posts to get the one you want, when using `<NotionPost />`.
`id` param corresponds to the `id` you will give as a prop to `<NotionPost />`.  
The default queries posts that are `published` and with the `slug` corresponding to `id`.  
_Note: if multiple posts come out from this query, the first matching one will be kept._

#### `options.postsQueryFilter` (optional)

```ts
QueryDatabaseParameters["filter"];

// Default:
const const defaultPostsQueryFilter = {
  property: "published",
  checkbox: { equals: true },
});
```

Allows to filter posts to get the ones you want, when using `<NotionPosts />`.  
The default queries posts that are `published`.

### Utility functions

#### `defaultNotionPageParser(client, page)`

```ts
const defaultNotionPageParser = async (
  client: Client,
  page: PageObjectResponse
): Promise<React.ReactNode[]>;
```

Check [createNotionComponents(auth, dbId, options)](#createnotioncomponentsauth-dbid-options) section to understand the types.

`defaultNotionPageParser` enables you to parse the blocks of a page. It is used in the [default `options.parsePost` function](#optionsparsepost-optional), and you can use it as well if you want to create your own blog database without rewriting the block parsing.

#### `defaultNotionBlockParser(block, notionPublicFolder)`

```ts
const defaultNotionBlockParser = async (
  block: BlockObjectResponse,
  notionPublicFolder: string = `${process.cwd()}/public/notion-files`
): Promise<JSX.Element | undefined>;
```

Check `BlockObjectResponse` type in [Notion's code](https://github.com/makenotion/notion-sdk-js/blob/b66c67dbdadc7c72312869311ea735063db758b1/src/api-endpoints.ts#L5788). It describes a [Notion supported block](https://developers.notion.com/reference/block).

`defaultNotionBlockParser` enables you to turn a block into a `JSX.Element`. This way, if you want to change the `defaultNotionPageParser` logic, but want to keep the block to HTML logic, you can use this function.  
Also, if a notion block is not supported yet, you can create your own function to wrap this one, and support the block you need.  
Finally, you could create your own syntax in Notion and parse it here with some new logic.

`block` is the Notion block to parse.

`notionPublicFolder` is the folder where the Notion files and images found in the blocks will be saved. In the future, this might be replaced by something to handle file uploading to S3 (with AWS sdk or [UploadThing](https://uploadthing.com/)).
