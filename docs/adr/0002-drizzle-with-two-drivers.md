# Drizzle with a Neon driver in Workers and `pg` locally

Data access goes through Drizzle. Workers use the Neon WebSocket driver and local/CI use node-postgres, selected by an explicit `DATABASE_DRIVER` setting. The Neon HTTP driver was rejected because it has no interactive transactions, which the Book store needs. Migrations are generated SQL files applied by an explicit `db:migrate` step, never at Worker startup; a later CI deploy job runs it.
