import { LocatorStrategy } from '@qa-automater/types';

export interface PlaywrightMapperOptions {
  exact?: boolean;
  role?: string;
  name?: string;
}

export class PlaywrightCodeMapper {
  /**
   * Maps a locator strategy and value to a semantic Playwright API expression string.
   *
   * @param strategy - The locator strategy type ('testid', 'role_name', 'label', 'text', 'placeholder', 'id', 'name', 'css')
   * @param value - The raw selector or value string (e.g. 'login-submit', 'button:Sign In')
   * @param options - Additional options such as exact match or explicit role/name overrides
   * @returns Playwright locator code string (e.g. "page.getByTestId('login-submit')", "page.getByRole('button', { name: 'Sign In' })")
   */
  public map(
    strategy: LocatorStrategy | string,
    value: string,
    options?: PlaywrightMapperOptions,
  ): string {
    const sanitizedValue = value.trim();

    switch (strategy) {
      case 'testid':
        return `page.getByTestId('${this.escapeQuotes(sanitizedValue)}')`;

      case 'role_name':
        return this.mapRoleName(sanitizedValue, options);

      case 'label':
        return `page.getByLabel('${this.escapeQuotes(sanitizedValue)}')`;

      case 'text':
        return `page.getByText('${this.escapeQuotes(sanitizedValue)}')`;

      case 'placeholder':
        return `page.getByPlaceholder('${this.escapeQuotes(sanitizedValue)}')`;

      case 'id': {
        const idVal = sanitizedValue.startsWith('#') ? sanitizedValue.slice(1) : sanitizedValue;
        return `page.locator('#${this.escapeQuotes(idVal)}')`;
      }

      case 'name':
        return `page.locator('[name="${this.escapeDoubleQuotes(sanitizedValue)}"]')`;

      case 'css':
      default:
        return this.mapCss(sanitizedValue);
    }
  }

  private mapRoleName(value: string, options?: PlaywrightMapperOptions): string {
    let role = options?.role;
    let name = options?.name;

    if (!role || !name) {
      if (value.includes(':')) {
        const parts = value.split(':');
        role = role ?? parts[0]?.trim();
        name = name ?? parts.slice(1).join(':').trim();
      } else {
        name = name ?? value;
      }
    }

    const exactOption = options?.exact ? ', exact: true' : '';

    if (role && name) {
      return `page.getByRole('${this.escapeQuotes(role)}', { name: '${this.escapeQuotes(name)}'${exactOption} })`;
    }

    if (role) {
      return options?.exact
        ? `page.getByRole('${this.escapeQuotes(role)}', { exact: true })`
        : `page.getByRole('${this.escapeQuotes(role)}')`;
    }

    return `page.getByText('${this.escapeQuotes(name || value)}')`;
  }

  private mapCss(value: string): string {
    if (value.startsWith('page.')) {
      return value;
    }
    return `page.locator('${this.escapeQuotes(value)}')`;
  }

  private escapeQuotes(val: string): string {
    return val.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  }

  private escapeDoubleQuotes(val: string): string {
    return val.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }
}

export const defaultPlaywrightCodeMapper = new PlaywrightCodeMapper();

export function mapLocatorToPlaywright(
  strategy: LocatorStrategy | string,
  value: string,
  options?: PlaywrightMapperOptions,
): string {
  return defaultPlaywrightCodeMapper.map(strategy, value, options);
}
