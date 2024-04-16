import { RichTextItemResponse } from "@notionhq/client/build/src/api-endpoints";
// type RichTextItemResponse = string;

export type Parsers = {
  c2c55fd5f2f94ddea190ce420146c90bType: (
    kk: c2c55fd5f2f94ddea190ce420146c90bType
  ) => React.ReactNode;
  abc: (kk: { x: number; id: string }) => React.ReactNode;
};

type c2c55fd5f2f94ddea190ce420146c90bType = {
  title: {
    type: "rich_text";
    rich_text: Array<RichTextItemResponse>;
    id: string;
  };
  "Created time": {
    type: "created_time";
    created_time: string;
    id: string;
  };
  published: { type: "checkbox"; checkbox: boolean; id: string };
  slug: { type: "title"; title: Array<RichTextItemResponse>; id: string };
};
