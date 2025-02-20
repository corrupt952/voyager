export * from './types';
export * from './script-parser';
export * from './vue-parser';

import { ParseResult } from './types';
import { parseScript } from './script-parser';
import { parseVue } from './vue-parser';

/**
 * ファイルの種類に応じて適切なパーサーを選択して解析を実行する
 */
export function parseFile(filePath: string): ParseResult {
  if (filePath.endsWith('.vue')) {
    return parseVue(filePath);
  }
  return parseScript(filePath);
}
