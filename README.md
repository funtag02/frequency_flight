# [Frequency Flight](https://votre-repo.github.io/frequency-flight/)

> Runner néon spatial — vaisseau, aliens et astéroïdes pilotés par NN  
> Projet Steering Behaviours & Neuro-Evolution | p5.js + ML5.js

---

## L'idée

Et si les ennemis d'un runner apprenaient à te bloquer ?

**Frequency Flight** est un runner automatique 2D dans l'esprit de Geometry Dash et Jetpack Joyride, avec une ambiance néon spatiale et une piste Jungle des années 2000 à 174 BPM produite sur FL Studio. Le joueur pilote un **vaisseau spatial qui avance en continu vers la droite**, laissant derrière lui une traînée néon — purement visuelle, comme la traînée d'un avion.

La gravité est très faible. Le joueur contrôle la montée et la descente pour esquiver les ennemis qui arrivent depuis la droite. Ces ennemis — aliens et astéroïdes — sont pilotés par des réseaux de neurones entraînés par algorithme neuro-évolutif. Ils apprennent à anticiper les mouvements du joueur, à se coordonner, et à former des formations de plus en plus difficiles à esquiver.

---

## Comment ça marche

Le vaisseau avance automatiquement vers la droite à vitesse constante. Le joueur contrôle uniquement son altitude — monter ou descendre — pour éviter les ennemis qui arrivent en face. Une légère gravité le tire doucement vers le bas en permanence.

Il y a un plafond en haut de l'écran : impossible de le franchir, mais pas de dégâts. En bas, sortir de l'écran est fatal.

Les ennemis apparaissent depuis la droite et se déplacent vers la gauche en utilisant des steering behaviours. Chaque type a un comportement distinct, piloté par son propre NN. Ils apprennent au fil des générations à mieux anticiper le joueur et à se coordonner entre eux.

En mode entraînement, une IA pilote le vaisseau — les ennemis s'entraînent contre elle, génération après génération. En mode jeu, c'est le joueur qui prend les commandes, au clavier ou à la webcam via ML5.js.

---

## Les ennemis

### Types d'ennemis

| Type | Comportement NN | Steering behavior principal |
|---|---|---|
| Alien chasseur | Fonce directement sur le vaisseau | Seek / Pursue |
| Alien encercleur | Cherche à bloquer la trajectoire par le haut ou le bas | Seek + coordination |
| Astéroïde dérivant | Dérive lentement, change de cap imprévisiblement | Wander |
| Formation alien | Groupe coordonné qui forme un mur mobile | Separation + coordination collective |

### Ce que les NN apprennent
- Anticiper la position future du vaisseau plutôt que de viser sa position actuelle
- Se coordonner avec les autres ennemis pour former des patterns difficiles à traverser
- Identifier les moments où le joueur est le plus vulnérable (près du plafond ou du bas)

---

## Steering behaviors utilisés

Tout le mouvement des ennemis repose sur des forces appliquées à des instances de `Vehicle` — jamais sur de la manipulation directe de position. La classe `vehicle.js` est réutilisée et étendue depuis le projet Snake Steering.

- **Seek** — les aliens chasseurs visent directement la position actuelle du vaisseau
- **Pursue** — les aliens encercleurs prédisent la position future du vaisseau et interceptent sa trajectoire
- **Separation** — les ennemis se repoussent mutuellement pour ne pas se superposer et couvrir des zones différentes
- **Arrive** — les ennemis qui cherchent à bloquer ralentissent progressivement en arrivant sur leur position cible
- **Wander** — les astéroïdes dérivent de façon organique et imprévisible
- **Avoid** — les ennemis contournent les obstacles fixes placés par le joueur via clic souris

---

## Ce qui ne marche pas encore

*(à compléter une fois le code écrit)*

---

## Points d'amélioration

*(à compléter une fois le code écrit)*

---

## Contrôles

| Action | Contrôle clavier | Contrôle ML5 |
|---|---|---|
| Monter | `↑` | Main levée |
| Descendre | `↓` | Main basse |
| Bouclier temporaire | `A` | Bouche ouverte (si activé) |
| Bouclier résistant | `Z` | Main fermée en poing (si activé) |
| Ajouter un obstacle | Clic gauche sur le canvas | — |
| Activer / désactiver ML5 | `M` | — |
| Mode debug | `D` | — |
| Pause | `P` | — |
| Rejouer | `R` | — |

> Les contrôles ML5 sont activables individuellement depuis le menu de configuration avant la partie.

---

## Boucliers

Le joueur dispose de deux boucliers indépendants, activables simultanément.

| Bouclier | Effet | Durée |
|---|---|---|
| Bouclier temporaire | Invincibilité totale pendant quelques secondes | Durée limitée, puis recharge |
| Bouclier résistant | Absorbe plusieurs impacts avant de se briser | Permanent jusqu'à destruction |

Chaque bouclier est assignable au clavier ou à un geste ML5, paramétrable dans le menu avant la partie.

