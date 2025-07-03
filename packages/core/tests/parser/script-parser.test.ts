import { describe, it, expect, beforeEach, vi } from 'vitest';
import { parseScript } from '../../src/parser/script-parser.js';
import { readFileSync } from 'fs';

// fsモジュールのモック
vi.mock('fs', () => ({
  readFileSync: vi.fn(),
}));

describe('script-parser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('import statements', () => {
    it('should parse default import', () => {
      const content = `import DefaultName from 'module-name';`;
      vi.mocked(readFileSync).mockReturnValue(content);

      const result = parseScript('test.ts');
      expect(result.imports).toHaveLength(1);
      expect(result.imports[0]).toEqual({
        source: 'module-name',
        hasDefault: true,
        defaultLocal: 'DefaultName',
        specifiers: [],
      });
    });

    it('should parse named imports', () => {
      const content = `import { name1, name2 as alias } from 'module-name';`;
      vi.mocked(readFileSync).mockReturnValue(content);

      const result = parseScript('test.ts');
      expect(result.imports).toHaveLength(1);
      expect(result.imports[0]).toEqual({
        source: 'module-name',
        specifiers: [
          { imported: 'name1', local: 'name1' },
          { imported: 'name2', local: 'alias' },
        ],
      });
    });

    it('should parse mixed imports', () => {
      const content = `import Default, { name1, name2 as alias } from 'module-name';`;
      vi.mocked(readFileSync).mockReturnValue(content);

      const result = parseScript('test.ts');
      expect(result.imports).toHaveLength(1);
      expect(result.imports[0]).toEqual({
        source: 'module-name',
        hasDefault: true,
        defaultLocal: 'Default',
        specifiers: [
          { imported: 'name1', local: 'name1' },
          { imported: 'name2', local: 'alias' },
        ],
      });
    });

    it('should parse side-effect imports', () => {
      const content = `import 'module-name';`;
      vi.mocked(readFileSync).mockReturnValue(content);

      const result = parseScript('test.ts');
      expect(result.imports).toHaveLength(1);
      expect(result.imports[0]).toEqual({
        source: 'module-name',
        specifiers: [],
      });
    });

    it('should parse multiple imports', () => {
      const content = `
        import DefaultName from 'module-1';
        import { name1, name2 as alias } from 'module-2';
        import 'module-3';
      `;
      vi.mocked(readFileSync).mockReturnValue(content);

      const result = parseScript('test.ts');
      expect(result.imports).toHaveLength(3);
    });
  });

  describe('export statements', () => {
    it('should detect default export', () => {
      const content = `export default class ClassName {}`;
      vi.mocked(readFileSync).mockReturnValue(content);

      const result = parseScript('test.ts');
      expect(result.exports.hasDefault).toBe(true);
    });

    it('should parse named exports', () => {
      const content = `export { name1, name2 };`;
      vi.mocked(readFileSync).mockReturnValue(content);

      const result = parseScript('test.ts');
      expect(result.exports.named).toEqual(['name1', 'name2']);
    });

    it('should parse declaration exports', () => {
      const content = `
        export const constName = 'value';
        export function funcName() {}
        export class ClassName {}
      `;
      vi.mocked(readFileSync).mockReturnValue(content);

      const result = parseScript('test.ts');
      expect(result.exports.named).toContain('constName');
      expect(result.exports.named).toContain('funcName');
      expect(result.exports.named).toContain('ClassName');
    });
  });

  describe('file type and language detection', () => {
    it('should detect definition files', () => {
      vi.mocked(readFileSync).mockReturnValue('');
      const result = parseScript('types.d.ts');
      expect(result.type).toBe('definition');
      expect(result.scriptLang).toBe('ts');
    });

    it('should detect TypeScript files', () => {
      vi.mocked(readFileSync).mockReturnValue('');
      const result = parseScript('script.ts');
      expect(result.type).toBe('script');
      expect(result.scriptLang).toBe('ts');
    });

    it('should detect JavaScript files', () => {
      vi.mocked(readFileSync).mockReturnValue('');
      const result = parseScript('script.js');
      expect(result.type).toBe('script');
      expect(result.scriptLang).toBe('js');
    });

    it('should detect TSX files', () => {
      vi.mocked(readFileSync).mockReturnValue('');
      const result = parseScript('component.tsx');
      expect(result.type).toBe('script');
      expect(result.scriptLang).toBe('ts');
    });

    it('should detect JSX files', () => {
      vi.mocked(readFileSync).mockReturnValue('');
      const result = parseScript('component.jsx');
      expect(result.type).toBe('script');
      expect(result.scriptLang).toBe('js');
    });

    it('should handle unknown extensions', () => {
      vi.mocked(readFileSync).mockReturnValue('');
      const result = parseScript('script.unknown');
      expect(result.type).toBe('script');
      expect(result.scriptLang).toBe('unknown');
    });
  });

  describe('error handling', () => {
    it('should handle file read errors', () => {
      vi.mocked(readFileSync).mockImplementation(() => {
        throw new Error('File not found');
      });

      const result = parseScript('test.ts');
      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe('File not found');
    });

    it('should return empty imports and exports on error', () => {
      vi.mocked(readFileSync).mockImplementation(() => {
        throw new Error('File not found');
      });

      const result = parseScript('test.ts');
      expect(result.imports).toEqual([]);
      expect(result.exports).toEqual({ hasDefault: false, named: [] });
    });
  });
});
