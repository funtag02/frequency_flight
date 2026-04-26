# [Frequency Flight](https://votre-repo.github.io/frequency-flight/)

> Runner néon spatial — vaisseau, aliens et astéroïdes pilotés par NN  
> Projet Steering Behaviours & Neuro-Evolution | p5.js + ML5.js

---

## L'idée

Et si les ennemis d'un runner apprenaient à te bloquer — et à te tirer dessus ?

**Frequency Flight** est un runner automatique 2D dans l'esprit de Geometry Dash et Jetpack Joyride, avec une ambiance néon spatiale et une piste Jungle des années 2000 à 174 BPM produite sur FL Studio. Le joueur pilote un **vaisseau spatial qui avance en continu vers la droite**, laissant derrière lui une traînée néon — comme l'échappement d'une fusée. Il peut tirer des missiles pour éliminer certains ennemis.

La gravité est très faible. Le joueur contrôle la montée et la descente pour esquiver les ennemis qui arrivent depuis la droite, tout en ripostant avec ses missiles. Dépasser les limites en Y (plafond ou sol) est fatal.

---

## Comment ça marche

Le vaisseau avance automatiquement vers la droite à vitesse constante (accélérée par rapport à la V1). Le joueur contrôle uniquement son altitude et peut tirer. Une légère gravité le tire doucement vers le bas.

**Plafond et sol sont mortels** — sortir de l'écran en haut ou en bas entraîne la mort immédiate.

Les ennemis apparaissent depuis la droite et se déplacent vers la gauche. Les ennemis tireurs (`shooter`, `gunner`) peuvent riposter avec des missiles synchronisés au BPM.

---

## Les ennemis

| Type | Comportement | Steering | HP | Tir |
|---|---|---|---|---|
| Alien chasseur | Fonce directement sur le vaisseau | Seek / Pursue | 1 | Non |
| Alien encercleur | Bloque la trajectoire par le haut ou le bas | Seek + coordination | 1 | Non |
| Astéroïde dérivant | Dérive imprévisiblement | Wander | 1 | Non |
| Formation alien | Forme un mur mobile coordonné | Separation + coordination | 1 | Non |
| **Shooter** | Se cale sur la position du joueur et tire des missiles guidés | Pursue vertical | **2** | Oui — guidé |
| **Gunner** | Tire en ligne droite vers la gauche | Seek vertical | **2** | Oui — droit |

### Pulsation néon BPM
Tous les ennemis clignotent en néon à 174 BPM (ou en phase décalée) — effet visuel purement esthétique, synchronisé avec le beat de la musique.

---

## Missiles

### Missiles joueur
- Tir : `ESPACE` ou **clic gauche**
- Missile droit vers la droite, vitesse élevée
- Un missile par pression (pas de tir automatique)
- Cooldown léger entre les tirs
- **ML5 (V2)** : ouverture de la bouche → tir

### Missiles ennemis
- `Shooter` : missile guidé, vise la position actuelle du joueur
- `Gunner` : missile droit vers la gauche
- Tir synchronisé au BPM (toutes les 2 beats ~41 frames)
- Les missiles ennemis peuvent être esquivés ou absorbés par les boucliers

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

| Bouclier | Effet | Durée |
|---|---|---|
| Bouclier temporaire (`A`) | Invincibilité totale | Durée limitée, puis recharge |
| Bouclier résistant (`Z`) | Absorbe 3 impacts avant de se briser | Permanent jusqu'à destruction |

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

La piste musicale Jungle 174 BPM (FL Studio) sera intégrée en V2 via `p5.sound`.

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
| 1-2 | Position joueur (x, y) normalisée |
| 3 | Vitesse verticale joueur |
| 4-5 | Distance horizontale et verticale ennemi/joueur |
| 6-7 | Position Y des 2 ennemis les plus proches |
| 8-9 | Distance plafond / sol |
| 10 | État boucliers |

---

## Structure du projet
frequency-flight/
├── index.html
├── sketch.js
├── vehicle.js          # IMMUABLE
├── nn.js
├── fitness.js
├── missile.js          # Missiles joueur et ennemis
├── player.js
├── enemy.js            # 6 types d'ennemis
├── levelgen.js
├── ui.js
├── levels/
│   └── medium/level.json
├── brains/
└── assets/
├── music/
└── fonts/

---

## État d'implémentation

| Fonctionnalité | Statut | Notes |
|---|---|---|
| 🎮 Gameplay basique | ✅ | Vaisseau, 6 types d'ennemis, collisions, 2 boucliers |
| 🚀 Missiles joueur | ✅ | ESPACE / clic, cooldown, tir droit |
| 🔫 Missiles ennemis | ✅ | Shooter (guidé) + Gunner (droit), 2 HP, sync BPM |
| 💀 Limites Y mortelles | ✅ | Plafond et sol = mort immédiate |
| 🎨 Thème néon | ✅ | UI Orbitron, glow, pulsation BPM ennemis |
| 🔊 Effets sonores | ✅ | 5 sons synthétiques p5.Oscillator/Noise |
| 🧬 Réseau de neurones | ✅ | Feed-forward [10, 8, 8, 2] |
| 🌊 Steering behaviors | ✅ | Seek, pursue, arrive, wander, separate, avoid |
| 🎥 ML5.js | ❌ | V2 — handPose, faceMesh, tir bouche ouverte |
| 🧠 Neuro-évolution | ❌ | V2 |
| 🎵 Musique 174 BPM | ❌ | V2 |
| 💾 Sauvegarde brains | ❌ | V2 |

---

## Lancer le projet

```bash
git clone https://github.com/votre-repo/frequency-flight.git
cd frequency-flight
npx serve .
```

Ouvrir `http://localhost:8080`.

---

## Détails techniques

IDE : VSCode  
Modèles IA utilisés : Claude Sonnet 4.5 / Haiku 4.5