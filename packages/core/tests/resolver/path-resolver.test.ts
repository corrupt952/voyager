import { describe, it, expect, beforeEach } from 'vitest';
import { PathResolver } from '../../src/resolver/path-resolver.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('PathResolver', () => {
  const fixtureDir = join(__dirname, '../fixtures/test-project');
  let resolver: PathResolver;

  beforeEach(() => {
    resolver = new PathResolver({
      rootDir: fixtureDir,
      baseUrl: 'src',
      paths: {
        '@/*': ['src/*'],
        '#/*': ['types/*'],
      },
    });
  });

  describe('Relative path resolution', () => {
    it('should resolve files in the same directory', () => {
      const fromFile = join(fixtureDir, 'src/components/Parent.vue');
      const result = resolver.resolve('./Header.vue', fromFile);
      expect(result.resolvedPath).toBe(join(fixtureDir, 'src/components/Header.vue'));
      expect(result.error).toBeUndefined();
    });

    it('should resolve files in parent directory', () => {
      const fromFile = join(fixtureDir, 'src/components/Header.vue');
      const result = resolver.resolve('../utils/helper.ts', fromFile);
      expect(result.resolvedPath).toBe(join(fixtureDir, 'src/utils/helper.ts'));
      expect(result.error).toBeUndefined();
    });

    it('should return error for non-existent files', () => {
      const fromFile = join(fixtureDir, 'src/components/Parent.vue');
      const result = resolver.resolve('./NotFound.vue', fromFile);
      expect(result.resolvedPath).toBeNull();
      expect(result.error).toContain('File does not exist');
    });
  });

  describe('Alias path resolution', () => {
    it('should resolve @ alias', () => {
      const fromFile = join(fixtureDir, 'src/App.vue');
      const result = resolver.resolve('@/components/Button.vue', fromFile);
      expect(result.resolvedPath).toBe(join(fixtureDir, 'src/components/Button.vue'));
      expect(result.error).toBeUndefined();
    });

    it('should handle multiple aliases', () => {
      const fromFile = join(fixtureDir, 'src/App.vue');
      const result = resolver.resolve('#/vue.d.ts', fromFile);
      expect(result.resolvedPath).toBe(join(fixtureDir, 'types/vue.d.ts'));
      expect(result.error).toBeUndefined();
    });

    it('should try resolving as relative path for non-existent alias', () => {
      const fromFile = join(fixtureDir, 'src/App.vue');
      const result = resolver.resolve('utils/helper.ts', fromFile);
      expect(result.resolvedPath).toBe(join(fixtureDir, 'src/utils/helper.ts'));
      expect(result.error).toBeUndefined();
    });
  });

  describe('node_modules resolution', () => {
    it('should resolve node_modules packages', () => {
      const fromFile = join(fixtureDir, 'src/App.vue');
      const result = resolver.resolve('vue', fromFile);
      expect(result.resolvedPath).toBe(join(fixtureDir, 'node_modules/vue/dist/vue.js'));
      expect(result.error).toBeUndefined();
    });

    it('should disable node_modules resolution', () => {
      const noNodeModulesResolver = new PathResolver({
        rootDir: fixtureDir,
        resolveNodeModules: false,
      });
      const fromFile = join(fixtureDir, 'src/App.vue');
      const result = noNodeModulesResolver.resolve('vue', fromFile);
      expect(result.resolvedPath).toBeNull();
      expect(result.error).toBe('node_modules resolution is disabled');
    });
  });

  describe('Extension resolution', () => {
    it('should try appropriate extensions when extension is omitted', () => {
      const fromFile = join(fixtureDir, 'src/components/App.vue');
      const result = resolver.resolve('./Button', fromFile);
      expect(result.resolvedPath).toBe(join(fixtureDir, 'src/components/Button.vue'));
      expect(result.error).toBeUndefined();
    });

    it('should select correct extension from multiple candidates', () => {
      const fromFile = join(fixtureDir, 'src/utils/index.ts');
      const result = resolver.resolve('./helper', fromFile);
      expect(result.resolvedPath).toBe(join(fixtureDir, 'src/utils/helper.ts'));
      expect(result.error).toBeUndefined();
    });

    it('should resolve index.* for directories', () => {
      const fromFile = join(fixtureDir, 'src/App.vue');
      const result = resolver.resolve('./utils', fromFile);
      expect(result.resolvedPath).toBe(join(fixtureDir, 'src/utils/index.vue'));
      expect(result.error).toBeUndefined();
    });
  });

  describe('Error handling', () => {
    it('should return error for invalid paths', () => {
      const fromFile = join(fixtureDir, 'src/App.vue');
      const result = resolver.resolve('', fromFile);
      expect(result.resolvedPath).toBeNull();
      expect(result.error).toBe('Invalid path');
    });

    it('should detect circular references', () => {
      const fromFile = join(fixtureDir, 'src/App.vue');
      const result = resolver.resolve('./App.vue', fromFile);
      expect(result.resolvedPath).toBe(join(fixtureDir, 'src/App.vue'));
      expect(result.error).toBeUndefined();
    });
  });
});