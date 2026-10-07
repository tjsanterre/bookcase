<script setup lang="ts">
defineProps<{ isbn: string; title: string; authors: string[]; hasCover: boolean; lazy?: boolean }>();
</script>

<template>
  <img
    v-if="hasCover"
    class="cover"
    :src="`/api/books/${isbn}/cover`"
    :alt="`Cover of ${title}`"
    :title="`${title} — ${authors.join(', ')}`"
    :loading="lazy ? 'lazy' : undefined"
  />
  <span v-else class="cover placeholder" :title="`${title} — ${authors.join(', ')}`">{{ title.charAt(0).toUpperCase() }}</span>
</template>

<style>
.cover { display: block; width: 100%; aspect-ratio: 2 / 3; object-fit: cover; border-radius: 0.25rem; background: var(--accent-soft); box-shadow: 0 1px 3px rgb(0 0 0 / 0.25); }
.placeholder { display: grid; place-items: center; font-size: 2rem; font-weight: 700; color: var(--accent); }
</style>
