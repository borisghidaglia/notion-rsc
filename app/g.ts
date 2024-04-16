import { appendFileSync, readFileSync, writeFileSync } from "fs";

import { Client as NotionClient } from "@notionhq/client";
import {
  DatabaseObjectResponse,
  PageObjectResponse,
} from "@notionhq/client/build/src/api-endpoints";
import { execSync } from "child_process";
import { Types } from "../out";

const notionClient = new NotionClient({
  auth: process.env.NOTION_API_KEY,
  // Forwarding local fetch to leverage caching
  // https://nextjs.org/docs/app/building-your-application/data-fetching#automatic-fetch-request-deduping
  fetch: fetch,
});

async function generateTypesFromUrls(dbId: string): Promise<void> {
  try {
    const types: Record<string, any> = {};

    // const responseData = (
    //   await notionClient.databases.retrieve({
    //     database_id: dbId,
    //   })
    // ).properties;

    // const responseData = (
    //   (
    //     await notionClient.databases.query({
    //       database_id: dbId,
    //     })
    //   ).results[0] as PageObjectResponse
    // ).properties;

    // const dbInfo = (await notionClient.databases.retrieve({
    //   database_id: dbId,
    // })) as DatabaseObjectResponse;

    const pageInfo = await notionClient.pages.retrieve({
      page_id: dbId,
    });

    if (!("url" in pageInfo)) throw "stfu";
    const responseData = pageInfo.properties;
    // const dbTitle = dbInfo.title.map((e) => e.plain_text).join("");

    const typeName = `${dbId}Type`;
    // const typeName = `${dbTitle ?? dbId}Type`;

    const x: Record<string, any> = {};
    for (const [k, v] of Object.entries(responseData)) {
      const kk = Types.find((t) => Object.keys(t)[0] === v.type)!;
      x[k] = (kk as any)[v.type as any];
    }

    writeFileSync("./generated-types.ts", "");
    af(`type ${typeName} = {`);
    for (const [k, v] of Object.entries(x)) {
      af(`"${k}": `);
      af(v);
      af(";");
    }
    af("};");

    af("\n\n");

    af("// Notion Types\n\n");
    const notionTypes = readFileSync(
      "./node_modules/@notionhq/client/build/src/api-endpoints.d.ts"
    );
    af(notionTypes.toString());

    // const rawString = `type ${typeName} = ${JSON.stringify(responseData)};`;
    // af(rawString)

    execSync("npx prettier ./generated-types.ts --write");

    console.log("Types generated and saved successfully.");
  } catch (error) {
    console.error("Error generating types:", error);
  }
}

// generateTypesFromUrls("c2c55fd5f2f94ddea190ce420146c90b");
generateTypesFromUrls("e9b44fd96ee84f4d9c11a8b651b8eae8");

const af = async (formattedString: string) =>
  appendFileSync("generated-types.ts", formattedString, { encoding: "utf-8" });
