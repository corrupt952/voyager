import { describe, it, expect, beforeEach, vi } from 'vitest';
import { parseVue } from '../vue-parser.js';
import { readFileSync } from 'fs';
import { parse } from '@vue/compiler-sfc';
import type { SFCDescriptor, SFCScriptBlock } from '@vue/compiler-sfc';

// モジュールのモック
vi.mock('fs', () => ({
  readFileSync: vi.fn(),
}));

vi.mock('@vue/compiler-sfc', () => ({
  parse: vi.fn(),
}));

// モック用のヘルパー関数
function createMockScript(content: string, lang?: string): SFCScriptBlock {
  return {
    content,
    type: 'script',
    attrs: lang ? { lang } : {},
    loc: {
      source: content,
      start: { line: 1, column: 1, offset: 0 },
      end: { line: 1, column: 1, offset: content.length },
    },
    lang: lang || 'js',
  };
}

function createMockDescriptor(options: {
  script?: string | null;
  scriptSetup?: string | null;
  scriptLang?: string;
  scriptSetupLang?: string;
}): SFCDescriptor {
  return {
    filename: 'test.vue',
    source: '',
    template: null,
    script: options.script ? createMockScript(options.script, options.scriptLang) : null,
    scriptSetup: options.scriptSetup
      ? createMockScript(options.scriptSetup, options.scriptSetupLang)
      : null,
    styles: [],
    customBlocks: [],
    cssVars: [],
    slotted: false,
    shouldForceReload: () => false,
  };
}

