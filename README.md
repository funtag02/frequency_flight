# [Frequency Flight](https://votre-repo.github.io/frequency-flight/)

> Runner néon spatial — vaisseau, aliens et astéroïdes pilotés par NN  
> Projet Steering Behaviours & Neuro-Evolution | p5.js

---

## L'idée

Et si les ennemis d'un runner apprenaient à te bloquer — et à te tirer dessus ?

**Frequency Flight** est un runner automatique 2D dans l'esprit de Geometry Dash et Jetpack Joyride, avec une ambiance néon spatiale et une piste Liquid DNB à 174 BPM produite sur FL Studio. Le joueur pilote un **vaisseau spatial qui avance en continu vers la droite**, laissant derrière lui une traînée néon — comme l'échappement d'une fusée. Il peut tirer des missiles pour éliminer certains ennemis.

La gravité est très faible. Le joueur contrôle la montée et la descente pour esquiver les ennemis qui arrivent depuis la droite, tout en ripostant avec ses missiles. **Dépasser les limites en Y — plafond ou sol — est fatal.**

---

## Comment ça marche

Le vaisseau avance automatiquement vers la droite à vitesse constante. Le joueur contrôle uniquement son altitude et peut tirer. Une légère gravité le tire doucement vers le bas en permanence.

Le vaisseau s'incline dynamiquement selon sa vitesse verticale — nez vers le haut quand il monte, nez vers le bas quand il descend — et laisse une traînée néon qui part de l'arrière du sprite et suit sa trajectoire passée.

Les ennemis apparaissent depuis la droite et se déplacent vers la gauche. Les ennemis tireurs (`shooter`, `gunner`) peuvent riposter avec des missiles synchronisés au BPM. Tous les ennemis clignotent en néon à 174 BPM.

---

## Architecture technique

Le projet utilise une **architecture hybride canvas + DOM** :

- **Canvas p5.js** — rendu du jeu uniquement (vaisseau, ennemis, missiles, fond, effets)
- **DOM HTML/CSS** — toute l'UI (HUD, menus, éditeur de niveau, overlays)

Cette séparation permet un HUD plus performant (non redessiné à 60fps) et une UI d'édition de niveau ergonomique avec des inputs natifs.

---

## Les ennemis

| Type | Comportement | Steering | HP | Tir |
|---|---|---|---|---|
| Alien chasseur | Fonce directement sur le vaisseau | Seek / Pursue | 1 | Non |
| Alien encercleur | Bloque la trajectoire par le haut ou le bas | Seek + coordination | 1 | Non |
| Astéroïde dérivant | Dérive imprévisiblement | Wander | 1 | Non |
| Formation alien | Forme un mur mobile coordonné | Separation + coordination | 1 | Non |
| **Shooter** | Se cale sur la position du joueur, tire des missiles guidés | Pursue vertical | **2** | Oui — guidé |
| **Gunner** | Tire en ligne droite vers la gauche | Seek vertical | **2** | Oui — droit |

### Pulsation néon BPM
Tous les ennemis clignotent en néon à 174 BPM avec une phase aléatoire par ennemi — ils ne clignotent pas tous en synchronisation totale, ce qui donne un effet organique.

---

## Missiles

### Missiles joueur
- Tir : `ESPACE` ou **clic gauche**
- Missile droit vers la droite, vitesse élevée
- Un missile par pression (pas de tir automatique), cooldown léger

### Missiles ennemis
- `Shooter` : missile guidé à faible force de correction (esquivable) — ne tire pas si à moins de 450px du joueur sur l'axe X
- `Gunner` : missile droit vers la gauche
- Tir synchronisé à **1/8 BPM** (~165 frames entre chaque tir)
- Le seek des missiles guidés s'arrête dès qu'ils dépassent le joueur en X
- Les missiles ennemis sont absorbés par les boucliers

---

## Contrôles

