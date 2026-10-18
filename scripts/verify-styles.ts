#!/usr/bin/env tsx
/**
 * Style policy for the web app. Colors, radii and motion live in `styles/tokens.css` and reach components only
 * through the Tailwind theme declared in `index.css`.
 *
 *   1. Every stylesheet under `apps/web/src` is on the allowlist below.
 *   2. Every token declared in `tokens.css` is exposed through `var(--token)` in `index.css`.
 *   3. No raw color (hex, rgb/hsl/oklch/color() functions, named CSS colors, Tailwind palette utilities such as
 *      `text-red-600`) appears in a `.css`, `.ts` or `.tsx` file other than `tokens.css`.
 *
 * Usage: `pnpm run verify:styles` (or `tsx scripts/verify-styles.ts`). Findings print as `file:line message` and the
 * process exits with 1 when there are any.
 */

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPOSITORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WEB_SOURCE_ROOT = path.join(REPOSITORY_ROOT, 'apps', 'web', 'src');

const TOKENS_STYLESHEET = 'apps/web/src/styles/tokens.css';
const THEME_STYLESHEET = 'apps/web/src/index.css';
const STYLESHEET_ALLOWLIST = new Set([THEME_STYLESHEET, TOKENS_STYLESHEET]);

const STYLESHEET_EXTENSION = '.css';
const SCANNED_EXTENSIONS = new Set([STYLESHEET_EXTENSION, '.ts', '.tsx']);

const TAILWIND_PALETTE_NAMES = [
  'slate',
  'gray',
  'zinc',
  'neutral',
  'stone',
  'taupe',
  'mauve',
  'mist',
  'olive',
  'red',
  'orange',
  'amber',
  'yellow',
  'lime',
  'green',
  'emerald',
  'teal',
  'cyan',
  'sky',
  'blue',
  'indigo',
  'violet',
  'purple',
  'fuchsia',
  'pink',
  'rose',
];

const TAILWIND_COLOR_UTILITIES = [
  'bg',
  'text',
  'border',
  'border-[xytrblse]',
  'from',
  'via',
  'to',
  'ring',
  'ring-offset',
  'inset-ring',
  'fill',
  'stroke',
  'outline',
  'decoration',
  'divide',
  'shadow',
  'inset-shadow',
  'drop-shadow',
  'accent',
  'caret',
  'placeholder',
  'scrollbar',
];

const CSS_NAMED_COLORS = `
  aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood
  cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray
  darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen
  darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue
  firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew
  hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan
  lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray
  lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue
  mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred
  midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid
  palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple
  rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue
  slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white
  whitesmoke yellow yellowgreen
`
  .trim()
  .split(/\s+/)
  .join('|');

const COLOR_FUNCTIONS = ['rgb', 'rgba', 'hsl', 'hsla', 'hwb', 'lab', 'lch', 'oklab', 'oklch', 'color'].join('|');

const RAW_COLOR_PATTERN = new RegExp(`(?<![\\w&])#[\\da-f]{3,8}\\b|(?<![\\w-])(?:${COLOR_FUNCTIONS})\\(`, 'giu');

const TAILWIND_PALETTE_PATTERN = new RegExp(
  `(?<![\\w-])(?:${TAILWIND_COLOR_UTILITIES.join('|')})-(?:(?:${TAILWIND_PALETTE_NAMES.join('|')})-\\d{2,3}|white|black)` +
    '(?:\\/(?:\\d+|\\[[^\\]]+\\]))?(?![\\w-])',
  'gu',
);

const CSS_DECLARATION_PATTERN = /(?<![\w-])(?<property>--[\w-]+|[a-z-]+)\s*:\s*(?<value>[^;{}]+)/giu;
const CSS_COLOR_PROPERTY_PATTERN = /^--|color|background|border|outline|fill|stroke|shadow|decoration|column-rule/iu;
const CSS_NAMED_COLOR_PATTERN = new RegExp(`(?<![\\w-])(?:${CSS_NAMED_COLORS})(?![\\w(-])`, 'giu');
const CSS_NON_COLOR_VALUE_PATTERN = /url\([^)]*\)|"[^"]*"|'[^']*'/gu;

