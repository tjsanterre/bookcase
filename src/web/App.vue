<script setup lang="ts">
import { computed, ref } from "vue";
import BookDetail from "./BookDetail.vue";
import BookList from "./BookList.vue";

const hash = ref(location.hash);
addEventListener("hashchange", () => (hash.value = location.hash));

const isbn = computed(() => /^#\/books\/([^/?#]+)$/.exec(hash.value)?.[1]);
</script>

<template>
  <!-- KeepAlive preserves the list's search and filters while a detail page is open -->
  <KeepAlive include="BookList">
    <BookDetail v-if="isbn" :key="isbn" :isbn="isbn" />
    <BookList v-else />
  </KeepAlive>
</template>
