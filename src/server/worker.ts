import { createApp } from "./app.ts";
import { loadConfig } from "./config.ts";
import { openDb } from "./db.ts";
import { createOpenLibrary } from "./openLibrary.ts";

// A fresh app per request: Workers forbid sharing database connections across requests.
export default {
  fetch(request: Request, env: Record<string, string | undefined>) {
    const config = loadConfig(env);
    const app = createApp({
      db: openDb(config.database),
      lookup: createOpenLibrary(fetch, config.contactEmail ? `Bookcase (${config.contactEmail})` : "Bookcase"),
    });
    return app.fetch(request);
  },
};
