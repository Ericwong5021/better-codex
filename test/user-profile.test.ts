import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { avatarInitials, readCodexUserProfile } from "../src/user-profile.js";

function fakeJwt(payload: Record<string, unknown>) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `aaa.${body}.bbb`;
}

test("avatarInitials prefer first letters of latin name parts", () => {
  assert.equal(avatarInitials("Eric Wong"), "EW");
  assert.equal(avatarInitials("Ada"), "AD");
  assert.equal(avatarInitials("王亦东"), "王亦");
});

test("readCodexUserProfile reads name from Codex id_token", () => {
  const directory = mkdtempSync(join(tmpdir(), "better-codex-auth-"));
  const path = join(directory, "auth.json");
  try {
    writeFileSync(path, JSON.stringify({
      tokens: {
        id_token: fakeJwt({
          name: "Eric Wong",
          email: "ericwong5021@gmail.com",
          "https://api.openai.com/auth": {
            chatgpt_user_id: "user-eQPSyejCkbCsTV5uPutbxKOD",
          },
        }),
      },
    }));
    const profile = readCodexUserProfile(path);
    assert.equal(profile.id, "user-eQPSyejCkbCsTV5uPutbxKOD");
    assert.equal(profile.name, "Eric Wong");
    assert.equal(profile.email, "ericwong5021@gmail.com");
    assert.equal(profile.handle, "ericwong5021");
    assert.equal(profile.initials, "EW");
    assert.match(profile.color, /^#[0-9a-f]{6}$/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
