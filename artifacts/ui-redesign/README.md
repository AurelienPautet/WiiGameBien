# UI screenshots

Accroches décoratives retirées. Navigation de mêmes dimensions sur toutes les pages, avec adaptation commune aux écrans desktop, tablette et mobile.

Open [gallery.html](gallery.html) to browse all screenshots.

- [Accueil](35-home-clean-copy.png): Accroches retirées ; descriptions des modes conservées. Footer centré en bas.
- [Classements](36-rankings-consistent-nav.png): Même menu de 204 × 886 px à cette taille d’écran (1440 × 1000).
- [Mes créations](37-creations-consistent-nav.png): Même menu et titre sans sous-titre superflu.
- [Sélection solo](38-solo-consistent-nav.png): Navigation de mêmes dimensions que sur l’accueil.
- [Éditeur de niveau](39-level-editor-consistent-nav.png): Navigation de mêmes dimensions que sur l’accueil.
- [Éditeur de campagne](40-campaign-editor-consistent-nav.png): Navigation de mêmes dimensions que sur l’accueil.
- [Administration](41-admin-consistent-nav.png): Navigation de mêmes dimensions que sur l’accueil.
- [Accueil · Mobile](42-home-clean-copy-mobile.png): Navigation compacte commune à toutes les pages.

Vérification : 269 tests web passent ; typage, build et formatage validés ; lint sans erreur (32 avertissements existants). Le contrôle navigateur compare position, largeur et hauteur de la navigation sur huit vues (accueil, classements, créations niveaux/campagnes, solo, les deux éditeurs et administration), à 1440 × 1000, 1920 × 1080, 1024 × 768, 768 × 1200, 390 × 844 et 320 × 640. Aucun débordement horizontal ni erreur JavaScript ; footer d’accueil centré en bas. Compte temporaire supprimé après vérification.

[Démo des transitions de navigation](navigation_transitions.mp4) : passage entre Accueil, Classements et Mes créations, puis entre Niveaux et Campagnes. Le menu reste fixe. Le fondu et le glissement durent 240 ms pour une page et 180 ms pour un onglet, et sont désactivés avec `prefers-reduced-motion`.

Validation des transitions : 271 tests web, typage, build et formatage validés ; lint sans erreur (32 avertissements existants). Vérification navigateur des animations, de la stabilité de la navigation, de la conservation de la page lors des changements d’onglet, du clavier, des clics rapides, du mobile et du mode sans animations. Compte de test supprimé après capture.

[Démo du cadre de sélection animé](selection_frame_transitions.mp4) : le fond cyan suit la sélection dans le menu et le contour des onglets glisse entre Niveaux et Campagnes. Chaque groupe possède son propre cadre ; les onglets d’une fenêtre de profil restent indépendants de ceux de la page. Le mouvement utilise le ressort partagé de l’interface et respecte la préférence de réduction des animations.

La navigation reste montée entre les routes pour permettre au cadre de se déplacer depuis l’ancienne sélection. Vérification navigateur du déplacement réel du cadre, de son alignement à 1440, 1024, 768, 390 et 320 px, des flèches du clavier, des changements rapides, du profil, du mode sans animations, de l’entrée dans une partie solo immersive et du retour au menu. Les comptes et niveaux temporaires sont supprimés après vérification. Suite web : 271 tests ; typage, build et formatage validés ; lint sans erreur.
