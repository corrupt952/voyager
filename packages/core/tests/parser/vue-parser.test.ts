import { describe, it, expect } from 'vitest';
import { parseVue } from '../../src/parser/vue-parser.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const fixtureDir = join(__dirname, '../fixtures/parser-test');

describe('vue-parser', () => {
  describe('Composition API (script setup)', () => {
    it('should parse Vue file with script setup', () => {
      const result = parseVue(join(fixtureDir, 'vue-composition.vue'));
      
      expect(result.type).toBe('vue');
      expect(result.scriptType).toBe('composition');
      expect(result.scriptLang).toBe('ts');
      expect(result.imports).toHaveLength(2);
      expect(result.imports[0].source).toBe('./Component.vue');
      expect(result.imports[1].source).toBe('vue');
      expect(result.exports.hasDefault).toBe(true);
    });
  });

  describe('Options API', () => {
    it('should parse Vue file with Options API', () => {
      const result = parseVue(join(fixtureDir, 'vue-options.vue'));
      
      expect(result.type).toBe('vue');
      expect(result.scriptType).toBe('options');
      expect(result.scriptLang).toBe('ts');
      expect(result.imports).toHaveLength(1);
      expect(result.imports[0].source).toBe('./Component.vue');
      expect(result.exports.hasDefault).toBe(true);
    });

    it('should parse plain JavaScript Vue file', () => {
      const result = parseVue(join(fixtureDir, 'vue-plain-js.vue'));
      
      expect(result.type).toBe('vue');
      expect(result.scriptType).toBe('unknown');
      expect(result.scriptLang).toBe('js');
      expect(result.imports).toHaveLength(0);
      expect(result.exports.hasDefault).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle Vue file without script section', () => {
      const result = parseVue(join(fixtureDir, 'vue-no-script.vue'));
      
      expect(result.type).toBe('vue');
      expect(result.scriptType).toBe('unknown');
      expect(result.imports).toHaveLength(0);
      expect(result.exports.hasDefault).toBe(true);
      expect(result.exports.named).toHaveLength(0);
    });

    it('should handle Vue file with multiple script blocks', () => {
      const result = parseVue(join(fixtureDir, 'vue-multiple-scripts.vue'));
      
      expect(result.type).toBe('vue');
      expect(result.scriptType).toBe('composition');
      expect(result.scriptLang).toBe('ts');
      expect(result.imports).toHaveLength(1);
      expect(result.imports[0].source).toBe('vue');
    });

    it('should handle Vue file with only style', () => {
      const result = parseVue(join(fixtureDir, 'vue-style-only.vue'));
      
      expect(result.type).toBe('vue');
      expect(result.scriptType).toBe('unknown');
      expect(result.imports).toHaveLength(0);
      expect(result.exports.hasDefault).toBe(true);
    });

    it('should handle JSX/TSX in Vue files', () => {
      const result = parseVue(join(fixtureDir, 'vue-jsx.vue'));
      
      expect(result.type).toBe('vue');
      expect(result.scriptType).toBe('composition');
      expect(result.scriptLang).toBe('unknown');
      expect(result.imports).toHaveLength(1);
      expect(result.imports[0].source).toBe('vue');
    });

    it('should handle Vue file with exports in script setup', () => {
      const result = parseVue(join(fixtureDir, 'vue-with-exports.vue'));
      
      expect(result.type).toBe('vue');
      expect(result.scriptType).toBe('composition');
      expect(result.exports.hasDefault).toBe(true);
      expect(result.exports.named).toContain('helper');
      // TypeScript interface exports are not detected by current implementation
      expect(result.exports.named).not.toContain('Props');
    });

    it('should handle invalid Vue file gracefully', () => {
      const result = parseVue(join(fixtureDir, 'vue-invalid.vue'));
      
      expect(result.error).toBeDefined();
      expect(result.type).toBe('vue');
    });
  });

  describe('Import parsing', () => {
    it('should correctly parse import specifiers', () => {
      const result = parseVue(join(fixtureDir, 'vue-composition.vue'));
      
      const vueImport = result.imports.find(imp => imp.source === 'vue');
      expect(vueImport).toBeDefined();
      expect(vueImport?.specifiers).toHaveLength(1);
      expect(vueImport?.specifiers[0]).toEqual({
        imported: 'ref',
        local: 'ref'
      });

      const componentImport = result.imports.find(imp => imp.source === './Component.vue');
      expect(componentImport).toBeDefined();
      expect(componentImport?.hasDefault).toBe(true);
      expect(componentImport?.defaultLocal).toBe('Component');
      expect(componentImport?.specifiers).toHaveLength(0);
    });
  });

  describe('File path handling', () => {
    it('should include correct file path in result', () => {
      const filePath = join(fixtureDir, 'vue-composition.vue');
      const result = parseVue(filePath);
      
      expect(result.filePath).toBe(filePath);
    });
  });
});