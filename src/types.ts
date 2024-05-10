import {
  BlockObjectResponse,
  GetDatabaseResponse,
  GetPageResponse,
  QueryDatabaseResponse,
} from "@notionhq/client/build/src/api-endpoints";

export type NotionRscConfig = {
  notionIntegrationSecret: string;
  pageIds: string[];
  databaseIds: string[];
};

export type NotionData = {
  pages: Record<string, NotionPageSatisfiesType>;
  databases: Record<string, NotionDatabaseSatisfiesType>;
};

export type PageParserParams = Extract<
  GetPageResponse,
  { properties: any }
>["properties"] &
  NotionRscAdditionalTypes & { content: React.ReactNode };

export type NotionPageSatisfiesType = GetPageResponse &
  NotionTypeFix_SHOULD_NOT_BE_NECESSARY &
  NotionRscAdditionalTypes;

export type NotionDatabaseSatisfiesType = {
  query: NotionDatabaseQuerySatisfies;
  retrieve: NotionDatabaseRetrieveSatisfies;
};

type NotionDatabaseQuerySatisfies = OmitOverUnionMembers<
  QueryDatabaseResponse,
  "results"
> & {
  results: (QueryDatabaseResponse["results"][number] &
    NotionRscAdditionalTypes)[];
} & NotionTypeFix_SHOULD_NOT_BE_NECESSARY;

type NotionDatabaseRetrieveSatisfies = OmitOverUnionMembers<
  GetDatabaseResponse,
  "properties"
> &
  NotionTypeFix_SHOULD_NOT_BE_NECESSARY & {
    properties: Record<
      string,
      OmitOverUnionMembers<
        GetDatabaseResponse["properties"][string],
        "description"
      > & {
        description?: GetDatabaseResponse["properties"][string]["description"];
      }
    >;
  };

export type BlockWithChildren = BlockObjectResponse & {
  children?: BlockWithChildren[];
};

// Data notion-rsc adds alongside notion data
type NotionRscAdditionalTypes = {
  blocks: (BlockObjectResponse & { children?: BlockObjectResponse[] })[];
};

// https://github.com/makenotion/notion-sdk-js/issues/505
type NotionTypeFix_SHOULD_NOT_BE_NECESSARY = { request_id: string };

type OmitOverUnionMembers<T, K extends keyof T> = T extends T
  ? Omit<T, K>
  : never;
