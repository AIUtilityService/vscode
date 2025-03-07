import * as vscode from "vscode";

export class CELSemanticTokenProvider
  implements vscode.DocumentSemanticTokensProvider
{
  private readonly tokenTypes = [
    "celDollar",
    "celBrace",
    "celRoot",
    "celMiddle",
    "celLeaf",
  ];
  private readonly legend = new vscode.SemanticTokensLegend(this.tokenTypes);

  public getLegend(): vscode.SemanticTokensLegend {
    return this.legend;
  }

  public provideDocumentSemanticTokens(
    document: vscode.TextDocument
  ): vscode.SemanticTokens {
    const tokensBuilder = new vscode.SemanticTokensBuilder(this.legend);

    for (let lineIndex = 0; lineIndex < document.lineCount; lineIndex++) {
      const line = document.lineAt(lineIndex);
      const text = line.text;

      // Find CEL expressions
      const matches = text.match(/\${([^}]+)}/g);
      if (matches) {
        for (const match of matches) {
          const startIndex = text.indexOf(match);
          const path = match.slice(2, -1); // Remove ${ and }
          const segments = path.split(".");

          // Add token for dollar sign ($)
          tokensBuilder.push(
            lineIndex,
            startIndex,
            1, // length of $
            0, // index of celDollar
            0
          );

          // Add token for opening brace ({)
          tokensBuilder.push(
            lineIndex,
            startIndex + 1,
            1, // length of {
            1, // index of celBrace
            0
          );

          let currentIndex = startIndex + 2; // Skip ${

          // Color each segment
          segments.forEach((segment, index) => {
            let tokenType: number;
            if (index === 0) {
              tokenType = 2; // celRoot
            } else if (index === segments.length - 1) {
              tokenType = 4; // celLeaf
            } else {
              tokenType = 3; // celMiddle
            }

            tokensBuilder.push(
              lineIndex,
              currentIndex,
              segment.length,
              tokenType,
              0
            );

            currentIndex += segment.length + 1; // +1 for the dot
          });

          // Add token for closing brace (})
          tokensBuilder.push(
            lineIndex,
            startIndex + match.length - 1,
            1, // length of }
            1, // index of celBrace
            0
          );
        }
      }
    }

    return tokensBuilder.build();
  }
}
