<script setup lang="ts">
import { nextTick, onActivated, onDeactivated, ref, watch } from "vue";
import { BarcodeDetector } from "barcode-detector/ponyfill";
import BookCover from "../components/BookCover.vue";

interface Book {
  isbn: string;
  title: string;
  authors: string[];
  hasCover: boolean;
}
type AddResult = { status: "saved"; book: Book } | { status: "duplicate"; book: Book } | { status: "manual"; isbn: string };

const REPEAT_MS = 3000;

const video = ref<HTMLVideoElement>();
const input = ref<HTMLInputElement>();
const manualError = ref("");
const typed = ref("");
const error = ref("");
const notice = ref("");
const cameraError = ref("");
const cameraOn = ref(false);
const cameraStarting = ref(false);
const added = ref<Book[]>([]);
const pending = ref(false);
const duplicate = ref<Book | null>(null);
const manual = ref<{ isbn: string; title: string; authors: string } | null>(null);

// A lookup or open sheet blocks further Adds; camera reads that aren't ISBNs are dropped silently
async function add(isbn: string, fromCamera = false): Promise<boolean> {
  if (pending.value || duplicate.value || manual.value) {
    notice.value = "Finish the current Add first";
    return false;
  }
  notice.value = "";
  pending.value = true;
  try {
    const res = await fetch("/api/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isbn }),
    });
    const body = await res.json();
    if (!res.ok) {
      if (!fromCamera) error.value = body.error;
      return false;
    }
    error.value = "";
    const r = body as AddResult;
    if (r.status === "saved") added.value.unshift(r.book);
    else if (r.status === "duplicate") duplicate.value = r.book;
    else manual.value = { isbn: r.isbn, title: "", authors: "" };
    return true;
  } catch {
    if (!fromCamera) error.value = "Could not reach the server";
    return false;
  } finally {
    pending.value = false;
  }
}

async function submitTyped() {
  const isbn = typed.value.trim();
  if (isbn && (await add(isbn))) typed.value = "";
}

// Keeps a USB scanner's next read landing in the input
watch([duplicate, manual], ([d, m]) => {
  if (d || m) return;
  notice.value = "";
  manualError.value = "";
  nextTick(() => input.value?.focus());
});

async function undo(book: Book) {
  const res = await fetch(`/api/books/${book.isbn}`, { method: "DELETE" });
  if (res.ok || res.status === 404) added.value = added.value.filter((b) => b.isbn !== book.isbn);
  else error.value = "Could not undo";
}

async function saveManual() {
  const m = manual.value!;
  if (!m.title.trim()) return;
  const res = await fetch("/api/books", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      isbn: m.isbn,
      title: m.title,
      authors: m.authors.split(",").map((a) => a.trim()).filter(Boolean),
    }),
  });
  if (!res.ok) {
    manualError.value = (await res.json()).error;
    return;
  }
  added.value.unshift(await res.json());
  manual.value = null;
}

// Camera: poll frames while the screen is active; the same code is ignored for REPEAT_MS after its last read
let stream: MediaStream | undefined;
let timer: ReturnType<typeof setInterval> | undefined;
const lastSeen = new Map<string, number>();

let generation = 0;

async function startCamera() {
  const mine = ++generation;
  cameraError.value = "";
  cameraStarting.value = true;
  let s: MediaStream;
  try {
    s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
  } catch {
    cameraError.value = "Camera unavailable; type the ISBN instead";
    cameraStarting.value = false;
    return;
  }
  cameraStarting.value = false;
  if (mine !== generation) return s.getTracks().forEach((t) => t.stop());
  stream = s;
  cameraOn.value = true;
  await nextTick();
  if (mine !== generation) return;
  video.value!.srcObject = s;
  try {
    await video.value!.play();
  } catch {
    if (mine === generation) {
      stopCamera();
      cameraError.value = "Camera unavailable; type the ISBN instead";
    }
    return;
  }
  if (mine !== generation) return;
  const detector = new BarcodeDetector({ formats: ["ean_13"] });
  let busy = false;
  timer = setInterval(async () => {
    if (busy) return;
    busy = true;
    const codes = await detector.detect(video.value!).catch(() => []);
    const now = Date.now();
    for (const { rawValue } of codes) {
      const seen = lastSeen.get(rawValue);
      lastSeen.set(rawValue, now);
      if (seen === undefined || now - seen > REPEAT_MS) add(rawValue, true);
    }
    busy = false;
  }, 250);
}

