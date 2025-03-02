import * as vscode from "vscode";

export class SchemaFixProvider implements vscode.CodeActionProvider {
  public static readonly providedCodeActionKinds = [
    vscode.CodeActionKind.QuickFix,
  ];

  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext
  ): vscode.CodeAction[] | undefined {
    const actions: vscode.CodeAction[] = [];

    // Process each diagnostic
    for (const diagnostic of context.diagnostics) {
      // Only process our own diagnostics
      if (diagnostic.source !== "kro-schema-validation") {
        continue;
      }

      // Handle missing or incorrect apiVersion
      if (diagnostic.message.includes("apiVersion")) {
        const fixAction = this.createApiVersionFix(document, diagnostic);
        if (fixAction) {
          actions.push(fixAction);
        }
      }

      // Handle missing or incorrect kind
      if (diagnostic.message.includes("kind")) {
        const fixAction = this.createKindFix(document, diagnostic);
        if (fixAction) {
          actions.push(fixAction);
        }
      }

      // Handle empty document
      if (diagnostic.message.includes("Empty document")) {
        const fixAction = this.createEmptyDocumentFix(document, diagnostic);
        if (fixAction) {
          actions.push(fixAction);
        }
      }
    }

    return actions;
  }

  private createApiVersionFix(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic
  ): vscode.CodeAction | undefined {
    const fix = new vscode.CodeAction(
      "Add correct apiVersion",
      vscode.CodeActionKind.QuickFix
    );
    fix.diagnostics = [diagnostic];

    const edit = new vscode.WorkspaceEdit();

    // If first line exists but is incorrect
    if (diagnostic.message.includes("Invalid apiVersion")) {
      const range = new vscode.Range(0, 0, 0, document.lineAt(0).text.length);
      edit.replace(document.uri, range, "apiVersion: kro.run/v1alpha1");
    }
    // If apiVersion is missing
    else if (diagnostic.message.includes("First line must be")) {
      if (document.lineCount === 0) {
        edit.insert(
          document.uri,
          new vscode.Position(0, 0),
          "apiVersion: kro.run/v1alpha1\n"
        );
      } else {
        edit.insert(
          document.uri,
          new vscode.Position(0, 0),
          "apiVersion: kro.run/v1alpha1\n"
        );
      }
    }

    fix.edit = edit;
    return fix;
  }

  private createKindFix(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic
  ): vscode.CodeAction | undefined {
    const fix = new vscode.CodeAction(
      "Add correct kind",
      vscode.CodeActionKind.QuickFix
    );
    fix.diagnostics = [diagnostic];

    const edit = new vscode.WorkspaceEdit();

    // If second line exists but is incorrect
    if (diagnostic.message.includes("Invalid kind")) {
      const range = new vscode.Range(1, 0, 1, document.lineAt(1).text.length);
      edit.replace(document.uri, range, "kind: ResourceGraphDefinition");
    }
    // If kind is missing
    else if (
      diagnostic.message.includes("Second line must be") ||
      diagnostic.message.includes("Missing kind")
    ) {
      if (document.lineCount <= 1) {
        edit.insert(
          document.uri,
          new vscode.Position(1, 0),
          "kind: ResourceGraphDefinition\n"
        );
      } else {
        const position = new vscode.Position(1, 0);
        edit.insert(document.uri, position, "kind: ResourceGraphDefinition\n");
      }
    }

    fix.edit = edit;
    return fix;
  }

  private createEmptyDocumentFix(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic
  ): vscode.CodeAction | undefined {
    const fix = new vscode.CodeAction(
      "Add schema template",
      vscode.CodeActionKind.QuickFix
    );
    fix.diagnostics = [diagnostic];

    const edit = new vscode.WorkspaceEdit();
    const template =
      "apiVersion: kro.run/v1alpha1\nkind: ResourceGraphDefinition\n";

    edit.insert(document.uri, new vscode.Position(0, 0), template);
    fix.edit = edit;

    return fix;
  }
}
