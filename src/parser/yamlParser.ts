import * as yaml from "js-yaml";
import * as vscode from "vscode";
import { ResourceGraphDefinition } from "../schema/model";

export class YamlParser {
  /**
   * Parse YAML content from a document
   */
  public static parse(document: vscode.TextDocument): any {
    try {
      return yaml.load(document.getText());
    } catch (e: any) {
      console.error("Error parsing YAML:", e.message);
      return null;
    }
  }

  /**
   * Check if the parsed YAML is a Kro ResourceGraphDefinition
   */
  public static isResourceGraphDefinition(
    parsedYaml: any
  ): parsedYaml is ResourceGraphDefinition {
    return (
      parsedYaml &&
      parsedYaml.apiVersion === "kro.run/v1alpha1" &&
      parsedYaml.kind === "ResourceGraphDefinition"
    );
  }

  /**
   * Get the position in the document for a specific path in the YAML
   */
  public static getPositionForPath(
    document: vscode.TextDocument,
    path: string[]
  ): vscode.Range | null {
    // This is a simplified implementation
    // In a real extension, you would need to parse the YAML AST to find exact positions
    const text = document.getText();
    const lines = text.split("\n");

    let currentPath: string[] = [];
    let indentLevel = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(/^(\s*)(\w+):/);

      if (match) {
        const [, indent, key] = match;
        const currentIndentLevel = indent.length;

        // Adjust current path based on indent level
        if (currentIndentLevel < indentLevel) {
          const levelsToRemove = Math.floor(
            (indentLevel - currentIndentLevel) / 2
          );
          currentPath = currentPath.slice(
            0,
            currentPath.length - levelsToRemove
          );
        }

        indentLevel = currentIndentLevel;

        // Update current path
        if (currentIndentLevel === indentLevel) {
          currentPath[currentPath.length - 1] = key;
        } else {
          currentPath.push(key);
        }

        // Check if current path matches the target path
        if (
          currentPath.length === path.length &&
          currentPath.every((value, index) => value === path[index])
        ) {
          const startPos = new vscode.Position(i, match[1].length);
          const endPos = new vscode.Position(i, line.length);
          return new vscode.Range(startPos, endPos);
        }
      }
    }

    return null;
  }
}
