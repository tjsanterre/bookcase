<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { signInWithProvider } from "../auth";

const route = useRoute();
// The Worker appends ?error= ahead of the hash when it refuses a sign-in
const refused = computed(() => new URLSearchParams(location.search).has("error"));
const back = computed(() => (typeof route.query.redirect === "string" ? route.query.redirect : "/"));
</script>

<template>
  <main class="sign-in">
    <h1>Sign in</h1>
    <p class="hint">Bookcase is private. Sign in with the Owner's account.</p>
    <p v-if="refused" role="alert" class="refused">That account isn't allowed. Use the Owner's verified email.</p>
    <button type="button" class="provider-button" @click="signInWithProvider(back)">Continue with your account</button>
  </main>
</template>

<style scoped>
.sign-in { padding: 2rem 1rem; display: grid; gap: 1rem; justify-items: start; }
.sign-in h1 { margin: 0; }
.hint { margin: 0; color: var(--muted); }
.refused { margin: 0; color: var(--danger); }
.provider-button { background: var(--accent); color: var(--accent-text); border-color: var(--accent); font-weight: 600; padding: 0.6rem 1.1rem; }
</style>
