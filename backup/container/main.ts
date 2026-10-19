import { backupServer } from "./server.ts";

// The container's entry point (Dockerfile). DATABASE_URL is the Worker's
// secret, passed in when it starts the container.
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is not set");
backupServer(databaseUrl, "/tmp/backup.dump").listen(8080);
