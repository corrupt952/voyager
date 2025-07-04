import { describe, it, expect } from 'vitest';
import { parseVue } from '../../src/parser/vue-parser.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync, mkdirSync, rmSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const tempDir = join(__dirname, '../temp-api-detection-comprehensive');

describe('Vue API Detection - Ultra Comprehensive Tests', () => {
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

  describe('Options API - Complete Property Coverage', () => {
    it('should detect emits with array syntax', () => {
      const content = `
<script>
export default {
  emits: ['update:modelValue', 'close', 'submit'],
  methods: {
    handleSubmit() {
      this.$emit('submit')
    }
  }
}
</script>
`;
      const filepath = createTestFile('options-emits-array.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('options');
    });

    it('should detect emits with object validation syntax', () => {
      const content = `
<script>
export default {
  emits: {
    'update:modelValue': (value) => typeof value === 'string',
    'close': null,
    'change': (id, name) => id != null && name != null
  }
}
</script>
`;
      const filepath = createTestFile('options-emits-object.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('options');
    });

    it('should detect provide as function', () => {
      const content = `
<script>
export default {
  provide() {
    return {
      theme: this.theme,
      user: this.currentUser
    }
  },
  data() {
    return {
      theme: 'dark',
      currentUser: null
    }
  }
}
</script>
`;
      const filepath = createTestFile('options-provide-function.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('options');
    });

    it('should detect provide as object', () => {
      const content = `
<script>
export default {
  provide: {
    theme: 'dark',
    primaryColor: '#007bff'
  }
}
</script>
`;
      const filepath = createTestFile('options-provide-object.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('options');
    });

    it('should detect inject with array syntax', () => {
      const content = `
<script>
export default {
  inject: ['theme', 'user', 'config'],
  mounted() {
    console.log(this.theme)
  }
}
</script>
`;
      const filepath = createTestFile('options-inject-array.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('options');
    });

    it('should detect inject with object syntax and defaults', () => {
      const content = `
<script>
export default {
  inject: {
    theme: {
      default: 'light'
    },
    user: {
      from: 'currentUser',
      default: () => ({ name: 'Guest' })
    }
  }
}
</script>
`;
      const filepath = createTestFile('options-inject-object.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('options');
    });

    it('should detect mixins usage', () => {
      const content = `
<script>
import formMixin from './mixins/form'
import validationMixin from './mixins/validation'

export default {
  mixins: [formMixin, validationMixin],
  data() {
    return {
      localData: true
    }
  }
}
</script>
`;
      const filepath = createTestFile('options-mixins.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('options');
    });

    it('should detect extends usage', () => {
      const content = `
<script>
import BaseComponent from './BaseComponent.vue'

export default {
  extends: BaseComponent,
  data() {
    return {
      extendedData: 'value'
    }
  }
}
</script>
`;
      const filepath = createTestFile('options-extends.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('options');
    });

    it('should detect model option for custom v-model', () => {
      const content = `
<script>
export default {
  model: {
    prop: 'checked',
    event: 'change'
  },
  props: {
    checked: Boolean
  }
}
</script>
`;
      const filepath = createTestFile('options-model.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('options');
    });

    it('should detect directives option', () => {
      const content = `
<script>
export default {
  directives: {
    focus: {
      mounted(el) {
        el.focus()
      }
    },
    clickOutside: {
      beforeMount(el, binding) {
        el.clickOutsideEvent = function(event) {
          if (!(el === event.target || el.contains(event.target))) {
            binding.value(event)
          }
        }
        document.addEventListener('click', el.clickOutsideEvent)
      },
      unmounted(el) {
        document.removeEventListener('click', el.clickOutsideEvent)
      }
    }
  }
}
</script>
`;
      const filepath = createTestFile('options-directives.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('options');
    });

    it('should detect inheritAttrs option', () => {
      const content = `
<script>
export default {
  inheritAttrs: false,
  props: ['label', 'value']
}
</script>
`;
      const filepath = createTestFile('options-inheritAttrs.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('options');
    });

    it('should detect filters (Vue 2)', () => {
      const content = `
<script>
export default {
  filters: {
    capitalize(value) {
      if (!value) return ''
      return value.toString().toUpperCase()
    },
    currency(value) {
      return '$' + value.toFixed(2)
    }
  }
}
</script>
`;
      const filepath = createTestFile('options-filters.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('options');
    });

    it('should detect all Vue 2 lifecycle hooks', () => {
      const content = `
<script>
export default {
  beforeCreate() {
    console.log('beforeCreate')
  },
  created() {
    console.log('created')
  },
  beforeMount() {
    console.log('beforeMount')
  },
  mounted() {
    console.log('mounted')
  },
  beforeUpdate() {
    console.log('beforeUpdate')
  },
  updated() {
    console.log('updated')
  },
  activated() {
    console.log('activated')
  },
  deactivated() {
    console.log('deactivated')
  },
  beforeDestroy() {
    console.log('beforeDestroy')
  },
  destroyed() {
    console.log('destroyed')
  },
  errorCaptured(err, vm, info) {
    console.log('errorCaptured', err)
  }
}
</script>
`;
      const filepath = createTestFile('options-vue2-lifecycle.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('options');
    });

    it('should detect all Vue 3 lifecycle hooks', () => {
      const content = `
<script>
export default {
  beforeCreate() {
    console.log('beforeCreate')
  },
  created() {
    console.log('created')
  },
  beforeMount() {
    console.log('beforeMount')
  },
  mounted() {
    console.log('mounted')
  },
  beforeUpdate() {
    console.log('beforeUpdate')
  },
  updated() {
    console.log('updated')
  },
  beforeUnmount() {
    console.log('beforeUnmount')
  },
  unmounted() {
    console.log('unmounted')
  },
  errorCaptured(err, instance, info) {
    console.log('errorCaptured', err)
  },
  renderTracked({ key, target, type }) {
    console.log('renderTracked', key)
  },
  renderTriggered({ key, target, type }) {
    console.log('renderTriggered', key)
  },
  activated() {
    console.log('activated')
  },
  deactivated() {
    console.log('deactivated')
  },
  serverPrefetch() {
    return this.fetchData()
  }
}
</script>
`;
      const filepath = createTestFile('options-vue3-lifecycle.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('options');
    });

    it('should detect expose option', () => {
      const content = `
<script>
export default {
  expose: ['publicMethod', 'publicData'],
  data() {
    return {
      publicData: 'visible',
      privateData: 'hidden'
    }
  },
  methods: {
    publicMethod() {},
    privateMethod() {}
  }
}
</script>
`;
      const filepath = createTestFile('options-expose.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('options');
    });

    it('should detect render function in Options API', () => {
      const content = `
<script>
export default {
  props: ['level'],
  render() {
    return h(
      'h' + this.level,
      this.$slots.default()
    )
  }
}
</script>
`;
      const filepath = createTestFile('options-render.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('options');
    });

    it('should detect complex computed with getters and setters', () => {
      const content = `
<script>
export default {
  data() {
    return {
      firstName: 'John',
      lastName: 'Doe'
    }
  },
  computed: {
    fullName: {
      get() {
        return this.firstName + ' ' + this.lastName
      },
      set(newValue) {
        const names = newValue.split(' ')
        this.firstName = names[0]
        this.lastName = names[names.length - 1]
      }
    }
  }
}
</script>
`;
      const filepath = createTestFile('options-computed-getset.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('options');
    });

    it('should detect complex watch configurations', () => {
      const content = `
<script>
export default {
  data() {
    return {
      user: {
        name: 'John',
        profile: {
          age: 30
        }
      }
    }
  },
  watch: {
    user: {
      handler(newVal, oldVal) {
        console.log('User changed')
      },
      deep: true,
      immediate: true
    },
    'user.profile.age': function(newAge) {
      console.log('Age changed to', newAge)
    },
    $route(to, from) {
      console.log('Route changed')
    }
  }
}
</script>
`;
      const filepath = createTestFile('options-watch-complex.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('options');
    });
  });

  describe('Composition API - Advanced Patterns', () => {
    it('should detect all reactivity API imports', () => {
      const content = `
<script>
import { 
  ref, 
  reactive, 
  readonly, 
  computed, 
  watch, 
  watchEffect,
  watchPostEffect,
  watchSyncEffect,
  toRef,
  toRefs,
  toRaw,
  markRaw,
  shallowRef,
  shallowReactive,
  shallowReadonly,
  isRef,
  isProxy,
  isReactive,
  isReadonly,
  unref,
  proxyRefs,
  customRef,
  triggerRef
} from 'vue'

export default {
  // Even without setup, these imports indicate Composition API
}
</script>
`;
      const filepath = createTestFile('composition-all-reactivity.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('composition');
    });

    it('should detect all lifecycle imports', () => {
      const content = `
<script>
import {
  onBeforeMount,
  onMounted,
  onBeforeUpdate,
  onUpdated,
  onBeforeUnmount,
  onUnmounted,
  onActivated,
  onDeactivated,
  onErrorCaptured,
  onRenderTracked,
  onRenderTriggered,
  onServerPrefetch
} from 'vue'

export default {}
</script>
`;
      const filepath = createTestFile('composition-all-lifecycle.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('composition');
    });

    it('should detect effectScope usage', () => {
      const content = `
<script>
import { effectScope, onScopeDispose } from 'vue'

export default {
  setup() {
    const scope = effectScope()
    
    scope.run(() => {
      // effects collected here
    })
    
    onScopeDispose(() => {
      scope.stop()
    })
  }
}
</script>
`;
      const filepath = createTestFile('composition-effectscope.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('composition');
    });

    it('should detect provide/inject in Composition API', () => {
      const content = `
<script>
import { provide, inject } from 'vue'

export default {
  setup() {
    provide('theme', 'dark')
    provide('user', { name: 'John' })
    
    const parentTheme = inject('parentTheme', 'light')
    const config = inject('config')
    
    return {}
  }
}
</script>
`;
      const filepath = createTestFile('composition-provide-inject.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('composition');
    });

    it('should detect getCurrentInstance usage', () => {
      const content = `
<script>
import { getCurrentInstance } from 'vue'

export default {
  setup() {
    const instance = getCurrentInstance()
    const globalProperties = instance.appContext.config.globalProperties
    
    return {}
  }
}
</script>
`;
      const filepath = createTestFile('composition-instance.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('composition');
    });

    it('should detect h and render functions in Composition API', () => {
      const content = `
<script>
import { h, ref } from 'vue'

export default {
  setup() {
    const count = ref(0)
    
    return () => h('div', {
      onClick: () => count.value++
    }, count.value)
  }
}
</script>
`;
      const filepath = createTestFile('composition-render-h.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('composition');
    });

    it('should detect JSX in setup', () => {
      const content = `
<script lang="jsx">
import { ref } from 'vue'

export default {
  setup() {
    const count = ref(0)
    
    return () => (
      <div onClick={() => count.value++}>
        {count.value}
      </div>
    )
  }
}
</script>
`;
      const filepath = createTestFile('composition-jsx.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('composition');
    });

    it('should detect useSlots and useAttrs', () => {
      const content = `
<script>
import { useSlots, useAttrs } from 'vue'

export default {
  setup() {
    const slots = useSlots()
    const attrs = useAttrs()
    
    return {
      hasDefaultSlot: !!slots.default,
      hasIdAttr: !!attrs.id
    }
  }
}
</script>
`;
      const filepath = createTestFile('composition-slots-attrs.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('composition');
    });

    it('should detect nextTick usage', () => {
      const content = `
<script>
import { nextTick, ref } from 'vue'

export default {
  setup() {
    const message = ref('Hello')
    
    const updateMessage = async () => {
      message.value = 'Updated'
      await nextTick()
      console.log('DOM updated')
    }
    
    return { message, updateMessage }
  }
}
</script>
`;
      const filepath = createTestFile('composition-nexttick.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('composition');
    });

    it('should detect popular composables', () => {
      const content = `
<script>
import { useRouter, useRoute } from 'vue-router'
import { useStore } from 'vuex'
import { useI18n } from 'vue-i18n'
import { useHead } from '@vueuse/head'
import { useMutation, useQuery } from '@vue/apollo-composable'

export default {
  setup() {
    const router = useRouter()
    const route = useRoute()
    const store = useStore()
    const { t } = useI18n()
    
    return {}
  }
}
</script>
`;
      const filepath = createTestFile('composition-popular-composables.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('composition');
    });

    it('should detect VueUse composables', () => {
      const content = `
<script>
import { 
  useLocalStorage, 
  useMouse, 
  usePreferredDark,
  useEventListener,
  useIntersectionObserver,
  useDebounce,
  useThrottle
} from '@vueuse/core'

export default {}
</script>
`;
      const filepath = createTestFile('composition-vueuse.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('composition');
    });

    it('should detect custom composables in various paths', () => {
      const content = `
<script>
import { useAuth } from '@/composables/auth'
import { useTheme } from '~/composables/theme'
import { useValidation } from '../composables/validation'
import { useForm } from './composables/form'
import useModal from '@/hooks/useModal'
import { useFetch } from '/src/composables/fetch'

export default {}
</script>
`;
      const filepath = createTestFile('composition-custom-paths.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('composition');
    });

    it('should detect setup with props destructuring', () => {
      const content = `
<script>
export default {
  props: ['modelValue', 'disabled'],
  setup({ modelValue, disabled }) {
    console.log(modelValue, disabled)
    return {}
  }
}
</script>
`;
      const filepath = createTestFile('composition-props-destructure.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('composition');
    });

    it('should detect setup with context destructuring', () => {
      const content = `
<script>
export default {
  setup(props, { emit, attrs, slots, expose }) {
    expose({
      focus: () => console.log('focus')
    })
    
    return {}
  }
}
</script>
`;
      const filepath = createTestFile('composition-context-destructure.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('composition');
    });

    it('should detect defineAsyncComponent', () => {
      const content = `
<script>
import { defineAsyncComponent } from 'vue'

export default {
  components: {
    AsyncComp: defineAsyncComponent(() => 
      import('./components/AsyncComponent.vue')
    ),
    AsyncWithOptions: defineAsyncComponent({
      loader: () => import('./components/Heavy.vue'),
      loadingComponent: LoadingComponent,
      errorComponent: ErrorComponent,
      delay: 200,
      timeout: 3000
    })
  }
}
</script>
`;
      const filepath = createTestFile('composition-async-component.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('composition');
    });
  });

  describe('Script Setup - Vue 3.x Features', () => {
    it('should detect defineProps macro', () => {
      const content = `
<script setup>
const props = defineProps({
  title: String,
  count: {
    type: Number,
    default: 0
  }
})
</script>
`;
      const filepath = createTestFile('script-setup-defineprops.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('composition');
    });

    it('should detect defineProps with TypeScript', () => {
      const content = `
<script setup lang="ts">
interface Props {
  title: string
  count?: number
}

const props = defineProps<Props>()
</script>
`;
      const filepath = createTestFile('script-setup-defineprops-ts.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('composition');
    });

    it('should detect defineEmits', () => {
      const content = `
<script setup>
const emit = defineEmits(['update:modelValue', 'close'])

const handleClick = () => {
  emit('update:modelValue', 'new value')
}
</script>
`;
      const filepath = createTestFile('script-setup-defineemits.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('composition');
    });

    it('should detect defineExpose', () => {
      const content = `
<script setup>
import { ref } from 'vue'

const count = ref(0)
const increment = () => count.value++

defineExpose({
  count,
  increment
})
</script>
`;
      const filepath = createTestFile('script-setup-defineexpose.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('composition');
    });

    it('should detect defineOptions macro (Vue 3.3+)', () => {
      const content = `
<script setup>
defineOptions({
  name: 'MyComponent',
  inheritAttrs: false,
  customOptions: {
    foo: 'bar'
  }
})

const count = ref(0)
</script>
`;
      const filepath = createTestFile('script-setup-defineoptions.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('composition');
    });

    it('should detect defineSlots (Vue 3.3+)', () => {
      const content = `
<script setup lang="ts">
const slots = defineSlots<{
  default(props: { msg: string }): any
  header(): any
  footer(): any
}>()
</script>
`;
      const filepath = createTestFile('script-setup-defineslots.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('composition');
    });

    it('should detect defineModel (Vue 3.4+)', () => {
      const content = `
<script setup>
const modelValue = defineModel()
const count = defineModel('count', { type: Number, default: 0 })
</script>
`;
      const filepath = createTestFile('script-setup-definemodel.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('composition');
    });

    it('should detect generic components (Vue 3.3+)', () => {
      const content = `
<script setup lang="ts" generic="T extends string | number, U">
defineProps<{
  items: T[]
  selected: U
}>()
</script>
`;
      const filepath = createTestFile('script-setup-generic.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('composition');
    });

    it('should detect withDefaults', () => {
      const content = `
<script setup lang="ts">
interface Props {
  msg?: string
  count?: number
}

const props = withDefaults(defineProps<Props>(), {
  msg: 'Hello',
  count: 0
})
</script>
`;
      const filepath = createTestFile('script-setup-withdefaults.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('composition');
    });

    it('should detect top-level await', () => {
      const content = `
<script setup>
const data = await fetch('/api/data').then(r => r.json())
const user = await loadUser()
</script>
`;
      const filepath = createTestFile('script-setup-top-await.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('composition');
    });
  });

  describe('Mixed API Patterns - Real World Scenarios', () => {
    it('should detect gradual migration pattern', () => {
      const content = `
<script>
import { ref, computed } from 'vue'

export default {
  // Legacy Options API
  data() {
    return {
      legacyData: 'old'
    }
  },
  methods: {
    legacyMethod() {
      console.log('legacy')
    }
  },
  // New Composition API
  setup() {
    const newData = ref('new')
    const computedData = computed(() => newData.value.toUpperCase())
    
    return {
      newData,
      computedData
    }
  }
}
</script>
`;
      const filepath = createTestFile('mixed-gradual-migration.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('mixed');
    });

    it('should detect Options API with imported composables', () => {
      const content = `
<script>
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/auth'

export default {
  data() {
    return {
      user: null
    }
  },
  mounted() {
    // Using composables in Options API lifecycle
    const router = useRouter()
    const { isAuthenticated } = useAuth()
    
    if (!isAuthenticated.value) {
      router.push('/login')
    }
  }
}
</script>
`;
      const filepath = createTestFile('mixed-options-with-composables.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('mixed');
    });

    it('should detect setup with Options API helpers', () => {
      const content = `
<script>
import { ref } from 'vue'
import { mapState, mapActions } from 'vuex'

export default {
  setup() {
    const localState = ref(0)
    return { localState }
  },
  computed: {
    ...mapState(['user', 'settings'])
  },
  methods: {
    ...mapActions(['loadUser', 'saveSettings'])
  }
}
</script>
`;
      const filepath = createTestFile('mixed-setup-with-helpers.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('mixed');
    });

    it('should detect mixed with provide/inject', () => {
      const content = `
<script>
import { provide as vueProvide, ref } from 'vue'

export default {
  provide() {
    return {
      optionsProvided: this.someData
    }
  },
  setup() {
    const compositionData = ref('test')
    vueProvide('compositionProvided', compositionData)
    
    return { compositionData }
  },
  data() {
    return {
      someData: 'provided from options'
    }
  }
}
</script>
`;
      const filepath = createTestFile('mixed-provide-both.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('mixed');
    });
  });

  describe('Multiple Script Blocks', () => {
    it('should detect script + script setup combination', () => {
      const content = `
<script>
export default {
  name: 'MyComponent',
  inheritAttrs: false,
  props: {
    foo: String
  }
}
</script>

<script setup>
import { ref } from 'vue'

const count = ref(0)
</script>
`;
      const filepath = createTestFile('multiple-script-setup.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('composition');
    });

    it('should detect multiple script blocks with different langs', () => {
      const content = `
<script lang="ts">
export interface MyComponentProps {
  title: string
}
</script>

<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<MyComponentProps>()
const count = ref(0)
</script>
`;
      const filepath = createTestFile('multiple-scripts-ts.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('composition');
    });
  });

  describe('Edge Cases - No Export Default', () => {
    it('should handle script with only imports', () => {
      const content = `
<script>
import './styles.css'
import 'prismjs'
import 'prismjs/themes/prism-tomorrow.css'
</script>
`;
      const filepath = createTestFile('script-imports-only.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('unknown');
    });

    it('should handle script with side effects', () => {
      const content = `
<script>
console.log('Component loaded')
window.myGlobal = { initialized: true }

if (process.env.NODE_ENV === 'development') {
  console.log('Dev mode')
}
</script>
`;
      const filepath = createTestFile('script-side-effects.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('unknown');
    });

    it('should handle named exports only', () => {
      const content = `
<script>
export const VERSION = '1.0.0'
export function helper() {
  return 'help'
}
export { something } from './somewhere'
</script>
`;
      const filepath = createTestFile('script-named-exports.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('unknown');
    });
  });

  describe('Functional Components', () => {
    it('should detect Vue 2 functional component', () => {
      const content = `
<script>
export default {
  functional: true,
  props: ['level'],
  render(h, context) {
    return h(
      'h' + context.props.level,
      context.data,
      context.children
    )
  }
}
</script>
`;
      const filepath = createTestFile('functional-vue2.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('functional');
    });

    it('should detect Vue 3 functional component', () => {
      const content = `
<script>
export default (props, context) => {
  return h('div', props.message)
}
</script>
`;
      const filepath = createTestFile('functional-vue3.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('functional');
    });

    it('should detect functional component with JSX', () => {
      const content = `
<script lang="jsx">
export default (props) => <div class="functional">{props.message}</div>
</script>
`;
      const filepath = createTestFile('functional-jsx.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('functional');
    });
  });

  describe('TypeScript Specific Patterns', () => {
    it('should detect Options API with TypeScript types', () => {
      const content = `
<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'

interface User {
  id: number
  name: string
}

export default {
  props: {
    user: Object as () => User
  },
  data(): { count: number; users: User[] } {
    return {
      count: 0,
      users: []
    }
  },
  methods: {
    increment(): void {
      this.count++
    },
    addUser(user: User): void {
      this.users.push(user)
    }
  }
}
</script>
`;
      const filepath = createTestFile('options-typescript.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('options');
    });

    it('should detect defineComponent with generics', () => {
      const content = `
<script lang="ts">
import { defineComponent, PropType } from 'vue'

interface Item {
  id: string
  label: string
}

export default defineComponent<{ items: Item[] }>({
  props: {
    items: {
      type: Array as PropType<Item[]>,
      required: true
    }
  },
  setup(props) {
    return {}
  }
})
</script>
`;
      const filepath = createTestFile('composition-generics.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('composition');
    });

    it('should detect Vue 2 class components', () => {
      const content = `
<script lang="ts">
import { Component, Vue, Prop } from 'vue-property-decorator'

@Component({
  components: {
    ChildComponent
  }
})
export default class MyComponent extends Vue {
  @Prop() readonly msg!: string
  
  count = 0
  
  get computedMsg() {
    return 'computed ' + this.msg
  }
  
  increment() {
    this.count++
  }
  
  mounted() {
    console.log('mounted')
  }
}
</script>
`;
      const filepath = createTestFile('class-component.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('class');
    });

    it('should detect satisfies operator (TS 4.9+)', () => {
      const content = `
<script setup lang="ts">
import { ref } from 'vue'

const config = {
  theme: 'dark',
  layout: 'grid'
} satisfies Config

const state = ref({
  count: 0,
  name: 'test'
} satisfies State)
</script>
`;
      const filepath = createTestFile('typescript-satisfies.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('composition');
    });
  });

  describe('Async Components and Dynamic Imports', () => {
    it('should detect async component factory', () => {
      const content = `
<script>
export default {
  components: {
    AsyncComponent: () => import('./AsyncComponent.vue'),
    LazyLoaded: () => ({
      component: import('./HeavyComponent.vue'),
      loading: LoadingComponent,
      error: ErrorComponent,
      delay: 200,
      timeout: 3000
    })
  }
}
</script>
`;
      const filepath = createTestFile('async-components.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('options');
    });

    it('should detect async setup function', () => {
      const content = `
<script>
export default {
  async setup() {
    const data = await fetchInitialData()
    const user = await getCurrentUser()
    
    return {
      data,
      user
    }
  }
}
</script>
`;
      const filepath = createTestFile('async-setup.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('composition');
    });
  });

  describe('Complex Real World Patterns', () => {
    it('should detect Nuxt 3 patterns', () => {
      const content = `
<script setup>
const route = useRoute()
const router = useRouter()
const { data } = await useFetch('/api/data')
const { $pinia } = useNuxtApp()

useState('counter', () => 0)
useLazyFetch('/api/users')
useAsyncData('key', () => $fetch('/api/data'))
</script>
`;
      const filepath = createTestFile('nuxt3-patterns.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('composition');
    });

    it('should detect Pinia store usage patterns', () => {
      const content = `
<script setup>
import { storeToRefs } from 'pinia'
import { useUserStore } from '@/stores/user'
import { useCartStore } from '@/stores/cart'

const userStore = useUserStore()
const { user, isLoggedIn } = storeToRefs(userStore)

const cartStore = useCartStore()
const { items, total } = storeToRefs(cartStore)
</script>
`;
      const filepath = createTestFile('pinia-patterns.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('composition');
    });

    it('should detect complex enterprise component', () => {
      const content = `
<script lang="ts">
import { defineComponent, ref, computed, watch, provide } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import type { FormRules } from '@/types'

export default defineComponent({
  name: 'EnterpriseForm',
  components: {
    FormField,
    SubmitButton
  },
  props: {
    initialData: {
      type: Object,
      default: () => ({})
    }
  },
  emits: ['submit', 'cancel'],
  setup(props, { emit }) {
    const { t } = useI18n()
    const router = useRouter()
    const authStore = useAuthStore()
    const { user } = storeToRefs(authStore)
    
    const formData = ref({ ...props.initialData })
    const loading = ref(false)
    const errors = ref({})
    
    const rules: FormRules = {
      name: [{ required: true, message: t('validation.required') }],
      email: [{ type: 'email', message: t('validation.email') }]
    }
    
    const isValid = computed(() => {
      return Object.keys(errors.value).length === 0
    })
    
    watch(() => props.initialData, (newData) => {
      formData.value = { ...newData }
    }, { deep: true })
    
    const handleSubmit = async () => {
      loading.value = true
      try {
        // submit logic
        emit('submit', formData.value)
      } finally {
        loading.value = false
      }
    }
    
    provide('formContext', {
      errors,
      rules
    })
    
    return {
      formData,
      loading,
      errors,
      isValid,
      handleSubmit,
      t
    }
  }
})
</script>
`;
      const filepath = createTestFile('enterprise-component.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('composition');
    });
  });

  describe('Malformed and Tricky Patterns', () => {
    it('should handle minified code', () => {
      const content = `<script>export default{data(){return{a:1,b:2}},methods:{c(){this.a++}},computed:{d(){return this.a+this.b}}}</script>`;
      const filepath = createTestFile('minified.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('options');
    });

    it('should handle code with unusual formatting', () => {
      const content = `
<script>
export default
{
data
:
function
(
)
{
return
{
count
:
0
}
}
,
methods
:
{
increment
(
)
{
this
.
count
++
}
}
}
</script>
`;
      const filepath = createTestFile('unusual-formatting.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('options');
    });

    it('should not be fooled by strings containing API patterns', () => {
      const content = `
<script>
export default {
  setup() {
    const message = \`
      This component uses data() {
        return { methods: {}, computed: {} }
      }
      But it's actually Composition API
    \`
    return { message }
  }
}
</script>
`;
      const filepath = createTestFile('string-patterns.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('composition');
    });

    it('should handle Unicode and special characters', () => {
      const content = `
<script>
export default {
  data() {
    return {
      message: '你好世界',
      emoji: '🚀',
      special: '\\n\\t\\r'
    }
  },
  methods: {
    处理点击() {
      console.log('中文方法名')
    }
  }
}
</script>
`;
      const filepath = createTestFile('unicode-content.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('options');
    });

    it('should handle regex patterns in code', () => {
      const content = `
<script>
export default {
  data() {
    return {
      // This regex looks for "setup(" but it's not actual setup
      pattern: /setup\\(/g,
      methodsPattern: /methods\\s*:/
    }
  },
  computed: {
    isValid() {
      return this.pattern.test(this.input)
    }
  }
}
</script>
`;
      const filepath = createTestFile('regex-patterns.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('options');
    });
  });

  describe('Template Literal and String Edge Cases', () => {
    it('should handle template literals with API-like content', () => {
      const content = `
<script>
export default {
  setup() {
    const generateCode = () => {
      return \`
        export default {
          data() { return {} },
          methods: {},
          computed: {}
        }
      \`
    }
    return { generateCode }
  }
}
</script>
`;
      const filepath = createTestFile('template-literal-api.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('composition');
    });

    it('should handle dynamic property names', () => {
      const content = `
<script>
const methodName = 'data'
const computedName = 'computed'

export default {
  [methodName]() {
    return { dynamic: true }
  },
  [\`\${computedName}\`]: {
    dynamicComputed() {
      return 'test'
    }
  }
}
</script>
`;
      const filepath = createTestFile('dynamic-properties.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('options');
    });
  });

  describe('Comments and Documentation Patterns', () => {
    it('should ignore patterns in single-line comments', () => {
      const content = `
<script>
// This component used to have data() and methods:
// but now it uses Composition API
export default {
  setup() {
    return {}
  }
}
</script>
`;
      const filepath = createTestFile('single-line-comments.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('composition');
    });

    it('should ignore patterns in multi-line comments', () => {
      const content = `
<script>
/*
 * Legacy code example:
 * export default {
 *   data() { return {} },
 *   methods: {
 *     handleClick() {}
 *   }
 * }
 */
export default {
  setup() {
    return {}
  }
}
</script>
`;
      const filepath = createTestFile('multi-line-comments.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('composition');
    });

    it('should ignore patterns in JSDoc', () => {
      const content = `
<script>
/**
 * @example
 * export default {
 *   data() { return { count: 0 } },
 *   methods: {
 *     increment() { this.count++ }
 *   }
 * }
 */
export default {
  setup() {
    return { message: 'hello' }
  }
}
</script>
`;
      const filepath = createTestFile('jsdoc-patterns.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('composition');
    });
  });

  describe('No Script Block', () => {
    it('should handle component with template only', () => {
      const content = `
<template>
  <div>Template only component</div>
</template>
`;
      const filepath = createTestFile('template-only.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('unknown');
    });

    it('should handle component with style only', () => {
      const content = `
<style scoped>
.container {
  padding: 20px;
}
</style>
`;
      const filepath = createTestFile('style-only.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('unknown');
    });

    it('should handle empty component', () => {
      const content = '';
      const filepath = createTestFile('empty.vue', content);
      const result = parseVue(filepath);
      expect(result.scriptType).toBe('unknown');
    });
  });
});