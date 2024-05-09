# Current work

1. [x] Deploy `notion-rsc` v0.0.5
2. [x] When fetching a page, create a type and a db entry for each inline db encountered inside it.
3. [x] Display inline db using the default db parser when they appear in a page

...  
X. [ ] Change parser terminology to renderer terminology?  
X+1. [ ] ⚠️ Remove the `@notionhq/client` dependency in examples package.json

# Issue?

What happens if I run `npx notion-rsc sync` but don't render an image of type "file"?  
The thing is that the url in notionData is a Notion S3 link with an expiration duration (1h).  
And we save images locally only when the image is about to be rendered (not good).  
Hence, I suspect that running the command and waiting 1h+ before rendering the data (aka calling createNotionComponent) will break.

# Questions

- Do I even need to `tsc notionData.ts`?
- Why tf `prose prose-invert` works on `defaultParser`?
