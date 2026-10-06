<script setup lang="ts">
import { nextTick, onActivated, onDeactivated, ref, watch } from "vue";
import { BarcodeDetector } from "barcode-detector/ponyfill";

interface Book {
  isbn: string;
  title: string;
}
type Scan = { status: "saved"; book: Book } | { status: "duplicate"; book: Book } | { status: "manual"; isbn: string };

const REPEAT_MS = 3000;

const video = ref<HTMLVideoElement>();
const input = ref<HTMLInputElement>();
const manualError = ref("");
const typed = ref("");
const error = ref("");
const notice = ref("");
const cameraError = ref("");
const added = ref<Book[]>([]);
const pending = ref(false);
const duplicate = ref<Book | null>(null);
const manual = ref<{ isbn: string; title: string; authors: string } | null>(null);

// A lookup or open sheet blocks further scans; camera reads that aren't ISBNs are dropped silently
async function scan(isbn: string, fromCamera = false): Promise<boolean> {
  if (pending.value || duplicate.value || manual.value) {
    notice.value = "Finish the current Scan first";
    return false;
  }
  notice.value = "";
  pending.value = true;
  try {
    const res = await fetch("/api/scan", {
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
    const r = body as Scan;
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
  if (isbn && (await scan(isbn))) typed.value = "";
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
  let s: MediaStream;
  try {
    s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
  } catch {
    cameraError.value = "Camera unavailable; type the ISBN instead";
    return;
  }
  if (mine !== generation) return s.getTracks().forEach((t) => t.stop());
  stream = s;
  video.value!.srcObject = s;
  await video.value!.play();
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
      if (seen === undefined || now - seen > REPEAT_MS) scan(rawValue, true);
    }
    busy = false;
  }, 250);
}

function stopCamera() {
  generation++;
  clearInterval(timer);
  stream?.getTracks().forEach((t) => t.stop());
  stream = undefined;
  lastSeen.clear();
}

onActivated(() => {
  startCamera();
  input.value?.focus();
});
onDeactivated(stopCamera);
</script>

<template>
  <main class="scan">
    <a href="#/">← Books</a>
    <video ref="video" playsinline muted />
    <p v-if="cameraError">{{ cameraError }}</p>
    <form @submit.prevent="submitTyped">
      <input ref="input" v-model="typed" inputmode="numeric" placeholder="Type or scan an ISBN" aria-label="ISBN" autofocus />
      <button type="submit">Add</button>
    </form>
    <p v-if="error" role="alert">{{ error }}</p>
    <p v-if="notice" role="status">{{ notice }}</p>
    <p v-if="pending" role="status">Looking up…</p>

    <section v-if="added.length">
      <h2>Just added</h2>
      <ul>
        <li v-for="b in added" :key="b.isbn">
          <a :href="`#/books/${b.isbn}`">{{ b.title }}</a>
          <button @click="undo(b)">Undo</button>
        </li>
      </ul>
    </section>

    <div v-if="duplicate" class="sheet" role="dialog">
      <p>“{{ duplicate.title }}” is already in your Bookcase.</p>
      <a :href="`#/books/${duplicate.isbn}`">Open it</a>
      <button @click="duplicate = null">Keep scanning</button>
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
.scan { padding: 0.5rem; display: flex; flex-direction: column; gap: 0.5rem; }
.scan form:not(.sheet) { display: flex; gap: 0.5rem; }
.scan form:not(.sheet) input { flex: 1; }
.scan video { width: 100%; max-height: 40vh; background: #000; }
.sheet { position: fixed; inset: auto 0 0 0; padding: 1rem; background: Canvas; border-top: 1px solid; display: flex; flex-direction: column; gap: 0.5rem; }
</style>