function stopCamera() {
  generation++;
  cameraStarting.value = false;
  clearInterval(timer);
  stream?.getTracks().forEach((t) => t.stop());
  stream = undefined;
  cameraOn.value = false;
  lastSeen.clear();
}

onActivated(() => input.value?.focus());
onDeactivated(() => {
  stopCamera();
  duplicate.value = null;
  manual.value = null;
});
</script>

<template>
  <main class="add">
    <p>Add a book by its ISBN.</p>

    <section class="method">
      <h2>Camera</h2>
      <button type="button" :disabled="cameraStarting" @click="cameraOn ? stopCamera() : startCamera()">{{ cameraOn ? "Stop camera" : "Start camera" }}</button>
      <p v-if="cameraError" role="alert">{{ cameraError }}</p>
      <template v-if="cameraOn">
        <p class="hint">Point the camera at the barcode on the back cover (starts with 978 or 979).</p>
        <video ref="video" playsinline muted />
      </template>
    </section>

    <p v-if="!cameraOn" class="or">or</p>

    <section v-if="!cameraOn" class="method">
      <h2>Type ISBN</h2>
      <form @submit.prevent="submitTyped">
        <input ref="input" v-model="typed" inputmode="numeric" placeholder="ISBN, 10 or 13 digits" aria-label="ISBN" autofocus />
        <button type="submit">Add</button>
      </form>
      <p class="hint">A USB barcode scanner works here too.</p>
    </section>

    <p v-if="error" role="alert">{{ error }}</p>
    <p v-if="notice" role="status">{{ notice }}</p>
    <p v-if="pending" role="status">Looking up…</p>

    <section v-if="added.length">
      <h2>Just added</h2>
      <ul class="added">
        <li v-for="b in added" :key="b.isbn">
          <a class="thumb" :href="`#/books/${b.isbn}`" aria-hidden="true" tabindex="-1"><BookCover :isbn="b.isbn" :title="b.title" :authors="b.authors" :has-cover="b.hasCover" /></a>
          <a class="info" :href="`#/books/${b.isbn}`">
            <strong>{{ b.title }}</strong>
            <span v-if="b.authors.length">{{ b.authors.join(", ") }}</span>
          </a>
          <button @click="undo(b)">Undo</button>
        </li>
      </ul>
    </section>

    <div v-if="duplicate" class="sheet" role="dialog">
      <p>“{{ duplicate.title }}” is already in your Bookcase.</p>
      <a :href="`#/books/${duplicate.isbn}`">Open it</a>
      <button @click="duplicate = null">Keep adding</button>
    </div>

    <form v-if="manual" class="sheet" role="dialog" @submit.prevent="saveManual">
      <p>No details found for {{ manual.isbn }}.</p>
      <p v-if="manualError" role="alert">{{ manualError }}</p>
      <label>Title <input v-model="manual.title" required /></label>
      <label>Authors (comma separated) <input v-model="manual.authors" /></label>
      <button type="submit">Save</button>
      <button type="button" @click="manual = null">Skip</button>
    </form>
  </main>
</template>

<style>
.add { padding: 0.5rem; display: flex; flex-direction: column; gap: 0.5rem; }
.add h2 { margin: 0; font-size: 1rem; }
.add .method { display: flex; flex-direction: column; align-items: flex-start; gap: 0.5rem; padding: 0.75rem; border: 1px solid var(--border); border-radius: 0.5rem; }
.add .method form { align-self: stretch; }
.add .hint { margin: 0; color: var(--muted); font-size: 0.875rem; }
.add .or { margin: 0; text-align: center; color: var(--muted); }
.add form:not(.sheet) { display: flex; gap: 0.5rem; }
.add form:not(.sheet) input { flex: 1; }
.add video { width: 100%; max-height: 40vh; background: #000; }
.added { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.5rem; }
.added li { display: flex; align-items: center; gap: 0.75rem; }
.added .thumb { flex: 0 0 3rem; }
.added .info { flex: 1; min-width: 0; display: flex; flex-direction: column; color: inherit; text-decoration: none; }
.added .info span { color: var(--muted); font-size: 0.875rem; }
.sheet { position: fixed; inset: auto 0 0 0; padding: 1rem; display: flex; flex-direction: column; gap: 0.5rem; }
</style>
