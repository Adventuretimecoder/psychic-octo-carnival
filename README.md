# Sanguinis — The Age of Blood

A gothic vampire **dynasty action-RPG** set in the original world of **Eryndor**, 1847 years after the Sundering. Hunt through procedurally generated dungeons in real time, breed bloodlines across generations of heirs, and scheme your way onto the Crimson Throne.

Built mobile-first: it runs in any phone browser, can be added to the home screen, and is packaged as an Android APK by CI.

## Why this genre

The brief asks for houses, bloodlines, inheritance, evolution, politics, territories, dungeons and bosses to work *together*. A **dynasty roguelite with a court-strategy layer** is the structure where they all feed one another:

| You do this… | …which feeds this |
|---|---|
| Hunt dungeons in real-time combat | XP, mastery, loot, materials, blood of many types |
| Feed on weakened foes | Blood reserves, resonance buffs, bloodline potency, purity/corruption |
| Raise bloodlines through 5 stages | New abilities, transformations, fusions, hidden powers |
| Court the 20 houses | Alliances, stipends, secrets, Council seats, **marriages** |
| Marry an heir into a house | The next generation inherits that house's bloodlines, passive, weakness and signature power |
| Slay a region's lord | The right to claim the region → nightly income, bonuses, buildings |
| Heirs die for good | Succession: choose among children whose genomes mix both parents, with mutations |

It is single-player with persistent saves, so no backend is needed. That keeps it free to host and playable offline on a phone.

## How to play

**Play now:** open the published web link, or build locally (below).

- **Hunt** (centre button): pick a region on the map of Eryndor. Each region has 3–5 floors; the last is a boss lair. Between floors, descend or return home to bank your loot. Dying loses unbanked items and costs a *vitae*; at zero vitae the heir meets the **True Death** and succession begins.
- **Hunger:** blood drains over time and powers your abilities. At zero you starve, then frenzy (stronger, but burning HP). Feed on foes below ~25% HP (they show a blood-drop marker). Each blood type grants a different resonance buff.
- **Sunlight** pools burn vampires. Some bosses sweep the room with light.
- **Haven:** claim quest rewards, talk to and gift your six household NPCs, use the laboratory and Night Market, rest to pass a night.
- **Heir:** attributes, bloodline genome & stages, ability trees (9 schools) with mastery-based evolution, armory, lineage.
- **Court:** gift, petition, spy, blackmail, denounce, ally, marry; sit on the Night Council and pass decrees; manage domains.
- **Lore:** quest journal, 60-entry codex (many sealed until discovered), bestiary, timeline, achievements & titles.

**Touch controls:** left thumb = move (floating stick); big button = attack (hold; auto-aims); ring of four = abilities; fangs = feed; mask = transform; small buttons = belt potions.
**Keyboard:** WASD move · click/J attack · Space dash · Q E R F abilities · V feed · T transform · 1 2 potions · Esc pause.

## What's in the game

| System | Content |
|---|---|
| Noble houses | 20, each with crest, colours, motto, founder, history, traditions, hierarchy, bloodlines, signature ability (3 evolution tiers), passive, weakness, territory, alliances, rivals, secret, legends, ritual, 3-step questline, unique item |
| Bloodlines | 20, five stages each (Latent → Apotheosis), dominance, rarity, resonance, weakness, incompatibilities, hidden ability; **10 fusions**; **18 mutations** |
| Inheritance | Dominant / recessive / dormant genes, hybrid vigour, incompatibility instability, spontaneous mutations (the only source of the rarest lines), marriage compatibility preview |
| Ranks | 11 (Newly Turned → Primordial), each with an advancement trial, privileges, title, bonuses; 4 specialization Paths |
| Abilities | 100+ across Blood, Shadow, Necromancy, Elemental, Mind, Body and Forbidden schools, bloodline-exclusive, fusion and hidden (discovered) powers; mastery evolution chains; bloodline variants |
| Transformations | 12 forms (Human Disguise → Primordial), each with upkeep, mods, drawback and requirements |
| Bestiary | 50 creatures over 10 AI behaviours, 12 multi-phase bosses (13 attack patterns) |
| World | 12 regions, 36 secrets (lore pages, sanctuaries, hidden abilities/recipes/quests), 55-event timeline, 60 codex entries, 12 dynamic world events |
| Items | 105 templates + random affixes, 8 rarities, 2 sets, boss relics, artifacts, upgrades (+10), enchanting, runes, dismantling |
| Crafting | 49 recipes over 6 stations, experimentation-based discovery, research, blood distillation |
| Quests | 85 + 20 house quests: main story in 4 acts with branching choices, political, exploration, dungeon, legendary, personal, hidden, bloodline trials, repeatables |
| Economy | Supply-and-demand market, event-driven prices, banking (deposits & loans), nightly auctions, territory income |
| Politics | Standing, power, espionage, blackmail, denunciation, alliances, marriages, Night Council seats, 6 decrees incl. claiming the Throne, house AI feuds & raids |
| Achievements | 59 with titles |

## Architecture

```
src/game/types.ts          Data schemas everything is authored against
src/game/data/             All content (houses, bloodlines, abilities, creatures, …) + registry of IDs
src/game/systems/          Pure game logic — stats, genetics, progression, quests, world (politics,
                           territory, economy), crafting, loot, run handling, saves
src/game/engine/           Canvas action engine: dungeon generation, procedural art & lighting,
                           synthesized audio, the Hunt (combat, AI, bosses, HUD, touch controls)
src/ui/                    React + Tailwind interface
tests/                     Vitest suite for the core mechanics and content integrity
```

- **Stack:** TypeScript, React 19, Tailwind 4, Vite, Vitest; Canvas 2D for the action layer; Web Audio for sound and music; Capacitor for Android.
- **Art & audio** are generated procedurally at runtime (characters, tiles, lighting, particles, music, SFX). Icons are from game-icons.net (CC BY 3.0); fonts are Cinzel, Cormorant Garamond and IM Fell English (OFL).
- **Saves** autosave to browser storage (3 slots) with export/import codes for backups and moving between devices.

## Build & run

```bash
npm install
npm run dev            # local dev server
npm test               # mechanics tests
npm run build          # production build → dist/
npm run build:single   # one self-contained HTML file → dist-single/
```

### Android APK
Every push runs `.github/workflows/android.yml`, which builds the web game, wraps it with Capacitor and publishes **Sanguinis.apk** to the repo's **Releases** page. Open that page on your phone, download the APK and install it (allow "Install unknown apps" for your browser when asked).

### Web hosting (GitHub Pages)
`.github/workflows/pages.yml` deploys `dist/` to GitHub Pages. Enable it once in **Settings → Pages → Source: GitHub Actions**.

## Scope notes

- **No multiplayer, accounts or admin/moderation tools.** The brief makes those conditional on persistent online accounts; this is a single-player game, so they would be dead weight. The `systems/` layer is pure and serializable, so a server-authoritative backend (e.g. Node + PostgreSQL on Render/Fly free tiers) could be added later around it.
- **Player-created houses** are your dynasty itself: crest, colours, motto, lineage, archives, succession and alliances are all tracked. Splitting or merging *your own* house is not implemented; AI houses can be exiled through politics.
- Balance is a first pass; expect tuning.
