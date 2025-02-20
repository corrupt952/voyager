import { FileType, ExportInfo, ScriptType, ScriptLang } from '../parser/types.js';

/**
 * 依存関係ノードの情報
 */
export interface DependencyNode {
  /** ファイルの絶対パス */
  id: string;
  /** ファイルのプロジェクトルートからの相対パス */
  relativePath: string;
  /** ファイルの種類 */
  type: FileType;
  /** スクリプトタイプ（Vueコンポーネントの場合のみ） */
  scriptType?: ScriptType;
  /** スクリプト言語 */
  scriptLang: ScriptLang;
  /** 依存関係情報 */
  dependencies: {
    /** このファイルが依存しているファイルのパス（このファイルが使っているファイル） */
    imports: string[];
    /** このファイルに依存しているファイルのパス（このファイルを使っているファイル） */
    importedBy: string[];
  };
  /** エクスポート情報 */
  exports: ExportInfo;
}

/**
 * 依存関係の種類
 */
export type DependencyType = 'import' | 'extends' | 'implements';

/**
 * 依存関係エッジの情報
 */
export interface DependencyEdge {
  /** 依存元のファイルパス */
  from: string;
  /** 依存先のファイルパス */
  to: string;
  /** 依存の種類 */
  type: DependencyType;
}

/**
 * 依存関係グラフの情報
 */
export interface DependencyGraph {
  /** ノードのマップ（キーはファイルの絶対パス） */
  nodes: Map<string, DependencyNode>;
  /** エッジのセット */
  edges: Set<DependencyEdge>;
}

/**
 * 依存関係解析のオプション
 */
export interface DependencyAnalyzerOptions {
  /** プロジェクトのルートディレクトリ */
  rootDir: string;
  /** TypeScriptのベースURL */
  baseUrl?: string;
  /** TypeScriptのパスエイリアス */
  paths?: Record<string, string[]>;
  /** node_modulesの解決を行うかどうか */
  resolveNodeModules?: boolean;
}
