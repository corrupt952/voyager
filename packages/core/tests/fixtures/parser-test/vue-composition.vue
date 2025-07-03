<template>
  <div>{{ message }}</div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Component from './Component.vue'

const message = ref('Hello')
</script>