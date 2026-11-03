<script setup lang="ts">
import { useRoute, useRouter } from "vue-router";
import { authClient } from "./auth";

const route = useRoute();
const router = useRouter();
const session = authClient.useSession();

async function signOut() {
  await authClient.signOut();
  await router.push("/sign-in");
}
</script>

<template>
  <header class="app-header">
    <RouterLink to="/" class="brand">Bookcase</RouterLink>
    <nav v-if="session.data" class="header-actions">
      <RouterLink v-if="route.path !== '/add'" to="/add" class="add-button">+ Add</RouterLink>
      <button type="button" class="signout-button" @click="signOut">Sign out</button>
    </nav>
  </header>
  <div class="page">
    <RouterView v-slot="{ Component, route: r }">
      <KeepAlive include="BookListView,AddView">
        <component :is="Component" :key="r.params.isbn" />
      </KeepAlive>
    </RouterView>
  </div>
</template>
