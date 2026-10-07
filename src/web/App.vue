<template>
  <RouterView v-slot="{ Component, route }">
    <KeepAlive include="BookListView,ScanView">
      <component :is="Component" :key="route.params.isbn" />
    </KeepAlive>
  </RouterView>
</template>
