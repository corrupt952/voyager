import { readFileSync } from 'fs';
import { parse } from '@vue/compiler-sfc';
import { ParseResult, ScriptType, ScriptLang } from './types.js';
import { parseScript } from './script-parser.js';

/**
 * コメントと文字列を除去する
 */
function removeCommentsAndStrings(content: string): string {
  // シングルラインコメントを除去
  content = content.replace(/\/\/.*$/gm, '');
  
  // マルチラインコメントを除去
  content = content.replace(/\/\*[\s\S]*?\*\//g, '');
  
  // 文字列リテラル（シングルクォート、ダブルクォート、テンプレートリテラル）を除去
  // より正確な正規表現で、エスケープされた引用符も考慮
  content = content.replace(/(["'`])(?:(?=(\\?))\2[\s\S])*?\1/g, '""');
  
  return content;
}

/**
 * スクリプトタイプを判定する
 */
function detectScriptType(content: string, hasScriptSetup: boolean): ScriptType {
  // script setupが存在する場合は必ずComposition API
  if (hasScriptSetup) {
    return 'composition';
  }

  // 生のコンテンツで大量のVueインポートをチェック（fallback）
  const rawVueImports = content.match(/import\s*\{[\s\S]+?\}\s*from\s*["']vue["']/);
  if (rawVueImports) {
    // Composition API特有のインポートをチェック
    const compositionImports = ['ref', 'reactive', 'computed', 'watch', 'h', 'onMounted', 'onUpdated'];
    if (compositionImports.some(api => rawVueImports[0].includes(api))) {
      // render関数があるかチェック
      if (/render\s*\(\s*\)/.test(content)) {
        return 'composition';
      }
      // 大量のインポート（10個以上）
      if (rawVueImports[0].split(',').length > 10) {
        return 'composition';
      }
    }
  }

  // コメントと文字列を除去したコンテンツで検査
  const cleanContent = removeCommentsAndStrings(content);
  
  let hasCompositionAPI = false;
  let hasOptionsAPI = false;
  let hasVueImports = false;

  // Composition APIの検出
  // 複数行のインポートも検出するため、改行を含むパターンを使用
  const vueImports = cleanContent.match(/import\s*\{[\s\S]+?\}\s*from\s*["']vue["']/g);
  if (vueImports) {
    hasVueImports = true;
    const compositionAPIs = [
      'ref', 'reactive', 'readonly', 'computed', 'watch', 'watchEffect', 'watchPostEffect', 
      'watchSyncEffect', 'toRef', 'toRefs', 'toRaw', 'markRaw', 'shallowRef', 'shallowReactive', 
      'shallowReadonly', 'isRef', 'isProxy', 'isReactive', 'isReadonly', 'unref', 'proxyRefs', 
      'customRef', 'triggerRef', 'effectScope', 'onScopeDispose', 'getCurrentInstance', 'h', 
      'nextTick', 'defineAsyncComponent', 'resolveComponent', 'resolveDirective', 'withDirectives', 
      'createRenderer', 'onBeforeMount', 'onMounted', 'onBeforeUpdate', 'onUpdated', 
      'onBeforeUnmount', 'onUnmounted', 'onActivated', 'onDeactivated', 'onErrorCaptured', 
      'onRenderTracked', 'onRenderTriggered', 'onServerPrefetch', 'provide', 'inject', 
      'useSlots', 'useAttrs'
    ];
    
    // Vueから何かをインポートしていればComposition APIの可能性が高い
    hasCompositionAPI = true;
    
    for (const importStr of vueImports) {
      if (compositionAPIs.some(api => importStr.includes(api))) {
        hasCompositionAPI = true;
        break;
      }
    }
  }

  const compositionPatterns = [
    // defineComponent
    /defineComponent/,
    // setup関数（より柔軟なパターン）
    /setup\s*\(/,
    /setup\s*:/,
    /setup\s*\(\s*\)/,
    /setup\s*\([^)]*\)/,
    // composables検出（use関数のインポート）
    /import\s*{[^}]*\buse[A-Z]\w*\b[^}]*}/, 
    /import\s+use[A-Z]\w*\s+from/,
    // defineAsyncComponent
    /defineAsyncComponent/
  ];

  if (compositionPatterns.some(pattern => pattern.test(cleanContent))) {
    hasCompositionAPI = true;
  }

  // Options APIの検出（拡張版）
  const optionsAPIPatterns = [
    /data\s*\(\s*\)/, // data()
    /methods\s*:/, // methods:
    /computed\s*:/, // computed:
    /watch\s*:/, // watch:
    /props\s*:/, // props:
    /emits\s*:/, // emits:
    /provide\s*[:(]/, // provide: or provide()
    /inject\s*:/, // inject:
    /mixins\s*:/, // mixins:
    /extends\s*:/, // extends:
    /directives\s*:/, // directives:
    /filters\s*:/, // filters: (Vue 2)
    /expose\s*:/, // expose:
    /model\s*:/, // model:
    /inheritAttrs\s*:/, // inheritAttrs:
    /components\s*:/, // components:
    // ライフサイクルフック
    /beforeCreate\s*\(\s*\)/, 
    /created\s*\(\s*\)/,
    /beforeMount\s*\(\s*\)/,
    /mounted\s*\(\s*\)/,
    /beforeUpdate\s*\(\s*\)/,
    /updated\s*\(\s*\)/,
    /beforeUnmount\s*\(\s*\)/, // Vue 3
    /unmounted\s*\(\s*\)/, // Vue 3
    /beforeDestroy\s*\(\s*\)/, // Vue 2
    /destroyed\s*\(\s*\)/, // Vue 2
    /activated\s*\(\s*\)/,
    /deactivated\s*\(\s*\)/,
    /errorCaptured\s*\(\s*\)/,
    /renderTracked\s*\(\s*\)/, // Vue 3
    /renderTriggered\s*\(\s*\)/, // Vue 3
    /serverPrefetch\s*\(\s*\)/ // Vue 3 SSR
  ];

  if (optionsAPIPatterns.some(pattern => pattern.test(cleanContent))) {
    hasOptionsAPI = true;
  }

  // 関数型コンポーネントの検出
  if (/functional\s*:\s*true/.test(cleanContent)) {
    return 'functional';
  }

  // Vue 3関数型コンポーネント（export default が関数）
  if (/export\s+default\s+\(/.test(cleanContent) || /export\s+default\s+function\s*\(/.test(cleanContent)) {
    return 'functional';
  }

  // クラスコンポーネントの検出
  if (/class\s+\w+\s+extends\s+(Vue|Component)/.test(cleanContent) || /@Component/.test(cleanContent)) {
    return 'class';
  }

  // 動的プロパティ名の検出（Options API）
  const dynamicPropertyPattern = /\[[^\]]+\]\s*\(\s*\)|{\s*\[[^\]]+\]\s*:/;
  if (dynamicPropertyPattern.test(cleanContent)) {
    // 動的プロパティ名でもdata()やcomputed:などの形式ならOptions API
    if (/\[['"`]?(data|methods|computed|watch|methodName|computedName)['"`]?\]/.test(cleanContent)) {
      hasOptionsAPI = true;
    }
    // テンプレートリテラルを使った動的プロパティ
    if (/\[`[^`]*`\]\s*:/.test(cleanContent)) {
      hasOptionsAPI = true;
    }
  }

  // 混在の検出（改善版）
  // defineComponentがある場合は、propsやemitsがあってもComposition APIと判定
  const hasDefineComponent = /defineComponent/.test(cleanContent);
  const hasSetupFunction = /setup\s*\(/.test(cleanContent) || /setup\s*:/.test(cleanContent);
  const hasDefineAsyncComponent = /defineAsyncComponent/.test(cleanContent);
  
  if (hasDefineComponent && hasSetupFunction) {
    // defineComponent + setupがある場合は純粋なComposition API
    return 'composition';
  }

  if (hasCompositionAPI && hasOptionsAPI) {
    // 本当の混在パターンかチェック
    
    // defineAsyncComponentがある場合は、components:があってもComposition API
    if (hasDefineAsyncComponent) {
      return 'composition';
    }
    
    // setupがある場合、props/emits/componentsだけならComposition API
    if (hasSetupFunction) {
      const hasDataOrMethods = /data\s*\(\s*\)/.test(cleanContent) || 
                               /methods\s*:/.test(cleanContent) ||
                               /computed\s*:/.test(cleanContent) ||
                               /watch\s*:/.test(cleanContent);
      if (!hasDataOrMethods) {
        return 'composition';
      }
      // setupとdata/methodsが両方ある場合のみmixed
      return 'mixed';
    }
    
    // defineComponentでpropsだけの場合はComposition API
    if (hasDefineComponent) {
      return 'composition';
    }
    
    return 'mixed';
  }

  if (hasCompositionAPI) {
    return 'composition';
  }

  if (hasOptionsAPI) {
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
