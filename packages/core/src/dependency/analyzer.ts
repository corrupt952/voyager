import { relative } from 'path';
import {
  DependencyAnalyzerOptions,
  DependencyGraph,
  DependencyNode,
  DependencyEdge,
} from './types.js';
import { PathResolver } from '../resolver/path-resolver.js';
import { parseFile } from '../parser/index.js';

/**
 * 依存関係解析器クラス
 */
export class DependencyAnalyzer {
  private readonly rootDir: string;
  private readonly pathResolver: PathResolver;

  constructor(options: DependencyAnalyzerOptions) {
    this.rootDir = options.rootDir;
    this.pathResolver = new PathResolver({
      rootDir: options.rootDir,
      baseUrl: options.baseUrl,
      paths: options.paths,
      resolveNodeModules: options.resolveNodeModules,
    });
  }

  /**
   * 依存関係グラフを取得する
   */
  getGraph(): DependencyGraph {
    return {
      nodes: this.graph.nodes,
      edges: this.graph.edges,
    };
  }

  /**
   * 単一ファイルの依存関係を解析する
   */
  private analyzeFile(filePath: string): DependencyNode | null {
    const parseResult = parseFile(filePath);
    if (!parseResult || parseResult.error) {
      return null;
    }

    return {
      id: parseResult.filePath,
      relativePath: relative(this.rootDir, parseResult.filePath),
      type: parseResult.type,
      scriptType: parseResult.scriptType,
      scriptLang: parseResult.scriptLang,
      dependencies: {
        imports: parseResult.imports.map((imp) => imp.source),
        importedBy: [], // 初期値は空配列、後で構築
      },
      exports: parseResult.exports,
    };
  }

  /**
   * 複数ファイルの依存関係を解析する
   */
  analyze(files: string[]): void {
    const graph: DependencyGraph = {
      nodes: new Map(),
      edges: new Set(),
    };

    // 1. 各ファイルを解析してノードを作成
    for (const file of files) {
      const node = this.analyzeFile(file);
      if (node) {
        graph.nodes.set(file, node);
      }
    }

    // 2. インポート関係からエッジを作成し、双方向の依存関係を構築
    for (const [filePath, node] of graph.nodes) {
      for (const importPath of node.dependencies.imports) {
        const resolveResult = this.pathResolver.resolve(importPath, filePath);
        if (resolveResult.resolvedPath) {
          // エッジを追加
          const edge: DependencyEdge = {
            from: filePath,
            to: resolveResult.resolvedPath,
            type: 'import',
          };
          graph.edges.add(edge);

          // 依存されている側のノードのimportedByに追加
          const targetNode = graph.nodes.get(resolveResult.resolvedPath);
          if (targetNode) {
            targetNode.dependencies.importedBy.push(filePath);
          }
        }
      }
    }

    this.graph = graph;
  }

  private graph: DependencyGraph = {
    nodes: new Map(),
    edges: new Set(),
  };
}
