<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{ isbn: string; title: string; authors: string[]; hasCover: boolean; lazy?: boolean }>();
const tooltip = computed(() => `${props.title} — ${props.authors.join(", ")}`);
</script>

<template>
  <img
    v-if="hasCover"
    class="cover"
    :src="`/api/books/${isbn}/cover`"
    :alt="`Cover of ${title}`"
    :title="tooltip"
    :loading="lazy ? 'lazy' : undefined"
  />
  <span v-else class="cover placeholder" :title="tooltip"><span>{{ title.charAt(0).toUpperCase() }}</span></span>
</template>

<style>
.cover { display: block; width: 100%; aspect-ratio: 2 / 3; object-fit: cover; border-radius: 0.25rem; background: var(--accent-soft); box-shadow: 0 1px 3px rgb(0 0 0 / 0.25); }
.placeholder { container-type: inline-size; display: grid; place-items: center; font-weight: 700; color: var(--accent); }
.placeholder > span { font-size: 40cqw; }
</style>
