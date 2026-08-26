#!/usr/bin/env bash
set -euo pipefail

# build-for-sftp.sh
#
# Packages this repo's git-tracked files into a clean folder (and, by
# default, a zip of the same), ready to upload via SFTP to a Node.js
# hosting panel that runs its own `npm install` / `npm run build` /
# `npm run start` on the server.
#
# Because it's built from `git archive`, the output can never accidentally
# include node_modules, .next, .git, or .env.local. It's further trimmed
# down to just what's needed to run the app (see the `export-ignore`
# entries in .gitattributes, which drop docs, .claude/, this scripts/
# folder itself, etc. from the archive without affecting the normal repo).
#
# Usage:
#   scripts/build-for-sftp.sh [branch] [output-name] [--no-zip]
#
# Examples:
#   scripts/build-for-sftp.sh                       # current branch -> ./zotero-sci-stats-deploy/ + .zip
#   scripts/build-for-sftp.sh demo                   # 'demo' branch  -> ./zotero-sci-stats-deploy/ + .zip
#   scripts/build-for-sftp.sh demo my-upload         # 'demo' branch  -> ./my-upload/ + .zip
#   scripts/build-for-sftp.sh demo my-upload --no-zip  # folder only, no zip

BRANCH="HEAD"
NAME="zotero-sci-stats-deploy"
MAKE_ZIP=1
POSITIONAL=()

for arg in "$@"; do
  if [ "$arg" = "--no-zip" ]; then
    MAKE_ZIP=0
  else
    POSITIONAL+=("$arg")
  fi
done

[ "${#POSITIONAL[@]}" -ge 1 ] && BRANCH="${POSITIONAL[0]}"
[ "${#POSITIONAL[@]}" -ge 2 ] && NAME="${POSITIONAL[1]}"

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

OUT_DIR="$NAME"
OUT_ZIP="$NAME.zip"

rm -rf "$OUT_DIR"
[ "$MAKE_ZIP" = "1" ] && rm -f "$OUT_ZIP"
mkdir -p "$OUT_DIR"

echo "Exporting tracked files from '$BRANCH' ..."
git archive --worktree-attributes --format=tar "$BRANCH" | tar -x -C "$OUT_DIR"

if [ "$MAKE_ZIP" = "1" ]; then
  echo "Creating $OUT_ZIP ..."
  git archive --worktree-attributes --format=zip -o "$OUT_ZIP" "$BRANCH"
fi

cat <<EOF

Done.

  Folder: $OUT_DIR/   (upload as-is via SFTP$([ "$MAKE_ZIP" = "1" ] && echo ", or"))
EOF
[ "$MAKE_ZIP" = "1" ] && echo "  Zip:    $OUT_ZIP    (upload this one file and unzip on the server)"

cat <<EOF

Contains exactly the files tracked in git on '$BRANCH' - no
node_modules, .next, .git, or .env.local.

NOT included on purpose - set these up separately on the server:
  - .env.local, or (better) your host's environment-variable panel.
    See .env.example for which variables are needed.

On the server, after uploading, run:
  npm install && npm run build && npm run start
EOF
