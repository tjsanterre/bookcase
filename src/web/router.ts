import { createRouter, createWebHashHistory } from "vue-router";
import AddView from "./views/AddView.vue";
import BookDetailView from "./views/BookDetailView.vue";
import BookListView from "./views/BookListView.vue";

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: "/", component: BookListView },
    { path: "/add", component: AddView },
    { path: "/books/:isbn", component: BookDetailView, props: true },
  ],
});
