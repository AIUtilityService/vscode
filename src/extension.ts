// src/extension.ts
import * as vscode from "vscode";
import { SchemaValidator } from "./validation/schemaValidator";
import { SchemaFixProvider } from "./actions/schemaFix";
import { CELSemanticTokenProvider } from "./provider/semanticProvider";

// Debounce timer for validation
let validationTimer: NodeJS.Timeout | undefined;

export function activate(context: vscode.ExtensionContext) {
  const validateCommand = vscode.commands.registerCommand(
    "kro-cde.validateSchema",
    () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        SchemaValidator.validate(editor.document);
      }
    }
  );
  context.subscriptions.push(validateCommand);

  // Register the code action provider
  const codeActionProvider = vscode.languages.registerCodeActionsProvider(
    { language: "yaml" },
    new SchemaFixProvider(),
    {
      providedCodeActionKinds: SchemaFixProvider.providedCodeActionKinds,
    }
  );
  context.subscriptions.push(codeActionProvider);

  // Create a status bar item
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusBarItem.text = "$(check) Kro Schema";
  statusBarItem.tooltip = "Validate Kro Schema";
  statusBarItem.command = "kro-cde.validateSchema";
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // Validate on document open
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((document) => {
      if (document.languageId === "yaml") {
        SchemaValidator.validate(document);
      }
    })
  );

  // Validate on document save
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((document) => {
      if (document.languageId === "yaml") {
        SchemaValidator.validate(document);
      }
    })
  );

  // Validate on document change (with debounce)
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (event.document.languageId === "yaml") {
        // Clear existing timeout
        if (validationTimer) {
          clearTimeout(validationTimer);
        }

        // Set new timeout
        validationTimer = setTimeout(() => {
          SchemaValidator.validate(event.document);
        }, 500);
      }
    })
  );
  const semanticTokensProvider = new CELSemanticTokenProvider();
  context.subscriptions.push(
    vscode.languages.registerDocumentSemanticTokensProvider(
      { language: "yaml" },
      semanticTokensProvider,
      semanticTokensProvider.getLegend()
    )
  );
  // Validate all open documents
  vscode.workspace.textDocuments.forEach((document) => {
    if (document.languageId === "yaml") {
      SchemaValidator.validate(document);
    }
  });
}

export function deactivate() {
  console.log("Kro Schema Validator deactivated");
}
