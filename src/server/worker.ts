import { createApp } from "./app.ts";
import { createAuth } from "./auth.ts";
import { loadConfig } from "./config.ts";
import { openDb } from "./db.ts";
import { createOpenLibrary } from "./openLibrary.ts";

// A fresh app per request: Workers forbid sharing database connections across requests.
export default {
  fetch(request: Request, env: Record<string, string | undefined>) {
    const config = loadConfig(env);
    const db = openDb(config.database);
    const app = createApp({
      db,
      auth: (withProvider) => createAuth(db, config, withProvider),
      lookup: createOpenLibrary(fetch, config.contactEmail ? `Bookcase (${config.contactEmail})` : "Bookcase"),
    });
    return app.fetch(request);
  },
};
