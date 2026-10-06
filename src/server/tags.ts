export const MAX_TAG_LENGTH = 40;

/** Returns the trimmed, lowercased tag, or null if it is empty or longer than MAX_TAG_LENGTH. */
export function normalizeTag(input: string): string | null {
  const tag = input.trim().toLowerCase();
  return tag.length > 0 && tag.length <= MAX_TAG_LENGTH ? tag : null;
}
