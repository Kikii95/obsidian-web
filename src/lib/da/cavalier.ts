/** Nombre de cavaliers dans la palette fermée de la DA (docs/direction-artistique.md §3.3). */
export const CAVALIER_COUNT = 6;

/** Couleur de cavalier (1 à 6) attribuée à une étiquette par empreinte stable de son nom. */
export function cavalierIndex(tag: string): number {
  const name = tag.replace(/^#/, "").trim().toLowerCase();
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return (hash % CAVALIER_COUNT) + 1;
}
