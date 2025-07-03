export * from './types.js';
export * from './script-parser.js';
export * from './vue-parser.js';

import { ParseResult } from './types.js';
import { parseScript } from './script-parser.js';
import { parseVue } from './vue-parser.js';

/**
 * ファイルの種類に応じて適切なパーサーを選択して解析を実行する
 */
export function parseFile(filePath: string): ParseResult {
  if (filePath.endsWith('.vue')) {
    return parseVue(filePath);
  }
  return parseScript(filePath);
}
