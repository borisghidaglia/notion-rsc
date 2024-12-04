import { NotionRscConfig } from "notion-rsc/src/types";

const notionRscConfig: NotionRscConfig = {
  notionIntegrationSecret: process.env.NOTION_API_KEY!,
  databaseIds: [],
  pageIds: ["944d2814048f4e539f5a970e8949e2d6"],
};

export default notionRscConfig;
