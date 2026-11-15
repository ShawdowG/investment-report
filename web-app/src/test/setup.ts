import "fake-indexeddb/auto";
import { Blob as NodeBlob } from "node:buffer";
import { afterEach } from "vitest";

// fake-indexeddb uses structuredClone, which preserves Node's Blob but not
// jsdom's private Blob implementation.
Object.defineProperty(globalThis, "Blob", { configurable: true, value: NodeBlob });

afterEach(() => {
  window.localStorage.clear();
});
