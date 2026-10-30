import { DatabaseSync, backup } from "node:sqlite";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
export async function backupDatabase(source, destination) {
  source = resolve(source);
  destination = resolve(destination);
  if (source === destination || existsSync(destination))
    throw new Error(
      "Choose a new backup path; existing files are never overwritten.",
    );
  mkdirSync(dirname(destination), { recursive: true });
  const db = new DatabaseSync(source, { readOnly: true });
  try {
    await backup(db, destination);
  } finally {
    db.close();
  }
  const check = new DatabaseSync(destination, { readOnly: true });
  try {
    if (
      check.prepare("PRAGMA integrity_check").get().integrity_check !== "ok" ||
      check.prepare("PRAGMA foreign_key_check").all().length
    )
      throw new Error("Backup verification failed.");
    return {
      path: destination,
      schema: check.prepare("PRAGMA user_version").get().user_version,
    };
  } finally {
    check.close();
  }
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  if (!process.argv[2] || !process.argv[3])
    throw new Error(
      "Usage: node scripts/database-backup.mjs SOURCE.sqlite NEW_BACKUP.sqlite",
    );
  console.log(
    JSON.stringify(await backupDatabase(process.argv[2], process.argv[3])),
  );
}
