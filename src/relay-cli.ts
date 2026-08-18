#!/usr/bin/env node
import { resolve } from "node:path";
import { passwordHash, readHubSecret, validateWebPassword, validateWebUsername } from "./relay-auth.js";
import { startRelayServer } from "./relay-server.js";
import { RelayStore } from "./relay-store.js";

const [command = "serve", value] = process.argv.slice(2);
const database = resolve(process.env.BETTER_CODEX_RELAY_DB || "./data/better-codex-relay.db");

if (command === "serve") {
  startRelayServer();
} else {
  const store = new RelayStore(database);
  try {
    if (command === "pairing-code") console.log(JSON.stringify(store.createPairingCode(), null, 2));
    else if (command === "devices") console.log(JSON.stringify(store.devices(), null, 2));
    else if (command === "revoke" && value) console.log(JSON.stringify(store.revokeDevice(value), null, 2));
    else if (command === "rotate-token" && value) console.log(JSON.stringify(store.rotateDeviceToken(value), null, 2));
    else if (command === "password-set") {
      const password = validateWebPassword(readHubSecret("BETTER_CODEX_RELAY_WEB_PASSWORD_FILE", "BETTER_CODEX_RELAY_WEB_PASSWORD"));
      const username = validateWebUsername(process.env.BETTER_CODEX_RELAY_WEB_USERNAME || "admin");
      store.setWebCredentials(username, passwordHash(password));
      console.log(JSON.stringify({ updated: true, sessions_revoked: true }, null, 2));
    } else if (command === "audit") console.log(JSON.stringify(store.auditEvents(value ? Number(value) : 100), null, 2));
    else throw new Error("usage: better-codex-relay serve|pairing-code|devices|revoke <device-id>|rotate-token <device-id>|password-set|audit [limit]");
  } finally {
    store.close();
  }
}
