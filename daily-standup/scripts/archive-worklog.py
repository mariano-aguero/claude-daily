#!/usr/bin/env python3
"""Archive worklog entries.

Part of claude-daily: https://github.com/mariano-aguero/claude-daily

Usage:
  python3 archive-worklog.py              # archive entries older than 3 days
  python3 archive-worklog.py --days 7    # custom cutoff
  python3 archive-worklog.py --all       # archive ALL entries (used by /log-clear)
"""

import argparse
import datetime
import os
import re
import tempfile


def main():
    parser = argparse.ArgumentParser(
        description="Archive worklog entries from ~/.daily-worklog/current.md."
    )
    parser.add_argument(
        "--all", action="store_true", help="Archive ALL entries (used by /log-clear)"
    )
    parser.add_argument(
        "--days",
        type=int,
        default=3,
        metavar="N",
        help="Archive entries older than N days (default: 3)",
    )
    args = parser.parse_args()

    if args.days < 1:
        parser.error("--days must be at least 1")

    worklog = os.path.expanduser("~/.daily-worklog/current.md")
    archive_dir = os.path.expanduser("~/.daily-worklog/archive")

    os.makedirs(archive_dir, exist_ok=True)

    try:
        with open(worklog) as f:
            lines = f.readlines()
    except FileNotFoundError:
        return

    if args.all:
        old, keep = lines, []
    else:
        cutoff = (datetime.date.today() - datetime.timedelta(days=args.days)).isoformat()
        old, keep = [], []
        for line in lines:
            m = re.match(r"- \[(\d{4}-\d{2}-\d{2})", line)
            if m and m.group(1) < cutoff:
                old.append(line)
            else:
                keep.append(line)

    if not old:
        label = "nothing to archive" if args.all else f"no entries older than {cutoff}"
        print(f"Done ({label})")
        return

    # --all uses timestamp suffix to avoid overwriting same-day clears
    if args.all:
        ts = datetime.datetime.now().strftime("%Y-%m-%d-%H-%M")
        archive_file = os.path.join(archive_dir, f"{ts}.md")
    else:
        archive_file = os.path.join(archive_dir, datetime.date.today().isoformat() + ".md")

    # Atomic write for archive file: prevents partial writes on crash.
    # For append mode, read existing content first and combine with new entries.
    arc_tmp_path = None
    try:
        existing_archive = []
        if not args.all:
            try:
                with open(archive_file) as f:
                    existing_archive = f.readlines()
            except FileNotFoundError:
                pass
        with tempfile.NamedTemporaryFile("w", dir=archive_dir, delete=False, suffix=".tmp") as arc_tmp:
            arc_tmp.writelines(existing_archive + old)
            arc_tmp_path = arc_tmp.name
        os.replace(arc_tmp_path, archive_file)
    except Exception:
        if arc_tmp_path and os.path.exists(arc_tmp_path):
            os.unlink(arc_tmp_path)
        raise

    # Atomic write: write keep to a temp file, then replace worklog atomically.
    # Prevents data loss if the process is interrupted mid-write.
    # Cleanup on error prevents orphaned .tmp files if writelines fails (e.g. disk full).
    dir_ = os.path.dirname(worklog)
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile("w", dir=dir_, delete=False, suffix=".tmp") as tmp:
            tmp.writelines(keep)
            tmp_path = tmp.name
        os.replace(tmp_path, worklog)
    except Exception:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)
        raise

    print(f"Archived {len(old)} entries → {os.path.basename(archive_file)}")


if __name__ == "__main__":
    main()
