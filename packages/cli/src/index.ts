#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { fileURLToPath } from 'url';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { collectFiles, DependencyAnalyzer, CollectedFile } from '@voyager/core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const packageJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'));

// HTMLテンプレートを読み込む
const template = readFileSync(
  join(__dirname, '../node_modules/@voyager/ui/dist/template.html'),
  'utf-8'
);

const DEFAULT_IGNORE_PATTERNS = [
  '**/node_modules/**',
  '**/dist/**',
  '**/coverage/**',
  '**/.git/**',
  '**/public/**',
  '**/static/**',
  '**/*.stories.{js,jsx,ts,tsx,vue}',
  '**/*.spec.{js,jsx,ts,tsx,vue}',
  '**/*.test.{js,jsx,ts,tsx,vue}',
  '**/tests/**',
  '**/test/**',
  '**/__tests__/**',
  '**/stories/**',
  '**/.storybook/**',
];

const program = new Command();

program
  .name('voyager')
  .description('Vue component dependency visualization tool')
  .version(packageJson.version)
  .argument('<directory>', 'Target directory containing Vue components')
  .option('-o, --output <file>', 'Output file path (default: voyager-graph.html)')
  .option('--ignore <patterns...>', 'Glob patterns to ignore (in addition to default patterns)', [])
  .option(
    '--ignore-only <patterns...>',
    'Use only these glob patterns to ignore (override default patterns)',
    []
  )
  .option('--verbose', 'Show detailed analysis results')
  .action(
    async (
      directory: string,
      options: {
        output?: string;
        ignore?: string[];
        ignoreOnly?: string[];
        verbose?: boolean;
      }
    ) => {
      try {
        console.log(chalk.blue('🚀 Analyzing Vue components in:'), chalk.green(directory));
        console.log(
          chalk.blue('📦 Output file:'),
          chalk.green(options.output || 'voyager-graph.html')
        );

        const ignorePatterns = options.ignoreOnly?.length
          ? options.ignoreOnly
          : [...DEFAULT_IGNORE_PATTERNS, ...(options.ignore || [])];

        console.log(chalk.blue('\n🚫 Ignored patterns:'));
        ignorePatterns.forEach((pattern) => {
          console.log(chalk.gray(`  - ${pattern}`));
        });

        // ファイル収集
        const files = await collectFiles(directory, ignorePatterns);

        console.log(chalk.blue('\n📁 Found files:'));
        console.log(
          chalk.blue('Vue components:'),
          chalk.green(files.filter((f: CollectedFile) => f.type === 'vue').length)
        );
        console.log(
          chalk.blue('Script files:'),
          chalk.green(files.filter((f: CollectedFile) => f.type === 'script').length)
        );
        console.log(
          chalk.blue('Type definitions:'),
          chalk.green(files.filter((f: CollectedFile) => f.type === 'definition').length)
        );

        // 依存関係の解析
        console.log(chalk.blue('\n🔍 Analyzing dependencies...'));
        const analyzer = new DependencyAnalyzer({
          rootDir: directory,
          baseUrl: 'src',
          paths: {
            '@/*': ['src/*'],
          },
        });

        analyzer.analyze(files.map((f: CollectedFile) => f.absolutePath));
        const graph = analyzer.getGraph();

        // 解析結果の表示
        if (options.verbose) {
          console.log(chalk.blue('\n📊 Analysis results:'));
          console.log(chalk.gray('Nodes:'), graph.nodes.size);
          console.log(chalk.gray('Edges:'), graph.edges.size);
        }

        // HTMLファイルの生成
        const outputPath = options.output || 'voyager-graph.html';
        const absoluteOutputPath = resolve(process.cwd(), outputPath);

        const graphData = JSON.stringify({
          nodes: Array.from(graph.nodes.values()),
          edges: Array.from(graph.edges),
        });

        // テンプレートにグラフデータを埋め込む
        const html = template.replace(
          'window.__GRAPH_DATA__ = null',
          `window.__GRAPH_DATA__ = ${graphData}`
        );
        writeFileSync(absoluteOutputPath, html);

        console.log(chalk.green('\n✨ Done! Open the following file in your browser:'));
        console.log(chalk.blue(outputPath));
      } catch (error) {
        console.error(
          chalk.red('Error:'),
          error instanceof Error ? error.message : 'Unknown error'
        );
        process.exit(1);
      }
    }
  );

program.parse();
