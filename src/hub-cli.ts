#!/usr/bin/env node
import { resolve } from "node:path";
import { passwordHash, readHubSecret, validateWebPassword, validateWebUsername } from "./hub-auth.js";
import { HubStore, restoreHubBackup } from "./hub-store.js";
import { startHubServer } from "./hub-server.js";

const [command = "serve", value] = process.argv.slice(2);
const database = resolve(process.env.BETTER_CODEX_HUB_DB || "./data/better-codex-hub.db");

if (command === "serve") {
  startHubServer();
} else if (command === "restore" && value) {
  console.log(JSON.stringify(restoreHubBackup(database, value), null, 2));
} else {
  const store = new HubStore(database);
  try {
    if (command === "pairing-code") console.log(JSON.stringify(store.createPairingCode(), null, 2));
    else if (command === "devices") console.log(JSON.stringify(store.devices(), null, 2));
    else if (command === "revoke" && value) console.log(JSON.stringify(store.revokeDevice(value), null, 2));
    else if (command === "clear-projection") console.log(JSON.stringify(store.clearProjection(), null, 2));
    else if (command === "password-set") {
      const password = validateWebPassword(readHubSecret("BETTER_CODEX_HUB_WEB_PASSWORD_FILE", "BETTER_CODEX_HUB_WEB_PASSWORD"));
      const username = validateWebUsername(process.env.BETTER_CODEX_HUB_WEB_USERNAME || "admin");
      store.setWebUserPassword(username, passwordHash(password));
      console.log(JSON.stringify({ updated: true, sessions_revoked: true }, null, 2));
    } else if (command === "user-add" && value) {
      const password = validateWebPassword(readHubSecret("BETTER_CODEX_HUB_WEB_PASSWORD_FILE", "BETTER_CODEX_HUB_WEB_PASSWORD"));
      console.log(JSON.stringify(store.createWebUser(validateWebUsername(value), passwordHash(password)), null, 2));
    } else if (command === "user-list") console.log(JSON.stringify(store.listWebUsers(), null, 2));
    else if (command === "user-disable" && value) console.log(JSON.stringify(store.setWebUserDisabled(validateWebUsername(value), true), null, 2));
    else if (command === "user-enable" && value) console.log(JSON.stringify(store.setWebUserDisabled(validateWebUsername(value), false), null, 2));
    else if (command === "user-password-set" && value) {
      const password = validateWebPassword(readHubSecret("BETTER_CODEX_HUB_WEB_PASSWORD_FILE", "BETTER_CODEX_HUB_WEB_PASSWORD"));
      console.log(JSON.stringify(store.setWebUserPassword(validateWebUsername(value), passwordHash(password)), null, 2));
    } else if (command === "backup") console.log(JSON.stringify(store.backup(value), null, 2));
    else if (command === "audit") console.log(JSON.stringify(store.auditEvents(value ? Number(value) : 100), null, 2));
    else throw new Error("usage: better-codex-hub serve|pairing-code|devices|revoke <device-id>|clear-projection|password-set|user-add <username>|user-list|user-disable <username>|user-enable <username>|user-password-set <username>|backup [path]|restore <path>|audit [limit]");
  } finally {
    store.close();
  }
}
