import * as ts from "typescript";
import { readFileSync } from "fs";
import { inspect } from "node:util";

// Function to extract members of a union type from the value of the "properties" key
function extractUnionMembers(filePath: string, typeName: string): string[] {
  const fileContent = readFileSync(filePath, "utf-8");
  const sourceFile = ts.createSourceFile(
    filePath,
    fileContent,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true
  );

  let unionMembers: string[] = [];

  function extractType(node: ts.TypeNode, sourceFile: ts.SourceFile): string {
    if (ts.isTypeReferenceNode(node) && node.typeArguments) {
      if (ts.isUnionTypeNode(node.typeArguments[0])) {
        return node.typeArguments[0].types
          .map((member) => extractType(member, sourceFile))
          .join(" | ");
      } else {
        return extractType(node.typeArguments[0], sourceFile);
      }
    } else if (ts.isTypeLiteralNode(node)) {
      const memberObject: { [key: string]: string } = {};
      node.members.forEach((prop) => {
        if (ts.isPropertySignature(prop) && prop.type) {
          const typeName = extractType(prop.type, sourceFile);
          const propName = prop.name.getText(sourceFile);
          memberObject[propName] = typeName;
        }
      });
      return JSON.stringify(memberObject);
    } else {
      return node.getText(sourceFile);
    }
  }

  function visit(node: ts.Node) {
    if (ts.isTypeAliasDeclaration(node) && node.name.text === typeName) {
      // Check if it's an object type alias
      if (ts.isTypeLiteralNode(node.type)) {
        // Find the 'properties' key
        const propertiesKey = node.type.members.find(
          (member) =>
            ts.isPropertySignature(member) &&
            member.name.getText() === "properties"
        );
        if (
          propertiesKey &&
          ts.isPropertySignature(propertiesKey) &&
          propertiesKey.type &&
          ts.isTypeReferenceNode(propertiesKey.type) &&
          propertiesKey.type.typeArguments
        ) {
          const objectType = propertiesKey.type.typeArguments[1];
          if (ts.isUnionTypeNode(objectType)) {
            // Extract members of the union type
            unionMembers = objectType.types.map((member) => {
              return extractType(member, sourceFile).valueOf();
            });
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  return unionMembers;
}

// Example usage
const filePath = "./node_modules/@notionhq/client/build/src/api-endpoints.d.ts";
const typeName = "PageObjectResponse";
const typeText = extractUnionMembers(filePath, typeName);
console.log(typeText.map((t) => JSON.parse(t)));
