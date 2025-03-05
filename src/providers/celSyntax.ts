import * as vscode from "vscode";

export class CELSyntaxProvider
  implements vscode.DocumentSemanticTokensProvider
{
  private readonly tokenTypes = new Map<string, number>([
    ["celExpression", 0],
    ["variable", 1],
    ["operator", 2],
    ["function", 3],
  ]);

  private readonly tokenModifiers = new Map<string, number>([
    ["declaration", 0],
    ["readonly", 1],
  ]);

  private readonly legend = new vscode.SemanticTokensLegend(
    [...this.tokenTypes.keys()],
    [...this.tokenModifiers.keys()]
  );

  public getLegend(): vscode.SemanticTokensLegend {
    return this.legend;
  }

  async provideDocumentSemanticTokens(
    document: vscode.TextDocument
  ): Promise<vscode.SemanticTokens> {
    const builder = new vscode.SemanticTokensBuilder(this.legend);

    for (let lineIndex = 0; lineIndex < document.lineCount; lineIndex++) {
      const line = document.lineAt(lineIndex);
      const text = line.text;

      // Find CEL expressions in the line
      const matches = text.match(/\${[^}]+}/g);
      if (matches) {
        matches.forEach((match) => {
          const startIndex = text.indexOf(match);
          if (startIndex > -1) {
            // Highlight the entire CEL expression
            builder.push(
              lineIndex,
              startIndex,
              match.length,
              this.tokenTypes.get("celExpression")!,
              0
            );

            // Additional parsing for internal CEL components
            // You can add more sophisticated parsing here
          }
        });
      }
    }

    return builder.build();
  }
}
