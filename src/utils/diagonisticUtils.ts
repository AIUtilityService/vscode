import * as vscode from "vscode";

/**
 * Utility class for creating and managing diagnostics
 */
export class DiagnosticUtils {
  /**
   * Diagnostic collection for Kro schema validation
   */
  private static readonly diagnosticCollection =
    vscode.languages.createDiagnosticCollection("kro-schema-validation");

  /**
   * Clear diagnostics for a document
   */
  public static clearDiagnostics(document: vscode.TextDocument): void {
    this.diagnosticCollection.delete(document.uri);
  }

  /**
   * Set diagnostics for a document
   */
  public static setDiagnostics(
    document: vscode.TextDocument,
    diagnostics: vscode.Diagnostic[]
  ): void {
    this.diagnosticCollection.set(document.uri, diagnostics);
  }

  /**
   * Create an error diagnostic
   */
  public static createError(
    message: string,
    range: vscode.Range
  ): vscode.Diagnostic {
    return new vscode.Diagnostic(
      range,
      message,
      vscode.DiagnosticSeverity.Error
    );
  }

  /**
   * Create a warning diagnostic
   */
  public static createWarning(
    message: string,
    range: vscode.Range
  ): vscode.Diagnostic {
    return new vscode.Diagnostic(
      range,
      message,
      vscode.DiagnosticSeverity.Warning
    );
  }

  /**
   * Create an information diagnostic
   */
  public static createInfo(
    message: string,
    range: vscode.Range
  ): vscode.Diagnostic {
    return new vscode.Diagnostic(
      range,
      message,
      vscode.DiagnosticSeverity.Information
    );
  }

  /**
   * Create a hint diagnostic
   */
  public static createHint(
    message: string,
    range: vscode.Range
  ): vscode.Diagnostic {
    return new vscode.Diagnostic(
      range,
      message,
      vscode.DiagnosticSeverity.Hint
    );
  }

  /**
   * Add a code action to a diagnostic
   */
  public static addCodeAction(
    diagnostic: vscode.Diagnostic,
    codeActionTitle: string,
    edit: vscode.WorkspaceEdit
  ): vscode.Diagnostic {
    diagnostic.code = {
      value: codeActionTitle,
      target: vscode.Uri.parse(
        `command:kro-cde.applyFix?${encodeURIComponent(JSON.stringify([edit]))}`
      ),
    };
    return diagnostic;
  }
}
