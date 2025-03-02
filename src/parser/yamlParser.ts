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
}
