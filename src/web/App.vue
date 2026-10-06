<script setup lang="ts">
import { ref } from "vue";

const status = ref("checking…");
fetch("/api/health")
  .then((r) => r.json())
  .then((j) => (status.value = j.ok ? "server ok" : "server error"))
  .catch(() => (status.value = "server unreachable"));
</script>

<template>
  <h1>Bookcase</h1>
  <p>{{ status }}</p>
</template>
