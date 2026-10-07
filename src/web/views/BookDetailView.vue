<script setup lang="ts">
import { ref, watchEffect } from "vue";
import BookCover from "../components/BookCover.vue";

interface Book {
  isbn: string;
  title: string;
  subtitle: string | null;
  authors: string[];
  publisher: string | null;
  year: number | null;
  pageCount: number | null;
  tags: string[];
  hasCover: boolean;
  addedAt: string;
  updatedAt: string;
}

const props = defineProps<{ isbn: string }>();
const book = ref<Book | null>(null);
const missing = ref(false);
const allTags = ref<{ name: string }[]>([]);
const editing = ref(false);
const form = ref({ title: "", subtitle: "", authors: "" });
const error = ref("");
const newTag = ref("");
const confirmingDelete = ref(false);

async function load() {
  const res = await fetch(`/api/books/${props.isbn}`);
  if (!res.ok) {
    missing.value = true;
    return;
  }
  book.value = await res.json();
  allTags.value = await (await fetch("/api/tags")).json();
}
watchEffect(load);

function back() {
  // A deep link has no previous screen in this app, so fall back to the list
  if (history.length > 1) history.back();
  else location.hash = "#/";
}

function startEdit() {
  const b = book.value!;
  form.value = { title: b.title, subtitle: b.subtitle ?? "", authors: b.authors.join(", ") };
  error.value = "";
  editing.value = true;
}

async function save() {
  if (!form.value.title.trim()) {
    error.value = "Title is required";
    return;
  }
  // PUT replaces every field, so the untouched ones are sent back as they were
  const res = await fetch(`/api/books/${book.value!.isbn}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...book.value,
      title: form.value.title,
      subtitle: form.value.subtitle,
      authors: form.value.authors.split(",").map((a) => a.trim()).filter(Boolean),
    }),
  });
  if (!res.ok) {
    error.value = (await res.json()).error;
    return;
  }
  book.value = await res.json();
  editing.value = false;
}

async function setTags(tags: string[]) {
  const res = await fetch(`/api/books/${book.value!.isbn}/tags`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tags }),
  });
  if (!res.ok) {
    error.value = (await res.json()).error;
    return;
  }
  error.value = "";
  book.value = await res.json();
  allTags.value = await (await fetch("/api/tags")).json();
}

function addTag(name: string) {
  if (name.trim()) setTags([...book.value!.tags, name]);
  newTag.value = "";
}

const suggestions = () => allTags.value.filter((t) => !book.value!.tags.includes(t.name));

async function remove() {
  const res = await fetch(`/api/books/${book.value!.isbn}`, { method: "DELETE" });
  if (!res.ok) {
    error.value = "Could not delete this Book";
    return;
  }
  location.hash = "#/";
}
</script>

<template>
  <main class="detail">
    <p v-if="missing">Book not found</p>
    <template v-else-if="book">
      <div class="toolbar">
        <button @click="back">← Back</button>
        <button v-if="!editing" @click="startEdit">Edit details</button>
        <button class="danger" @click="confirmingDelete = true">Delete</button>
      </div>
      <p v-if="confirmingDelete" class="confirm">
        Delete this Book permanently, no undo?
        <button class="danger" @click="remove">Delete</button>
        <button @click="confirmingDelete = false">Cancel</button>
      </p>
      <p v-if="error" role="alert">{{ error }}</p>

      <div class="head">
        <div class="head-cover">
          <BookCover :isbn="book.isbn" :title="book.title" :authors="book.authors" :has-cover="book.hasCover" />
        </div>
        <div class="info">
          <form v-if="editing" @submit.prevent="save">
            <label>Title <input v-model="form.title" required /></label>
            <label>Subtitle <input v-model="form.subtitle" /></label>
            <label>Authors (comma separated) <input v-model="form.authors" /></label>
            <div>
              <button type="submit">Save</button>
              <button type="button" @click="editing = false">Cancel</button>
            </div>
          </form>
          <template v-else>
            <h1>{{ book.title }}</h1>
            <p v-if="book.subtitle" class="subtitle">{{ book.subtitle }}</p>
          </template>
          <dl>
            <template v-if="!editing && book.authors.length">
              <dt>{{ book.authors.length > 1 ? "Authors" : "Author" }}</dt>
              <dd>{{ book.authors.join(", ") }}</dd>
            </template>
            <template v-if="book.publisher"><dt>Publisher</dt><dd>{{ book.publisher }}</dd></template>
            <template v-if="book.year"><dt>Year</dt><dd>{{ book.year }}</dd></template>
            <template v-if="book.pageCount"><dt>Pages</dt><dd>{{ book.pageCount }}</dd></template>
            <dt>ISBN</dt><dd>{{ book.isbn }}</dd>
            <dt>Added</dt><dd>{{ book.addedAt.slice(0, 10) }}</dd>
            <dt>Updated</dt><dd>{{ book.updatedAt.slice(0, 10) }}</dd>
            <dt>Tags</dt>
            <dd class="tags">
              <button v-for="t in book.tags" :key="t" class="chip" :aria-label="`Remove ${t}`" @click="setTags(book.tags.filter((x) => x !== t))">{{ t }} ✕</button>
              <input v-model="newTag" placeholder="Add tag" aria-label="Add tag" @keydown.enter.prevent="addTag(newTag)" />
              <button v-for="t in suggestions()" :key="t.name" class="chip suggestion" @click="addTag(t.name)">+ {{ t.name }}</button>
            </dd>
          </dl>
        </div>
      </div>
    </template>
  </main>
</template>

<style>
.detail { padding: 0.75rem; display: flex; flex-direction: column; gap: 0.75rem; }
.detail label { display: flex; flex-direction: column; }
.toolbar { display: flex; gap: 0.5rem; }
.danger { color: #b3261e; border-color: #b3261e; }
.head { display: flex; flex-wrap: wrap; gap: 1.5rem; align-items: flex-start; }
.head-cover { flex: 0 0 12rem; max-width: 100%; }
.info { flex: 1 1 16rem; min-width: 0; overflow-wrap: anywhere; }
.info h1 { margin: 0; }
.subtitle { margin: 0.25rem 0 0; color: var(--muted); }
.info dl { display: grid; grid-template-columns: max-content minmax(0, 1fr); gap: 0.4rem 1rem; margin: 1rem 0 0; }
.info dt { color: var(--muted); }
.info dd { margin: 0; }
.tags input { min-width: 0; max-width: 100%; }
.tags { display: flex; flex-wrap: wrap; gap: 0.25rem; }
.chip.suggestion { border-style: dashed; }
</style>
