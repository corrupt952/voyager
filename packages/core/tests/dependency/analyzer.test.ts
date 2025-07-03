import { describe, it, expect, beforeEach } from 'vitest';
import { DependencyAnalyzer } from '../../src/dependency/analyzer.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('DependencyAnalyzer', () => {
  const fixtureDir = join(__dirname, '../fixtures/test-project');
  let analyzer: DependencyAnalyzer;

  beforeEach(() => {
    analyzer = new DependencyAnalyzer({
      rootDir: fixtureDir,
      baseUrl: 'src',
      paths: {
        '@/*': ['src/*'],
      },
    });
  });

  describe('Dependency analysis', () => {
    it('should analyze dependencies of multiple Vue files', () => {
      const files = [
        join(fixtureDir, 'src/App.vue'),
        join(fixtureDir, 'src/components/Header.vue'),
        join(fixtureDir, 'src/components/Footer.vue'),
      ];

      analyzer.analyze(files);
      const graph = analyzer.getGraph();

      // Verify nodes
      expect(graph.nodes.size).toBe(3);
      expect(graph.nodes.get(files[0])).toBeDefined();
      expect(graph.nodes.get(files[1])).toBeDefined();
      expect(graph.nodes.get(files[2])).toBeDefined();

      // Verify App.vue node details
      const appNode = graph.nodes.get(files[0]);
      expect(appNode).toBeDefined();
      if (appNode) {
        expect(appNode.type).toBe('vue');
        expect(appNode.scriptType).toBe('composition');
        expect(appNode.scriptLang).toBe('ts');
        expect(appNode.dependencies.imports).toHaveLength(2);
        expect(appNode.dependencies.imports).toContain('./components/Header.vue');
        expect(appNode.dependencies.imports).toContain('./components/Footer.vue');
      }

      // Verify edges
      expect(graph.edges.size).toBe(2);
      const edges = Array.from(graph.edges);
      expect(edges).toContainEqual({
        from: files[0],
        to: files[1],
        type: 'import',
      });
      expect(edges).toContainEqual({
        from: files[0],
        to: files[2],
        type: 'import',
      });

      // Verify reverse dependencies
      const headerNode = graph.nodes.get(files[1]);
      const footerNode = graph.nodes.get(files[2]);
      expect(headerNode?.dependencies.importedBy).toContain(files[0]);
      expect(footerNode?.dependencies.importedBy).toContain(files[0]);
    });

    it('should resolve alias paths', () => {
      // Component that uses alias import
      const componentWithAlias = join(fixtureDir, 'src/components/TestAlias.vue');
      const targetComponent = join(fixtureDir, 'src/components/Button.vue');

      analyzer.analyze([componentWithAlias, targetComponent]);
      const graph = analyzer.getGraph();

      expect(graph.nodes.size).toBe(2);
      expect(graph.edges.size).toBe(1);
      const edge = Array.from(graph.edges)[0];
      expect(edge).toEqual({
        from: componentWithAlias,
        to: targetComponent,
        type: 'import',
      });
    });

    it('should ignore non-existent files', () => {
      const files = [
        join(fixtureDir, 'src/App.vue'),
        join(fixtureDir, 'src/NotExist.vue'), // Non-existent file
        join(fixtureDir, 'src/components/Header.vue'),
      ];

      analyzer.analyze(files);
      const graph = analyzer.getGraph();

      // Only existing files should be included as nodes
      expect(graph.nodes.size).toBe(2);
      expect(graph.nodes.has(files[0])).toBe(true);
      expect(graph.nodes.has(files[1])).toBe(false);
      expect(graph.nodes.has(files[2])).toBe(true);
    });

    it('should ignore files with parsing errors', () => {
      // Test with invalid Vue file
      const invalidFile = join(fixtureDir, 'src/invalid.vue');
      const validFile = join(fixtureDir, 'src/App.vue');

      analyzer.analyze([invalidFile, validFile]);
      const graph = analyzer.getGraph();

      // Only valid files should be included
      expect(graph.nodes.has(validFile)).toBe(true);
      expect(graph.nodes.has(invalidFile)).toBe(false);
    });
  });

  describe('Graph structure validation', () => {
    it('should set relative paths correctly', () => {
      const file = join(fixtureDir, 'src/App.vue');
      analyzer.analyze([file]);
      
      const graph = analyzer.getGraph();
      const node = graph.nodes.get(file);
      expect(node?.relativePath).toBe('src/App.vue');
    });

    it('should build bidirectional dependencies', () => {
      const files = [
        join(fixtureDir, 'src/App.vue'),
        join(fixtureDir, 'src/components/Header.vue'),
      ];

      analyzer.analyze(files);
      const graph = analyzer.getGraph();

      const appNode = graph.nodes.get(files[0]);
      const headerNode = graph.nodes.get(files[1]);

      // App.vue imports Header.vue
      expect(appNode?.dependencies.imports).toContain('./components/Header.vue');
      // Header.vue is imported by App.vue
      expect(headerNode?.dependencies.importedBy).toContain(files[0]);
    });
  });
});