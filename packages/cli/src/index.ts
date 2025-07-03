#!/usr/bin/env node

import { Command } from 'commander';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { createGraphCommand, createDepsCommand, createStatsCommand } from './commands/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const packageJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'));

const program = new Command();

program
  .name('voyager')
  .description('Vue component dependency visualization tool')
  .version(packageJson.version);

// サブコマンドを追加
program.addCommand(createGraphCommand());
program.addCommand(createDepsCommand());
program.addCommand(createStatsCommand());

program.parse();