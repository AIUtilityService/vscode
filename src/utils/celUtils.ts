export class CELUtils {
  public static isCELExpression(value: any): boolean {
    if (typeof value !== "string") {
      return false;
    }
    return value.startsWith("${") && value.endsWith("}");
  }
}
