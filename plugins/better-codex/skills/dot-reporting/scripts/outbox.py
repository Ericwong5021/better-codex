#!/usr/bin/env python3
"""Producer-owned delivery queue. Never opens the Better Codex business database.

Transport stays with the host's authenticated MCP tools. Save the exact report
before sending; retain it until a committed receipt and matching event readback.
"""
import argparse
import contextlib
import fcntl
import hashlib
import json
import os
from pathlib import Path
import sys
import tempfile

MAX_BYTES = 2 * 1024 * 1024
IDENTITY = ("provider", "account_id", "host_id", "source_task_id")


def read_json(path):
    with open(path, "rb") as stream:
        raw = stream.read(MAX_BYTES + 1)
    if len(raw) > MAX_BYTES:
        raise ValueError("outbox_input_too_large")
    return json.loads(raw)


def canonical(value):
    return json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(",", ":"))


def task_key(report):
    return tuple(report[field] for field in IDENTITY)


def validate(report):
    if not isinstance(report, dict) or report.get("schema_version") != 2:
        raise ValueError("outbox_requires_v2_report")
    for field in (*IDENTITY, "event_id", "reported_at", "title", "state"):
        if not isinstance(report.get(field), str) or not report[field].strip():
            raise ValueError("outbox_missing_" + field)
    for field in ("sequence", "version"):
        if type(report.get(field)) is not int or report[field] < 1:
            raise ValueError("outbox_invalid_" + field)
    if len(canonical(report).encode()) > MAX_BYTES:
        raise ValueError("outbox_input_too_large")


@contextlib.contextmanager
def queue(directory):
    root = Path(directory).absolute()
    root.mkdir(mode=0o700, parents=True, exist_ok=True)
    if root.is_symlink() or root.stat().st_mode & 0o077:
        raise ValueError("outbox_directory_must_be_private")
    lock_fd = os.open(root / ".lock", os.O_CREAT | os.O_RDWR | os.O_NOFOLLOW, 0o600)
    with os.fdopen(lock_fd, "a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        path = root / "queue.json"
        if path.is_symlink():
            raise ValueError("outbox_symlink_rejected")
        state = read_json(path) if path.exists() else {"schema_version": 1, "entries": []}
        if state.get("schema_version") != 1 or not isinstance(state.get("entries"), list):
            raise ValueError("outbox_state_invalid")
        before = canonical(state)
        yield state
        payload = canonical(state)
        if payload != before:
            if len(payload.encode()) > MAX_BYTES:
                raise ValueError("outbox_capacity_reached")
            fd, temporary = tempfile.mkstemp(dir=root, prefix=".queue-")
            try:
                with os.fdopen(fd, "w", encoding="utf-8") as stream:
                    stream.write(payload)
                    stream.flush()
                    os.fsync(stream.fileno())
                os.replace(temporary, path)
                directory_fd = os.open(root, os.O_RDONLY)
                try:
                    os.fsync(directory_fd)
                finally:
                    os.close(directory_fd)
            finally:
                if os.path.exists(temporary):
                    os.unlink(temporary)


def run(args):
    result = None
    with queue(args.directory) as state:
        entries = state["entries"]
        if args.command == "enqueue":
            report = read_json(args.report)
            validate(report)
            digest = hashlib.sha256(canonical(report).encode()).hexdigest()
            existing = next((e for e in entries if e["report"]["event_id"] == report["event_id"]), None)
            if existing:
                if existing["digest"] != digest:
                    raise ValueError("outbox_event_id_conflict")
                result = {"status": existing["status"], "event_id": report["event_id"], "reused": True}
            else:
                previous = [e["report"] for e in entries if task_key(e["report"]) == task_key(report)]
                if previous and (report["sequence"] <= max(r["sequence"] for r in previous)
                                 or report["version"] <= max(r["version"] for r in previous)):
                    raise ValueError("outbox_non_monotonic_event")
                entries.append({"report": report, "digest": digest, "status": "pending", "receipt": None})
                result = {"status": "pending", "event_id": report["event_id"], "reused": False}
        elif args.command == "next":
            entry = next((e for e in entries if e["status"] == "pending"), None)
            result = {"status": "pending" if entry else "empty", "report": entry["report"] if entry else None}
        elif args.command == "ack":
            entry = next((e for e in entries if e["report"]["event_id"] == args.event_id), None)
            if not entry:
                raise ValueError("outbox_event_not_found")
            receipt, events = read_json(args.receipt), read_json(args.events)
            report = entry["report"]
            event = next((e for e in events.get("events", []) if e.get("event_id") == args.event_id
                          and e.get("task_id") == receipt.get("id")), None)
            if (receipt.get("status") not in ("applied", "duplicate") or not receipt.get("id")
                    or not event or event.get("outcome") != "applied"
                    or event.get("sequence") != report["sequence"]
                    or event.get("source_run_id") != report.get("source_run_id")
                    or event.get("source_version") != report["version"]
                    or event.get("state") != report["state"]):
                raise ValueError("outbox_application_not_confirmed")
            observation = receipt.get("observation", {})
            if any(observation.get(field) != report[field] for field in IDENTITY):
                raise ValueError("outbox_receipt_identity_mismatch")
            entry["status"] = "confirmed"
            entry["receipt"] = {"task_id": receipt["id"], "event_id": args.event_id,
                                "cursor": event["cursor"], "observed_at": event.get("observed_at")}
            result = {"status": "confirmed", **entry["receipt"]}
        else:
            result = {"pending": sum(e["status"] == "pending" for e in entries),
                      "confirmed": sum(e["status"] == "confirmed" for e in entries)}
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("enqueue", "next", "ack", "status"))
    parser.add_argument("--directory", required=True)
    parser.add_argument("--report")
    parser.add_argument("--event-id")
    parser.add_argument("--receipt")
    parser.add_argument("--events")
    args = parser.parse_args()
    required = ("report",) if args.command == "enqueue" else ("event_id", "receipt", "events") if args.command == "ack" else ()
    if any(not getattr(args, field) for field in required):
        parser.error("missing required input file or event ID")
    try:
        print(json.dumps(run(args), ensure_ascii=False))
    except (ValueError, OSError, KeyError, TypeError) as error:
        code = str(error) if isinstance(error, ValueError) and str(error).startswith("outbox_") else "outbox_storage_or_input_error"
        print(json.dumps({"status": "error", "error": code}), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
