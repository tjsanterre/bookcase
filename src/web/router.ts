import { createRouter, createWebHashHistory } from "vue-router";
import BookDetail from "./BookDetail.vue";
import BookList from "./BookList.vue";
import ScanScreen from "./ScanScreen.vue";

export default createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: "/", component: BookList },
    { path: "/scan", component: ScanScreen },
    { path: "/books/:isbn", component: BookDetail, props: true },
  ],
});
