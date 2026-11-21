#!/usr/bin/env bash
set -Eeuo pipefail

umask 077

deploy_dir="${DEPLOY_DIR:-/opt/project-book_movie_tickets}"
env_file="${deploy_dir}/.env"
compose_file="${deploy_dir}/docker-compose.prod.yml"

if [[ ! -f "${env_file}" || ! -f "${compose_file}" ]]; then
  echo "Deployment files are missing under ${deploy_dir}" >&2
  exit 1
fi

# Read only backup settings; application credentials stay inside Docker Compose.
backup_dir="$(sed -n 's/^BACKUP_DIR=//p' "${env_file}" | tail -n 1)"
retention_days="$(sed -n 's/^BACKUP_RETENTION_DAYS=//p' "${env_file}" | tail -n 1)"
backup_dir="${backup_dir:-${deploy_dir}/backups}"
retention_days="${retention_days:-14}"

if [[ -z "${backup_dir}" || "${backup_dir}" == "/" || ! "${retention_days}" =~ ^[0-9]+$ ]]; then
  echo "Unsafe backup configuration" >&2
  exit 1
fi

mkdir -p "${backup_dir}"
timestamp="$(date -u +'%Y%m%dT%H%M%SZ')"
final_file="${backup_dir}/cinemabooking-${timestamp}.sql.gz"
temp_file="${final_file}.tmp"
compose=(docker compose --env-file "${env_file}" -f "${compose_file}")

cleanup() {
  rm -f -- "${temp_file}"
}
trap cleanup EXIT

"${compose[@]}" exec -T mysql sh -c \
  'exec mysqldump --single-transaction --quick --routines --triggers --events --set-gtid-purged=OFF -u root -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' \
  | gzip -9 > "${temp_file}"

gzip -t "${temp_file}"
mv -- "${temp_file}" "${final_file}"
trap - EXIT

find "${backup_dir}" -maxdepth 1 -type f -name 'cinemabooking-*.sql.gz' \
  -mtime "+${retention_days}" -delete

echo "MySQL backup created: ${final_file}"
