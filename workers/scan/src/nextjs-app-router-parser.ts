import { AppRouterRoute, AppRouterParseResult } from '@qa-automater/types';
import { ReactParser } from './react-parser';

export class NextJsAppRouterParser {
  private reactParser: ReactParser;

  constructor() {
    this.reactParser = new ReactParser();
  }

  /**
   * Calculates the Next.js App Router URL route path from a file path.
   * Handles:
   * - Root page: app/page.tsx -> "/"
   * - Subdirectories: app/login/page.tsx -> "/login"
   * - Route groups: app/(auth)/login/page.tsx -> "/login"
   * - Src directory: src/app/dashboard/page.tsx -> "/dashboard"
   * - Dynamic routes: app/users/[id]/page.tsx -> "/users/[id]"
   * - Private folders: app/_components/page.tsx -> null (ignored)
   */
  public pathToRoute(filePath: string): string | null {
    const normalized = filePath.replace(/\\/g, '/').replace(/^\.\//, '');
    const segments = normalized.split('/');
    const fileName = segments[segments.length - 1];

    // Page file check (page.tsx, page.jsx, page.ts, page.js)
    if (!fileName || !/^page\.(tsx|jsx|ts|js)$/i.test(fileName)) {
      return null;
    }

    // Locate "app" folder in directory hierarchy
    const appIndex = segments.lastIndexOf('app');
    if (appIndex === -1) {
      return null;
    }

    // Extract directory segments between "app" and "page.ext"
    const routeSegments = segments.slice(appIndex + 1, segments.length - 1);

    const validRouteSegments: string[] = [];

    for (const segment of routeSegments) {
      // Private folders start with "_" and are excluded from routing
      if (segment.startsWith('_')) {
        return null;
      }
      // Route groups start with "(" and end with ")" and are omitted from URL path
      if (segment.startsWith('(') && segment.endsWith(')')) {
        continue;
      }
      validRouteSegments.push(segment);
    }

    if (validRouteSegments.length === 0) {
      return '/';
    }

    return '/' + validRouteSegments.join('/');
  }

  /**
   * Parses a single Next.js App Router page file and extracts route info with JSX elements.
   */
  public parseRouteFile(filePath: string, codeContent: string): AppRouterRoute | null {
    const routePath = this.pathToRoute(filePath);
    if (!routePath) {
      return null;
    }

    const parseResult = this.reactParser.parseFile(filePath, codeContent);
    const exportedComp = parseResult.components.find((c) => c.is_export);
    const mainComp = exportedComp || parseResult.components[0];

    return {
      route_path: routePath,
      file_path: filePath.replace(/\\/g, '/'),
      component_name: mainComp ? mainComp.name : undefined,
      jsx_elements: parseResult.jsx_elements,
    };
  }

  /**
   * Parses an array of repository files and extracts all valid Next.js App Router routes.
   */
  public parseRepositoryRoutes(
    files: Array<{ filePath: string; content: string }>,
  ): AppRouterParseResult {
    const routes: AppRouterRoute[] = [];

    for (const file of files) {
      const route = this.parseRouteFile(file.filePath, file.content);
      if (route) {
        routes.push(route);
      }
    }

    return {
      routes,
      total_routes: routes.length,
    };
  }
}
