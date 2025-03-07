import * as vscode from "vscode";

export class CELSyntaxProvider
  implements vscode.DocumentSemanticTokensProvider
{
  private readonly tokenTypes = new Map<string, number>([
    ["celRoot", 0],
    ["celField", 1],
    ["celLeafField", 2],
  ]);

  private readonly tokenModifiers = new Map<string, number>();

  public getLegend(): vscode.SemanticTokensLegend {
    return new vscode.SemanticTokensLegend(
      [...this.tokenTypes.keys()],
      [...this.tokenModifiers.keys()]
    );
  }

  async provideDocumentSemanticTokens(
    document: vscode.TextDocument
  ): Promise<vscode.SemanticTokens> {
    const builder = new vscode.SemanticTokensBuilder(this.getLegend());

    for (let lineIndex = 0; lineIndex < document.lineCount; lineIndex++) {
      const line = document.lineAt(lineIndex);
      const text = line.text;

      const matches = text.match(/\${[^}]+}/g);
      if (matches) {
        matches.forEach((match) => {
          const startIndex = text.indexOf(match);
          if (startIndex > -1) {
            const expression = match.slice(2, -1);
            const parts = expression.split(".");

            let currentIndex = startIndex + 2; // Skip ${

            // Process each part with its specific token type
            for (let i = 0; i < parts.length; i++) {
              const part = parts[i];

              // Determine token type based on position
              let tokenType;
              if (i === 0) {
                tokenType = this.tokenTypes.get("celRoot");
              } else if (i === parts.length - 1) {
                tokenType = this.tokenTypes.get("celLeafField");
              } else {
                tokenType = this.tokenTypes.get("celField");
              }

              // Push token with correct position and length
              builder.push(lineIndex, currentIndex, part.length, tokenType!, 0);

              // Move index past current part and the dot
              currentIndex += part.length;
              if (i < parts.length - 1) {
                currentIndex += 1; // Add 1 for the dot separator
              }
            }
          }
        });
      }
    }

    return builder.build();
  }
}
