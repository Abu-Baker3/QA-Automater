import ts from 'typescript';
import {
  ComponentNode,
  ComponentEdge,
  ComponentImportGraph,
  AppRouterRoute,
} from '@qa-automater/types';
import { ReactParser } from './react-parser';

export interface ImportSpecifier {
  specifier: string;
  importedName: string;
  localName: string;
}

export class ComponentImportGraphBuilder {
  private reactParser: ReactParser;
  private maxDepth: number;

  constructor(maxDepth = 10) {
    this.reactParser = new ReactParser();
    this.maxDepth = maxDepth;
  }

  /**
   * Extracts import declarations from a TypeScript/JavaScript source file code string.
   */
  public parseImports(filePath: string, codeContent: string): ImportSpecifier[] {
    const imports: ImportSpecifier[] = [];
    const sourceFile = ts.createSourceFile(
      filePath,
      codeContent,
      ts.ScriptTarget.Latest,
      true,
      filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );

    const visit = (node: ts.Node) => {
      if (ts.isImportDeclaration(node)) {
        const specifier = (node.moduleSpecifier as ts.StringLiteral).text;
        if (node.importClause) {
          // Default import: import CustomComp from './CustomComp'
          if (node.importClause.name) {
            imports.push({
              specifier,
              importedName: 'default',
              localName: node.importClause.name.text,
            });
          }
          // Named imports: import { LoginForm, Button } from './components'
          if (
            node.importClause.namedBindings &&
            ts.isNamedImports(node.importClause.namedBindings)
          ) {
            node.importClause.namedBindings.elements.forEach((el) => {
              imports.push({
                specifier,
                importedName: el.propertyName ? el.propertyName.text : el.name.text,
                localName: el.name.text,
              });
            });
          }
        }
      }
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return imports;
  }

  /**
   * Resolves relative or alias import specifiers to an actual file path in availableFiles.
   */
  public resolveImportPath(
    importSpecifier: string,
    currentFilePath: string,
    availableFiles: string[],
  ): string | null {
    if (!importSpecifier.startsWith('.') && !importSpecifier.startsWith('@/')) {
      return null; // External package import (e.g. 'react', 'next')
    }

    const currentNormalized = currentFilePath.replace(/\\/g, '/');
    const currentDir = currentNormalized.substring(0, currentNormalized.lastIndexOf('/'));

    let basePath = '';
    if (importSpecifier.startsWith('@/')) {
      // Alias path mapping: '@/components/LoginForm' -> 'src/components/LoginForm' or 'components/LoginForm'
      basePath = importSpecifier.replace(/^@\//, '');
    } else {
      // Relative path: './LoginForm' or '../components/LoginForm'
      const parts = (currentDir + '/' + importSpecifier).split('/');
      const stack: string[] = [];
      for (const part of parts) {
        if (part === '' || part === '.') continue;
        if (part === '..') {
          stack.pop();
        } else {
          stack.push(part);
        }
      }
      basePath = stack.join('/');
    }

    // Try matching file candidates with extensions
    const candidates = [
      basePath,
      `${basePath}.tsx`,
      `${basePath}.ts`,
      `${basePath}.jsx`,
      `${basePath}.js`,
      `${basePath}/index.tsx`,
      `${basePath}/index.ts`,
      `${basePath}/index.jsx`,
      `${basePath}/index.js`,
      `src/${basePath}.tsx`,
      `src/${basePath}.ts`,
      `src/${basePath}/index.tsx`,
    ];

    const normalizedAvailable = availableFiles.map((f) => f.replace(/\\/g, '/'));

    for (const cand of candidates) {
      const foundIdx = normalizedAvailable.indexOf(cand);
      if (foundIdx !== -1) {
        return normalizedAvailable[foundIdx]!;
      }
    }

    return null;
  }

  /**
   * Builds the component import graph across all repository files.
   * Enforces depth limit to stop gracefully on barrel re-exports or circular dependencies.
   */
  public buildGraph(
    files: Array<{ filePath: string; content: string }>,
    routes: AppRouterRoute[] = [],
  ): ComponentImportGraph {
    const nodes: Record<string, ComponentNode> = {};
    const edges: ComponentEdge[] = [];
    const rootRouteIds: string[] = [];

    const availableFiles = files.map((f) => f.filePath);
    const fileMap = new Map<string, string>();
    files.forEach((f) => fileMap.set(f.filePath.replace(/\\/g, '/'), f.content));

    const routeMap = new Map<string, AppRouterRoute>();
    routes.forEach((r) => routeMap.set(r.file_path.replace(/\\/g, '/'), r));

    // Step 1: Discover all component nodes across files
    files.forEach((file) => {
      const normPath = file.filePath.replace(/\\/g, '/');
      const parseResult = this.reactParser.parseFile(normPath, file.content);
      const appRoute = routeMap.get(normPath);

      parseResult.components.forEach((comp) => {
        const nodeId = `${normPath}:${comp.name}`;
        nodes[nodeId] = {
          id: nodeId,
          file_path: normPath,
          component_name: comp.name,
          is_page: !!appRoute,
          route_path: appRoute ? appRoute.route_path : undefined,
          jsx_elements: parseResult.jsx_elements.filter(
            (elem) => elem.tag_name !== comp.name.toLowerCase(),
          ),
        };

        if (appRoute && !rootRouteIds.includes(nodeId)) {
          rootRouteIds.push(nodeId);
        }
      });
    });

    // Step 2: Build parent-to-child import edges with depth limit tracking
    const buildEdges = (
      currentFile: string,
      currentParentId: string,
      depth: number,
      visited: Set<string>,
    ) => {
      // AC2: Stop gracefully when depth limit reached or cycle detected
      if (depth >= this.maxDepth || visited.has(currentFile)) {
        return;
      }

      visited.add(currentFile);
      const content = fileMap.get(currentFile);
      if (!content) return;

      const imports = this.parseImports(currentFile, content);

      for (const imp of imports) {
        const targetFile = this.resolveImportPath(imp.specifier, currentFile, availableFiles);
        if (!targetFile) continue;

        // Find child component nodes in target file
        const childCompName = imp.importedName === 'default' ? imp.localName : imp.importedName;

        const targetNodeId = `${targetFile}:${childCompName}`;
        const targetNode =
          nodes[targetNodeId] || Object.values(nodes).find((n) => n.file_path === targetFile);

        if (targetNode) {
          // Avoid duplicate edges
          const edgeExists = edges.some(
            (e) => e.parent_id === currentParentId && e.child_id === targetNode.id,
          );
          if (!edgeExists) {
            edges.push({
              parent_id: currentParentId,
              child_id: targetNode.id,
              imported_as: imp.localName,
            });
          }

          // Recurse down child component dependencies
          buildEdges(targetFile, targetNode.id, depth + 1, new Set(visited));
        }
      }
    };

    // Traverse starting from root route components
    rootRouteIds.forEach((rootId) => {
      const rootNode = nodes[rootId];
      if (rootNode) {
        buildEdges(rootNode.file_path, rootId, 0, new Set());
      }
    });

    // Fallback: If no routes provided, build edges for all discovered components
    if (rootRouteIds.length === 0) {
      Object.values(nodes).forEach((node) => {
        buildEdges(node.file_path, node.id, 0, new Set());
      });
    }

    return {
      nodes,
      edges,
      root_route_ids: rootRouteIds,
    };
  }
}
