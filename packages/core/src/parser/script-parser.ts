import { readFileSync } from 'fs';
import { ParseResult, ImportStatement, ImportSpecifier, ScriptLang } from './types.js';

/**
 * import文を解析するための正規表現
 */
const IMPORT_REGEX = {
  // デフォルトインポート: import DefaultName from 'path'
  DEFAULT: /import\s+([A-Za-z_$][A-Za-z0-9_$]*)\s+from\s+['"]([^'"]+)['"]/g,
  // 名前付きインポート: import { name1, name2 as alias } from 'path'
  NAMED: /import\s+{([^}]+)}\s+from\s+['"]([^'"]+)['"]/g,
  // デフォルト+名前付きインポート: import Default, { name1, name2 as alias } from 'path'
  MIXED: /import\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*,\s*{([^}]+)}\s+from\s+['"]([^'"]+)['"]/g,
  // 副作用のみのインポート: import 'path'
  SIDE_EFFECT: /import\s+['"]([^'"]+)['"]/g,
};

/**
 * export文を解析するための正規表現
 */
const EXPORT_REGEX = {
  // デフォルトエクスポート: export default ...
  DEFAULT: /export\s+default\s+/,
  // 名前付きエクスポート: export { name1, name2 }
  NAMED: /export\s+{([^}]+)}/g,
  // 変数/関数/クラスのエクスポート: export const/function/class name
  DECLARATION: /export\s+(const|let|var|function|class)\s+([A-Za-z_$][A-Za-z0-9_$]*)/g,
};

/**
 * ファイルの拡張子からスクリプト言語を判定する
 */
function detectScriptLang(filePath: string): ScriptLang {
  if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
    return 'ts';
  }
  if (filePath.endsWith('.js') || filePath.endsWith('.jsx')) {
    return 'js';
  }
  return 'unknown';
}

/**
 * 名前付きインポートの指定子をパースする
 */
function parseNamedImportSpecifiers(specifiersStr: string): ImportSpecifier[] {
  return specifiersStr
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((specifier) => {
      const [imported, local] = specifier.split(/\s+as\s+/).map((s) => s.trim());
      return {
        imported,
        local: local || imported,
      };
    });
}

/**
 * スクリプトファイルをパースする
 */
export function parseScript(filePath: string): ParseResult {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const imports: ImportStatement[] = [];
    const exports = { hasDefault: false, named: [] as string[] };

    // インポート文の解析
    let match;

    // デフォルトインポートの解析
    while ((match = IMPORT_REGEX.DEFAULT.exec(content)) !== null) {
      imports.push({
        source: match[2],
        hasDefault: true,
        defaultLocal: match[1],
        specifiers: [],
      });
    }

    // 名前付きインポートの解析
    while ((match = IMPORT_REGEX.NAMED.exec(content)) !== null) {
      imports.push({
        source: match[2],
        specifiers: parseNamedImportSpecifiers(match[1]),
      });
    }

    // 混合インポートの解析
    while ((match = IMPORT_REGEX.MIXED.exec(content)) !== null) {
      imports.push({
        source: match[3],
        hasDefault: true,
        defaultLocal: match[1],
        specifiers: parseNamedImportSpecifiers(match[2]),
      });
    }

    // 副作用のみのインポートの解析
    while ((match = IMPORT_REGEX.SIDE_EFFECT.exec(content)) !== null) {
      imports.push({
        source: match[1],
        specifiers: [],
      });
    }

    // エクスポートの解析
    exports.hasDefault = EXPORT_REGEX.DEFAULT.test(content);

    // 名前付きエクスポートの解析
    while ((match = EXPORT_REGEX.NAMED.exec(content)) !== null) {
      exports.named.push(
        ...match[1]
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      );
    }

    // 宣言エクスポートの解析
    while ((match = EXPORT_REGEX.DECLARATION.exec(content)) !== null) {
      exports.named.push(match[2]);
    }

    return {
      type: filePath.endsWith('.d.ts') ? 'definition' : 'script',
      filePath,
      scriptLang: detectScriptLang(filePath),
      imports,
      exports,
    };
  } catch (error) {
    return {
      type: filePath.endsWith('.d.ts') ? 'definition' : 'script',
      filePath,
      scriptLang: detectScriptLang(filePath),
      imports: [],
      exports: { hasDefault: false, named: [] },
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
}
