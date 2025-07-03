import { Command } from 'commander';
import chalk from 'chalk';
import { resolve, basename } from 'path';
import { existsSync } from 'fs';
import { collectFiles, DependencyAnalyzer } from '@voyager/core';
import { DEFAULT_IGNORE_PATTERNS } from '../constants.js';

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
    .action(
      async (
        directory: string,
        options: {
          target: string;
          ignore: string[];
          ignoreOnly: string[];
          json?: boolean;
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

          if (options.json) {
            console.log(JSON.stringify({
              file: node.relativePath,
              imports: node.dependencies.imports,
              importedBy: node.dependencies.importedBy.map((p) => {
                const n = graph.nodes.get(p);
                return n ? n.relativePath : p;
              }),
            }, null, 2));
          } else {
            console.log(chalk.blue.bold(`\n${basename(targetPath)}`));
            
            // imports
            if (node.dependencies.imports.length > 0) {
              console.log(chalk.green(`├── imports (${node.dependencies.imports.length}):`));
              node.dependencies.imports.forEach((imp, idx) => {
                const isLast = idx === node.dependencies.imports.length - 1;
                const prefix = isLast ? '│   └──' : '│   ├──';
                console.log(chalk.gray(`${prefix} ${imp}`));
              });
            } else {
              console.log(chalk.gray('├── imports: none'));
            }

            // imported by
            if (node.dependencies.importedBy.length > 0) {
              console.log(chalk.yellow(`└── imported by (${node.dependencies.importedBy.length}):`));
              node.dependencies.importedBy.forEach((path, idx) => {
                const importerNode = graph.nodes.get(path);
                const displayPath = importerNode ? importerNode.relativePath : path;
                const isLast = idx === node.dependencies.importedBy.length - 1;
                const prefix = isLast ? '    └──' : '    ├──';
                console.log(chalk.gray(`${prefix} ${displayPath}`));
              });
            } else {
              console.log(chalk.gray('└── imported by: none'));
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