import * as ts from 'typescript';
import {
  FileParseResult,
  RepositoryParseResult,
  ExtractedComponent,
  ExtractedJsxElement,
  ExtractedJsxProp,
} from '@qa-automater/types';

export class ReactParser {
  /**
   * Parse a single TSX/JSX React component file.
   * - AC1: Extracts components, exports, JSX elements, line numbers, and locator props.
   * - AC2: On syntax error, returns parse_failed: true and logs error without crashing.
   */
  parseFile(filePath: string, codeContent: string): FileParseResult {
    try {
      const scriptKind =
        filePath.endsWith('.tsx') || filePath.endsWith('.jsx')
          ? ts.ScriptKind.TSX
          : ts.ScriptKind.TS;

      const sourceFile = ts.createSourceFile(
        filePath,
        codeContent,
        ts.ScriptTarget.Latest,
        true,
        scriptKind,
      );

      const components: ExtractedComponent[] = [];
      const allFileJsxElements: ExtractedJsxElement[] = [];

      // Helper to extract JSX element details
      const extractJsxElement = (
        node: ts.JsxOpeningElement | ts.JsxSelfClosingElement,
      ): ExtractedJsxElement => {
        const tagName = node.tagName.getText(sourceFile);
        const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
        const lineNumber = line + 1; // 1-indexed

        const props: ExtractedJsxProp[] = [];
        let data_testid: string | undefined;
        let aria_label: string | undefined;
        let role: string | undefined;
        let id: string | undefined;
        let name: string | undefined;
        let type: string | undefined;

        node.attributes.properties.forEach((prop) => {
          if (ts.isJsxAttribute(prop)) {
            const propName = prop.name.getText(sourceFile);
            let propValue = '';

            if (prop.initializer) {
              if (ts.isStringLiteral(prop.initializer)) {
                propValue = prop.initializer.text;
              } else if (ts.isJsxExpression(prop.initializer) && prop.initializer.expression) {
                propValue = prop.initializer.expression.getText(sourceFile);
              }
            } else {
              propValue = 'true'; // boolean flag attribute (e.g. disabled)
            }

            props.push({ name: propName, value: propValue });

            if (propName === 'data-testid' || propName === 'data-test-id') {
              data_testid = propValue;
            } else if (propName === 'aria-label') {
              aria_label = propValue;
            } else if (propName === 'role') {
              role = propValue;
            } else if (propName === 'id') {
              id = propValue;
            } else if (propName === 'name') {
              name = propValue;
            } else if (propName === 'type') {
              type = propValue;
            }
          }
        });

        return {
          tag_name: tagName,
          line_number: lineNumber,
          props,
          ...(data_testid ? { data_testid } : {}),
          ...(aria_label ? { aria_label } : {}),
          ...(role ? { role } : {}),
          ...(id ? { id } : {}),
          ...(name ? { name } : {}),
          ...(type ? { type } : {}),
        };
      };

      // Traverse nodes to extract component definitions & JSX elements
      const visitNode = (node: ts.Node, currentComponent?: ExtractedComponent) => {
        let activeComponent: ExtractedComponent | undefined = currentComponent;

        // Check if node is a React Component (Function Declaration, Variable Statement)
        if (ts.isFunctionDeclaration(node) && node.name) {
          const compName = node.name.text;
          const firstChar = compName.charAt(0);
          if (firstChar && firstChar === firstChar.toUpperCase() && firstChar !== firstChar.toLowerCase()) {
            const isExport =
              node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) || false;
            activeComponent = {
              name: compName,
              file_path: filePath,
              is_export: isExport,
              jsx_elements: [],
            };
            components.push(activeComponent);
          }
        } else if (ts.isVariableStatement(node)) {
          const isExport =
            node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) || false;
          node.declarationList.declarations.forEach((decl) => {
            if (ts.isIdentifier(decl.name) && decl.initializer) {
              const compName = decl.name.text;
              const firstChar = compName.charAt(0);
              if (firstChar && firstChar === firstChar.toUpperCase() && firstChar !== firstChar.toLowerCase()) {
                if (
                  ts.isArrowFunction(decl.initializer) ||
                  ts.isFunctionExpression(decl.initializer)
                ) {
                  activeComponent = {
                    name: compName,
                    file_path: filePath,
                    is_export: isExport,
                    jsx_elements: [],
                  };
                  components.push(activeComponent);
                }
              }
            }
          });
        }

        // Check for JSX Elements
        if (ts.isJsxElement(node)) {
          const jsxElem = extractJsxElement(node.openingElement);
          allFileJsxElements.push(jsxElem);
          if (activeComponent) {
            activeComponent.jsx_elements.push(jsxElem);
          }
        } else if (ts.isJsxSelfClosingElement(node)) {
          const jsxElem = extractJsxElement(node);
          allFileJsxElements.push(jsxElem);
          if (activeComponent) {
            activeComponent.jsx_elements.push(jsxElem);
          }
        }

        ts.forEachChild(node, (child) => visitNode(child, activeComponent));
      };

      visitNode(sourceFile);

      return {
        file_path: filePath,
        parse_failed: false,
        components,
        jsx_elements: allFileJsxElements,
      };
    } catch (err) {
      console.warn(
        `[ReactParser] Syntax/parse error in file '${filePath}':`,
        (err as Error).message,
      );
      return {
        file_path: filePath,
        parse_failed: true,
        error: (err as Error).message,
        components: [],
        jsx_elements: [],
      };
    }
  }

  /**
   * Parse multiple files in a repository, aggregating component & JSX element data.
   * Continues scan even if individual files fail to parse (AC2).
   */
  parseRepositoryFiles(
    files: Array<{ filePath: string; content: string }>,
  ): RepositoryParseResult {
    let parsedCount = 0;
    let failedCount = 0;
    const fileResults: FileParseResult[] = [];
    const allComponents: ExtractedComponent[] = [];
    const allJsxElements: ExtractedJsxElement[] = [];

    for (const file of files) {
      const result = this.parseFile(file.filePath, file.content);
      fileResults.push(result);

      if (result.parse_failed) {
        failedCount++;
      } else {
        parsedCount++;
        allComponents.push(...result.components);
        allJsxElements.push(...result.jsx_elements);
      }
    }

    return {
      total_files: files.length,
      parsed_files: parsedCount,
      failed_files: failedCount,
      components: allComponents,
      jsx_elements: allJsxElements,
      file_results: fileResults,
    };
  }
}
