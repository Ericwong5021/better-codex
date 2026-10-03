# Better Codex Mockup development plugin

Run `npm run dev:mockup` from the source checkout. It prepares a complete local
plugin in a temporary `better-codex-mockup` directory and prints that directory.
Import the printed directory in Codex and open **Better Codex Mockup**.

This directory holds the descriptor template. The preparation script generates
`mcp.json` with absolute paths to this checkout's Node runtime, TypeScript loader,
and source CLI. It does not change the production MCP registration.

Each `mcp --mockup` connection owns one simulation service in a private temporary
home. The plugin uses the shared product UI, supports Chinese and English demo
data, and keeps import, export, and reset in its settings menu. Export data before
closing the development plugin if you want to reuse edits. Closing its MCP
connection removes only its simulation child and temporary service data.

Mockup exposes only its board and bounded App transport tools. It does not
connect to the production Runtime or start real tasks, providers, Session Host,
Relay, or updates. Packaged executables reject `--mockup`.
