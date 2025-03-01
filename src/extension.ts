import * as vscode from "vscode";
import { SchemaValidator } from "./validation/schemaValidator";

/**
 * Activates the extension
 */
export function activate(context: vscode.ExtensionContext) {
  console.log("Kro Schema Validator is now active");

  // Register commands
  const validateCommand = vscode.commands.registerCommand(
    "kro-cde.validateSchema",
    () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        SchemaValidator.validate(editor.document);
        vscode.window.showInformationMessage("Kro schema validation complete");
      }
    }
  );

  context.subscriptions.push(validateCommand);

  // Create status bar item
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusBarItem.text = "$(check) Kro";
  statusBarItem.tooltip = "Validate Kro ResourceGraphDefinition";
  statusBarItem.command = "kro-cde.validateSchema";
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // Validate on document open and save
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((document) => {
      if (document.languageId === "yaml") {
        SchemaValidator.validate(document);
      }
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((document) => {
      if (document.languageId === "yaml") {
        SchemaValidator.validate(document);
      }
    })
  );

  // Validate on document change (with debounce)
  let timeout: NodeJS.Timeout | undefined = undefined;
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (event.document.languageId === "yaml") {
        if (timeout) {
          clearTimeout(timeout);
          timeout = undefined;
        }
        timeout = setTimeout(() => {
          SchemaValidator.validate(event.document);
        }, 500);
      }
    })
  );

  // Validate all open YAML documents
  vscode.workspace.textDocuments.forEach((document) => {
    if (document.languageId === "yaml") {
      SchemaValidator.validate(document);
    }
  });
}

/**
 * Deactivates the extension
 */
export function deactivate() {
  console.log("Kro Schema Validator is now deactivated");
}
