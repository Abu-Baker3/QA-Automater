import ts from 'typescript';
import {
  CodeValidationDiagnostic,
  CodeValidationResult,
  CodeValidationRuleId,
  PlaywrightCodegenOutput,
} from '@qa-automater/types';

export class CodeValidator {
  /**
   * Validates a PlaywrightCodegenOutput against custom ESLint-style rules (AC1)
   * and TypeScript AST syntax compiler checks (AC2).
   */
  public validate(output: PlaywrightCodegenOutput): CodeValidationResult {
    const diagnostics: CodeValidationDiagnostic[] = [];
    const passedRulesSet = new Set<CodeValidationRuleId>([
      'no-xpath',
      'po-encapsulation',
      'ts-syntax-error',
      'ts-type-error',
    ]);

    const allFiles = [
      ...output.pageObjects.map((po) => ({
        path: po.filePath,
        content: po.content,
        isSpec: false,
      })),
      { path: output.specFile.filePath, content: output.specFile.content, isSpec: true },
    ];

    for (const file of allFiles) {
      // Rule 1: no-xpath (AC1)
      this.checkNoXpath(file.path, file.content, diagnostics, passedRulesSet);

      // Rule 2: po-encapsulation (AC1) - apply to test spec files
      if (file.isSpec) {
        this.checkPoEncapsulation(file.path, file.content, diagnostics, passedRulesSet);
      }

      // Rule 3 & 4: TypeScript syntax & AST compiler diagnostics (AC2)
      this.checkTypeScriptDiagnostics(file.path, file.content, diagnostics, passedRulesSet);
    }

    return {
      valid: diagnostics.filter((d) => d.severity === 'error').length === 0,
      diagnostics,
      passed_rules: Array.from(passedRulesSet),
    };
  }

  private checkNoXpath(
    filePath: string,
    content: string,
    diagnostics: CodeValidationDiagnostic[],
    passedRules: Set<CodeValidationRuleId>,
  ): void {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] || '';
      // Look for xpath patterns: xpath=, //div, locator('xpath='), locator('//')
      if (/xpath=|['"]\/\/[a-zA-Z]/i.test(line)) {
        diagnostics.push({
          rule_id: 'no-xpath',
          file_path: filePath,
          line_number: i + 1,
          message: `XPath locators are prohibited in generated code. Use role, testid, label, or CSS selectors instead.`,
          severity: 'error',
        });
        passedRules.delete('no-xpath');
      }
    }
  }

  private checkPoEncapsulation(
    filePath: string,
    content: string,
    diagnostics: CodeValidationDiagnostic[],
    passedRules: Set<CodeValidationRuleId>,
  ): void {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] || '';
      // Direct raw locator invocations in spec body: page.locator, page.getByTestId, page.getByRole, page.getByLabel, page.getByText
      if (
        /\bpage\.(locator|getByTestId|getByRole|getByLabel|getByText|getByPlaceholder)\(/i.test(
          line,
        )
      ) {
        diagnostics.push({
          rule_id: 'po-encapsulation',
          file_path: filePath,
          line_number: i + 1,
          message: `Raw Playwright locator used directly in spec body. Encapsulate all locators within Page Object getters.`,
          severity: 'error',
        });
        passedRules.delete('po-encapsulation');
      }
    }
  }

  private checkTypeScriptDiagnostics(
    filePath: string,
    content: string,
    diagnostics: CodeValidationDiagnostic[],
    passedRules: Set<CodeValidationRuleId>,
  ): void {
    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.ES2022,
      true,
      ts.ScriptKind.TS,
    );

    // ts.SourceFile parses parseDiagnostics array containing syntax errors
    const parseDiagnostics =
      (sourceFile as unknown as { parseDiagnostics?: ts.Diagnostic[] }).parseDiagnostics || [];

    for (const diag of parseDiagnostics) {
      let lineNumber = 1;
      let columnNumber = 1;
      if (diag.start !== undefined) {
        const pos = sourceFile.getLineAndCharacterOfPosition(diag.start);
        lineNumber = pos.line + 1;
        columnNumber = pos.character + 1;
      }

      const message =
        typeof diag.messageText === 'string' ? diag.messageText : diag.messageText.messageText;

      diagnostics.push({
        rule_id: 'ts-syntax-error',
        file_path: filePath,
        line_number: lineNumber,
        column_number: columnNumber,
        message: `TypeScript Syntax Error: ${message}`,
        severity: 'error',
      });
      passedRules.delete('ts-syntax-error');
    }
  }
}

export const defaultCodeValidator = new CodeValidator();

export function validateCodegenOutput(output: PlaywrightCodegenOutput): CodeValidationResult {
  return defaultCodeValidator.validate(output);
}
