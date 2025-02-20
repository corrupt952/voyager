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
      imports: parseResult.imports.map((imp) => imp.source),
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

    // 2. インポート関係からエッジを作成
    for (const [filePath, node] of graph.nodes) {
      for (const importPath of node.imports) {
        const resolveResult = this.pathResolver.resolve(importPath, filePath);
        if (resolveResult.resolvedPath) {
          const edge: DependencyEdge = {
            from: filePath,
            to: resolveResult.resolvedPath,
            type: 'import',
          };
          graph.edges.add(edge);
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
