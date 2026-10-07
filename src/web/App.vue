<template>
  <!-- KeepAlive preserves the list's filters and the scan screen's "Just added" while a detail page is open -->
  <RouterView v-slot="{ Component, route }">
    <KeepAlive include="BookList,ScanScreen">
      <component :is="Component" :key="route.params.isbn" />
    </KeepAlive>
  </RouterView>
</template>