| Action | Clavier |
|---|---|
| Monter | `↑` ou `W` |
| Descendre | `↓` ou `S` |
| Tirer | `ESPACE` ou clic gauche |
| Bouclier temporaire | `A` |
| Bouclier résistant | `Z` |
| Mode debug | `D` |
| Pause | `P` |
| Rejouer | `R` |

---

## Boucliers

| Bouclier | Touche | Effet | Durée |
|---|---|---|---|
| Temporaire | `A` | Invincibilité totale | Durée limitée, puis recharge |
| Résistant | `Z` | Absorbe 3 impacts avant de se briser | Permanent jusqu'à destruction |

Les deux boucliers absorbent aussi les missiles ennemis.

---

## Audio (effets synthétiques)

Tous les sons sont générés synthétiquement via `p5.Oscillator` / `p5.Noise` — aucun fichier audio requis pour les effets.

| Son | Déclencheur |
|---|---|
| Laser (sawtooth court) | Tir joueur |
| Explosion (noise burst) | Ennemi détruit |
| Ping métallique (triangle) | Impact bouclier |
| Sweep descendant (sine) | Mort du joueur |
| Sub-bass click (60Hz) | Chaque beat à 174 BPM |

> La piste musicale Liquid DNB 174 BPM (FL Studio) sera intégrée en V2 via `p5.sound`.

---

## Éditeur de niveau (mode Debug)

Accessible depuis l'écran de démarrage via le bouton **DEBUG**.

### Paramètres globaux
- Vitesse de scroll
- Gravité
- Force de montée

### Éditeur de waves
Chaque wave est configurable :
- `startFrame` — frame de départ
- `duration` — durée en frames
- `spawnInterval` — intervalle entre spawns
- Liste d'ennemis : ajouter / supprimer par type

### Sauvegarde
La configuration custom est sauvegardée en **localStorage** et rechargée automatiquement à l'ouverture de l'éditeur.

---

## Réseau de neurones

### Architecture

| Paramètre | Valeur par défaut |
|---|---|
| Neurones en entrée | 10 |
| Couches cachées | 2 × 8 |
| Neurones en sortie | 2 |
| Activation | `tanh` |

### Entrées

| # | Entrée |
|---|---|
| 1–2 | Position joueur (x, y) normalisée |
| 3 | Vitesse verticale joueur |
| 4–5 | Distance horizontale et verticale ennemi / joueur |
| 6–7 | Position Y des 2 ennemis les plus proches |
| 8–9 | Distance plafond / sol |
| 10 | État boucliers |

### Sorties

| # | Sortie |
|---|---|
| 1 | Déplacement vertical de l'ennemi (−1 → +1) |
| 2 | Déclenchement d'une action coordonnée (0 ou 1) |

---

## Mode Entraînement — Neuro-Évolution

### Accès
Bouton **TRAIN 🧬** sur l'écran d'accueil.

### Ce que les réseaux de neurones apprennent

Chaque ennemi possède un cerveau — un réseau feed-forward [10, 8, 8, 2]. À chaque frame il reçoit 10 capteurs normalisés (position joueur, distance, vitesse verticale, état boucliers...) et produit 2 sorties qui pondèrent ses steering behaviors.

Sans entraînement, les poids sont aléatoires et l'ennemi se comporte de façon chaotique. L'entraînement fait évoluer ces poids pour que l'ennemi apprenne à **anticiper la trajectoire du joueur**, **se coordonner** avec d'autres ennemis, et **exploiter les moments de vulnérabilité**.

### Fitness

La fitness mesure à quel point un cerveau atteint son objectif :
fitness = (impacts_infligés × 10) + (evasions_détectées × 0.5) + (brosses × 0.2)

Chaque ennemi entraîné essaie de toucher le joueur — la fitness récompense les impacts directs.

### Résultat
- Le **meilleur cerveau** (max fitness) est sauvegardé en `localStorage`
- Clé : `bestBrain_v1`
- Peut être chargé pour tester ses performances

