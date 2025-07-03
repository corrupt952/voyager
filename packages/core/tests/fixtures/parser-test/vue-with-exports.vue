<template>
  <div>With Exports</div>
</template>

<script setup lang="ts">
export const helper = () => 'helper'
export interface Props {
  title: string
}

const props = defineProps<Props>()
</script>