---

## Réseau de neurones

### Architecture (paramétrable via l'UI d'entraînement)

| Paramètre | Valeur par défaut | Plage |
|---|---|---|
| Neurones en entrée | 10 | 6 — 20 |
| Couches cachées | 2 | 1 — 4 |
| Neurones par couche | 8 | 4 — 32 |
| Fonction d'activation | `tanh` | `tanh` / `sigmoid` / `relu` |
| Neurones en sortie | 2 | fixe |

### Entrées (capteurs)

| # | Entrée | Description |
|---|---|---|
| 1 | `player.x` | Position horizontale du vaisseau |
| 2 | `player.y` | Position verticale du vaisseau |
| 3 | `player.vy` | Vitesse verticale du vaisseau |
| 4 | `dist.x` | Distance horizontale vaisseau / ennemi |
| 5 | `dist.y` | Distance verticale vaisseau / ennemi |
| 6-7 | `others[0-1].y` | Position verticale des 2 autres ennemis proches |
| 8 | `player.distCeiling` | Distance entre le vaisseau et le plafond |
| 9 | `player.distFloor` | Distance entre le vaisseau et le bas de l'écran |
| 10 | `player.shield` | État des boucliers actifs (0 / 1) |

### Sorties

| # | Sortie | Description |
|---|---|---|
| 1 | `dy` | Déplacement vertical de l'ennemi (-1 → +1) |
| 2 | `trigger` | Déclencher une action coordonnée avec les autres ennemis (0 ou 1) |

---

## Fonction de fitness

```
fitness = (impacts_infligés × bonus_coordination) - penalite_predictibilite
```

| Composante | Description | Calcul |
|---|---|---|
| `impacts_infligés` | L'ennemi a-t-il touché le vaisseau ou forcé une esquive brusque ? | +1 par impact, +0.5 par esquive détectée (variation brusque de `player.vy`) |
| `bonus_coordination` | Plusieurs ennemis ont-ils agi en synchronisation ? | +30% si ≥2 ennemis ont triggeré dans une fenêtre de 200ms |
| `penalite_predictibilite` | L'ennemi fait-il toujours le même mouvement ? | −20% si le même pattern est répété 3 fois de suite |

---

## Condition d'arrêt de l'entraînement

L'entraînement s'arrête automatiquement quand :

> **60% des ennemis** réussissent à toucher le vaisseau ou à forcer une esquive brusque sur **au moins 3 passages consécutifs** sans que le joueur IA ne les ait anticipés.

---

## Algorithme neuro-évolutif

Inspiré de **NEAT** (NeuroEvolution of Augmenting Topologies) simplifié :

1. **Population initiale** : N cerveaux avec poids aléatoires
2. **Évaluation** : chaque cerveau joue une session complète, sa fitness est calculée
3. **Sélection** : les 20% meilleurs sont conservés (élitisme)
4. **Croisement** : paires de cerveaux parents génèrent des enfants (crossover des poids)
5. **Mutation** : perturbation aléatoire de certains poids (taux de mutation configurable)
6. **Nouvelle génération** : remplacement de la population et recommencement

---

## Niveaux

L'architecture est pensée pour supporter plusieurs niveaux, chacun défini par un fichier JSON dans `levels/`. La V1 implémente uniquement le niveau medium.

```
levels/
├── medium/
│   └── level.json          # Seul niveau implémenté en V1
├── easy/                   # Réservé pour les versions futures
├── hard/                   # Réservé pour les versions futures
└── killer/                 # Réservé pour les versions futures
```

Un fichier de niveau définit la densité d'apparition des ennemis, les types présents, et les paramètres de difficulté (vitesse, fréquence de spawn, force des NN).

---

## ML5.js — contrôle par webcam

### Monter / descendre : position de la main (`ml5.handPose`)

```
main haute  →  vaisseau monte
main basse  →  vaisseau descend
```

### Boucliers : gestes configurables (`ml5.handPose` / `ml5.faceMesh`)

Chaque bouclier peut être assigné à un geste ML5 depuis le menu de configuration :
- Bouche ouverte (`ml5.faceMesh`) → bouclier temporaire
- Main fermée en poing (`ml5.handPose`) → bouclier résistant

> Activable/désactivable individuellement avant la partie. Le clavier reste disponible en fallback.

---

## Sauvegarde et compétition de cerveaux

Chaque cerveau entraîné est exporté en JSON :

```json
{
  "id": "brain_042",
  "generation": 87,
  "fitness": 3.42,
  "topology": { "inputs": 10, "hidden": [8, 8], "outputs": 2 },
  "weights": [ ... ]
}
```

En mode compétition, plusieurs cerveaux peuvent être chargés simultanément — chaque type d'ennemi utilise un cerveau différent et on observe lequel est le plus redoutable.

---

## Structure du projet

