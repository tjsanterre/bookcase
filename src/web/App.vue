<script setup lang="ts">
import { computed, ref } from "vue";
import BookDetail from "./BookDetail.vue";
import BookList from "./BookList.vue";
import ScanScreen from "./ScanScreen.vue";

const hash = ref(location.hash);
addEventListener("hashchange", () => (hash.value = location.hash));

const scanning = computed(() => hash.value === "#/scan");
const isbn = computed(() => /^#\/books\/([^/?#]+)$/.exec(hash.value)?.[1]);
</script>

<template>
  <!-- KeepAlive preserves the list's filters and the scan screen's "Just added" while a detail page is open -->
  <KeepAlive include="BookList,ScanScreen">
    <BookDetail v-if="isbn" :key="isbn" :isbn="isbn" />
    <ScanScreen v-else-if="scanning" />
    <BookList v-else />
  </KeepAlive>
</template>
