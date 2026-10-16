/** Taille de base du navigateur : les réglages en px de l'utilisateur sont convertis en rem pour suivre l'échelle fluide. */
export const REM_PX = 16;

/** Convertit une valeur en px (réglage utilisateur) en rem, pour qu'elle grandisse avec l'écran en 2K et 4K. */
export function enRem(px: number): string {
  return `${px / REM_PX}rem`;
}
