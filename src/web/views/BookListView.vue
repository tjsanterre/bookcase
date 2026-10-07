<script setup lang="ts">
import { computed, onActivated, ref, watch } from "vue";
import { authorSortKey } from "../../server/authorSort.ts";

interface Book {
  isbn: string;
  title: string;
  authors: string[];
  hasCover: boolean;
  addedAt: string;
}
type Sort = "title" | "author" | "recent";

const q = ref("");
const sort = ref<Sort>("title");
const selected = ref<string[]>([]);
const mode = ref<"all" | "any">("all");
const sheetOpen = ref(false);
const books = ref<Book[]>([]);
const total = ref(0);
const allTags = ref<{ name: string; count: number }[]>([]);

async function load() {
  const p = new URLSearchParams({ q: q.value, mode: mode.value, sort: sort.value });
  for (const t of selected.value) p.append("tag", t);
  const res = await (await fetch(`/api/books?${p}`)).json();
  books.value = res.books;
  total.value = res.total;
  allTags.value = await (await fetch("/api/tags")).json();
}
watch([q, sort, selected, mode], load, { deep: true });
// Also runs on first mount; returning from a detail page may follow an edit or delete
onActivated(load);

function toggleTag(name: string) {
  const i = selected.value.indexOf(name);
  if (i >= 0) selected.value.splice(i, 1);
  else selected.value.push(name);
}

function clearAll() {
  q.value = "";
  selected.value = [];
  mode.value = "all";
}

function heading(b: Book): string {
  if (sort.value === "recent") {
    const age = Date.now() - new Date(b.addedAt).getTime();
    return age < 864e5 ? "Today" : age < 7 * 864e5 ? "This week" : "Earlier";
  }
  const text = sort.value === "author" ? authorSortKey(b.authors) : b.title;
  const letter = text.charAt(0).toUpperCase();
  return /[A-Z]/.test(letter) ? letter : "#";
}

const groups = computed(() => {
  const out: { name: string; books: Book[] }[] = [];
  for (const b of books.value) {
    const name = heading(b);
    if (out.at(-1)?.name !== name) out.push({ name, books: [] });
    out.at(-1)!.books.push(b);
  }
  return out;
});
</script>

<template>
  <header class="bar">
    <input v-model="q" type="search" placeholder="Search books" aria-label="Search books" />
    <button @click="sheetOpen = true">Filters{{ selected.length ? ` (${selected.length})` : "" }}</button>
    <select v-model="sort" aria-label="Sort">
      <option value="title">A–Z</option>
      <option value="author">Author</option>
      <option value="recent">Recent</option>
    </select>
  </header>

  <div class="pills">
    <button v-for="t in selected" :key="t" @click="toggleTag(t)">{{ t }} ✕</button>
  </div>
  <p class="count">{{ books.length }} of {{ total }}</p>

  <div v-if="!books.length" class="empty">
    <p>No Books match</p>
    <button v-if="total" @click="clearAll">Clear</button>
  </div>
  <section v-for="g in groups" :key="g.name">
    <h2 class="sticky">{{ g.name }}</h2>
    <a v-for="b in g.books" :key="b.isbn" class="row" :href="`#/books/${b.isbn}`">
      <img v-if="b.hasCover" class="cover" :src="`/api/books/${b.isbn}/cover`" alt="" loading="lazy" />
      <span v-else class="cover placeholder" aria-hidden="true">{{ b.title.charAt(0).toUpperCase() }}</span>
      <span class="text">
        <strong>{{ b.title }}</strong>
        <span>{{ b.authors.join(", ") }}</span>
      </span>
    </a>
  </section>

  <div v-if="sheetOpen" class="sheet" role="dialog" aria-label="Filters">
    <label><input v-model="mode" type="radio" value="all" /> Has all</label>
    <label><input v-model="mode" type="radio" value="any" /> Has any</label>
    <label v-for="t in allTags" :key="t.name">
      <input type="checkbox" :checked="selected.includes(t.name)" @change="toggleTag(t.name)" />
      {{ t.name }} ({{ t.count }})
    </label>
    <button @click="selected = []">Clear</button>
    <button @click="sheetOpen = false">Show {{ books.length }} Books</button>
  </div>
</template>

<style>
.bar { display: flex; gap: 0.5rem; padding: 0.75rem; }
.bar input { flex: 1; min-width: 0; }
.pills { padding: 0 0.75rem; }
.pills button { margin: 0 0.25rem 0.25rem 0; background: var(--accent-soft); border-color: var(--accent-soft); }
.count { margin: 0.25rem 0.75rem; color: var(--muted); }
.sticky { position: sticky; top: var(--header-h); margin: 0; padding: 0.25rem 0.75rem; font-size: 0.9rem; color: var(--accent); background: var(--bg); border-bottom: 1px solid var(--border); }
.row { display: flex; gap: 0.75rem; align-items: center; padding: 0.5rem 0.75rem; color: inherit; text-decoration: none; border-bottom: 1px solid var(--border); }
.row:hover { background: var(--accent-soft); }
.row .text { display: flex; flex-direction: column; min-width: 0; }
.row .text span { color: var(--muted); font-size: 0.9rem; }
.cover { flex: none; width: 48px; height: 72px; object-fit: cover; border-radius: 0.25rem; background: var(--accent-soft); box-shadow: 0 1px 3px rgb(0 0 0 / 0.25); }
.placeholder { display: grid; place-items: center; font-size: 1.5rem; font-weight: 700; color: var(--accent); }
.empty { text-align: center; }
.sheet { position: fixed; inset: auto 0 0 0; max-height: 70vh; overflow: auto; display: flex; flex-direction: column; gap: 0.5rem; padding: 1rem; }
</style>
