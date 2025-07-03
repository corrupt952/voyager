import { Command } from 'commander';
import chalk from 'chalk';
import { collectFiles, DependencyAnalyzer, CollectedFile, DependencyNode } from '@voyager/core';
import { DEFAULT_IGNORE_PATTERNS } from '../constants.js';

interface Stats {
  totalFiles: number;
  vueComponents: number;
  scriptFiles: number;
  typeDefinitions: number;
  totalImports: number;
  circularDependencies: string[][];
  orphanedComponents: string[];
  mostImported: { file: string; count: number }[];
}

function findCircularDependencies(graph: Map<string, DependencyNode>): string[][] {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function dfs(node: string, path: string[]): void {
    visited.add(node);
    recursionStack.add(node);

    const nodeData = graph.get(node);
    if (nodeData) {
      for (const dep of nodeData.dependencies.imports) {
        // 依存先が存在するか確認
        const depNode = Array.from(graph.entries()).find(([_, n]) => 
          n.relativePath === dep || n.id.endsWith(dep)
        );
        
        if (depNode) {
          const depPath = depNode[0];
          if (!visited.has(depPath)) {
            dfs(depPath, [...path, depPath]);
          } else if (recursionStack.has(depPath)) {
            // 循環を発見
            const cycleStart = path.indexOf(depPath);
            if (cycleStart !== -1) {
              const cycle = path.slice(cycleStart);
              cycle.push(depPath);
              cycles.push(cycle);
            }
          }
        }
      }
    }

    recursionStack.delete(node);
  }

  for (const [node] of graph) {
    if (!visited.has(node)) {
      dfs(node, [node]);
    }
  }

  return cycles;
}

export function createStatsCommand(): Command {
  const command = new Command('stats');

  command
    .description('Show component statistics')
    .argument('<directory>', 'Target directory containing Vue components')
    .option('--ignore <patterns...>', 'Glob patterns to ignore (in addition to default patterns)', [])
    .option(
      '--ignore-only <patterns...>',
      'Use only these glob patterns to ignore (override default patterns)',
      []
    )
    .option('--json', 'Output as JSON')
    .action(
      async (
        directory: string,
        options: {
          ignore: string[];
          ignoreOnly: string[];
          json?: boolean;
        }
      ) => {
        try {
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

          analyzer.analyze(files.map((f: CollectedFile) => f.absolutePath));
          const graph = analyzer.getGraph();

          // 統計情報の計算
          const stats: Stats = {
            totalFiles: graph.nodes.size,
            vueComponents: files.filter((f) => f.type === 'vue').length,
            scriptFiles: files.filter((f) => f.type === 'script').length,
            typeDefinitions: files.filter((f) => f.type === 'definition').length,
            totalImports: Array.from(graph.edges).length,
            circularDependencies: findCircularDependencies(graph.nodes),
            orphanedComponents: [],
            mostImported: [],
          };

          // 孤立したコンポーネント（importされていない）
          stats.orphanedComponents = Array.from(graph.nodes.values())
            .filter((node) => node.dependencies.importedBy.length === 0)
            .map((node) => node.relativePath);

          // 最も多くimportされているファイル
          const importCounts = new Map<string, number>();
          for (const node of graph.nodes.values()) {
            if (node.dependencies.importedBy.length > 0) {
              importCounts.set(node.relativePath, node.dependencies.importedBy.length);
            }
          }
          stats.mostImported = Array.from(importCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([file, count]) => ({ file, count }));

          if (options.json) {
            console.log(JSON.stringify(stats, null, 2));
          } else {
            console.log(chalk.blue.bold('\n📊 Component Statistics\n'));
            
            console.log(chalk.blue('Files:'));
            console.log(`  Total files: ${chalk.green(stats.totalFiles)}`);
            console.log(`  Vue components: ${chalk.green(stats.vueComponents)}`);
            console.log(`  Script files: ${chalk.green(stats.scriptFiles)}`);
            console.log(`  Type definitions: ${chalk.green(stats.typeDefinitions)}`);
            
            console.log(chalk.blue('\nDependencies:'));
            console.log(`  Total imports: ${chalk.green(stats.totalImports)}`);
            console.log(`  Circular dependencies: ${chalk.yellow(stats.circularDependencies.length)}`);
            
            if (stats.circularDependencies.length > 0) {
              console.log(chalk.yellow('  Circular dependency chains:'));
              stats.circularDependencies.forEach((cycle, idx) => {
                console.log(`    ${idx + 1}. ${cycle.map(c => {
                  const node = graph.nodes.get(c);
                  return node ? node.relativePath : c;
                }).join(' → ')}`);
              });
            }
            
            console.log(`  Orphaned components: ${chalk.yellow(stats.orphanedComponents.length)}`);
            
            if (stats.mostImported.length > 0) {
              console.log(chalk.blue('\nMost imported files:'));
              stats.mostImported.forEach(({ file, count }) => {
                console.log(`  ${chalk.gray(file)} - ${chalk.green(count)} imports`);
              });
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