const SCRIPT_NAMED_COLOR_PATTERN = new RegExp(
  `\\b(?:color|backgroundColor|background|borderColor|outlineColor|fill|stroke|stopColor|floodColor|caretColor|accentColor)\\s*[:=]\\s*\\{?\\s*['"\`](?:${CSS_NAMED_COLORS})['"\`]`,
  'giu',
);

const TOKEN_DECLARATION_PATTERN = /(?<![\w-])(--[a-z\d-]+)\s*:/giu;
const CSS_BLOCK_COMMENT_PATTERN = /\/\*[\s\S]*?\*\//gu;

interface iStyleViolation {
  filePath: string;
  line: number;
  message: string;
}

interface iSourceFile {
  absolutePath: string;
  repositoryPath: string;
}

class StyleVerifier {
  public async verify() {
    const sourceFiles = await this.collectSourceFiles(WEB_SOURCE_ROOT);
    const violations = [
      ...this.verifyStylesheetAllowlist(sourceFiles),
      ...(await this.verifyTokenExposure()),
      ...(await this.verifyNoRawColors(sourceFiles)),
    ];

    this.report(violations, sourceFiles);
  }

  private verifyStylesheetAllowlist(sourceFiles: iSourceFile[]) {
    return sourceFiles
      .filter((sourceFile) => sourceFile.repositoryPath.endsWith(STYLESHEET_EXTENSION))
      .filter((sourceFile) => !STYLESHEET_ALLOWLIST.has(sourceFile.repositoryPath))
      .map((sourceFile) => ({
        filePath: sourceFile.repositoryPath,
        line: 1,
        message: 'stylesheet is not on the CSS allowlist; style with Tailwind utilities and tokens in the component',
      }));
  }

  private async verifyTokenExposure() {
    const tokensPath = path.join(REPOSITORY_ROOT, TOKENS_STYLESHEET);
    const themePath = path.join(REPOSITORY_ROOT, THEME_STYLESHEET);
    const [tokensSource, themeSource] = await Promise.all([
      this.readStylesheet(tokensPath),
      this.readStylesheet(themePath),
    ]);

    if (tokensSource === undefined || themeSource === undefined) {
      const missingPath = tokensSource === undefined ? TOKENS_STYLESHEET : THEME_STYLESHEET;
      return [{ filePath: missingPath, line: 1, message: 'required stylesheet does not exist' }];
    }

    const declaredTokens = new Map<string, number>();
    for (const match of tokensSource.matchAll(TOKEN_DECLARATION_PATTERN)) {
      const tokenName = match[1];
      if (!declaredTokens.has(tokenName)) declaredTokens.set(tokenName, this.getLineNumber(tokensSource, match.index));
    }

    const violations: iStyleViolation[] = [];
    for (const [tokenName, line] of declaredTokens) {
      if (this.isTokenReferenced(themeSource, tokenName)) continue;
      violations.push({
        filePath: TOKENS_STYLESHEET,
        line,
        message: `${tokenName} is not exposed through the Tailwind theme; reference var(${tokenName}) in ${THEME_STYLESHEET}`,
      });
    }
    return violations;
  }

  private async verifyNoRawColors(sourceFiles: iSourceFile[]) {
    const violations: iStyleViolation[] = [];
    for (const sourceFile of sourceFiles) {
      if (sourceFile.repositoryPath === TOKENS_STYLESHEET) continue;

      const isStylesheet = sourceFile.repositoryPath.endsWith(STYLESHEET_EXTENSION);
      const rawSource = await readFile(sourceFile.absolutePath, 'utf8');
      const source = isStylesheet ? this.blankCssComments(rawSource) : rawSource;

      violations.push(
        ...this.findPatternViolations(sourceFile, source, RAW_COLOR_PATTERN, (match) => `raw color "${match}"`),
        ...this.findPatternViolations(
          sourceFile,
          source,
          TAILWIND_PALETTE_PATTERN,
          (match) => `Tailwind palette utility "${match}"`,
        ),
        ...(isStylesheet
          ? this.findStylesheetNamedColors(sourceFile, source)
          : this.findPatternViolations(
              sourceFile,
              source,
              SCRIPT_NAMED_COLOR_PATTERN,
              (match) => `named color in "${match}"`,
            )),
      );
    }
    return violations;
  }