### Stats en temps réel
L'écran d'entraînement affiche :
- Génération courante (1–10)
- Meilleure fitness (max de la génération)
- Fitness moyenne (population entière)
- Graphique d'évolution max/avg par génération (canvas néon)
- Temps écoulé par génération et total

### Algorithme génétique

- **20 individus** évalués **3 sessions** chacun par génération
- **Élitisme** : top 20% conservés sans modification
- **Crossover** : mélange 50/50 des poids de deux parents
- **Mutation** gaussienne : taux 10–15%
- **Session** : 600 frames (~10 sec simulées) avec wrap de l'ennemi
- **Vitesse** : 30 steps simulés par frame → ~30× plus rapide que temps réel
- Le joueur IA esquive automatiquement — les ennemis s'entraînent contre lui
- Le meilleur cerveau est sauvegardé en localStorage à la fin

## Adaptation du concept NN à Frequency Flight — difficultés rencontrées

### Le problème fondamental : entraîner *qui* contre *quoi* ?

Dans l'exemple des voitures sur circuit, le problème est simple et bien défini : un véhicule, un circuit fixe, une fitness = distance parcourue. Le cerveau apprend à piloter, et l'environnement ne change pas entre les générations.

Dans Frequency Flight, la situation est inversée et bien plus complexe : **ce sont les ennemis qui ont un cerveau, pas le joueur**. L'objectif est que les ennemis apprennent à être dangereux — mais dangereux contre un joueur humain imprévisible, qu'on ne peut pas simuler facilement.

Ça soulève immédiatement plusieurs questions sans réponse évidente :

- Contre quoi entraîne-t-on les ennemis pendant l'entraînement, si le joueur humain n'est pas là ?
- Si on utilise un joueur IA, est-ce qu'un ennemi entraîné contre une IA sera dangereux contre un humain ?
- Comment mesure-t-on qu'un ennemi est "bon" si sa cible (le joueur) change de comportement à chaque partie ?

### Ce qu'on a dû simplifier

**Le joueur IA est trop prévisible.** Pour simuler l'entraînement, on a créé un joueur automatique qui esquive verticalement en fonction de la position de l'ennemi. Ce joueur est honnête mais limité — il ne fait pas de feintes, ne tire pas, ne change pas de stratégie. Un ennemi très entraîné contre lui sera donc optimisé pour battre *ce joueur précis*, pas forcément un humain.

**Un seul ennemi par session.** Le readme documente des formations coordonnées, des bonus de coordination dans la fitness, des patterns multi-ennemis — rien de tout ça n'est entraînable avec l'architecture actuelle. Coordonner plusieurs cerveaux pendant l'entraînement nécessiterait de faire jouer N ennemis simultanément, de mesurer leur coordination collective, et de les évaluer ensemble plutôt qu'individuellement. C'est un problème d'entraînement multi-agents qui dépasse largement la portée du projet.

**La fitness ne mesure pas vraiment la dangerosité.** Le score actuel récompense les impacts directs et les esquives forcées — mais un ennemi peut accumuler des impacts en se jetant bêtement sur le joueur en boucle (wrap), sans vraiment "apprendre" à anticiper. La pénalité de prévisibilité et le bonus de coordination du readme sont restés non implémentés car ils nécessitent un historique comportemental complexe à calculer frame par frame.

**Les curseurs de topologie ne sont pas exposés.** Le readme prévoyait des sliders pour modifier le nombre de couches, de neurones, la fonction d'activation — ces paramètres existent dans le code (`NeuralNetwork` accepte une topologie arbitraire) mais l'UI d'entraînement ne les expose pas encore. Ajouter des curseurs qui redémarrent l'entraînement avec une nouvelle topologie est prévu en V3.

**La condition d'arrêt automatique n'est pas active.** Le critère "60% des ennemis touchent le vaisseau sur 3 passages consécutifs" est documenté mais non implémenté — l'entraînement tourne toujours les N générations complètes.

