import { createRouter, createWebHashHistory } from "vue-router";
import { authClient } from "./auth";
import AddView from "./views/AddView.vue";
import BookDetailView from "./views/BookDetailView.vue";
import BookListView from "./views/BookListView.vue";
import SignInView from "./views/SignInView.vue";

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: "/", component: BookListView },
    { path: "/add", component: AddView },
    { path: "/books/:isbn", component: BookDetailView, props: true },
    { path: "/sign-in", component: SignInView },
  ],
});

// The Worker enforces the session on the API; this only keeps signed-out visitors off screens that would show errors
router.beforeEach(async (to) => {
  if (to.path === "/sign-in") return true;
  const { data } = await authClient.getSession();
  return data ? true : { path: "/sign-in", query: { redirect: to.fullPath } };
});
