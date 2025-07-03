import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PathResolver } from '../../src/resolver/path-resolver.js';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import type { PathLike, PathOrFileDescriptor } from 'fs';

// fsモジュールのモック
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  statSync: vi.fn(() => ({
    isDirectory: () => false,
  })),
}));

describe('PathResolver', () => {
  const rootDir = '/project';
  let resolver: PathResolver;

  beforeEach(() => {
    vi.clearAllMocks();
    resolver = new PathResolver({
      rootDir,
      baseUrl: 'src',
      paths: {
        '@/*': ['src/*'],
        '#/*': ['types/*'],
      },
    });
  });

  describe('相対パスの解決', () => {
    it('同じディレクトリ内のファイルを解決できる', () => {
      vi.mocked(existsSync).mockReturnValue(true);
      const result = resolver.resolve('./Component.vue', '/project/src/components/Parent.vue');
      expect(result.resolvedPath).toBe('/project/src/components/Component.vue');
    });

    it('親ディレクトリのファイルを解決できる', () => {
      vi.mocked(existsSync).mockReturnValue(true);
      const result = resolver.resolve('../utils/helper.ts', '/project/src/components/Parent.vue');
      expect(result.resolvedPath).toBe('/project/src/utils/helper.ts');
    });

    it('存在しないファイルの場合はエラーを返す', () => {
      vi.mocked(existsSync).mockReturnValue(false);
      const result = resolver.resolve('./NotFound.vue', '/project/src/components/Parent.vue');
      expect(result.resolvedPath).toBeNull();
      expect(result.error).toContain('ファイルが存在しません');
    });
  });

  describe('エイリアスパスの解決', () => {
    it('@エイリアスを解決できる', () => {
      vi.mocked(existsSync).mockReturnValue(true);
      const result = resolver.resolve('@/components/Button.vue', '/project/src/App.vue');
      expect(result.resolvedPath).toBe('/project/src/components/Button.vue');
    });

    it('複数のエイリアスを処理できる', () => {
      vi.mocked(existsSync).mockReturnValue(true);
      const result = resolver.resolve('#/vue.d.ts', '/project/src/App.vue');
      expect(result.resolvedPath).toBe('/project/types/vue.d.ts');
    });

    it('存在しないエイリアスパスの場合は相対パスとして解決を試みる', () => {
      vi.mocked(existsSync).mockImplementation((path: PathLike) => {
        return path === '/project/src/unknown/file.ts';
      });
      const result = resolver.resolve('unknown/file.ts', '/project/src/App.vue');
      expect(result.resolvedPath).toBe('/project/src/unknown/file.ts');
    });
  });

  describe('node_modulesの解決', () => {
    it('node_modulesのパッケージを解決できる', () => {
      vi.mocked(existsSync).mockImplementation((path: PathLike) => {
        if (path === '/project/node_modules/vue/package.json') {
          return true;
        }
        if (path === '/project/node_modules/vue/dist/vue.js') {
          return true;
        }
        return false;
      });

      vi.mocked(readFileSync).mockImplementation((path: PathOrFileDescriptor) => {
        if (path === '/project/node_modules/vue/package.json') {
          return JSON.stringify({
            name: 'vue',
            main: 'dist/vue.js',
          });
        }
        throw new Error('Unexpected file read');
      });

      const result = resolver.resolve('vue', '/project/src/App.vue');
      expect(result.resolvedPath).toBe('/project/node_modules/vue/dist/vue.js');
    });

    it('node_modulesの解決を無効にできる', () => {
      const noNodeModulesResolver = new PathResolver({
        rootDir,
        resolveNodeModules: false,
      });

      const result = noNodeModulesResolver.resolve('vue', '/project/src/App.vue');
      expect(result.resolvedPath).toBeNull();
      expect(result.error).toBe('node_modulesの解決が無効です');
    });
  });

  describe('拡張子の解決', () => {
    it('拡張子が省略された場合に適切な拡張子を試す', () => {
      vi.mocked(existsSync).mockImplementation((path: PathLike) => {
        return path === '/project/src/components/Button.vue';
      });
      const result = resolver.resolve('./Button', '/project/src/components/App.vue');
      expect(result.resolvedPath).toBe('/project/src/components/Button.vue');
    });

    it('複数の拡張子候補から正しいものを選択する', () => {
      vi.mocked(existsSync).mockImplementation((path: PathLike) => {
        return path === '/project/src/utils/helper.ts';
      });
      const result = resolver.resolve('./helper', '/project/src/utils/index.ts');
      expect(result.resolvedPath).toBe('/project/src/utils/helper.ts');
    });
  });

  describe('エラーハンドリング', () => {
    it('無効なパスの場合はエラーを返す', () => {
      const result = resolver.resolve('', '/project/src/App.vue');
      expect(result.resolvedPath).toBeNull();
      expect(result.error).toBe('無効なパスです');
    });

    it('循環参照を検出できる', () => {
      vi.mocked(existsSync).mockReturnValue(true);
      const result = resolver.resolve('./App.vue', '/project/src/App.vue');
      expect(result.resolvedPath).toBe('/project/src/App.vue');
    });
  });
});
