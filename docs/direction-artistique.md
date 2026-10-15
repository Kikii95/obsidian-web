# Direction artistique

Design System : https://claude.ai/artifact/Sb867tc9NkzxuLvuByKpVS  
Canevas des variantes : https://claude.ai/artifact/QniLbUmgM9wzeY9z849PBh  
Planche d'évolution : https://claude.ai/artifact/L7dns1oyKBbCgccLDRGZ1x

> Établie le 14/10/2026 à partir de deux objets réels : la **fiche bristol lignée** (le support de la méthode
> Zettelkasten : une idée par fiche, une cote, des renvois vers d'autres fiches) et l'**obsidienne**, le verre
> volcanique qui donne son nom au logiciel (noir, cassure conchoïdale en écailles, reflet irisé sur les arêtes).
> Pas de références photographiques fournies : les deux objets sont décrits de mémoire ci-dessous. Garde l'identité
> déjà validée : le mark « second cerveau » v2.9.1 (cerveau bullé + arbre de 6 nœuds, blanc sur tuile magenta).
> Remplace le kit shadcn sombre teinté magenta (Geist, tuiles de statistiques à icônes, cartes `rounded-xl` partout).

## 0. Fiche cible (ajoutée à la retouche du 15/10/2026)

| Nature de l'app | Registre | Fond et lumière | À éviter |
| --- | --- | --- | --- |
| **Outil de développeur** : un lecteur et éditeur de coffre Obsidian (dépôt GitHub) dans le navigateur, utilisé par des développeurs, souvent le soir et sur téléphone | tech, net, récent ; la métaphore des fiches inspire le vocabulaire et quelques composants, elle ne déguise pas l'interface | **sombre partout, notes comprises** : fiche en bristol noir, encre claire, accents magenta | blanc aveuglant, carnet manuscrit trop présent, angles vifs qui régressent sur l'origine, jouet |

Affordances de l'origine à garder : icônes et boutons arrondis (`--radius` 0,625 rem), bouton flottant rond,
densité de l'explorateur, barre d'outils de la note.

## Retouches

### Retouche 1 — 15/10/2026 (`/da retour`, retours de Willem et Killian sur la v1)

Verdict sur la v1 : « agréablement surpris », idée gardée (des fiches posées sur un éclat d'obsidienne). Corrigé :

1. **La fiche devient un bristol noir** (`--bristol: #211D29`, arête `--bord-fiche`) écrit à l'encre claire
   (`--encre: #E8E3EF`, 13,7:1). La ligne de tête magenta reste, en dégradé qui s'efface vers la droite. Les cotes et
   métadonnées passent au bleu de lignage clair `#8FB4DA` (8:1), les renvois au magenta `#DD5CF7` (5,7:1). Les thèmes
   clairs du sélecteur (Bristol et `*-light`) gardent la fiche blanche de la v1.
2. **Les bords s'arrondissent** : `--radius` revient à 0,625 rem (celui de l'origine : logo, palette, Éditer,
   champs), fiches 12 px, éclats 14 px réguliers (plus d'angle cassé), onglets 10 px, bouton flottant rond.
3. **Les onglets du chemin** (accueil, dossiers, note courante) ne sont plus des trapèzes bleu pâle : onglets
   arrondis en verre relevé `#2A2534`, l'onglet courant prend le fond de la fiche et sa ligne magenta.
4. **Le carnet s'atténue** : lignage à alpha 0,085 (contre 0,32), plus de ligne vide en tête de note, plus de fiches
   penchées (renvois satellites, bouton flottant), sous-titre de l'accueil en Literata italique au lieu de Caveat
   (Caveat ne reste que dans les états vides). Le texte reste calé sur les lignes (`--ligne` 1,75 rem).

Les sections ci-dessous décrivent la v1 ; là où elles parlent d'un bristol « blanc froid », lire « noir » pour le
thème sombre (référence) et les tokens de `src/styles/da/tokens.css`.

## 1. Le principe : ce sont des fiches posées sur un éclat d'obsidienne, pas un tableau de bord

Obsidian Web sert à **relire et relier ses notes** depuis un téléphone. Une note n'est pas une « donnée » dans un
widget : c'est une fiche qu'on tire d'une liasse, qu'on lit, et dont les renvois mènent à d'autres fiches. Le
logiciel, lui, porte le nom d'une pierre : un verre noir taillé, aux arêtes vives, qui s'irise quand la lumière glisse.
L'app est donc une **table d'obsidienne** sur laquelle on pose ses **fiches bristol**.

Trois choses caractérisent l'objet, et l'app doit les reprendre littéralement :

1. **La fiche bristol lignée.** Carton blanc froid, une ligne de tête colorée en haut (ici le magenta de la marque),
   des lignes bleues régulières sous le texte, une cote dans le coin (le chemin de la note). Une note s'affiche sur
   une fiche, jamais sur une « card » d'interface.
2. **Le renvoi.** Sur une fiche Zettelkasten, on écrit à la main la cote d'une autre fiche : c'est le lien. Les liens
   internes sont des renvois à l'encre magenta, les rétroliens sont « les fiches qui renvoient ici ».
3. **L'éclat d'obsidienne.** Tout ce qui n'est pas une fiche (en-tête, explorateur, menus, connexion) est du verre
   volcanique : noir violacé, ondes de cassure conchoïdale, arête claire de 1 px, irisation violet → sarcelle → or
   qui glisse sur les arêtes.

La règle de contrôle : **si un écran ressemble à un tableau de bord shadcn sombre (tuiles de chiffres à icônes
colorées, Geist, cartes arrondies identiques) ou à Notion, il est raté.**

## 2. Structure de page

| Élément | Traitement |
| --- | --- |
| Fond | Obsidienne `--obsidienne`, ondes de cassure conchoïdale (dégradés radiaux décentrés, alpha ≤ 0,06) + grain vitreux |
| Marges / grille | Fiches centrées, largeur de lecture 68 ch max ; sur mobile, la fiche occupe la largeur moins 12 px de table de chaque côté |
| Titre de page | Sur une fiche : titre en Literata 600 sur la première ligne, sous la ligne de tête magenta ; hors fiche : titre gravé sur l'obsidienne (Literata, graphite clair) |
| Bloc | Fiche bristol (contenu lu) ou éclat d'obsidienne (chrome, outils, réglages) ; jamais une troisième sorte de carte |
| Liste de notes | Liasse : fiches empilées, la suivante dépasse de 3 px, cote à droite |
| Séparateur | Ligne de lignage (bleu, 1 px) sur une fiche ; arête irisée sur l'obsidienne |
| Navigation | Barre d'obsidienne en haut, explorateur = liasses par dossier avec intercalaires à onglet |

**Voix.** On parle de fiches, de liasses, de renvois, de cotes : « Fiches », « Liasse », « Renvois entrants »,
« Cote », « Tirer une fiche », « Fiche du jour ». Les libellés techniques existants restent quand ils nomment une
fonction précise (Graph, Templates, Frontmatter) ; la main du lecteur (états vides, astuces) écrit en Caveat,
au tutoiement déjà en place (« Ton second brain »).

## 3. Couleurs

### 3.1 Sémantique verrouillée

| Couleur | Sens | Origine dans le sujet |
| --- | --- | --- |
| Magenta `#D433F5` (sur obsidienne) / `#A324BC` (sur bristol) | **la marque, le renvoi, l'action principale** | la tuile du logo ; la ligne de tête des fiches bristol ; l'encre des renvois |
| Bleu de lignage `#3B6894` (encre) / lignes `rgba(94,143,192,.32)` | **la structure de la fiche** : lignes, cote, métadonnées, chemins | les lignes imprimées du bristol |
| Encre `#1E1A24` | le texte de la fiche | l'encre noire du stylo |
| Graphite `#BDB6C8` / `#958EA2` | le texte sur l'obsidienne | la lumière grise sur le verre noir |
| Irisation `#8C6BF2` → `#3FB8A4` → `#E0B04A` | **décor seulement** : arêtes, reflet du sceau, chargement | l'obsidienne arc-en-ciel |
| Vert sapin `#3E9B6E` | à jour, synchronisé, connecté | — (état) |
| Ambre `#E3A13B` | en cours : indexation, brouillon non enregistré | — (état) |
| Rature `#D9472F` | erreur, suppression | la rature au stylo rouge |
| Cavaliers (palette §3.3) | **étiquettes (tags)** et rien d'autre | les cavaliers de signalisation clipsés sur les fiches |

Dans tout contexte d'état, ces teintes ne veulent dire que ça. Le magenta ne remplit jamais un grand aplat : il trace
(ligne de tête, renvoi, contour de bouton) ; un seul bouton plein magenta par écran (l'action principale).

### 3.2 Tokens

```css
:root {
  /* obsidienne (thème de référence : sombre) */
  --obsidienne: #100D13;       /* la table */
  --obsidienne-2: #18141C;     /* éclat : en-tête, explorateur, menus */
  --obsidienne-3: #231D29;     /* éclat relevé : survol, champ */
  --arete: rgba(236, 226, 255, 0.10);
  --graphite: #BDB6C8;
  --graphite-doux: #958EA2;
  /* bristol */
  --bristol: #F5F6F2;          /* sombre : #E9EAE4 (« sous la lampe ») */
  --lignage: rgba(94, 143, 192, 0.32);
  --lignage-encre: #3B6894;
  --encre: #1E1A24;
  /* marque et renvoi */
  --magenta: #D433F5;
  --magenta-encre: #A324BC;
  /* irisation (décor) */
  --iris-1: #8C6BF2; --iris-2: #3FB8A4; --iris-3: #E0B04A;
  /* états */
  --a-jour: #3E9B6E; --en-cours: #E3A13B; --rature: #D9472F;
}
```

Le sombre « Obsidienne » est la référence (lecture du soir sur téléphone, et c'est la pierre). Le clair « Bristol »
garde l'en-tête en obsidienne et pose les fiches sur un carton gris perle `#E3E4E7`.
Plafonds : irisation alpha ≤ 0,22 ; ondes de cassure alpha ≤ 0,06 ; arête 1 px alpha ≤ 0,14 ; halo du sceau
magenta alpha ≤ 0,35 ; contraste texte ≥ 4,5:1 (encre sur bristol 15,7:1, lignage-encre 5,4:1 (4,8:1 sur le bristol sombre), graphite-doux sur
obsidienne 6:1, magenta-encre sur bristol 5,5:1, magenta sur obsidienne 5,1:1).

Les 34 autres thèmes du sélecteur restent pour les utilisateurs qui les ont choisis (réglage persistant), mais ne
sont que des teintes : la matière (fiche, éclat, renvoi) est la même partout. Le catalogue est en sursis (BACKLOG).

### 3.3 Palette fermée des cavaliers (tags)

Six cavaliers en plastique translucide, attribués par empreinte du nom de l'étiquette : jaune `#F2C94C`,
vert `#4CAF7A`, bleu `#4A86D8`, orange `#F08A3C`, violet `#9B6BDF`, rose `#E86AA8`. Pas de sélecteur libre.

## 4. Typographie

| Rôle | Police | Pourquoi celle-ci pour ce sujet |
| --- | --- | --- |
| Titres et texte de fiche, interface | **Literata** | dessinée pour la lecture longue sur écran (Google Play Livres) : une note se lit comme une page de livre, et sa version display donne des titres de fiche nets |
| Cotes, chemins, compteurs, code | **IBM Plex Mono** | la cote d'une fiche se trace au normographe : chasse fixe, sobre, lisible petit |
| Main du lecteur : annotations, états vides, astuces | **Caveat** | l'écriture à la main sur la fiche, comme Luhmann notait ses renvois |

Chargement : `next/font/google` (fichiers auto-hébergés au build, utilisables hors ligne par la PWA). Chiffres dans
les titres en Literata (pas d'elzéviriens), compteurs en Plex Mono tabulaire. Jamais de Caveat pour une donnée.

## 5. Composants signature

| Composant | Ce qu'il reproduit | Piste technique |
| --- | --- | --- |
| **Fiche** | la fiche bristol lignée : ligne de tête magenta, lignes bleues calées sur l'interlignage, cote en haut à droite | `.fiche` : `background: repeating-linear-gradient` au pas de `--ligne` (1,75 rem), `::before` ligne de tête, ombre portée sur la table |
| **Renvoi** | la cote d'une autre fiche écrite à l'encre | liens internes `.renvoi` : encre magenta, flèche ↗ en exposant, soulignement manuscrit SVG tracé au survol |
| **Liasse** | une pile de fiches tenue ensemble | liste de notes : chaque ligne est une fiche, deux tranches décalées derrière (`box-shadow` multiples), cote à droite |
| **Intercalaire** | la fiche-guide à onglet qui sépare les dossiers | en-tête de section et de dossier : onglet trapézoïdal (`clip-path`) portant le nom en Plex Mono |
| **Éclat** | le verre volcanique taillé | `.eclat` : obsidienne-2, ondes conchoïdales radiales, arête 1 px, bord irisé (`border-image` dégradé alpha ≤ 0,22) |
| **Cavalier** | le cavalier de signalisation clipsé sur la tranche | tag : plastique translucide de la palette §3.3, pince trapézoïdale en haut (`::before`) |
| **Tampon dateur** | le tampon qui date la fiche | dates (« modifiée le », fiche du jour) : cadre double, Plex Mono, encre lignage, rotation −2° |
| **Sceau** | le mark v2.9.1 sur sa tuile | tuile magenta inchangée + reflet irisé qui balaie, nœuds qui pulsent au chargement |
| **Compteur de liasses** | le fichier qu'on mesure à l'épaisseur | statistiques du tableau d'accueil : chaque chiffre est l'épaisseur d'une liasse dessinée, pas une tuile à icône |

## 6. Effets et mouvement (au maximum, dans la matière du sujet)

| Effet | Lien avec l'objet réel | Recette (propriété, durée, courbe) | Où |
| --- | --- | --- | --- |
| Fiche tirée de la liasse (moment orchestré) | on sort la fiche du paquet | `transform: translateY(22px) rotate(-0.8deg) → 0`, `opacity 0 → 1`, 460 ms, `cubic-bezier(.2,.9,.25,1.12)` | ouverture d'une note, d'un dossier |
| Ligne de tête qui s'encre | le trait au feutre en haut de la fiche | `transform: scaleX(0 → 1)` origine gauche, 520 ms, délai 160 ms, `cubic-bezier(.6,0,.2,1)` | chaque fiche |
| Lignage qui se tire | les lignes imprimées apparaissent | `mask-size 0% → 100%` (ou `clip-path inset`) de gauche à droite, 700 ms, délai 240 ms | fiche de note |
| Feuilletage | on passe les fiches au pouce | enfants de la liasse : `translateY(8px) → 0` + `opacity`, 280 ms, décalage 35 ms (max 12) | listes, explorateur, accueil |
| Irisation qui glisse | la lumière sur le verre volcanique | `background-position 0% → 200%` d'un dégradé iris, 2,8 s en boucle lente sur le sceau ; 900 ms une fois au survol d'un éclat | sceau, éclats survolés |
| Tampon | le coup de tampon dateur | `transform: scale(1.35) rotate(-6deg) → scale(1) rotate(-2deg)`, `opacity`, 240 ms, `cubic-bezier(.3,1.5,.5,1)` | dates, fiche du jour |
| Renvoi tracé | le soulignement à la main | SVG `stroke-dashoffset 100% → 0`, 320 ms, `ease-out` au survol/focus | liens internes |
| Synapses | les nœuds du cerveau s'allument | nœuds du sceau `opacity .35 → 1` en séquence, 1,2 s boucle | chargements |
| Cavalier clipsé | la pince qui s'enclenche | survol : `translateY(-3px)`, 180 ms, `cubic-bezier(.3,1.6,.5,1)` | tags |

Garde-fous : tout est coupé sous `prefers-reduced-motion` (états finaux affichés), la page est complète au repos,
on n'anime que `transform`, `opacity`, `background-position`, `clip-path`. Le grain vitreux est un SVG de bruit
précalculé en data-URI, pas un filtre live.

## 7. Illustrations et icônes

Trait : celui du mark (trait rond épais, nœuds pleins). Motif récurrent : **le nœud et son renvoi** (deux pastilles
reliées), qui sert de séparateur, d'état vide et de chargement (synapses). Les états vides sont une fiche vierge
avec une annotation en Caveat. Les icônes utilitaires du chrome (lucide) restent tolérées en graphite, trait 1,5,
taille 16–18 px ; les objets du sujet (fiche, liasse, renvoi, cavalier) ont leurs propres SVG.

## 8. Ce qu'il ne faut pas faire

- Une note affichée hors d'une fiche, ou une fiche sans ligne de tête ni lignage.
- Un grand aplat clair dans le thème sombre ; des angles vifs sur les icônes et boutons (régression sur l'origine) ; un lignage plus appuyé qu'alpha 0,1.
- Le magenta en aplat, en halo néon ou en dégradé de fond ; plus d'un bouton plein magenta par écran.
- Une tuile de statistique « grand chiffre + petite icône colorée » (le moule shadcn de l'origine).
- Geist, Inter, ou la police système ; une étiquette mono en capitales au-dessus de chaque titre.
- Bois, laiton, tiroirs à poignée, cartels épinglés (c'est le cabinet de Magpie) ; panneaux chanfreinés (HSR Lab) ;
  crème `#F4F1EA` + terracotta (esthétique IA) ; en sombre la fiche est un bristol noir, jamais un aplat blanc.
- Toucher au dessin du mark v2.9.1 (5 copies synchronisées, cf. mémoire projet) : on l'entoure, on ne le redessine pas.
- Promouvoir le catalogue de thèmes : le sélecteur montre d'abord Obsidienne et Bristol.
