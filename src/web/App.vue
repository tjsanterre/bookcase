<script setup lang="ts">
import { useRoute } from "vue-router";

const route = useRoute();
</script>

<template>
  <header class="app-header">
    <RouterLink to="/" class="brand">Bookcase</RouterLink>
    <RouterLink v-if="route.path !== '/add'" to="/add" class="add-button">+ Add</RouterLink>
  </header>
  <div class="page">
    <RouterView v-slot="{ Component, route: r }">
      <KeepAlive include="BookListView,AddView">
        <component :is="Component" :key="r.params.isbn" />
      </KeepAlive>
    </RouterView>
  </div>
</template>
