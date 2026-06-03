/**
 * Shared helpers for Obsidian tag detection (#tag).
 * Used by the reader (markdown-renderer) and the editor (tag-highlighter)
 * so both agree on what counts as a tag.
 */

/**
 * Decide whether a `#xxx` token is a real Obsidian tag.
 *
 * Excludes:
 * - Hex color codes (#RRGGBB / #RRGGBBAA), e.g. #002253, #F86632, #FF972E80
 * - Purely numeric tokens, e.g. #1984 — Obsidian tags must contain at least
 *   one non-numeric character.
 *
 * @param tag - the token WITHOUT the leading `#`
 */
export function isValidObsidianTag(tag: string): boolean {
  if (/^(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(tag)) return false;
  if (/^\d+$/.test(tag)) return false;
  return true;
}