  private findPatternViolations(
    sourceFile: iSourceFile,
    source: string,
    pattern: RegExp,
    describeMatch: (match: string) => string,
  ) {
    return [...source.matchAll(pattern)].map((match) => ({
      filePath: sourceFile.repositoryPath,
      line: this.getLineNumber(source, match.index),
      message: `${describeMatch(match[0])} bypasses the design tokens; use a semantic token utility (bg-background, text-destructive, text-success, ...)`,
    }));
  }

  private findStylesheetNamedColors(sourceFile: iSourceFile, source: string) {
    const violations: iStyleViolation[] = [];
    for (const declaration of source.matchAll(CSS_DECLARATION_PATTERN)) {
      const property = declaration.groups?.property;
      const value = declaration.groups?.value;
      if (!property || !value || !CSS_COLOR_PROPERTY_PATTERN.test(property)) continue;

      const valueStart = declaration.index + declaration[0].length - value.length;
      const colorBearingValue = value.replace(CSS_NON_COLOR_VALUE_PATTERN, (nonColorPart) =>
        ' '.repeat(nonColorPart.length),
      );
      for (const colorMatch of colorBearingValue.matchAll(CSS_NAMED_COLOR_PATTERN)) {
        violations.push({
          filePath: sourceFile.repositoryPath,
          line: this.getLineNumber(source, valueStart + colorMatch.index),
          message: `named color "${colorMatch[0]}" in "${property}" bypasses the design tokens; use a semantic token`,
        });
      }
    }
    return violations;
  }

  private isTokenReferenced(stylesheetSource: string, tokenName: string) {
    const escapedTokenName = tokenName.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
    return new RegExp(`var\\(\\s*${escapedTokenName}\\s*[,)]`, 'u').test(stylesheetSource);
  }

  private async readStylesheet(absolutePath: string) {
    try {
      return this.blankCssComments(await readFile(absolutePath, 'utf8'));
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return undefined;
      throw error;
    }
  }

  /** Replaces comment text with spaces so line numbers and offsets stay valid. */
  private blankCssComments(source: string) {
    return source.replace(CSS_BLOCK_COMMENT_PATTERN, (comment) => comment.replace(/[^\n]/gu, ' '));
  }

  private getLineNumber(source: string, matchIndex: number) {
    return source.slice(0, matchIndex).split('\n').length;
  }

  private async collectSourceFiles(directory: string): Promise<iSourceFile[]> {
    const entries = await readdir(directory, { withFileTypes: true });
    const sourceFiles: iSourceFile[] = [];
    for (const entry of entries) {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        sourceFiles.push(...(await this.collectSourceFiles(absolutePath)));
      } else if (SCANNED_EXTENSIONS.has(path.extname(entry.name))) {
        sourceFiles.push({ absolutePath, repositoryPath: this.toRepositoryPath(absolutePath) });
      }
    }
    return sourceFiles;
  }

  private toRepositoryPath(absolutePath: string) {
    return path.relative(REPOSITORY_ROOT, absolutePath).replaceAll(path.sep, '/');
  }

  private report(violations: iStyleViolation[], sourceFiles: iSourceFile[]) {
    if (violations.length === 0) {
      console.log(`Style policy passed: ${sourceFiles.length} files checked.`);
      return;
    }

    const sortedViolations = [...violations].sort(
      (first, second) => first.filePath.localeCompare(second.filePath) || first.line - second.line,
    );
    for (const violation of sortedViolations) {
      console.error(`${violation.filePath}:${violation.line} ${violation.message}`);
    }
    console.error(`Style policy failed: ${violations.length} finding(s).`);
    process.exitCode = 1;
  }
}

await new StyleVerifier().verify();
