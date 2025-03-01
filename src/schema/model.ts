/**
 * Represents a Kro ResourceGraphDefinition
 */
export interface ResourceGraphDefinition {
  apiVersion: string;
  kind: string;
  metadata: {
    name: string;
    [key: string]: any;
  };
  spec: {
    schema?: SchemaDefinition;
    resources?: Resource[];
    [key: string]: any;
  };
}

/**
 * Represents a schema definition in a ResourceGraphDefinition
 */
export interface SchemaDefinition {
  spec?: Record<string, any>;
  status?: Record<string, any>;
}

/**
 * Represents a resource in a ResourceGraphDefinition
 */
export interface Resource {
  id: string;
  type: string;
  properties?: Record<string, any>;
  [key: string]: any;
}

/**
 * Represents a parsed type definition
 */
export interface TypeDefinition {
  baseType: string;
  modifiers: Record<string, string>;
  isValid: boolean;
  isRequired: boolean;
}

/**
 * Valid base types for schema fields
 */
export const VALID_BASE_TYPES = ["string", "integer", "boolean", "number"];

/**
 * Valid modifiers for schema fields
 */
export const VALID_MODIFIERS = [
  "required",
  "default",
  "description",
  "minimum",
  "maximum",
  "enum",
];

/**
 * Regular expressions for validating type syntax
 */
export const TYPE_PATTERNS = {
  string: /^string(\s*\|\s*.+)?$/,
  integer: /^integer(\s*\|\s*.+)?$/,
  boolean: /^boolean(\s*\|\s*.+)?$/,
  number: /^number(\s*\|\s*.+)?$/,
  array: /^\[\](.+)$/,
  map: /^map\[(.+)\](.+)$/,
};
