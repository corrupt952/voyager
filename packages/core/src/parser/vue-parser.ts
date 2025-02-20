import { readFileSync } from 'fs';
import { parse } from '@vue/compiler-sfc';
import { ParseResult, ScriptType, ScriptLang } from './types.js';
import { parseScript } from './script-parser.js';

/**
 * スクリプトタイプを判定する
 */
function detectScriptType(content: string, hasScriptSetup: boolean): ScriptType {
  // script setupが存在する場合は必ずComposition API
  if (hasScriptSetup) {
    return 'composition';
  }

  // defineComponent, setup関数の使用を検出
  if (
    content.includes('defineComponent') ||
    content.includes('setup(') ||
    content.includes('setup :') ||
    content.includes('setup:')
  ) {
    return 'composition';
  }

  // data, methods, computedなどのOptionsAPI特有のプロパティを検出
  if (
    /data\s*\(\s*\)/.test(content) ||
    /methods\s*:/.test(content) ||
    /computed\s*:/.test(content) ||
    /watch\s*:/.test(content) ||
    /props\s*:/.test(content)
  ) {
    return 'options';
  }

  return 'unknown';
}

/**
 * スクリプト言語を判定する
 */
function detectScriptLang(descriptor: ReturnType<typeof parse>['descriptor']): ScriptLang {
  const lang = descriptor.scriptSetup?.lang || descriptor.script?.lang;
  if (lang === 'ts' || lang === 'typescript') {
    return 'ts';
  }
  if (lang === 'js' || lang === 'javascript' || !lang) {
    return 'js';
  }
  return 'unknown';
}

/**
 * Vueファイルをパースする
 */
export function parseVue(filePath: string): ParseResult {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const { descriptor, errors } = parse(content);

    if (errors.length > 0) {
      throw new Error(`Vue SFC parse errors: ${errors.join(', ')}`);
    }

    // スクリプトブロックがない場合
    if (!descriptor.script && !descriptor.scriptSetup) {
      return {
        type: 'vue',
        filePath,
        scriptType: 'unknown',
        scriptLang: 'js', // スクリプトがない場合はJSとみなす
        imports: [],
        exports: { hasDefault: true, named: [] },
      };
    }

    // スクリプトの内容を取得
    const scriptContent = descriptor.scriptSetup?.content || descriptor.script?.content || '';
    const hasScriptSetup = !!descriptor.scriptSetup;

    // スクリプトタイプを判定
    const scriptType = detectScriptType(scriptContent, hasScriptSetup);
    const scriptLang = detectScriptLang(descriptor);

    // 一時的なスクリプトファイルとしてパースする
    const tempScriptResult = parseScript(filePath);

    return {
      type: 'vue',
      filePath,
      scriptType,
      scriptLang,
      imports: tempScriptResult.imports,
      exports: {
        // Vueコンポーネントは常にデフォルトエクスポートを持つと見なす
        hasDefault: true,
        named: tempScriptResult.exports.named,
      },
    };
  } catch (error) {
    return {
      type: 'vue',
      filePath,
      scriptType: 'unknown',
      scriptLang: 'unknown',
      imports: [],
      exports: { hasDefault: true, named: [] },
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
}
