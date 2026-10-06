<script setup lang="ts">
import { ref, watchEffect } from "vue";

interface Book {
  isbn: string;
  title: string;
  subtitle: string | null;
  authors: string[];
  publisher: string | null;
  year: number | null;
  pageCount: number | null;
  tags: string[];
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
const noCover = ref(false);

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
    <button @click="back">← Back</button>
    <p v-if="missing">Book not found</p>
    <template v-else-if="book">
      <img v-if="!noCover" :src="`/api/books/${book.isbn}/cover`" alt="Cover" width="120" @error="noCover = true" />

      <form v-if="editing" @submit.prevent="save">
        <label>Title <input v-model="form.title" required /></label>
        <label>Subtitle <input v-model="form.subtitle" /></label>
        <label>Authors (comma separated) <input v-model="form.authors" /></label>
        <button type="submit">Save</button>
        <button type="button" @click="editing = false">Cancel</button>
      </form>
      <template v-else>
        <h1>{{ book.title }}</h1>
        <p v-if="book.subtitle">{{ book.subtitle }}</p>
        <p>{{ book.authors.join(", ") }}</p>
        <button @click="startEdit">Edit details</button>
      </template>
      <p>ISBN {{ book.isbn }}</p>
      <p v-if="error" role="alert">{{ error }}</p>

      <div class="tags">
        <button v-for="t in book.tags" :key="t" class="chip" :aria-label="`Remove ${t}`" @click="setTags(book.tags.filter((x) => x !== t))">{{ t }} ✕</button>
        <input v-model="newTag" placeholder="Add tag" aria-label="Add tag" @keydown.enter.prevent="addTag(newTag)" />
        <button v-for="t in suggestions()" :key="t.name" class="chip suggestion" @click="addTag(t.name)">+ {{ t.name }}</button>
      </div>

      <p v-if="!confirmingDelete"><a href="#" @click.prevent="confirmingDelete = true">Delete this book</a></p>
      <p v-else>
        Delete this Book permanently, no undo?
        <button @click="remove">Delete</button>
        <button @click="confirmingDelete = false">Cancel</button>
      </p>
    </template>
  </main>
</template>

<style>
.detail { padding: 0.5rem; display: flex; flex-direction: column; gap: 0.5rem; align-items: flex-start; }
.detail label { display: flex; flex-direction: column; }
.tags { display: flex; flex-wrap: wrap; gap: 0.25rem; }
.chip.suggestion { border-style: dashed; }
</style>
