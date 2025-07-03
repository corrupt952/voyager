<template>
  <div>{{ message }}</div>
</template>

<script lang="ts">
import Component from './Component.vue'

export default {
  components: { Component },
  data() {
    return {
      message: 'Hello'
    }
  }
}
</script>