```
frequency-flight/
├── index.html
├── sketch.js               # Game loop principal (p5.js)
├── src/
│   ├── vehicle.js          # Classe Vehicle réutilisée depuis Snake Steering
│   ├── player.js           # Entité vaisseau (étend Vehicle)
│   ├── enemy.js            # Entité ennemie (étend Vehicle, steering + NN)
│   ├── nn.js               # Réseau de neurones feed-forward
│   ├── evolution.js        # Algorithme neuro-évolutif
│   ├── fitness.js          # Calcul de la fitness
│   ├── ml5controller.js    # Contrôle ML5.js (main / bouche / poing)
│   ├── levelgen.js         # Chargement et gestion des niveaux
│   └── ui.js               # Interface entraînement, curseurs, HUD, config boucliers
├── levels/
│   ├── medium/
│   │   └── level.json
│   ├── easy/
│   ├── hard/
│   └── killer/
├── brains/
└── assets/
    ├── music/              # Piste jungle produite sur FL Studio
    └── fonts/
```

---

## 🚧 NON IMPLÉMENTÉ (Prochaines itérations)

### V1 (MVP - Actuel)

Fonctionnalité | Statut | Notes
---|---|---
🎮 Gameplay basique | ✅ Implémenté | Vaisseau, 4 types d'ennemis, collisions, 2 boucliers
🧬 Réseau de neurones | ✅ Implémenté | Feed-forward simple, topology [10, 8, 8, 2]
📊 Fitness calculation | ✅ Implémenté | Impact-based, minimal MVP
🌊 Steering behaviors | ✅ Implémenté | Seek, pursue, arrive, wander, separate, avoid
📁 Level loading | ✅ Implémenté | Medium level uniquement
🎮 Clavier | ✅ Implémenté | ↑↓ mouvement, A/Z boucliers, D debug, P pause, R restart
🎥 ML5.js | ❌ NON IMPLÉMENTÉ | Requis pour webcam (main pose, face mesh)
🧠 Neuro-évolution | ❌ NON IMPLÉMENTÉ | Population loop, mutation/crossover/selection
🏆 Training mode | ❌ NON IMPLÉMENTÉ | IA joueuse, générations, sauvegarde des brains
⚙️ UI config menu | ❌ NON IMPLÉMENTÉ | Sliders, topology, mutation rate
🎵 Audio/Musique | ❌ NON IMPLÉMENTÉ | Piste jungle 174 BPM (à intégrer)
🔧 Obstacles joueur | ❌ NON IMPLÉMENTÉ | Click pour placer obstacles
📊 Graphique fitness | ❌ NON IMPLÉMENTÉ | Affichage performance ennemis
💾 Sauvegarde brains | ❌ NON IMPLÉMENTÉ | Export/import JSON
🎛️ Coordination NN | ❌ NON IMPLÉMENTÉ | Actions synchronisées multi-ennemis
🌍 Autres niveaux | ❌ NON IMPLÉMENTÉ | Easy, Hard, Killer (prévus)

### Détails des tâches futures

**ML5.js**
- Intégrer `ml5.handPose` pour altura de main → Y du vaisseau
- Intégrer `ml5.faceMesh` pour détection bouche/poing
- Menu de config pour activer/désactiver chaque geste individuellement
- Fallback clavier toujours actif

**Neuro-evolution**
- Boucle de génération : 30 ennemis par population
- Mutation gaussienne (taux : 0.1-0.5, configurable)
- Crossover 50/50 sur weights
- Elitism : top 20% conservés
- Arrêt automatique : 60% d'ennemis touchent le vaisseau sur 3 passages consécutifs

**Training mode**
- IA joueuse (vaisseau auto-piloté)
- Affichage : génération courante, fitness best/avg/worst
- Sauvegarde/charger brains depuis localStorage ou JSON

**UI améliorée**
- Sliders : topology (inputs 6-20, hidden 1-4 couches, neurons 4-32)
- Toggle : activation function (tanh / sigmoid / relu)
- Affichage real-time : fitness graph, performance stats
- Mode pause pour inspection détente

**Audio**
- Charger piste jungle 174 BPM depuis `assets/music/`
- p5.sound pour play/pause

**Obstacles joueur**
- Click sur canvas → créer obstacle (Vehicle inerte)
- Ennemis evade = steering avoid
- Destruction après N collisions ou temps

**Niveaux futurs**
- `levels/easy/` : moins d'ennemis, spawn plus lent
- `levels/hard/` : densité 2x, NN plus costaud
- `levels/killer/` : 3x density, formations coordonnées

---

## Lancer le projet

```bash
git clone https://github.com/votre-repo/frequency-flight.git
cd frequency-flight
npx serve .
# ou
python -m http.server 8080
```

Ouvrir `http://localhost:8080`.

> **MVP (Actuel)** : Clavier uniquement. ML5.js sera intégré dans V2.

---

## Détails techniques

IDE : VSCode  
Modèles IA utilisés : Claude Haiku 4.5 principalement pour le code et architecture.