import { readFileSync } from 'node:fs';
import path from 'node:path';

import { USER_THEME } from '#~/components/themes/constants';
import { getInitialThemeClassName, handleThemeChange } from '#~/components/themes/helpers';

/** The class selector of the stylesheet's `dark` variant, as `index.css` declares it. */
function readDarkVariantClass() {
  const css = readFileSync(path.resolve(import.meta.dirname, '../../../src/index.css'), 'utf8');
  const [, darkClass] = /@custom-variant dark \(&:where\(\.([\w-]+)/.exec(css) ?? [];
  if (darkClass === undefined) throw new Error('index.css declares no dark variant');
  return darkClass;
}

describe('theme classes', () => {
  afterEach(() => {
    document.documentElement.className = '';
  });

  it('switches the document to the class the dark variant styles, and back', () => {
    const darkClass = readDarkVariantClass();

    handleThemeChange(USER_THEME.DARK);
    expect(document.documentElement.classList.contains(darkClass)).toBe(true);

    handleThemeChange(USER_THEME.LIGHT);
    expect(document.documentElement.classList.contains(darkClass)).toBe(false);
  });

  it('renders a dark theme with the dark variant class on the server', () => {
    expect(getInitialThemeClassName(USER_THEME.DARK)).toBe(readDarkVariantClass());
  });
});
