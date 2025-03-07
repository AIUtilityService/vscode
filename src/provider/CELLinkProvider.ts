import * as vscode from "vscode";

export class CELDocumentLinkProvider implements vscode.DocumentLinkProvider {
  async provideDocumentLinks(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): Promise<vscode.DocumentLink[]> {
    const links: vscode.DocumentLink[] = [];

    for (let lineIndex = 0; lineIndex < document.lineCount; lineIndex++) {
      const line = document.lineAt(lineIndex);
      const text = line.text;

      // Find CEL expressions
      const matches = text.match(/\${([^}]+)}/g);
      if (matches) {
        for (const match of matches) {
          const startIndex = text.indexOf(match);
          const range = new vscode.Range(
            lineIndex,
            startIndex,
            lineIndex,
            startIndex + match.length
          );

          // Extract the field path from the CEL expression
          const fieldPath = match.substring(2, match.length - 1); // Remove ${ and }

          // Check if it's a resource reference
          if (
            fieldPath.startsWith("deployment.") ||
            fieldPath.startsWith("service.") ||
            fieldPath.startsWith("configmap.") ||
            fieldPath.startsWith("secret.")
          ) {
            // For resource references, find in resources section
            const targetPosition = this.findPositionInResources(
              document,
              fieldPath
            );
            if (targetPosition) {
              const link = new vscode.DocumentLink(range);
              link.target = document.uri.with({
                fragment: `L${targetPosition.line + 1},${targetPosition.character + 1}`,
              });
              links.push(link);
            }
          } else {
            // For schema references
            const targetPosition = this.findPositionOfField(
              document,
              fieldPath
            );
            if (targetPosition) {
              const link = new vscode.DocumentLink(range);
              link.target = document.uri.with({
                fragment: `L${targetPosition.line + 1},${targetPosition.character + 1}`,
              });
              links.push(link);
            }
          }
        }
      }
    }

    return links;
  }

  private findPositionInResources(
    document: vscode.TextDocument,
    fieldPath: string
  ): vscode.Position | undefined {
    const parts = fieldPath.split(".");
    const resourceType = parts[0]; // e.g., 'deployment'
    let inResourcesSection = false;
    let inCorrectResource = false;
    let indentationLevel = 0;

    for (let i = 0; i < document.lineCount; i++) {
      const line = document.lineAt(i);
      const text = line.text;
      const trimmedText = text.trim();
      const currentIndentation = text.search(/\S/);

      // Find resources section
      if (trimmedText === "resources:") {
        inResourcesSection = true;
        indentationLevel = currentIndentation;
        continue;
      }

      // Exit resources section if we hit a line with less indentation
      if (
        inResourcesSection &&
        currentIndentation <= indentationLevel &&
        trimmedText !== ""
      ) {
        if (!trimmedText.startsWith("-")) {
          inResourcesSection = false;
          inCorrectResource = false;
          continue;
        }
      }

      if (inResourcesSection) {
        // Find the specific resource
        if (
          trimmedText.startsWith("- kind:") &&
          trimmedText.toLowerCase().includes(resourceType.toLowerCase())
        ) {
          inCorrectResource = true;
          continue;
        }

        // Reset resource match when hitting a new resource
        if (trimmedText.startsWith("- kind:") && inCorrectResource) {
          inCorrectResource = false;
          continue;
        }

        // If we're in the correct resource, look for the field
        if (inCorrectResource) {
          const section = parts[1]; // 'status' or 'spec'
          if (trimmedText.startsWith(section + ":")) {
            // Look for remaining parts of the path
            const remainingParts = parts.slice(2);
            let currentLine = i;
            let currentPart = 0;

            while (
              currentLine < document.lineCount &&
              currentPart < remainingParts.length
            ) {
              const nextLine = document.lineAt(currentLine + 1);
              const nextText = nextLine.text.trim();

              if (nextText.startsWith(remainingParts[currentPart] + ":")) {
                if (currentPart === remainingParts.length - 1) {
                  // Found the final field
                  return new vscode.Position(
                    nextLine.lineNumber,
                    nextLine.firstNonWhitespaceCharacterIndex
                  );
                }
                currentPart++;
              }
              currentLine++;
            }
          }
        }
      }
    }

    return undefined;
  }
  /**
   * Find position of a field in the document
   */
  private findPositionOfField(
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
}
