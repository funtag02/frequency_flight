# [Frequency Flight](https://votre-repo.github.io/frequency-flight/)

> Runner néon spatial — vaisseau, aliens et astéroïdes pilotés par NN  
> Projet Steering Behaviours & Neuro-Evolution | p5.js + ML5.js

---

## L'idée

Et si les ennemis d'un runner apprenaient à te bloquer — et à te tirer dessus ?

**Frequency Flight** est un runner automatique 2D dans l'esprit de Geometry Dash et Jetpack Joyride, avec une ambiance néon spatiale et une piste Jungle des années 2000 à 174 BPM produite sur FL Studio. Le joueur pilote un **vaisseau spatial qui avance en continu vers la droite**, laissant derrière lui une traînée néon — comme l'échappement d'une fusée. Il peut tirer des missiles pour éliminer certains ennemis.

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
- **ML5 (V2)** : ouverture de la bouche → tir

### Missiles ennemis
- `Shooter` : missile guidé à faible force de correction (esquivable)
- `Gunner` : missile droit vers la gauche
- Tir synchronisé à **1/8 BPM** (~165 frames entre chaque tir)
- Le seek des missiles guidés s'arrête dès qu'ils dépassent le joueur en X
- Les missiles ennemis sont absorbés par les boucliers

---

## Contrôles

| Action | Clavier | ML5 (V2) |
|---|---|---|
| Monter | `↑` ou `W` | Main levée |
| Descendre | `↓` ou `S` | Main basse |
| Tirer | `ESPACE` ou clic gauche | Bouche ouverte |
| Bouclier temporaire | `A` | — |
| Bouclier résistant | `Z` | Main fermée en poing |
| Mode debug | `D` | — |
| Pause | `P` | — |
| Rejouer | `R` | — |

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

> La piste musicale Jungle 174 BPM (FL Studio) sera intégrée en V2 via `p5.sound`.

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

## Fonction de fitness
fitness = (impacts_infligés × bonus_coordination) − penalite_predictibilite

| Composante | Calcul |
|---|---|
| `impacts_infligés` | +1 par impact, +0.5 par esquive brusque détectée |
| `bonus_coordination` | +30% si ≥2 ennemis ont triggeré dans une fenêtre de 200ms |
| `penalite_predictibilite` | −20% si le même pattern est répété 3 fois de suite |

---

## Algorithme neuro-évolutif

Inspiré de NEAT simplifié :

1. Population initiale — N cerveaux avec poids aléatoires
2. Évaluation — chaque cerveau joue une session complète
3. Sélection — les 20% meilleurs sont conservés (élitisme)
4. Croisement — crossover 50/50 des poids entre deux parents
5. Mutation — bruit gaussien sur les poids (taux configurable)
6. Nouvelle génération — recommencement

**Condition d'arrêt** : 60% des ennemis touchent le vaisseau ou forcent une esquive brusque sur au moins 3 passages consécutifs.

---

## Structure du projet

frequency-flight/
├── index.html              # Structure DOM — menus, HUD, éditeur
├── style.css               # Thème néon — variables CSS, composants
├── sketch.js               # Game loop p5 + orchestration DOM
├── vehicle.js              # IMMUABLE — classe Vehicle de base
├── nn.js                   # Réseau de neurones feed-forward
├── fitness.js              # Calcul de fitness
├── missile.js              # Missiles joueur et ennemis
├── player.js               # Vaisseau joueur
├── enemy.js                # 6 types d'ennemis + pulsation BPM
├── levelgen.js             # Génération de niveaux (medium + custom)
├── ui.js                   # HUD DOM + debug canvas overlay
├── levels/
│   └── medium/level.json   # Niveau medium (référence)
├── brains/                 # Cerveaux entraînés (JSON)
└── assets/
├── music/              # Piste jungle 174 BPM (V2)
└── fonts/

---

## État d'implémentation

| Fonctionnalité | Statut | Notes |
|---|---|---|
| 🎮 Gameplay basique | ✅ | Vaisseau, 6 types d'ennemis, collisions, 2 boucliers |
| 🚀 Missiles joueur | ✅ | ESPACE / clic, cooldown, tir droit |
| 🔫 Missiles ennemis | ✅ | Shooter guidé + Gunner droit, 2 HP, sync 1/8 BPM |
| 💀 Limites Y mortelles | ✅ | Plafond et sol = mort immédiate |
| 🎨 Thème néon | ✅ | CSS variables, Orbitron, glow, pulsation BPM ennemis |
| 🏗️ Architecture hybride | ✅ | Canvas p5 = jeu / DOM = UI |
| 🛠️ Éditeur de niveau | ✅ | Waves, ennemis, params globaux, localStorage |
| 🔊 Effets sonores | ✅ | 5 sons synthétiques p5.Oscillator / Noise |
| 🧬 Réseau de neurones | ✅ | Feed-forward [10, 8, 8, 2] |
| 🌊 Steering behaviors | ✅ | Seek, pursue, arrive, wander, separate, avoid |
| 🎥 ML5.js | ❌ | V2 — handPose, faceMesh, tir bouche ouverte |
| 🧠 Neuro-évolution | ❌ | V2 — population loop, mutation, crossover |
| 🎵 Musique 174 BPM | ❌ | V2 — piste FL Studio via p5.sound |
| 💾 Sauvegarde brains | ❌ | V2 — export / import JSON |
| 📊 Graphique fitness | ❌ | V2 — affichage performance ennemis |
| 🔧 Obstacles joueur | ❌ | V2 — clic pour placer, ennemis évitent |
| 🌍 Niveaux easy/hard/killer | ❌ | V2 |

---

## Lancer le projet

```bash
Ouvrir index.html avec LiveServer
```

Aller sur `http://127.0.0.1:5500/frequency_flight/index.html`.

---

## Détails techniques

IDE : VSCode  
Librairies : p5.js, p5.sound, ML5.js (V2)  
Modèles IA utilisés : Claude Sonnet 4.5 / Haiku 4.5