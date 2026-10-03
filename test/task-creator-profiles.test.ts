import assert from "node:assert/strict";
import test from "node:test";
import { chmodSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { TaskCreatorProfiles, taskCreatorPngDataUrl } from "../src/task-creator-profiles.js";
import { ExternalObservationStore, type ExternalReport } from "../src/external-observations.js";
import { taskCreatorPresentation } from "../src/ui/features/board/creator-model.js";
import { externalObservationSchema, reportExternalInput } from "../src/mcp-schemas.js";
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jOYQAAAAASUVORK5CYII=", "base64");
const identity = { provider: "codex", account_id: "test-account", host_id: "test-host", thread_id: "test-thread" };
const report = (patch: Partial<ExternalReport> = {}): ExternalReport => ({ schema_version: 1, ...identity, sequence: 1, item_id: "test-item-1", reported_at: new Date().toISOString(), state: "running", title: "Test task", description: "", project_id: null, parent_thread_id: null, creator_name: "dot", message: null, ...patch });
function fixture() {
  const home = mkdtempSync(join(tmpdir(), "creator-profiles-"));
  const asset = join(home, "avatar.png"), path = join(home, "profiles.json");
  writeFileSync(asset, png, { mode: 0o600 });
  const config = { schema_version: 1, profiles: [{ id: "my-dot", name: "dot", avatar_file: asset }], mappings: [{ ...identity, profile_id: "my-dot" }] };
  writeFileSync(path, JSON.stringify(config), { mode: 0o600 });
  return { home, asset, path, config, registry: new TaskCreatorProfiles(path), close: () => rmSync(home, { recursive: true, force: true }) };
}
test("explicit full identity mapping renders an avatar, never a matching title or claimed name", () => {
  const f = fixture(), db = new DatabaseSync(":memory:");
  try {
    const store = new ExternalObservationStore(db, f.registry);
    store.ingest(report()); store.ingest(report({ thread_id: "unknown-thread", title: "dot", creator_name: "dot", item_id: "unknown-item" }));
    const mapped = store.list(true).find(item => item.thread_id === identity.thread_id)!;
    const unknown = store.list(true).find(item => item.thread_id === "unknown-thread")!;
    assert.equal(mapped.creator.verification, "unknown"); assert.equal(mapped.creator.display_source, "user_mapping");
    assert.equal(mapped.creator.avatar, null, "assets are deduplicated in bootstrap, not repeated in every record");
    const display = taskCreatorPresentation({ external_observation: mapped }, f.registry.profiles(), []);
    assert.equal(display.name, "dot"); assert.equal(display.avatar, taskCreatorPngDataUrl(png));
    assert.match(display.tooltip, /用户指定/);
    assert.equal(taskCreatorPresentation({ external_observation: unknown }, f.registry.profiles(), []).name, "未知创建者");
    for (const field of ["provider", "account_id", "host_id", "thread_id"] as const) assert.equal(f.registry.resolve({ ...identity, [field]: "different" }), null);
    assert.equal(externalObservationSchema.parse(mapped).creator.local_profile_id, "my-dot");
    assert.equal(reportExternalInput.safeParse({ ...report(), creator: { local_profile_id: "my-dot" } }).success, false);
  } finally { db.close(); f.close(); }
});
test("executor handoff and restart preserve creator declaration independently", () => {
  const f = fixture(), path = join(f.home, "test.db"); let db = new DatabaseSync(path);
  try {
    let store = new ExternalObservationStore(db);
    store.ingest(report({ executor_name: "dot" }));
    store.ingest(report({ sequence: 2, item_id: "handoff", creator_name: "User Bob", executor_name: "User Bob" }));
    db.close(); db = new DatabaseSync(path); store = new ExternalObservationStore(db);
    const item = store.list(true)[0];
    assert.equal(item.creator.name, "dot"); assert.equal(item.executor?.name, "User Bob"); assert.equal(item.declared_creator_name, "User Bob");
    assert.equal(item.creator.verification, "unknown");
  } finally { db.close(); f.close(); }
});
test("whole-source mapping requires explicit opt-in and never expands to another account or host", () => {
  const f = fixture();
  try {
    const { thread_id, ...source } = f.config.mappings[0];
    writeFileSync(f.path, JSON.stringify({ ...f.config, mappings: [{ ...source, scope: "source" }] }));
    assert.equal(f.registry.resolve({ ...identity, thread_id: "another-task" })?.name, "dot");
    assert.equal(f.registry.resolve({ ...identity, account_id: "other-account" }), null);
    assert.equal(f.registry.resolve({ ...identity, host_id: "other-host" }), null);
  } finally { f.close(); }
});
test("legacy observations map on read without rewriting their IDs, sequence or stored payload", () => {
  const f = fixture(), db = new DatabaseSync(":memory:");
  try {
    const store = new ExternalObservationStore(db); const receipt = store.ingest(report());
    const legacy = { ...report(), _ingestion_channel: "local_file" };
    db.prepare("UPDATE external_observations SET payload=? WHERE id=?").run(JSON.stringify(legacy), receipt.id);
    const before = db.prepare("SELECT * FROM external_observations WHERE id=?").get(receipt.id);
    const mapped = new ExternalObservationStore(db, f.registry).get(receipt.id, true)!;
    assert.equal(mapped.creator.local_profile_id, "my-dot");
    assert.deepEqual(db.prepare("SELECT * FROM external_observations WHERE id=?").get(receipt.id), before);
    writeFileSync(f.path, JSON.stringify({ schema_version: 1, profiles: [], mappings: [] }));
    assert.equal(new ExternalObservationStore(db, f.registry).get(receipt.id, true)?.creator.local_profile_id, undefined);
  } finally { db.close(); f.close(); }
});
test("creator and assigned user resolve separately; missing historical IDs never become the current user", () => {
  const users = [{ id: "alice", name: "Alice", avatar: taskCreatorPngDataUrl(png) }, { id: "bob", name: "Bob" }];
  const creator = taskCreatorPresentation({ creator_user_id: "alice" }, [], users);
  assert.equal(creator.name, "Alice"); assert.equal(creator.avatar, users[0].avatar);
  assert.equal(taskCreatorPresentation({ creator_user_id: "deleted" }, [], users).filterKey, "unknown");
  assert.equal(taskCreatorPresentation({}, [], users).name, "未知创建者");
});
test("cache refresh, invalid assets and missing files preserve a named profile with a safe fallback", () => {
  const f = fixture();
  try {
    assert.equal(f.registry.profiles()[0].avatar, taskCreatorPngDataUrl(png));
    writeFileSync(f.asset, "not an image"); assert.equal(f.registry.profiles()[0].avatar, null);
    writeFileSync(f.asset, png); assert.equal(f.registry.profiles()[0].avatar, taskCreatorPngDataUrl(png));
    rmSync(f.asset); assert.equal(f.registry.profiles()[0].name, "dot"); assert.equal(f.registry.profiles()[0].avatar, null);
    symlinkSync(f.path, f.asset); assert.equal(f.registry.profiles()[0].avatar, null);
    assert.doesNotMatch(JSON.stringify(f.registry.profiles()), /avatar_file|profiles.json|creator-profiles-/);
  } finally { f.close(); }
});
test("unsafe configurations, oversized images and dimensions fail closed", () => {
  const f = fixture();
  try {
    assert.throws(() => taskCreatorPngDataUrl(Buffer.alloc(300_001)), /creator_avatar/);
    const huge = Buffer.from(png); huge.writeUInt32BE(513, 16); assert.throws(() => taskCreatorPngDataUrl(huge), /dimensions/);
    assert.throws(() => taskCreatorPngDataUrl(png.subarray(0, png.length - 1)), /invalid/);
    const animation = Buffer.alloc(12); animation.write("acTL", 4, "ascii");
    assert.throws(() => taskCreatorPngDataUrl(Buffer.concat([png.subarray(0, png.length - 12), animation, png.subarray(png.length - 12)])), /animation_unsupported/);
    if (process.platform !== "win32") { chmodSync(f.path, 0o644); assert.equal(f.registry.resolve(identity), null); chmodSync(f.path, 0o600); }
    writeFileSync(f.path, JSON.stringify({ ...f.config, mappings: [f.config.mappings[0], f.config.mappings[0]] }));
    assert.equal(f.registry.resolve(identity), null); assert.equal(f.registry.profiles().length, 0);
    assert.equal(f.registry.error, "creator_profile_configuration_unavailable");
    rmSync(f.path); assert.equal(f.registry.resolve(identity), null); assert.equal(f.registry.error, null);
  } finally { f.close(); }
});
