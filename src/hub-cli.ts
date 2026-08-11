#!/usr/bin/env node
import { resolve } from "node:path";
import { HubStore } from "./hub-store.js";
import { startHubServer } from "./hub-server.js";

const [command = "serve", value] = process.argv.slice(2);

if (command === "serve") {
  startHubServer();
} else {
  const store = new HubStore(resolve(process.env.BETTER_CODEX_HUB_DB || "./data/better-codex-hub.db"));
  try {
    if (command === "pairing-code") console.log(JSON.stringify(store.createPairingCode(), null, 2));
    else if (command === "devices") console.log(JSON.stringify(store.devices(), null, 2));
    else if (command === "revoke" && value) console.log(JSON.stringify(store.revokeDevice(value), null, 2));
    else if (command === "clear-projection") console.log(JSON.stringify(store.clearProjection(), null, 2));
    else throw new Error("usage: better-codex-hub serve|pairing-code|devices|revoke <device-id>|clear-projection");
  } finally {
    store.close();
  }
}