describe('vue-parser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('script type detection', () => {
    it('should detect Composition API with defineComponent', () => {
      const scriptContent = `
        import { defineComponent } from 'vue';
        export default defineComponent({});
      `;
      vi.mocked(readFileSync).mockReturnValue(`<script>${scriptContent}</script>`);
      vi.mocked(parse).mockReturnValue({
        descriptor: createMockDescriptor({ script: scriptContent }),
        errors: [],
      });

      const result = parseVue('test.vue');
      expect(result.scriptType).toBe('composition');
    });

    it('should detect Composition API with setup function', () => {
      const scriptContent = `
        export default {
          setup() {
            return {};
          }
        };
      `;
      vi.mocked(readFileSync).mockReturnValue(`<script>${scriptContent}</script>`);
      vi.mocked(parse).mockReturnValue({
        descriptor: createMockDescriptor({ script: scriptContent }),
        errors: [],
      });

      const result = parseVue('test.vue');
      expect(result.scriptType).toBe('composition');
    });

    it('should detect Options API', () => {
      const scriptContent = `
        export default {
          data() {
            return {};
          },
          methods: {},
          computed: {},
        };
      `;
      vi.mocked(readFileSync).mockReturnValue(`<script>${scriptContent}</script>`);
      vi.mocked(parse).mockReturnValue({
        descriptor: createMockDescriptor({ script: scriptContent }),
        errors: [],
      });

      const result = parseVue('test.vue');
      expect(result.scriptType).toBe('options');
    });

    it('should handle script setup', () => {
      const scriptContent = `
        import { ref } from 'vue';
        const count = ref(0);
      `;
      vi.mocked(readFileSync).mockReturnValue(`<script setup>${scriptContent}</script>`);
      vi.mocked(parse).mockReturnValue({
        descriptor: createMockDescriptor({ scriptSetup: scriptContent }),
        errors: [],
      });

      const result = parseVue('test.vue');
      expect(result.scriptType).toBe('composition');
    });

    describe('TypeScript patterns', () => {
      it('should handle <script lang="ts">', () => {
        const scriptContent = `
          interface Props {
            message: string;
          }

          export default {
            props: {
              message: { type: String, required: true }
            } as Props
          };
        `;
        vi.mocked(readFileSync).mockReturnValue(`<script lang="ts">${scriptContent}</script>`);
        vi.mocked(parse).mockReturnValue({
          descriptor: createMockDescriptor({
            script: scriptContent,
            scriptLang: 'ts',
          }),
          errors: [],
        });

        const result = parseVue('test.vue');
        expect(result.type).toBe('vue');
        expect(result.scriptType).toBe('options');
        expect(result.scriptLang).toBe('ts');
      });

      it('should handle <script setup lang="ts">', () => {
        const scriptContent = `
          interface Props {
            message: string;
          }

          defineProps<Props>();

          const count = ref<number>(0);
        `;
        vi.mocked(readFileSync).mockReturnValue(
          `<script setup lang="ts">${scriptContent}</script>`
        );
        vi.mocked(parse).mockReturnValue({
          descriptor: createMockDescriptor({
            scriptSetup: scriptContent,
            scriptSetupLang: 'ts',
          }),
          errors: [],
        });

        const result = parseVue('test.vue');
        expect(result.type).toBe('vue');
        expect(result.scriptType).toBe('composition');
        expect(result.scriptLang).toBe('ts');
      });

      it('should handle <script lang="ts" setup>', () => {
        const scriptContent = `
          interface Props {
            message: string;
          }

          defineProps<Props>();

          const count = ref<number>(0);
        `;
        vi.mocked(readFileSync).mockReturnValue(
          `<script lang="ts" setup>${scriptContent}</script>`
        );
        vi.mocked(parse).mockReturnValue({
          descriptor: createMockDescriptor({
            scriptSetup: scriptContent,
            scriptSetupLang: 'ts',
          }),
          errors: [],
        });

        const result = parseVue('test.vue');
        expect(result.type).toBe('vue');
        expect(result.scriptType).toBe('composition');
        expect(result.scriptLang).toBe('ts');
      });

      it('should handle both normal and setup scripts with TypeScript', () => {
        const normalScript = `
          interface Props {
            message: string;
          }

          export type Status = 'active' | 'inactive';
        `;
        const setupScript = `
          const props = defineProps<Props>();
          const status = ref<Status>('active');
        `;
        vi.mocked(readFileSync).mockReturnValue(
          `<script lang="ts">${normalScript}</script><script setup lang="ts">${setupScript}</script>`
        );
        vi.mocked(parse).mockReturnValue({
          descriptor: createMockDescriptor({
            script: normalScript,
            scriptLang: 'ts',
            scriptSetup: setupScript,
            scriptSetupLang: 'ts',
          }),
          errors: [],
        });

        const result = parseVue('test.vue');
        expect(result.type).toBe('vue');
        expect(result.scriptType).toBe('composition');
        expect(result.scriptLang).toBe('ts');
      });

      it('should handle JavaScript by default when no lang is specified', () => {
        const scriptContent = `
          export default {
            data() {
              return {};
            }
          };
        `;
        vi.mocked(readFileSync).mockReturnValue(`<script>${scriptContent}</script>`);
        vi.mocked(parse).mockReturnValue({
          descriptor: createMockDescriptor({
            script: scriptContent,
          }),
          errors: [],
        });

        const result = parseVue('test.vue');
        expect(result.type).toBe('vue');
        expect(result.scriptLang).toBe('js');
      });

      it('should handle unknown script languages', () => {
        const scriptContent = `
          export default {
            data() {
              return {};
            }
          };
        `;
        vi.mocked(readFileSync).mockReturnValue(`<script lang="coffee">${scriptContent}</script>`);
        vi.mocked(parse).mockReturnValue({
          descriptor: createMockDescriptor({
            script: scriptContent,
            scriptLang: 'coffee',
          }),
          errors: [],
        });

        const result = parseVue('test.vue');
        expect(result.type).toBe('vue');
        expect(result.scriptLang).toBe('unknown');
      });
    });
  });

  describe('imports and exports', () => {
    it('should parse imports from script', () => {
      const scriptContent = `
        import { ref } from 'vue';
        import DefaultComp from './DefaultComp.vue';
        export default {
          setup() {
            return { count: ref(0) };
          }
        };
      `;
      vi.mocked(readFileSync).mockReturnValue(`<script>${scriptContent}</script>`);
      vi.mocked(parse).mockReturnValue({
        descriptor: createMockDescriptor({ script: scriptContent }),
        errors: [],
      });

      const result = parseVue('test.vue');
      expect(result.imports).toHaveLength(2);
      expect(result.imports[1].source).toBe('vue');
      expect(result.imports[0].source).toBe('./DefaultComp.vue');
    });

    it('should always have default export', () => {
      const content = `<template><div></div></template>`;
      vi.mocked(readFileSync).mockReturnValue(content);
      vi.mocked(parse).mockReturnValue({
        descriptor: createMockDescriptor({ script: null, scriptSetup: null }),
        errors: [],
      });

      const result = parseVue('test.vue');
      expect(result.exports.hasDefault).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle SFC parse errors', () => {
      vi.mocked(readFileSync).mockReturnValue('<template>');
      vi.mocked(parse).mockReturnValue({
        descriptor: createMockDescriptor({}),
        errors: [new Error('Unexpected end of template')],
      });

      const result = parseVue('test.vue');
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('Vue SFC parse errors');
    });

    it('should handle file read errors', () => {
      vi.mocked(readFileSync).mockImplementation(() => {
        throw new Error('File not found');
      });

      const result = parseVue('test.vue');
      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe('File not found');
    });
  });
});
