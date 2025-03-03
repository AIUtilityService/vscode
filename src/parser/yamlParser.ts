// src/parser/yamlParser.ts
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
   * Get the position of a key in the document
   */
  public static getKeyPosition(
    document: vscode.TextDocument,
    key: string,
    parentContext?: string
  ): vscode.Position | null {
    const lines = document.getText().split("\n");
    let inContext = !parentContext;
    let contextIndentation = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      const indentation = line.length - line.trimLeft().length;

      // Check for parent context
      if (parentContext && trimmedLine.startsWith(`${parentContext}:`)) {
        inContext = true;
        contextIndentation = indentation;
        continue;
      }

      // If we're in the parent context and find a key at the same indentation level,
      // we've exited the context
      if (
        inContext &&
        parentContext &&
        indentation <= contextIndentation &&
        trimmedLine &&
        !trimmedLine.startsWith("#")
      ) {
        inContext = false;
      }

      // If we're in the right context and find the key, return its position
      if (inContext && trimmedLine.startsWith(`${key}:`)) {
        return new vscode.Position(i, indentation);
      }
    }

    return null;
  }

  /**
   * Get the value of a key in the document
   */
  public static getKeyValue(
    document: vscode.TextDocument,
    key: string,
    parentContext?: string
  ): string | null {
    const position = this.getKeyPosition(document, key, parentContext);
    if (!position) {
      return null;
    }

    const line = document.lineAt(position.line);
    const colonIndex = line.text.indexOf(":");
    if (colonIndex === -1) {
      return null;
    }

    return line.text.substring(colonIndex + 1).trim();
  }
}
