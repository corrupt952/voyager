import { resolve, relative } from 'path';
import fastGlob from 'fast-glob';

export interface CollectedFile {
  absolutePath: string;
  relativePath: string;
  type: 'vue' | 'script' | 'definition';
}

const FILE_PATTERNS = [
  // Vue components
  '**/*.vue',
  // TypeScript/JavaScript files
  '**/*.ts',
  '**/*.js',
  '**/*.tsx',
  '**/*.jsx',
  // Type definitions
  '**/*.d.ts',
];

export async function collectFiles(
  baseDir: string,
  ignorePatterns: string[] = []
): Promise<CollectedFile[]> {
  const absoluteBaseDir = resolve(baseDir);

  const files = await fastGlob(FILE_PATTERNS, {
    cwd: absoluteBaseDir,
    ignore: ignorePatterns,
    absolute: true,
    dot: false,
  });

  return files.map((absolutePath: string) => {
    const relativePath = relative(absoluteBaseDir, absolutePath);
    const extension = absolutePath.split('.').pop()?.toLowerCase();

    let type: CollectedFile['type'] = 'script';
    if (extension === 'vue') {
      type = 'vue';
    } else if (extension === 'd.ts') {
      type = 'definition';
    }

    return {
      absolutePath,
      relativePath,
      type,
    };
  });
}