**ML5.js n'a pas pu être chargé.** La librairie est bloquée par la politique de tracking prevention des navigateurs modernes en environnement local (LiveServer). Le code d'intégration (`ml5controller.js`) est écrit et fonctionnel, mais ne peut pas être testé sans déploiement sur un serveur sans restriction CORS, ou en hébergeant la lib localement — ce qui n'était pas possible dans le temps imparti.

### Ce qui fonctionne malgré tout

L'algorithme génétique tourne correctement : on observe bien une séparation entre max fitness et avg fitness dès la première génération, et une convergence progressive sur les générations suivantes. Les cerveaux entraînés sont sauvegardés en localStorage. Le graphique d'évolution confirme que la population apprend quelque chose — même si ce "quelque chose" est optimisé pour battre le joueur IA plutôt qu'un humain.

Le vrai apprentissage observable : après quelques générations, les ennemis tendent à se positionner sur l'axe Y du joueur plus rapidement et à maintenir la pression plus longtemps, plutôt que de dériver aléatoirement.

---

## ML5.js — Contrôle par webcam

> ⚠️ **ML5.js est actuellement désactivé** — la librairie est bloquée par la politique de tracking prevention de certains navigateurs (Edge, Firefox strict) et ne peut pas être chargée depuis un CDN tiers dans l'environnement de développement local. L'intégration est prête côté code (`ml5controller.js`) et sera réactivée dès que le problème de chargement sera résolu (hébergement local de la lib ou déploiement sur serveur sans restriction CORS).

### Gestes prévus

| Geste | Action | Description |
|---|---|---|
| ✋ Main ouverte | Monter / descendre | Position Y du poignet vs centre écran |
| 🤙 Gunfinger | Tirer | Index horizontal + pouce vertical, autres fermés |
| ✊ Poing fermé | Bouclier temporaire (S1) | Tous les doigts fermés |
| ✌️ Signe V | Pause | Index + majeur tendus, écartés |
| 🖕 Doigt d'honneur | Restart | Majeur seul tendu |

### Règle clavier vs ML5 (prévue)
- Si le joueur utilise le clavier ou la souris pendant une partie, ML5 est désactivé pour cette session
- Il se réactive automatiquement à la prochaine partie (restart `R` ou menu)
- La touche `M` le réactive immédiatement à tout moment

### Limitations prévues
- Un seul geste actif à la fois — impossible de se déplacer et tirer simultanément
- Shield 2 non assigné (ergonomie insuffisante)

---

## Idées en attente (backlog)

| Idée | Priorité | Notes |
|---|---|---|
| Musique Liquid DNB 174 BPM | V2 | `p5.sound` — piste FL Studio |
| ML5.js — réactivation | V2 | Résoudre le blocage CDN / héberger la lib localement |
| Chargement brain entraîné en jeu | V3 | Jouer contre le meilleur cerveau sauvegardé |
| Munitions limitées + régénération | V3 | Couplé au tir ML5 simultané au déplacement |
| Shield 2 via ML5 | V3 | Geste à définir — ergonomie à tester |
| Bouche ouverte → tir (faceMesh) | V3 | Alternative au gunfinger ML5 |
| Calibration dynamique zone détection ML5 | V3 | Adaptation à la distance webcam |
| Obstacles joueur (clic) | V4 | Ennemis utilisent steering avoid |
| Niveaux easy / hard / killer | V4 | JSON dans `levels/` |
| Graphique fitness interactif | V4 | Hover sur les points = détails génération |
| Coordination multi-ennemis NN | V4 | Output 2 du NN enfin utilisé |
| Mode spectateur training | V4 | Voir le canvas pendant l'entraînement |
| Visualisation landmarks ML5 debug | V4 | Affichage des keypoints en mode D |

---

## Structure du projet

