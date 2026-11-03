/** A dedicated database on the same server, so truncating between tests never touches dev data. */
export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/bookcase_test";
