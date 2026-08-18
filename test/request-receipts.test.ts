import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { requestFingerprint, RequestReceiptStore } from "../src/request-receipts.js";

test("runtime request receipts replay finished writes and reject ambiguous reuse", () => {
  const directory = mkdtempSync(join(tmpdir(), "better-codex-receipts-"));
  const file = join(directory, "runtime.db");
  const store = new RequestReceiptStore(file);
  try {
    const body = Buffer.from('{"title":"Only once"}');
    const fingerprint = requestFingerprint("POST", "/api/issues", body);
    assert.deepEqual(store.begin("request-create-1", "POST", "/api/issues", fingerprint), { kind: "new" });
    assert.deepEqual(store.begin("request-create-1", "POST", "/api/issues", fingerprint), { kind: "unknown" });
    assert.deepEqual(store.begin("request-create-1", "POST", "/api/issues", requestFingerprint("POST", "/api/issues", Buffer.from('{"title":"Different"}'))), { kind: "conflict" });
    store.finish("request-create-1", { status: 201, headers: { "content-type": "application/json" }, body: Buffer.from('{"id":"issue-1"}') });
    const replay = store.begin("request-create-1", "POST", "/api/issues", fingerprint);
    assert.equal(replay.kind, "replay");
    if (replay.kind === "replay") {
      assert.equal(replay.response.status, 201);
      assert.equal(replay.response.body.toString(), '{"id":"issue-1"}');
    }
  } finally {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
