import * as vscode from "vscode";
import { YamlParser } from "../parser/yamlParser";
import {
  TYPE_PATTERNS,
  TypeDefinition,
  VALID_BASE_TYPES,
  VALID_MODIFIERS,
} from "../schema/model";
import { DiagnosticUtils } from "../utils/diagonisticUtils";

export class SchemaValidator {
  private static readonly diagnosticCollection =
    vscode.languages.createDiagnosticCollection("kro-schema-validation");

  /**
   * Validate the schema in a document
   *
   * Missing apiVersion but present kind
   * Present apiVersion but missing kind
   * Incorrect apiVersion value
   * Incorrect kind value
   * Both fields present but in wrong order
   * Empty document
   */
  public static validate(document: vscode.TextDocument): void {
    // Clear previous diagnostics
    this.diagnosticCollection.delete(document.uri);

    // Handle empty document
    if (document.lineCount === 0) {
      const emptyRange = new vscode.Range(0, 0, 0, 0);
      const diagnostics = [
        DiagnosticUtils.createError(
          "Empty document. Expected 'apiVersion: kro.run/v1alpha1' on the first line and 'kind: ResourceGraphDefinition' on the second line.",
          emptyRange
        ),
      ];
      this.diagnosticCollection.set(document.uri, diagnostics);
      return;
    }

    // Parse YAML
    const parsedYaml = YamlParser.parse(document);
    if (!parsedYaml) {
      return; // Invalid YAML, parsing errors will be shown by VS Code
    }

    const diagnostics: vscode.Diagnostic[] = [];
    let isValid = true;

    // Check first line for apiVersion
    const firstLine = document.lineAt(0);
    const firstLineContent = firstLine.text.trim();
    const hasApiVersion = firstLineContent.startsWith("apiVersion:");

    if (!hasApiVersion) {
      isValid = false;
      diagnostics.push(
        DiagnosticUtils.createError(
          "First line must be 'apiVersion: kro.run/v1alpha1'.",
          firstLine.range
        )
      );

      // If apiVersion is missing, don't validate further
      this.diagnosticCollection.set(document.uri, diagnostics);
      return;
    }

    // Check apiVersion value
    if (parsedYaml.apiVersion !== "kro.run/v1alpha1") {
      isValid = false;
      diagnostics.push(
        DiagnosticUtils.createError(
          "Invalid apiVersion. Expected 'kro.run/v1alpha1'.",
          firstLine.range
        )
      );
    }

    // Check second line for kind
    if (document.lineCount > 1) {
      const secondLine = document.lineAt(1);
      const secondLineContent = secondLine.text.trim();
      const hasKind = secondLineContent.startsWith("kind:");

      if (!hasKind) {
        isValid = false;
        diagnostics.push(
          DiagnosticUtils.createError(
            "Second line must be 'kind: ResourceGraphDefinition'.",
            secondLine.range
          )
        );

        // If kind is missing, don't validate further
        this.diagnosticCollection.set(document.uri, diagnostics);
        return;
      }

      // Check kind value
      if (parsedYaml.kind !== "ResourceGraphDefinition") {
        isValid = false;
        diagnostics.push(
          DiagnosticUtils.createError(
            "Invalid kind. Expected 'ResourceGraphDefinition'.",
            secondLine.range
          )
        );
      }
    } else {
      // Document has only one line (apiVersion), but missing kind
      isValid = false;
      diagnostics.push(
        DiagnosticUtils.createError(
          "Missing kind. Expected 'kind: ResourceGraphDefinition' on the second line.",
          new vscode.Range(
            new vscode.Position(0, firstLine.text.length),
            new vscode.Position(0, firstLine.text.length)
          )
        )
      );

      // If kind is missing, don't validate further
      this.diagnosticCollection.set(document.uri, diagnostics);
      return;
    }

    // If not valid, set diagnostics and return
    if (!isValid) {
      this.diagnosticCollection.set(document.uri, diagnostics);
      return;
    }

    // Set diagnostics
    this.diagnosticCollection.set(document.uri, diagnostics);
  }
}
