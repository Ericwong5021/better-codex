#!/bin/sh
set -eu
tailscale serve --bg --https=443 http://127.0.0.1:4318
