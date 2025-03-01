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
   */
  public static validate(document: vscode.TextDocument): void {
    // Clear previous diagnostics
    this.diagnosticCollection.delete(document.uri);

    // Parse YAML
    const parsedYaml = YamlParser.parse(document);
    if (!parsedYaml) {
      return; // Invalid YAML, parsing errors will be shown by VS Code
    }

    // Check if it's a ResourceGraphDefinition
    if (!YamlParser.isResourceGraphDefinition(parsedYaml)) {
      return; // Not a ResourceGraphDefinition, no validation needed
    }

    const diagnostics: vscode.Diagnostic[] = [];

    // Validate schema types
    this.validateSchemaTypes(parsedYaml, document, diagnostics);

    // Validate required fields
    this.validateRequiredFields(parsedYaml, document, diagnostics);

    // Set diagnostics
    this.diagnosticCollection.set(document.uri, diagnostics);
  }

  /**
   * Validate schema types in the ResourceGraphDefinition
   */
  private static validateSchemaTypes(
    parsedYaml: any,
    document: vscode.TextDocument,
    diagnostics: vscode.Diagnostic[]
  ): void {
    if (
      !parsedYaml.spec ||
      !parsedYaml.spec.schema ||
      !parsedYaml.spec.schema.spec
    ) {
      return; // No schema to validate
    }

    const schemaSpec = parsedYaml.spec.schema.spec;
    this.validateObjectTypes(
      schemaSpec,
      ["spec", "schema", "spec"],
      document,
      diagnostics
    );
  }

  /**
   * Recursively validate object types
   */
  private static validateObjectTypes(
    obj: any,
    path: string[],
    document: vscode.TextDocument,
    diagnostics: vscode.Diagnostic[]
  ): void {
    if (!obj || typeof obj !== "object") {
      return;
    }

    for (const key in obj) {
      const value = obj[key];
      const currentPath = [...path, key];

      if (typeof value === "string" && this.isTypeDefinition(value)) {
        // This is a type definition, validate it
        const typeInfo = this.parseTypeDefinition(value);
        if (!typeInfo.isValid) {
          const range =
            YamlParser.getPositionForPath(document, currentPath) ||
            new vscode.Range(0, 0, 0, 0);

          diagnostics.push(
            DiagnosticUtils.createError(
              `Invalid type definition: ${value}`,
              range
            )
          );
        }
      } else if (typeof value === "object" && value !== null) {
        // Recursively validate nested objects
        this.validateObjectTypes(value, currentPath, document, diagnostics);
      }
    }
  }

  /**
   * Validate required fields in the ResourceGraphDefinition
   */
  private static validateRequiredFields(
    parsedYaml: any,
    document: vscode.TextDocument,
    diagnostics: vscode.Diagnostic[]
  ): void {
    if (
      !parsedYaml.spec ||
      !parsedYaml.spec.schema ||
      !parsedYaml.spec.schema.spec
    ) {
      return; // No schema to validate
    }

    const schemaSpec = parsedYaml.spec.schema.spec;
    this.findRequiredFields(
      schemaSpec,
      ["spec", "schema", "spec"],
      document,
      diagnostics
    );
  }

  /**
   * Find required fields in the schema
   */
  private static findRequiredFields(
    obj: any,
    path: string[],
    document: vscode.TextDocument,
    diagnostics: vscode.Diagnostic[]
  ): void {
    if (!obj || typeof obj !== "object") {
      return;
    }

    for (const key in obj) {
      const value = obj[key];
      const currentPath = [...path, key];

      if (typeof value === "string" && this.isTypeDefinition(value)) {
        // Check if this field is required
        const typeInfo = this.parseTypeDefinition(value);
        if (typeInfo.isRequired) {
          // Check if the field exists in the instance
          // This would require parsing the instance data, which is beyond this example
          // In a real implementation, you would check if required fields exist in the instance
        }
      } else if (typeof value === "object" && value !== null) {
        // Recursively find required fields in nested objects
        this.findRequiredFields(value, currentPath, document, diagnostics);
      }
    }
  }

  /**
   * Check if a string is a type definition
   */
  private static isTypeDefinition(value: string): boolean {
    return Object.values(TYPE_PATTERNS).some((pattern) => pattern.test(value));
  }

  /**
   * Parse a type definition string
   */
  private static parseTypeDefinition(typeStr: string): TypeDefinition {
    const result: TypeDefinition = {
      baseType: "",
      modifiers: {},
      isValid: false,
      isRequired: false,
    };

    // Split by pipe to separate type and modifiers
    const parts = typeStr.split("|").map((p) => p.trim());

    // First part is the base type
    result.baseType = parts[0];

    // Check if base type is valid
    const isArrayType = TYPE_PATTERNS.array.test(result.baseType);
    const isMapType = TYPE_PATTERNS.map.test(result.baseType);

    result.isValid =
      VALID_BASE_TYPES.includes(result.baseType) || isArrayType || isMapType;

    // Parse modifiers
    for (let i = 1; i < parts.length; i++) {
      const modifierPart = parts[i];
      const modifierMatch = modifierPart.match(/^(\w+)=(.*)$/);

      if (modifierMatch) {
        const [, modifierName, modifierValue] = modifierMatch;

        // Check if modifier is valid
        if (!VALID_MODIFIERS.includes(modifierName)) {
          result.isValid = false;
          return result;
        }

        result.modifiers[modifierName] = modifierValue;

        if (modifierName === "required" && modifierValue === "true") {
          result.isRequired = true;
        }
      } else {
        result.isValid = false; // Invalid modifier format
        return result;
      }
    }

    return result;
  }
}
