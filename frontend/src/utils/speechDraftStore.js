/**
 * Local safety copy of a student's answers while a section is running.
 *
 * Every answer is saved to the server as soon as it is given. This store is the
 * second layer: if the network drops or the tab crashes before an upload
 * succeeds, the answer is still here, and the runner re-uploads it on the next
 * start or retry tick. Audio is too large for localStorage, so IndexedDB.
 *
 * Record shape: { key, attemptId, sectionId, questionId, kind, blob?, text?,
 *                 durationS?, synced, updatedAt }
 * The key is `${attemptId}:${questionId}`.
 */

const DB_NAME = "speech-test-drafts";
const STORE = "answers";
const DB_VERSION = 1;

let dbPromise = null;

function openDb() {
  if (!("indexedDB" in window)) return Promise.resolve(null);
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "key" });
        store.createIndex("bySection", ["attemptId", "sectionId"]);
      }
    };
    request.onsuccess = () => resolve(request.result);
    // Private browsing or blocked storage: carry on without the local copy.
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });
  return dbPromise;
}

function run(mode, work) {
  return openDb().then(
    (db) =>
      new Promise((resolve) => {
        if (!db) {
          resolve(null);
          return;
        }
        try {
          const tx = db.transaction(STORE, mode);
          const store = tx.objectStore(STORE);
          const result = work(store);
          tx.oncomplete = () => resolve(result?.result ?? true);
          tx.onerror = () => resolve(null);
          tx.onabort = () => resolve(null);
        } catch {
          resolve(null);
        }
      })
  );
}

export const draftKey = (attemptId, questionId) => `${attemptId}:${questionId}`;

export function saveDraft(draft) {
  return run("readwrite", (store) =>
    store.put({
      ...draft,
      key: draftKey(draft.attemptId, draft.questionId),
      updatedAt: Date.now(),
    })
  );
}

export function markDraftSynced(attemptId, questionId) {
  return openDb().then(
    (db) =>
      new Promise((resolve) => {
        if (!db) return resolve(null);
        try {
          const tx = db.transaction(STORE, "readwrite");
          const store = tx.objectStore(STORE);
          const get = store.get(draftKey(attemptId, questionId));
          get.onsuccess = () => {
            if (get.result) store.put({ ...get.result, synced: true });
          };
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(null);
          tx.onabort = () => resolve(null);
        } catch {
          resolve(null);
        }
      })
  );
}

/** All drafts for one section, newest state per question. */
export function getSectionDrafts(attemptId, sectionId) {
  return openDb().then(
    (db) =>
      new Promise((resolve) => {
        if (!db) return resolve([]);
        try {
          const tx = db.transaction(STORE, "readonly");
          const request = tx
            .objectStore(STORE)
            .index("bySection")
            .getAll(IDBKeyRange.only([attemptId, sectionId]));
          request.onsuccess = () => resolve(request.result || []);
          request.onerror = () => resolve([]);
        } catch {
          resolve([]);
        }
      })
  );
}

/** Drops a section's local copies once it is submitted. */
export function clearSectionDrafts(attemptId, sectionId) {
  return openDb().then(
    (db) =>
      new Promise((resolve) => {
        if (!db) return resolve(null);
        try {
          const tx = db.transaction(STORE, "readwrite");
          const store = tx.objectStore(STORE);
          const cursorRequest = store
            .index("bySection")
            .openCursor(IDBKeyRange.only([attemptId, sectionId]));
          cursorRequest.onsuccess = () => {
            const cursor = cursorRequest.result;
            if (cursor) {
              cursor.delete();
              cursor.continue();
            }
          };
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(null);
          tx.onabort = () => resolve(null);
        } catch {
          resolve(null);
        }
      })
  );
}