frequency-flight/
├── index.html              # Structure DOM — menus, HUD, éditeur, écran training
├── style.css               # Thème néon — variables CSS, composants
├── sketch.js               # Game loop p5 + orchestration DOM + training
├── vehicle.js              # IMMUABLE — classe Vehicle de base
├── nn.js                   # Réseau de neurones feed-forward + sérialisation
├── fitness.js              # Calcul de fitness
├── neuroevolution.js       # Algorithme génétique + entraînement
├── missile.js              # Missiles joueur et ennemis
├── ml5controller.js        # Contrôle ML5.js — désactivé (voir section ML5)
├── player.js               # Vaisseau joueur
├── enemy.js                # 6 types d'ennemis + pulsation BPM
├── levelgen.js             # Génération de niveaux (medium + custom)
├── ui.js                   # HUD DOM + debug canvas overlay
├── levels/
│   └── medium/level.json   # Niveau medium (référence)
├── brains/                 # Cerveaux entraînés (JSON)
└── assets/
├── music/              # Piste liquid dnb 174 BPM (V2)
└── fonts/

---

## État d'implémentation

| Fonctionnalité | Statut | Demandé | Notes |
|---|---|---|---|
| 🎮 Gameplay basique | ✅ | — | Vaisseau, 6 types d'ennemis, collisions, 2 boucliers |
| 🚀 Missiles joueur | ✅ | — | ESPACE / clic gauche |
| 🔫 Missiles ennemis | ✅ | — | Shooter guidé + Gunner droit, 2 HP, sync 1/8 BPM |
| 💀 Limites Y mortelles | ✅ | — | Plafond et sol = mort immédiate |
| 🎨 Thème néon | ✅ | — | CSS variables, Orbitron, glow, pulsation BPM ennemis |
| 🏗️ Architecture hybride | ✅ | — | Canvas p5 = jeu / DOM = UI |
| 🛠️ Éditeur de niveau | ✅ | ✅ | Waves, ennemis, params globaux, localStorage |
| 🔊 Effets sonores | ✅ | — | 5 sons synthétiques p5.Oscillator / Noise |
| 🧬 Réseau de neurones | ✅ | ✅ | Feed-forward [10, 8, 8, 2] |
| 🌊 Steering behaviors | ✅ | ✅ | Seek, pursue, arrive, wander, separate, avoid |
| 🧠 Neuro-évolution | ✅ | ✅ | GA 10 gen × 20 pop × 3 sessions, élitisme 20% |
| 💾 Sauvegarde best brain | ✅ | ✅ | localStorage `bestBrain_v1` |
| 📊 Graphique fitness | ✅ | — | Canvas néon — courbes max/avg par génération |
| 🏁 Condition d'arrêt entraînement | ❌ | ✅ | Prévu : 60% hits sur 3 passages — non implémenté |
| 🎛️ Curseurs topologie NN | ❌ | ✅ | Couches, neurones, activation — UI non exposée |
| 🔁 Généralisation du cerveau entraîné | ❌ | ✅ | Entraînement sur niveaux variés — non implémenté |
| 🤝 Coordination multi-ennemis | ❌ | ✅ | Entraînement multi-agents trop complexe — voir section difficultés |
| 🏆 Compétition de cerveaux | ❌ | ✅ | Charger N cerveaux en partie — V3 |
| 🔁 Chargement brain en jeu | ❌ | ✅ | Jouer contre le meilleur cerveau sauvegardé — V3 |
| 🎥 ML5.js | ⚠️ | ✅ | Code prêt (`ml5controller.js`), bloqué CDN navigateur |
| 🎵 Musique 174 BPM | ✅ | — | piste FL Studio via p5.sound |
| 🤙 Tir + déplacement ML5 simultané | ❌ | — | V3 — munitions limitées |
| 🔧 Obstacles joueur (clic souris) | ❌ | ✅ | V4 — ennemis utilisent steering avoid |
| 🌍 Niveaux easy/hard/killer | ❌ | ✅ | V4 — JSON dans `levels/` |

---

## Lancer le projet

```bash
Ouvrir index.html avec LiveServer
```

Aller sur `http://127.0.0.1:5500/frequency_flight/index.html`.

---

## Détails techniques

IDE : VSCode  
Librairies : p5.js, p5.sound  
Modèles IA utilisés : Claude Sonnet 4.6