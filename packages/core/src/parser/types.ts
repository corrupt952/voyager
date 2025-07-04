/**
 * パース対象のファイルタイプ
 */
export type FileType = 'vue' | 'script' | 'definition';

/**
 * Vueコンポーネントのスクリプトタイプ
 */
export type ScriptType = 'composition' | 'options' | 'mixed' | 'functional' | 'class' | 'unknown';

/**
 * スクリプト言語の種別
 */
export type ScriptLang = 'ts' | 'js' | 'unknown';

/**
 * インポート情報
 */
export interface ImportSpecifier {
  /** インポートする名前 */
  imported: string;
  /** ローカルでの名前（エイリアス） */
  local: string;
}

/**
 * インポート文の情報
 */
export interface ImportStatement {
  /** インポート元のパス */
  source: string;
  /** デフォルトインポートの有無 */
  hasDefault?: boolean;
  /** デフォルトインポートのローカル名 */
  defaultLocal?: string;
  /** 名前付きインポートのリスト */
  specifiers: ImportSpecifier[];
}

/**
 * エクスポート情報
 */
export interface ExportInfo {
  /** デフォルトエクスポートの有無 */
  hasDefault: boolean;
  /** 名前付きエクスポートのリスト */
  named: string[];
}

/**
 * パース結果の共通インターフェース
 */
export interface ParseResult {
  /** ファイルの種類 */
  type: FileType;
  /** ファイルの絶対パス */
  filePath: string;
  /** スクリプトタイプ（Vueコンポーネントの場合のみ） */
  scriptType?: ScriptType;
  /** スクリプト言語の種別 */
  scriptLang: ScriptLang;
  /** インポート文のリスト */
  imports: ImportStatement[];
  /** エクスポート情報 */
  exports: ExportInfo;
  /** パースエラーがあった場合のエラー情報 */
  error?: Error;
}
