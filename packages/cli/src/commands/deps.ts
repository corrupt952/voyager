import { Command } from 'commander';
import chalk from 'chalk';
import { resolve, basename } from 'path';
import { existsSync } from 'fs';
import { collectFiles, DependencyAnalyzer, DependencyNode } from '@voyager/core';
import { DEFAULT_IGNORE_PATTERNS } from '../constants.js';

interface DependencyTree {
  path: string;
  relativePath: string;
  children: DependencyTree[];
}

function collectDependencies(
  node: DependencyNode,
  graph: Map<string, DependencyNode>,
  direction: 'imports' | 'importedBy',
  depth: number | null,
  currentDepth: number = 0,
  visited: Set<string> = new Set()
): DependencyTree[] {
  if (depth !== null && currentDepth >= depth) {
    return [];
  }

  const dependencies = direction === 'imports' 
    ? node.dependencies.imports 
    : node.dependencies.importedBy;

  const trees: DependencyTree[] = [];

  for (const dep of dependencies) {
    if (visited.has(dep)) {
      continue; // 循環参照を避ける
    }

    if (direction === 'imports') {
      // importsの場合、相対パスから実際のノードを探す
      const depNode = Array.from(graph.entries()).find(([_, n]) => 
        n.relativePath === dep || n.id.endsWith(dep)
      );
      
      if (depNode) {
        const [depPath, depNodeData] = depNode;
        visited.add(depPath);
        
        const tree: DependencyTree = {
          path: depPath,
          relativePath: dep,
          children: collectDependencies(
            depNodeData,
            graph,
            direction,
            depth,
            currentDepth + 1,
            new Set(visited)
          )
        };
        trees.push(tree);
      } else {
        // ノードが見つからない場合（外部依存など）
        trees.push({
          path: dep,
          relativePath: dep,
          children: []
        });
      }
    } else {
      // importedByの場合、パスから直接ノードを取得
      const depNode = graph.get(dep);
      if (depNode) {
        visited.add(dep);
        
        const tree: DependencyTree = {
          path: dep,
          relativePath: depNode.relativePath,
          children: collectDependencies(
            depNode,
            graph,
            direction,
            depth,
            currentDepth + 1,
            new Set(visited)
          )
        };
        trees.push(tree);
      }
    }
  }

  return trees;
}

function printDependencyTree(
  trees: DependencyTree[],
  prefix: string = '',
  isLast: boolean = false,
  currentDepth: number = 0
): void {
  trees.forEach((tree, index) => {
    const isLastItem = index === trees.length - 1;
    const connector = isLastItem ? '└──' : '├──';
    const extension = isLastItem ? '    ' : '│   ';
    
    console.log(chalk.gray(`${prefix}${connector} ${tree.relativePath}`));
    
    if (tree.children.length > 0) {
      printDependencyTree(
        tree.children,
        prefix + extension,
        isLastItem,
        currentDepth + 1
      );
    }
  });
}

export function createDepsCommand(): Command {
  const command = new Command('deps');

  command
    .description('Show dependencies for a specific file')
    .argument('<directory>', 'Target directory containing Vue components')
    .requiredOption('-t, --target <file>', 'Target file to analyze dependencies')
    .option('--ignore <patterns...>', 'Glob patterns to ignore (in addition to default patterns)', [])
    .option(
      '--ignore-only <patterns...>',
      'Use only these glob patterns to ignore (override default patterns)',
      []
    )
    .option('--json', 'Output as JSON')
    .option('-d, --depth <number>', 'Depth of dependency tree to show (default: 1, use "all" for unlimited)', '1')
    .action(
      async (
        directory: string,
        options: {
          target: string;
          ignore: string[];
          ignoreOnly: string[];
          json?: boolean;
          depth: string;
        }
      ) => {
        try {
          // targetを指定されたディレクトリからの相対パスとして解決
          const targetPath = resolve(directory, options.target);

          if (!existsSync(targetPath)) {
            console.error(chalk.red(`Error: File not found: ${options.target} in ${directory}`));
            process.exit(1);
          }

          const ignorePatterns = options.ignoreOnly.length
            ? options.ignoreOnly
            : [...DEFAULT_IGNORE_PATTERNS, ...options.ignore];

          // ファイル収集
          const files = await collectFiles(directory, ignorePatterns);

          // 依存関係の解析
          const analyzer = new DependencyAnalyzer({
            rootDir: directory,
            baseUrl: 'src',
            paths: {
              '@/*': ['src/*'],
            },
          });

          analyzer.analyze(files.map((f) => f.absolutePath));
          const graph = analyzer.getGraph();

          // 対象ファイルのノードを取得
          const node = graph.nodes.get(targetPath);
          
          if (!node) {
            console.error(chalk.red(`Error: No dependency information found for ${options.target}`));
            console.error(chalk.gray('Make sure the file is within the specified directory and not ignored by patterns.'));
            process.exit(1);
          }

          // 深さの解析
          const maxDepth = options.depth === 'all' ? null : parseInt(options.depth, 10);
          if (options.depth !== 'all' && maxDepth !== null && (isNaN(maxDepth) || maxDepth < 1)) {
            console.error(chalk.red('Error: Depth must be a positive number or "all"'));
            process.exit(1);
          }

          if (options.json) {
            const importTrees = collectDependencies(node, graph.nodes, 'imports', maxDepth);
            const importedByTrees = collectDependencies(node, graph.nodes, 'importedBy', maxDepth);
            
            console.log(JSON.stringify({
              file: node.relativePath,
              depth: options.depth,
              imports: importTrees,
              importedBy: importedByTrees,
            }, null, 2));
          } else {
            console.log(chalk.blue.bold(`\n${basename(targetPath)}`));
            
            // imports
            const importTrees = collectDependencies(node, graph.nodes, 'imports', maxDepth);
            if (importTrees.length > 0) {
              console.log(chalk.green(`├── imports (${node.dependencies.imports.length}):`));
              printDependencyTree(importTrees, '│   ');
            } else {
              console.log(chalk.gray('├── imports: none'));
            }

            // imported by
            const importedByTrees = collectDependencies(node, graph.nodes, 'importedBy', maxDepth);
            if (importedByTrees.length > 0) {
              console.log(chalk.yellow(`└── imported by (${node.dependencies.importedBy.length}):`));
              printDependencyTree(importedByTrees, '    ');
            } else {
              console.log(chalk.gray('└── imported by: none'));
            }
            
            if (maxDepth && maxDepth > 1) {
              console.log(chalk.gray(`\n(Showing dependencies up to depth ${maxDepth})`));
            } else if (options.depth === 'all') {
              console.log(chalk.gray('\n(Showing all dependency levels)'));
            }
          }
        } catch (error) {
          console.error(
            chalk.red('Error:'),
            error instanceof Error ? error.message : 'Unknown error'
          );
          process.exit(1);
        }
      }
    );

  return command;
}