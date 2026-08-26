
# GLITCH WORLD (Web Edition)

A 2D Adventure + Action + Puzzle + Obstacles browser game built with **HTML5 Canvas**, **CSS3**, **JavaScript (ES6+)**, **Web Audio API**, and **LocalStorage**.

Developed by: **ROHITH & SUNRUTHI**

---

## Quick Start (How to Run)

The game is 100% self-contained and requires **no internet connection**, **no database servers**, and **no build steps**.

### Option A: Using Python local server (Recommended for local audio decoding)
```bash
cd GLITCH_WORLD_WEB
python -m http.server 8080
```
Then open [http://localhost:8080](http://localhost:8080) in your web browser (Chrome, Edge, Firefox, Safari).

### Option B: Using Node http-server / npx
```bash
npx -y serve GLITCH_WORLD_WEB
```

### Option C: Direct Browser Open
Simply double-click or open `index.html` directly in any modern web browser.

---

## Game Overview & Features

- **Authentication & Accounts**: LocalStorage-backed authentication supporting instant sign-in, user registration, validation, and session management. Default demo accounts (`player`, `rohith`, `sunruthi`) are ready out-of-the-box.
- **Home Screen & Live Character Preview**: Cyber sky backdrop, glowing title with glitch scanlines, and an interactive central canvas preview of the player with animated idle breathing.
- **Glitch Mechanic (Core Ability)**: Press **G** (or touch GLITCH button) to activate the Glitch Energy field. Allows player to phase through glitchable walls, reveal secret hidden platforms, bypass lasers and electric floors, and slow down enemy time within the field.
- **3 Dynamic Levels**:
  - **Level 1 (Adventure Forest)**: Platforming challenge, moving platforms, hidden underground coin/health tunnel, spikes, fire traps, glitchable wall, Key hunt, and animated exit door.
  - **Level 2 (Military Base)**: Gun combat enabled, AI patrolling soldiers, switch & security gate puzzle, laser barriers, explosive barrels, rifle weapon upgrade pickup, and military key.
  - **Level 3 (Dark Fortress)**: Dynamic flashlight vignette lighting, rotating laser hazards, electric floors, crushing moving walls, 2-switch treasure room, drones, snipers, heavy gunners, shield soldiers, sealed arena, and the **Fortress Commander Mini-Boss** fight.
- **Mini-Boss Fight**: 600 Health, machine-gun bursts, lobbed bouncing grenades with AoE explosions, dash charge attack, damage-mitigating energy shield mode, and Phase 2 **Rage Mode** (<30% health: flaming aura, increased speed, hyper-aggressive attack cadence). Defeat drops the **Master Key**!
- **Weapons & Projectiles**: Pistol (12 mag, reliable accuracy) and unlockable Rifle (24 mag, rapid fire) switchable with `1` / `2`. Real reload times and animations.
- **AI Finite State Machine**: Patrol $\rightarrow$ Alert (vision cone raycasting) $\rightarrow$ Chase $\rightarrow$ Attack $\rightarrow$ Cover (retreat and duck when wounded) $\rightarrow$ Search. Alerting one soldier alerts nearby comrades.
- **Audio Engine**: 7 BGM tracks (`menu_music`, `level1_music`, `level2_music`, `level3_music`, `boss_music`, `victory`, `game_over`) + 11 SFX (`button_click`, `jump`, `footstep`, `gunshot`, `reload`, `explosion`, `coin`, `enemy_hit`, `player_hurt`, `key_collect`, `door_open`), backed by a procedural Web Audio API synthesizer fallback.
- **Checkpoints & Run History**: Checkpoints auto-save mid-level progress. Every completed victory or defeat run is saved to LocalStorage with date, time, level reached, score, coins, enemies defeated, and total play time. Searchable and clearable.
- **Responsive Controls**: Full desktop keyboard/mouse controls + responsive on-screen virtual joystick and touch action buttons for tablets and mobile phones.

---

## Controls

### Desktop (Keyboard & Mouse)
| Key / Input | Action |
| :--- | :--- |
| **A / D** or **&larr; / &rarr;** | Move Left / Right |
| **W / Up / Space** | Jump (Press again in mid-air to Double Jump) |
| **Left Shift** | Sprint / Run |
| **Left Click** | Aim and Shoot Weapon (Level 2+) |
| **G** | Toggle Glitch Ability (Phase walls & slow time) |
| **R** | Reload Weapon |
| **C / Left Ctrl** | Crouch / Dodge Roll |
| **1 / 2** | Switch Weapon (Pistol / Rifle) |
| **E** | Interact / Activate Switch |
| **ESC** | Pause / Resume Mission |

### Mobile (Touch Controls)
| Button | Action |
| :--- | :--- |
| **&larr; / &rarr;** | Virtual D-Pad Movement |
| **JUMP** | Jump / Double Jump |
| **FIRE** | Shoot in facing direction |
| **GLITCH** | Toggle Glitch Ability |
| **RELOAD** | Reload Weapon |
| **DODGE** | Dodge Roll with invulnerability |
| **⏸** | Pause Game |

---

## Project Structure

```
GLITCH_WORLD_WEB/
├── index.html
├── css/
│   ├── style.css
│   ├── game.css
│   └── animations.css
├── js/
│   ├── storage.js
│   ├── audio.js
│   ├── particles.js
│   ├── collision.js
│   ├── glitch.js
│   ├── weapon.js
│   ├── player.js
│   ├── enemy.js
│   ├── boss.js
│   ├── levels.js
│   ├── controls.js
│   ├── ui.js
│   ├── auth.js
│   ├── home.js
│   ├── settings.js
│   ├── about.js
│   ├── history.js
│   ├── game.js
│   └── main.js
├── assets/
│   ├── images/
│   │   ├── player/
│   │   ├── enemies/
│   │   ├── boss/
│   │   ├── levels/
│   │   ├── obstacles/
│   │   ├── collectibles/
│   │   └── ui/
│   ├── sounds/
│   └── fonts/
└── README.md
```
