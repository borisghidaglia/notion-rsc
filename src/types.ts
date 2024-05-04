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

export type BlockWithChildren = BlockObjectResponse & {
  children?: BlockWithChildren[];
};

export type NotionPageSatisfiesType = GetPageResponse & {
  request_id: string;
  blocks: BlockWithChildren[];
};

export type NotionDatabaseSatisfiesType = {
  query: NotionDatabaseQuerySatisfies;
  retrieve: NotionDatabaseRetrieveSatisfies;
};

type NotionDatabaseQuerySatisfies = OmitOverUnionMembers<
  QueryDatabaseResponse,
  "results"
> & {
  results: (QueryDatabaseResponse["results"][number] & {
    blocks: BlockWithChildren[];
  })[];
} & { request_id: string };

type NotionDatabaseRetrieveSatisfies = OmitOverUnionMembers<
  GetDatabaseResponse,
  "properties"
> & {
  request_id: string;
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

type OmitOverUnionMembers<T, K extends keyof T> = T extends T
  ? Omit<T, K>
  : never;
