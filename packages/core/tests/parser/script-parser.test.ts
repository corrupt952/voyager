import { describe, it, expect } from 'vitest';
import { parseScript } from '../../src/parser/script-parser.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const fixtureDir = join(__dirname, '../fixtures/parser-test');

describe('script-parser', () => {
  describe('import statements', () => {
    it('should parse default import', () => {
      const result = parseScript(join(fixtureDir, 'default-import.ts'));
      
      expect(result.imports).toHaveLength(1);
      expect(result.imports[0]).toEqual({
        source: 'module-name',
        hasDefault: true,
        defaultLocal: 'DefaultName',
        specifiers: []
      });
    });

    it('should parse named imports', () => {
      const result = parseScript(join(fixtureDir, 'named-import.ts'));
      
      expect(result.imports).toHaveLength(1);
      expect(result.imports[0].source).toBe('module-name');
      expect(result.imports[0].specifiers).toEqual([
        { imported: 'name1', local: 'name1' },
        { imported: 'name2', local: 'name2' }
      ]);
    });

    it('should parse aliased imports', () => {
      const result = parseScript(join(fixtureDir, 'alias-import.ts'));
      
      expect(result.imports).toHaveLength(1);
      expect(result.imports[0].specifiers).toEqual([
        { imported: 'name1', local: 'alias1' },
        { imported: 'name2', local: 'alias2' }
      ]);
    });

    it('should not support namespace imports yet', () => {
      const result = parseScript(join(fixtureDir, 'namespace-import.ts'));
      
      // Namespace imports like 'import * as name' are not supported
      expect(result.imports).toHaveLength(0);
      expect(result.error).toBeUndefined();
    });

    it('should parse side effect imports', () => {
      const result = parseScript(join(fixtureDir, 'side-effect-import.ts'));
      
      expect(result.imports).toHaveLength(1);
      expect(result.imports[0]).toEqual({
        source: 'module-name',
        specifiers: []
      });
    });

    it('should parse mixed imports', () => {
      const result = parseScript(join(fixtureDir, 'mixed-import.ts'));
      
      expect(result.imports).toHaveLength(1);
      expect(result.imports[0].hasDefault).toBe(true);
      expect(result.imports[0].defaultLocal).toBe('DefaultExport');
      expect(result.imports[0].specifiers).toHaveLength(2);
      expect(result.imports[0].specifiers[0]).toEqual({ imported: 'name1', local: 'name1' });
      expect(result.imports[0].specifiers[1]).toEqual({ imported: 'name2', local: 'name2' });
    });

    it('should not distinguish type imports yet', () => {
      const result = parseScript(join(fixtureDir, 'type-import.ts'));
      
      // Type imports are not parsed differently from regular imports
      expect(result.imports).toHaveLength(0);
      expect(result.error).toBeUndefined();
    });

    it('should not support dynamic imports yet', () => {
      const result = parseScript(join(fixtureDir, 'dynamic-import.ts'));
      
      // Dynamic imports like import() are not supported
      expect(result.imports).toHaveLength(0);
      expect(result.error).toBeUndefined();
    });
  });

  describe('export statements', () => {
    it('should parse default export', () => {
      const result = parseScript(join(fixtureDir, 'default-export.ts'));
      
      expect(result.exports.hasDefault).toBe(true);
      expect(result.exports.named).toHaveLength(0);
    });

    it('should parse named exports', () => {
      const result = parseScript(join(fixtureDir, 'named-export.ts'));
      
      expect(result.exports.hasDefault).toBe(false);
      expect(result.exports.named).toContain('name1');
      expect(result.exports.named).toContain('name2');
      expect(result.exports.named).toContain('func1');
      expect(result.exports.named).toContain('Class1');
    });

    it('should partially parse re-exports', () => {
      const result = parseScript(join(fixtureDir, 're-export.ts'));
      
      // Re-exports are parsed as exports but imports are not detected
      expect(result.imports).toHaveLength(0);
      expect(result.exports.hasDefault).toBe(false);
      expect(result.exports.named).toHaveLength(3); // Parsed as regular exports
    });

    it('should parse mixed exports', () => {
      const result = parseScript(join(fixtureDir, 'mixed-export.ts'));
      
      expect(result.exports.hasDefault).toBe(true);
      expect(result.exports.named).toContain('value');
      expect(result.exports.named).toContain('helper');
    });
  });

  describe('edge cases', () => {
    it('should handle files without imports or exports', () => {
      const result = parseScript(join(fixtureDir, 'no-import-export.ts'));
      
      expect(result.imports).toHaveLength(0);
      expect(result.exports.hasDefault).toBe(false);
      expect(result.exports.named).toHaveLength(0);
    });

    it('should handle invalid syntax without throwing', () => {
      const result = parseScript(join(fixtureDir, 'invalid-syntax.ts'));
      
      // Invalid syntax doesn't throw, returns empty results
      expect(result.imports).toHaveLength(0);
      expect(result.exports.hasDefault).toBe(false);
      expect(result.exports.named).toHaveLength(0);
      expect(result.error).toBeUndefined(); // No error is set
    });

    it('should handle plain JavaScript files', () => {
      const result = parseScript(join(fixtureDir, 'plain.js'));
      
      expect(result.scriptLang).toBe('js');
      expect(result.imports).toHaveLength(0);
      expect(result.exports.hasDefault).toBe(false);
    });
  });
});