import { NotionRscConfig } from "notion-rsc/src/types";

const notionRscConfig: NotionRscConfig = {
  notionIntegrationSecret: process.env.NOTION_API_KEY!,
  databaseIds: [],
  pageIds: ["8e8ec40c26454cfdaaa03dbc7dd0ae81"],
};

export default notionRscConfig;
