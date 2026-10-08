#!/usr/bin/env bash
set -euo pipefail

workspace="$1"
cmd="$2"
shift 2

package="@pitter-patter/$workspace"

if pnpm --filter "$package" --fail-if-no-match exec node -e 'process.exit(require("./package.json").scripts?.[process.argv[1]] ? 0 : 1)' "$cmd" >/dev/null 2>&1; then
  exec pnpm --filter "$package" run "$cmd" "$@"
fi

exec pnpm --filter "$package" --fail-if-no-match exec "$cmd" "$@"
