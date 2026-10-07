import { createRouter, createWebHashHistory } from "vue-router";
import BookDetailView from "./views/BookDetailView.vue";
import BookListView from "./views/BookListView.vue";
import ScanView from "./views/ScanView.vue";

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: "/", component: BookListView },
    { path: "/scan", component: ScanView },
    { path: "/books/:isbn", component: BookDetailView, props: true },
  ],
});
