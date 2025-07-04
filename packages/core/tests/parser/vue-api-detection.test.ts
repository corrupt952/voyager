import { describe, it, expect } from 'vitest';
import { parseVue } from '../../src/parser/vue-parser.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync, mkdirSync, rmSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const tempDir = join(__dirname, '../temp-api-detection');

// テスト用の一時ディレクトリを作成
describe('Vue API Detection - Comprehensive Tests', () => {
  beforeAll(() => {
    try {
      mkdirSync(tempDir, { recursive: true });
    } catch (e) {
      // ディレクトリが既に存在する場合は無視
    }
  });

  afterAll(() => {
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {
      // エラーは無視
    }
  });

  const createTestFile = (filename: string, content: string) => {
    const filepath = join(tempDir, filename);
    writeFileSync(filepath, content);
    return filepath;
  };

  describe('Composition API - script setup', () => {
    it('should detect basic script setup', () => {
      const content = `
<template>
  <div>{{ count }}</div>
</template>

<script setup>
import { ref } from 'vue'
const count = ref(0)
</script>
`;
      const filepath = createTestFile('basic-script-setup.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('composition');
    });

    it('should detect script setup with TypeScript', () => {
      const content = `
<template>
  <div>{{ count }}</div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
const count = ref<number>(0)
</script>
`;
      const filepath = createTestFile('ts-script-setup.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('composition');
      expect(result.scriptLang).toBe('ts');
    });

    it('should detect script setup with lang="typescript"', () => {
      const content = `
<script setup lang="typescript">
const props = defineProps<{ msg: string }>()
</script>
`;
      const filepath = createTestFile('typescript-lang.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('composition');
      expect(result.scriptLang).toBe('ts');
    });
  });

  describe('Composition API - defineComponent', () => {
    it('should detect defineComponent with setup function', () => {
      const content = `
<script>
import { defineComponent, ref } from 'vue'

export default defineComponent({
  setup() {
    const count = ref(0)
    return { count }
  }
})
</script>
`;
      const filepath = createTestFile('define-component-setup.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('composition');
    });

    it('should detect defineComponent with arrow function setup', () => {
      const content = `
<script>
import { defineComponent } from 'vue'

export default defineComponent({
  setup: () => {
    return { message: 'hello' }
  }
})
</script>
`;
      const filepath = createTestFile('arrow-setup.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('composition');
    });

    it('should detect async setup function', () => {
      const content = `
<script>
import { defineComponent } from 'vue'

export default defineComponent({
  async setup() {
    const data = await fetchData()
    return { data }
  }
})
</script>
`;
      const filepath = createTestFile('async-setup.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('composition');
    });

    it('should detect setup with various spacing', () => {
      const content = `
<script>
export default {
  setup    (   )    {
    return {}
  }
}
</script>
`;
      const filepath = createTestFile('setup-spacing.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('composition');
    });

    it('should detect setup with line breaks', () => {
      const content = `
<script>
export default {
  setup
  () {
    return {}
  }
}
</script>
`;
      const filepath = createTestFile('setup-linebreak.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('composition');
    });
  });

  describe('Composition API - imports detection', () => {
    it('should detect Composition API by Vue imports', () => {
      const content = `
<script>
import { ref, reactive, computed, watch } from 'vue'

export default {
  setup() {
    // With setup function and composition imports
    return {}
  }
}
</script>
`;
      const filepath = createTestFile('composition-imports.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('composition');
    });

    it('should detect composables usage', () => {
      const content = `
<script>
import { useRouter } from 'vue-router'
import { useStore } from 'vuex'
import { useI18n } from 'vue-i18n'

export default {
  // using composables indicates Composition API
}
</script>
`;
      const filepath = createTestFile('composables.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('composition');
    });

    it('should detect custom composables', () => {
      const content = `
<script>
import { useAuth } from '@/composables/useAuth'
import { useTheme } from './composables/theme'

export default {}
</script>
`;
      const filepath = createTestFile('custom-composables.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('composition');
    });
  });

  describe('Options API - standard patterns', () => {
    it('should detect basic Options API', () => {
      const content = `
<script>
export default {
  data() {
    return {
      count: 0
    }
  },
  methods: {
    increment() {
      this.count++
    }
  }
}
</script>
`;
      const filepath = createTestFile('basic-options.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('options');
    });

    it('should detect Options API with computed', () => {
      const content = `
<script>
export default {
  data() {
    return { firstName: 'John', lastName: 'Doe' }
  },
  computed: {
    fullName() {
      return this.firstName + ' ' + this.lastName
    }
  }
}
</script>
`;
      const filepath = createTestFile('options-computed.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('options');
    });

    it('should detect Options API with watch', () => {
      const content = `
<script>
export default {
  data() {
    return { question: '' }
  },
  watch: {
    question(newVal, oldVal) {
      console.log(newVal)
    }
  }
}
</script>
`;
      const filepath = createTestFile('options-watch.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('options');
    });

    it('should detect Options API with props', () => {
      const content = `
<script>
export default {
  props: {
    title: String,
    likes: Number
  },
  data() {
    return { localData: 'test' }
  }
}
</script>
`;
      const filepath = createTestFile('options-props.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('options');
    });

    it('should detect Options API with array props', () => {
      const content = `
<script>
export default {
  props: ['title', 'likes'],
  methods: {
    handleClick() {}
  }
}
</script>
`;
      const filepath = createTestFile('options-array-props.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('options');
    });

    it('should detect Options API with lifecycle hooks', () => {
      const content = `
<script>
export default {
  mounted() {
    console.log('mounted')
  },
  created() {
    console.log('created')
  }
}
</script>
`;
      const filepath = createTestFile('options-lifecycle.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('options');
    });

    it('should detect Options API with components option', () => {
      const content = `
<script>
import ChildComponent from './Child.vue'

export default {
  components: {
    ChildComponent
  },
  data() {
    return {}
  }
}
</script>
`;
      const filepath = createTestFile('options-components.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('options');
    });
  });

  describe('Mixed API patterns', () => {
    it('should detect mixed APIs (Options + setup)', () => {
      const content = `
<script>
export default {
  data() {
    return { optionsData: 'test' }
  },
  setup() {
    const compositionData = ref('test')
    return { compositionData }
  },
  methods: {
    optionsMethod() {}
  }
}
</script>
`;
      const filepath = createTestFile('mixed-api.vue', content);
      const result = parseVue(filepath);
      // 現在の実装では最初にマッチしたものを返すため、このテストは失敗する
      expect(result.scriptType).toBe('mixed'); // 新しいタイプが必要
    });

    it('should detect Options API with Composition imports', () => {
      const content = `
<script>
import { ref } from 'vue'

export default {
  data() {
    return { count: 0 }
  },
  methods: {
    // Options APIだが、将来的にComposition APIに移行予定でimportだけ追加
  }
}
</script>
`;
      const filepath = createTestFile('options-with-imports.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('options'); // Import alone doesn't make it mixed without actual usage
    });
  });

  describe('Edge cases and false positives', () => {
    it('should not detect API from comments', () => {
      const content = `
<script>
// This component uses data() and methods:
// But it's actually using Composition API
import { ref } from 'vue'

export default {
  setup() {
    return {}
  }
}
</script>
`;
      const filepath = createTestFile('comment-false-positive.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('composition');
    });

    it('should not detect API from strings', () => {
      const content = `
<script>
export default {
  setup() {
    const message = "This string contains methods: and data() but it's not Options API"
    return { message }
  }
}
</script>
`;
      const filepath = createTestFile('string-false-positive.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('composition');
    });

    it('should detect empty component as unknown', () => {
      const content = `
<script>
export default {}
</script>
`;
      const filepath = createTestFile('empty-component.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('unknown');
    });

    it('should detect component with only name as unknown', () => {
      const content = `
<script>
export default {
  name: 'MyComponent'
}
</script>
`;
      const filepath = createTestFile('name-only.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('unknown');
    });

    it('should handle malformed setup function', () => {
      const content = `
<script>
export default {
  setUp() { // typo: should be setup
    return {}
  }
}
</script>
`;
      const filepath = createTestFile('malformed-setup.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('unknown');
    });

    it('should detect render function as Composition API', () => {
      const content = `
<script>
import { h } from 'vue'

export default {
  render() {
    return h('div', 'Hello')
  }
}
</script>
`;
      const filepath = createTestFile('render-function.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('composition');
    });

    it('should handle script with only imports', () => {
      const content = `
<script>
import SomeComponent from './SomeComponent.vue'
import { someUtil } from './utils'
</script>
`;
      const filepath = createTestFile('imports-only.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('unknown');
    });
  });

  describe('Complex real-world patterns', () => {
    it('should detect Pinia store usage as Composition API', () => {
      const content = `
<script>
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'

export default {
  setup() {
    const store = useUserStore()
    const { user } = storeToRefs(store)
    return { user }
  }
}
</script>
`;
      const filepath = createTestFile('pinia-usage.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('composition');
    });

    it('should detect VueUse composables', () => {
      const content = `
<script setup>
import { useLocalStorage, useMouse, usePreferredDark } from '@vueuse/core'

const store = useLocalStorage('my-storage', {})
const { x, y } = useMouse()
</script>
`;
      const filepath = createTestFile('vueuse.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('composition');
    });

    it('should detect class-style components as unknown', () => {
      const content = `
<script>
import { Component, Vue } from 'vue-property-decorator'

@Component
export default class MyComponent extends Vue {
  message = 'Hello'
  
  get computed() {
    return this.message + ' World'
  }
}
</script>
`;
      const filepath = createTestFile('class-component.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('class'); // class component is now supported
    });
  });
});