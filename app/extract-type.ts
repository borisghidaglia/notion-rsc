import { readFileSync, writeFile } from "fs";
import { format } from "prettier";
import * as ts from "typescript";

// Function to extract members of a union type from the value of the "properties" key
function extractUnionMembers(
  filePath: string,
  typeName: string
): Record<string, string>[] {
  const fileContent = readFileSync(filePath, "utf-8");
  const sourceFile = ts.createSourceFile(
    filePath,
    fileContent,
    ts.ScriptTarget.Latest,
    true
  );

  let unionMembers: Record<string, string>[] = [];

  function visit(node: ts.Node) {
    if (!(ts.isTypeAliasDeclaration(node) && node.name.text === typeName))
      return;
    if (!ts.isTypeLiteralNode(node.type)) return;
    const propertiesKey = node.type.members.find(
      (member) =>
        ts.isPropertySignature(member) && member.name.getText() === "properties"
    );

    if (
      propertiesKey &&
      ts.isPropertySignature(propertiesKey) &&
      propertiesKey.type &&
      ts.isTypeReferenceNode(propertiesKey.type) &&
      propertiesKey.type.typeArguments
    ) {
      const objectType = propertiesKey.type.typeArguments[1];
      // Extract members of the union type

      objectType.forEachChild((n) => {
        n.forEachChild((nn) => {
          if (ts.isPropertySignature(nn)) {
            if (nn.name.getText() === "type") {
              nn.forEachChild((nnn) => {
                if (ts.isLiteralTypeNode(nnn)) {
                  unionMembers.push({
                    [nnn.getText().replaceAll('"', "")]: n
                      .getText()
                      .replaceAll("\n        ", "")
                      .replaceAll("\n    ", ""),
                  });
                }
              });
            }
          }
        });
      });
    }
  }

  ts.forEachChild(sourceFile, visit);
  return unionMembers;
}

async function main() {
  // Example usage
  const filePath =
    "./node_modules/@notionhq/client/build/src/api-endpoints.d.ts";
  const typeName = "PageObjectResponse";
  const typeText = extractUnionMembers(filePath, typeName);
  // typeText.forEach((e) => console.log(e));
  const formattedString = await format(
    "export const Types = " + JSON.stringify(typeText) + " as const;",
    { parser: "typescript" }
  );
  writeFile("out.ts", formattedString, () => {});
}

main();
