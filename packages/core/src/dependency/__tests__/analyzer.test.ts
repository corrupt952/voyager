import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DependencyAnalyzer } from '../analyzer.js';
import { parseFile } from '../../parser/index.js';
import { existsSync } from 'fs';
import type { PathLike } from 'fs';
import type { ParseResult } from '../../parser/types.js';

// モジュールのモック
vi.mock('../../parser/index.js');
vi.mock('fs');

describe('DependencyAnalyzer', () => {
  const rootDir = '/project';
  let analyzer: DependencyAnalyzer;

  beforeEach(() => {
    vi.clearAllMocks();
    analyzer = new DependencyAnalyzer({
      rootDir,
      baseUrl: 'src',
      paths: {
        '@/*': ['src/*'],
      },
    });
  });

  describe('依存関係の解析', () => {
    it('複数のVueファイルの依存関係を解析できる', () => {
      // ファイルの存在チェックのモック
      vi.mocked(existsSync).mockImplementation((path: PathLike) => {
        return [
          '/project/src/App.vue',
          '/project/src/components/Header.vue',
          '/project/src/components/Footer.vue',
        ].includes(path.toString());
      });

      // パース結果のモック
      const mockFiles: Record<string, ParseResult> = {
        '/project/src/App.vue': {
          type: 'vue',
          filePath: '/project/src/App.vue',
          scriptType: 'composition',
          scriptLang: 'ts',
          imports: [
            { source: './components/Header.vue', specifiers: [] },
            { source: './components/Footer.vue', specifiers: [] },
          ],
          exports: { hasDefault: true, named: [] },
        },
        '/project/src/components/Header.vue': {
          type: 'vue',
          filePath: '/project/src/components/Header.vue',
          scriptType: 'composition',
          scriptLang: 'ts',
          imports: [],
          exports: { hasDefault: true, named: [] },
        },
        '/project/src/components/Footer.vue': {
          type: 'vue',
          filePath: '/project/src/components/Footer.vue',
          scriptType: 'composition',
          scriptLang: 'ts',
          imports: [],
          exports: { hasDefault: true, named: [] },
        },
      };

      vi.mocked(parseFile).mockImplementation((path: string) => mockFiles[path]);

      // 解析の実行
      analyzer.analyze([
        '/project/src/App.vue',
        '/project/src/components/Header.vue',
        '/project/src/components/Footer.vue',
      ]);

      const graph = analyzer.getGraph();

      // ノードの検証
      expect(graph.nodes.size).toBe(3);
      expect(graph.nodes.get('/project/src/App.vue')).toBeDefined();
      expect(graph.nodes.get('/project/src/components/Header.vue')).toBeDefined();
      expect(graph.nodes.get('/project/src/components/Footer.vue')).toBeDefined();

      // エッジの検証
      expect(graph.edges.size).toBe(2);
      const edges = Array.from(graph.edges);
      expect(edges).toContainEqual({
        from: '/project/src/App.vue',
        to: '/project/src/components/Header.vue',
        type: 'import',
      });
      expect(edges).toContainEqual({
        from: '/project/src/App.vue',
        to: '/project/src/components/Footer.vue',
        type: 'import',
      });
    });

    it('エイリアスパスを解決できる', () => {
      vi.mocked(existsSync).mockImplementation((path: PathLike) => {
        return ['/project/src/App.vue', '/project/src/components/Button.vue'].includes(
          path.toString()
        );
      });

      const mockFiles: Record<string, ParseResult> = {
        '/project/src/App.vue': {
          type: 'vue',
          filePath: '/project/src/App.vue',
          scriptType: 'composition',
          scriptLang: 'ts',
          imports: [{ source: '@/components/Button.vue', specifiers: [] }],
          exports: { hasDefault: true, named: [] },
        },
        '/project/src/components/Button.vue': {
          type: 'vue',
          filePath: '/project/src/components/Button.vue',
          scriptType: 'composition',
          scriptLang: 'ts',
          imports: [],
          exports: { hasDefault: true, named: [] },
        },
      };

      vi.mocked(parseFile).mockImplementation((path: string) => mockFiles[path]);

      analyzer.analyze(['/project/src/App.vue', '/project/src/components/Button.vue']);

      const graph = analyzer.getGraph();

      expect(graph.nodes.size).toBe(2);
      expect(graph.edges.size).toBe(1);
      const edge = Array.from(graph.edges)[0];
      expect(edge).toEqual({
        from: '/project/src/App.vue',
        to: '/project/src/components/Button.vue',
        type: 'import',
      });
    });

    it('存在しないファイルは無視する', () => {
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(parseFile).mockReturnValue({
        type: 'vue',
        filePath: '/project/src/App.vue',
        scriptType: 'composition',
        scriptLang: 'ts',
        imports: [{ source: './NotFound.vue', specifiers: [] }],
        exports: { hasDefault: true, named: [] },
      });

      analyzer.analyze(['/project/src/App.vue']);
      const graph = analyzer.getGraph();

      expect(graph.nodes.size).toBe(1);
      expect(graph.edges.size).toBe(0);
    });

    it('解析エラーのあるファイルは無視する', () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(parseFile).mockReturnValue({
        type: 'vue',
        filePath: '/project/src/App.vue',
        scriptType: 'unknown',
        scriptLang: 'unknown',
        imports: [],
        exports: { hasDefault: false, named: [] },
        error: new Error('解析エラー'),
      });

      analyzer.analyze(['/project/src/App.vue']);
      const graph = analyzer.getGraph();

      expect(graph.nodes.size).toBe(0);
      expect(graph.edges.size).toBe(0);
    });
  });
});
