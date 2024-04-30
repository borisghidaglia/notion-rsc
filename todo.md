# Current work

1. [x] Make sure description is not required in the properties type of notion (see notionData)
2. [ ] Generate notionData with the appropriate `satsifies` annotations (see data.ts)
3. [ ] Make sure `createPageComponent` works after running `notion-rsc sync`
4. [ ] Create the `createDatabaseComponent` function
5. [ ] Refactor the `createNotionComponents` function

# Issue?

What happens if I run `npx notion-rsc sync` but don't render an image of type "file"?  
The thing is that the url in notionData is a Notion S3 link with an expiration duration (1h).  
And we save images locally only when the image is about to be rendered (not good).  
Hence, I suspect that running the command and waiting 1h+ before rendering the data (aka calling createNotionComponent) will break.
