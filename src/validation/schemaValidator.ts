// src/validation/schemaValidator.ts
import * as vscode from "vscode";
import { YamlParser } from "../parser/yamlParser";
import {
  TYPE_PATTERNS,
  TypeDefinition,
  VALID_BASE_TYPES,
  VALID_MODIFIERS,
  ResourceGraphDefinition,
  SchemaDefinition,
  Resource,
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
   *
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
          emptyRange,
          "kro-schema-validation"
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

    // Validate header (apiVersion and kind)
    this.validateHeader(document, parsedYaml, diagnostics);

    // If header is invalid, don't proceed with further validation
    if (diagnostics.length > 0) {
      this.diagnosticCollection.set(document.uri, diagnostics);
      return;
    }

    // Check if it's a ResourceGraphDefinition
    if (!YamlParser.isResourceGraphDefinition(parsedYaml)) {
      return; // Not a ResourceGraphDefinition, no need to validate
    }

    // Validate the ResourceGraphDefinition structure
    this.validateResourceGraphDefinition(document, parsedYaml, diagnostics);

    // Set diagnostics
    this.diagnosticCollection.set(document.uri, diagnostics);
  }

  /**
   * Validate the header (apiVersion and kind)
   */
  private static validateHeader(
    document: vscode.TextDocument,
    parsedYaml: any,
    diagnostics: vscode.Diagnostic[]
  ): void {
    // Check first line for apiVersion
    const firstLine = document.lineAt(0);
    const firstLineContent = firstLine.text.trim();
    const hasApiVersion = firstLineContent.startsWith("apiVersion:");

    if (!hasApiVersion) {
      diagnostics.push(
        DiagnosticUtils.createError(
          "First line must be 'apiVersion: kro.run/v1alpha1'.",
          firstLine.range,
          "kro-schema-validation"
        )
      );
      return;
    }

    // Check apiVersion value
    if (parsedYaml.apiVersion !== "kro.run/v1alpha1") {
      diagnostics.push(
        DiagnosticUtils.createError(
          "Invalid apiVersion. Expected 'kro.run/v1alpha1'.",
          firstLine.range,
          "kro-schema-validation"
        )
      );
    }

    // Check second line for kind
    if (document.lineCount > 1) {
      const secondLine = document.lineAt(1);
      const secondLineContent = secondLine.text.trim();
      const hasKind = secondLineContent.startsWith("kind:");

      if (!hasKind) {
        diagnostics.push(
          DiagnosticUtils.createError(
            "Second line must be 'kind: ResourceGraphDefinition'.",
            secondLine.range,
            "kro-schema-validation"
          )
        );
        return;
      }

      // Check kind value
      if (parsedYaml.kind !== "ResourceGraphDefinition") {
        diagnostics.push(
          DiagnosticUtils.createError(
            "Invalid kind. Expected 'ResourceGraphDefinition'.",
            secondLine.range,
            "kro-schema-validation"
          )
        );
      }
    } else {
      // Document has only one line (apiVersion), but missing kind
      diagnostics.push(
        DiagnosticUtils.createError(
          "Missing kind. Expected 'kind: ResourceGraphDefinition' on the second line.",
          new vscode.Range(
            new vscode.Position(0, firstLine.text.length),
            new vscode.Position(0, firstLine.text.length)
          ),
          "kro-schema-validation"
        )
      );
    }
  }

  /**
   * Validate the ResourceGraphDefinition structure
   */
  private static validateResourceGraphDefinition(
    document: vscode.TextDocument,
    parsedYaml: ResourceGraphDefinition,
    diagnostics: vscode.Diagnostic[]
  ): void {
    // Validate metadata
    this.validateMetadata(document, parsedYaml, diagnostics);

    // Validate spec
    this.validateSpec(document, parsedYaml, diagnostics);
  }

  /**
   * Validate metadata section
   */
  private static validateMetadata(
    document: vscode.TextDocument,
    parsedYaml: ResourceGraphDefinition,
    diagnostics: vscode.Diagnostic[]
  ): void {
    if (!parsedYaml.metadata) {
      // Find the position to report the error
      const metadataPosition = this.findPositionAfterKey(document, "kind");

      diagnostics.push(
        DiagnosticUtils.createError(
          "Missing 'metadata' section. ResourceGraphDefinition must have a metadata section with a name.",
          new vscode.Range(metadataPosition, metadataPosition),
          "kro-schema-validation"
        )
      );
      return;
    }

    if (!parsedYaml.metadata.name) {
      // Find the position to report the error
      const namePosition = this.findPositionAfterKey(document, "metadata");

      diagnostics.push(
        DiagnosticUtils.createError(
          "Missing 'name' in metadata. ResourceGraphDefinition must have a name defined in metadata.",
          new vscode.Range(namePosition, namePosition),
          "kro-schema-validation"
        )
      );
    }
  }

  /**
   * Validate spec section
   */
  private static validateSpec(
    document: vscode.TextDocument,
    parsedYaml: ResourceGraphDefinition,
    diagnostics: vscode.Diagnostic[]
  ): void {
    if (!parsedYaml.spec) {
      // Find the position to report the error
      const specPosition = this.findPositionAfterKey(document, "metadata");

      diagnostics.push(
        DiagnosticUtils.createError(
          "Missing 'spec' section. ResourceGraphDefinition must have a spec section.",
          new vscode.Range(specPosition, specPosition),
          "kro-schema-validation"
        )
      );
      return;
    }

    // Validate schema if present
    if (parsedYaml.spec.schema) {
      this.validateSchema(document, parsedYaml.spec.schema, diagnostics);
    }

    // Validate resources if present
    if (parsedYaml.spec.resources) {
      this.validateResources(document, parsedYaml.spec.resources, diagnostics);
    }
  }

  /**
   * Validate schema section
   */
  private static validateSchema(
    document: vscode.TextDocument,
    schema: SchemaDefinition,
    diagnostics: vscode.Diagnostic[]
  ): void {
    // Validate spec schema
    if (schema.spec) {
      this.validateSchemaFields(document, schema.spec, "spec", diagnostics);
    }

    // Validate status schema
    if (schema.status) {
      this.validateSchemaFields(document, schema.status, "status", diagnostics);
    }
  }

  /**
   * Validate schema fields
   */
  private static validateSchemaFields(
    document: vscode.TextDocument,
    schemaFields: Record<string, any>,
    schemaType: string,
    diagnostics: vscode.Diagnostic[]
  ): void {
    for (const fieldName in schemaFields) {
      const fieldValue = schemaFields[fieldName];

      // Skip if not a string (might be a nested object)
      if (typeof fieldValue !== "string") {
        // Recursively validate nested fields
        if (typeof fieldValue === "object" && fieldValue !== null) {
          this.validateSchemaFields(
            document,
            fieldValue,
            `${schemaType}.${fieldName}`,
            diagnostics
          );
        }
        continue;
      }

      // Parse and validate the type definition
      const typeDefinition = this.parseTypeDefinition(fieldValue);

      if (!typeDefinition.isValid) {
        // Find the position of this field in the document
        const fieldPosition = this.findPositionOfField(
          document,
          `${schemaType}.${fieldName}`
        );

        diagnostics.push(
          DiagnosticUtils.createError(
            `Invalid type definition for field '${fieldName}': ${fieldValue}. Expected a valid type pattern.`,
            new vscode.Range(
              fieldPosition,
              fieldPosition.translate(0, fieldValue.length)
            ),
            "kro-schema-validation"
          )
        );
      } else {
        // Validate base type
        if (
          !VALID_BASE_TYPES.includes(typeDefinition.baseType) &&
          !typeDefinition.baseType.startsWith("[") &&
          !typeDefinition.baseType.startsWith("map[")
        ) {
          const fieldPosition = this.findPositionOfField(
            document,
            `${schemaType}.${fieldName}`
          );

          diagnostics.push(
            DiagnosticUtils.createError(
              `Invalid base type '${
                typeDefinition.baseType
              }' for field '${fieldName}'. Expected one of: ${VALID_BASE_TYPES.join(
                ", "
              )}, array ([]), or map.`,
              new vscode.Range(
                fieldPosition,
                fieldPosition.translate(0, fieldValue.length)
              ),
              "kro-schema-validation"
            )
          );
        }

        // Validate modifiers
        for (const modifier in typeDefinition.modifiers) {
          if (!VALID_MODIFIERS.includes(modifier)) {
            const fieldPosition = this.findPositionOfField(
              document,
              `${schemaType}.${fieldName}`
            );

            diagnostics.push(
              DiagnosticUtils.createWarning(
                `Unknown modifier '${modifier}' for field '${fieldName}'. Valid modifiers are: ${VALID_MODIFIERS.join(
                  ", "
                )}.`,
                new vscode.Range(
                  fieldPosition,
                  fieldPosition.translate(0, fieldValue.length)
                ),
                "kro-schema-validation"
              )
            );
          }
        }
      }
    }
  }

  /**
   * Validate resources section
   */
  private static validateResources(
    document: vscode.TextDocument,
    resources: Resource[],
    diagnostics: vscode.Diagnostic[]
  ): void {
    if (!Array.isArray(resources)) {
      const resourcesPosition = this.findPositionAfterKey(
        document,
        "resources"
      );

      diagnostics.push(
        DiagnosticUtils.createError(
          "Invalid 'resources' section. Expected an array of resources.",
          new vscode.Range(resourcesPosition, resourcesPosition),
          "kro-schema-validation"
        )
      );
      return;
    }

    // Track resource IDs to check for duplicates
    const resourceIds = new Set<string>();

    for (let i = 0; i < resources.length; i++) {
      const resource = resources[i];

      // Validate resource ID
      if (!resource.id) {
        const resourcePosition = this.findPositionOfArrayItem(
          document,
          "resources",
          i
        );

        diagnostics.push(
          DiagnosticUtils.createError(
            `Missing 'id' in resource at index ${i}. Each resource must have an ID.`,
            new vscode.Range(resourcePosition, resourcePosition),
            "kro-schema-validation"
          )
        );
      } else {
        // Check for duplicate IDs
        if (resourceIds.has(resource.id)) {
          const resourcePosition = this.findPositionOfField(
            document,
            `resources[${i}].id`
          );

          diagnostics.push(
            DiagnosticUtils.createError(
              `Duplicate resource ID '${resource.id}'. Resource IDs must be unique.`,
              new vscode.Range(
                resourcePosition,
                resourcePosition.translate(0, resource.id.length)
              ),
              "kro-schema-validation"
            )
          );
        }
        resourceIds.add(resource.id);
      }

      // Validate resource type
      if (!resource.type) {
        const resourcePosition = this.findPositionOfArrayItem(
          document,
          "resources",
          i
        );

        diagnostics.push(
          DiagnosticUtils.createError(
            `Missing 'type' in resource '${
              resource.id || `at index ${i}`
            }'. Each resource must have a type.`,
            new vscode.Range(resourcePosition, resourcePosition),
            "kro-schema-validation"
          )
        );
      }

      // Validate resource properties if present
      if (resource.properties && typeof resource.properties !== "object") {
        const propertiesPosition = this.findPositionOfField(
          document,
          `resources[${i}].properties`
        );

        diagnostics.push(
          DiagnosticUtils.createError(
            `Invalid 'properties' in resource '${
              resource.id || `at index ${i}`
            }'. Properties must be an object.`,
            new vscode.Range(propertiesPosition, propertiesPosition),
            "kro-schema-validation"
          )
        );
      }
    }
  }

  /**
   * Parse a type definition string
   */
  private static parseTypeDefinition(typeString: string): TypeDefinition {
    // Default result
    const result: TypeDefinition = {
      baseType: "",
      modifiers: {},
      isValid: false,
      isRequired: false,
    };

    // Check for empty string
    if (!typeString || typeString.trim() === "") {
      return result;
    }

    // Split by pipe to separate type and modifiers
    const parts = typeString.split("|").map((part) => part.trim());

    // First part is the base type
    result.baseType = parts[0];

    // Check if it's a valid base type or pattern
    let isValidBaseType = VALID_BASE_TYPES.includes(result.baseType);

    // Check for array type
    if (!isValidBaseType && TYPE_PATTERNS.array.test(result.baseType)) {
      isValidBaseType = true;
    }

    // Check for map type
    if (!isValidBaseType && TYPE_PATTERNS.map.test(result.baseType)) {
      isValidBaseType = true;
    }

    // Parse modifiers
    for (let i = 1; i < parts.length; i++) {
      const modifierPart = parts[i];

      // Check for required modifier
      if (modifierPart === "required") {
        result.isRequired = true;
        result.modifiers["required"] = "true";
        continue;
      }

      // Parse key-value modifiers
      const modifierMatch = modifierPart.match(/^(\w+)\s*=\s*(.+)$/);
      if (modifierMatch) {
        const [, modifierName, modifierValue] = modifierMatch;
        result.modifiers[modifierName] = modifierValue;
      } else {
        // Invalid modifier format
        return result;
      }
    }

    // Mark as valid if base type is valid
    result.isValid = isValidBaseType;

    return result;
  }

  /**
   * Find position after a key in the document
   */
  private static findPositionAfterKey(
    document: vscode.TextDocument,
    key: string
  ): vscode.Position {
    for (let i = 0; i < document.lineCount; i++) {
      const line = document.lineAt(i);
      if (line.text.trim().startsWith(`${key}:`)) {
        return new vscode.Position(i + 1, 0);
      }
    }
    return new vscode.Position(document.lineCount, 0);
  }

  /**
   * Find position of a field in the document
   */
  private static findPositionOfField(
    document: vscode.TextDocument,
    fieldPath: string
  ): vscode.Position {
    // Split the field path into parts
    const parts = fieldPath.split(".");

    // Handle array indexing
    const processedParts = [];
    for (const part of parts) {
      const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
      if (arrayMatch) {
        processedParts.push(arrayMatch[1]);
        processedParts.push(`- # ${arrayMatch[2]}`);
      } else {
        processedParts.push(part);
      }
    }

    let currentIndentation = 0;
    let matchedParts = 0;

    for (let i = 0; i < document.lineCount; i++) {
      const line = document.lineAt(i);
      const trimmedLine = line.text.trim();

      // Skip empty lines
      if (trimmedLine === "") {
        continue;
      }

      // Calculate indentation level
      const indentation = line.firstNonWhitespaceCharacterIndex;

      // If we're at a lower indentation than current, reset matching
      if (indentation < currentIndentation) {
        matchedParts = 0;
        currentIndentation = indentation;
      }

      // Check if this line matches the next part we're looking for
      const currentPart = processedParts[matchedParts];
      if (
        currentPart &&
        (trimmedLine.startsWith(`${currentPart}:`) ||
          (currentPart.startsWith("- #") && trimmedLine.startsWith("-")))
      ) {
        matchedParts++;
        currentIndentation = indentation;

        // If we've matched all parts, return the position
        if (matchedParts === processedParts.length) {
          // For the last part, return the position after the colon
          const colonIndex = line.text.indexOf(":");
          if (colonIndex !== -1) {
            return new vscode.Position(i, colonIndex + 1);
          }
          return new vscode.Position(i, line.text.length);
        }
      }
    }

    // If not found, return the end of the document
    return new vscode.Position(document.lineCount, 0);
  }

  /**
   * Find position of an array item in the document
   */
  private static findPositionOfArrayItem(
    document: vscode.TextDocument,
    arrayName: string,
    index: number
  ): vscode.Position {
    let foundArray = false;
    let itemCount = 0;

    for (let i = 0; i < document.lineCount; i++) {
      const line = document.lineAt(i);
      const trimmedLine = line.text.trim();

      // Find the array
      if (!foundArray && trimmedLine === `${arrayName}:`) {
        foundArray = true;
        continue;
      }

      // Count items in the array
      if (foundArray && trimmedLine.startsWith("-")) {
        if (itemCount === index) {
          return new vscode.Position(i, line.firstNonWhitespaceCharacterIndex);
        }
        itemCount++;
      }

      // If we found the array but then hit a line with less indentation, we've exited the array
      if (
        foundArray &&
        trimmedLine !== "" &&
        !trimmedLine.startsWith("-") &&
        line.firstNonWhitespaceCharacterIndex <=
          line.firstNonWhitespaceCharacterIndex
      ) {
        break;
      }
    }

    // If not found, return the end of the document
    return new vscode.Position(document.lineCount, 0);
  }
}
