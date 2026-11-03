# Run on Cloudflare Workers with Neon Postgres

Bookcase deploys to Cloudflare Workers (Hono API plus static assets) backed by Neon Postgres, replacing the Node server and SQLite file. Local development and tests run the same code against a Docker Postgres image, so there is one SQL dialect everywhere and no SQLite fallback. The Node entry point is removed; the Worker is the only runtime. Cover images stay in Postgres as `bytea` rather than moving to R2, because a personal Bookcase holds few, small images.
