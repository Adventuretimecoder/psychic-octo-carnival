import type { AchievementDef } from '../types';

type Cat = AchievementDef['category'];
const a = (id: string, name: string, category: Cat, description: string, counter: string, target: number, prestige: number, extra: { title?: string; hidden?: boolean } = {}): AchievementDef =>
  ({ id: `ach-${id}`, name, category, description, counter, target, prestige, ...extra });

export const ACHIEVEMENTS: AchievementDef[] = [
  // exploration
  a('first-descent', 'First Descent', 'exploration', 'Clear 5 dungeon floors.', 'floors', 5, 5),
  a('deep-delver', 'Deep Delver', 'exploration', 'Clear 50 dungeon floors.', 'floors', 50, 15),
  a('abyss-walker', 'Abyss Walker', 'exploration', 'Clear 250 dungeon floors.', 'floors', 250, 35, { title: 'Abyss Walker' }),
  a('secret-seeker', 'Secret Seeker', 'exploration', 'Uncover 10 secrets.', 'secrets', 10, 10),
  a('keeper-of-secrets', 'Keeper of Secrets', 'exploration', 'Uncover 40 secrets.', 'secrets', 40, 30, { title: 'Keeper of Secrets' }),
  a('eternal-dusk', 'Eternal Dusk', 'exploration', 'Survive 1000 nights.', 'nights', 1000, 50, { title: 'Child of Dusk' }),
  // combat
  a('first-blood', 'First Blood', 'combat', 'Slay 25 enemies.', 'kills', 25, 5),
  a('slaughterer', 'Night\'s Edge', 'combat', 'Slay 1000 enemies.', 'kills', 1000, 25),
  a('legion-breaker', 'Legion Breaker', 'combat', 'Slay 10000 enemies.', 'kills', 10000, 60, { title: 'Legion Breaker' }),
  a('gravewalker', 'Gravewalker', 'combat', 'Slay 200 undead.', 'kills:undead', 200, 15),
  a('exorcist', 'Exorcist', 'combat', 'Banish 150 spirits.', 'kills:spirit', 150, 15),
  a('demon-hunter', 'Demon Hunter', 'combat', 'Slay 100 demons.', 'kills:demon', 100, 20),
  a('kinslayer', 'Kinslayer', 'combat', 'Slay 100 vampires.', 'kills:vampire', 100, 25, { title: 'Kinslayer', hidden: true }),
  a('dragon-slayer', 'Dragonslayer', 'combat', 'Slay 10 dragons.', 'kills:dragon', 10, 30),
  a('dawn-breaker', 'Dawnbreaker', 'combat', 'Slay 50 celestials.', 'kills:celestial', 50, 25),
  a('boss-hunter', 'Boss Hunter', 'combat', 'Defeat 6 bosses.', 'bosses', 6, 20),
  a('lord-of-shadows', 'Lord of Shadows', 'combat', 'Defeat 100 bosses.', 'bosses', 100, 70, { title: 'Lord of Shadows' }),
  a('mother-slain', 'Mother Slain', 'combat', 'Defeat the Mother of Wolves.', 'boss:mother-of-wolves', 1, 10),
  a('crown-broken', 'Hollow Crown', 'combat', 'Defeat the Hollow King.', 'boss:hollow-king', 1, 10),
  a('saint-fallen', 'Fall of the Saint', 'combat', 'Defeat the Crimson Saint.', 'boss:crimson-saint', 1, 20),
  a('betrayer-ended', 'Betrayer Ended', 'combat', 'Defeat the First Betrayer.', 'boss:first-betrayer', 1, 35, { hidden: true }),
  a('star-eater-down', 'Star-Eater Down', 'combat', 'Defeat the Star-Eater.', 'boss:star-eater', 1, 40),
  a('name-reclaimed', 'Name Reclaimed', 'combat', 'Defeat the Forgotten Progenitor.', 'boss:forgotten-progenitor', 1, 60, { hidden: true }),
  a('flawless', 'Flawless Hunt', 'combat', 'Defeat 5 bosses without taking damage.', 'perfect-boss', 5, 40),
  a('combo-master', 'Combo Master', 'combat', 'Reach a 50-hit combo.', 'max-combo', 50, 20),
  // bloodline
  a('first-feed', 'First Taste', 'bloodline', 'Feed 10 times.', 'feeds', 10, 5),
  a('hundred-feeds', 'Practiced Thirst', 'bloodline', 'Feed 300 times.', 'feeds', 300, 15),
  a('noble-palate', 'Noble Palate', 'bloodline', 'Feed on noble blood 25 times.', 'feed:noble', 25, 15),
  a('royal-thirst', 'Royal Thirst', 'bloodline', 'Feed on royal blood 10 times.', 'feed:royal', 10, 25),
  a('ancient-cup', 'Ancient Cup', 'bloodline', 'Feed on ancient blood 15 times.', 'feed:ancient', 15, 25),
  a('holy-sin', 'Sacrilege', 'bloodline', 'Feed on holy blood 10 times.', 'feed:holy', 10, 25, { hidden: true }),
  a('shape-shifter', 'Shape-Shifter', 'bloodline', 'Transform 100 times.', 'transforms', 100, 15),
  a('fusion-adept', 'Fusion Adept', 'bloodline', 'Perform 5 bloodline fusions.', 'fusions', 5, 25),
  a('mutated', 'Fruit of Mutation', 'bloodline', 'Gain 5 mutations.', 'mutations', 5, 25),
  a('awakened', 'Awakened', 'bloodline', 'Complete 3 awakenings.', 'awakenings', 3, 35),
  a('bloodline-prodigy', 'Bloodline Prodigy', 'bloodline', 'Complete 20 awakenings.', 'awakenings', 20, 80, { title: 'Bloodline Prodigy' }),
  a('last-primordial', 'Last of the Primordial', 'bloodline', 'Feed on primordial blood 25 times.', 'feed:primordial', 25, 90, { title: 'Last of the Primordial', hidden: true }),
  // family
  a('dynasty', 'Dynasty', 'family', 'Raise 10 heirs.', 'heirs', 10, 30),
  a('firstborn-heir', 'Firstborn Heir', 'family', 'Raise 40 heirs across a dynasty.', 'heirs', 40, 100, { title: 'Firstborn Heir', hidden: true }),
  a('first-grave', 'First Grave', 'family', 'Suffer a true death.', 'true-deaths', 1, 5),
  a('mourners-line', 'Mourner\'s Line', 'family', 'Suffer 10 true deaths.', 'true-deaths', 10, 15),
  a('the-undying', 'The Undying', 'family', 'Play 1500 nights without a single true death.', 'nights', 1500, 75, { title: 'The Undying', hidden: true }),
  a('sunburnt', 'Sunburnt', 'family', 'Die to the sun 5 times.', 'sun-deaths', 5, 10, { hidden: true }),
  a('bloodmad', 'Bloodmad', 'family', 'Fall into frenzy 25 times.', 'frenzies', 25, 15, { hidden: true }),
  // politics
  a('first-oath', 'First Oath', 'politics', 'Forge an alliance.', 'alliances', 1, 5),
  a('web-of-allies', 'Web of Allies', 'politics', 'Hold 6 alliances.', 'alliances', 6, 30),
  a('wedded-houses', 'Wedded Houses', 'politics', 'Arrange 3 marriages.', 'marriages', 3, 15),
  a('landholder', 'Landholder', 'politics', 'Own 3 regions.', 'regions-owned', 3, 25),
  a('crimson-sovereign', 'Crimson Sovereign', 'politics', 'Own 12 regions.', 'regions-owned', 12, 100, { title: 'Crimson Sovereign' }),
  a('council-seat', 'Seat of the Seven', 'politics', 'Win a Night Council seat.', 'council-seat', 1, 40, { title: 'Councillor' }),
  a('lawgiver', 'Lawgiver', 'politics', 'Pass 15 decrees.', 'decrees', 15, 20),
  a('grave-sovereign', 'Grave Sovereign', 'politics', 'Reach the highest rank.', 'rank-max', 1, 85, { title: 'Grave Sovereign' }),
  // crafting, collection, legendary, progression
  a('apprentice-alchemist', 'Apprentice Alchemist', 'crafting', 'Craft 10 items.', 'crafts', 10, 5),
  a('master-alchemist', 'Master Alchemist', 'crafting', 'Craft 200 items.', 'crafts', 200, 30, { title: 'Master Alchemist' }),
  a('rich', 'Gilded Coffers', 'collection', 'Earn 100000 crowns.', 'gold-earned', 100000, 20),
  a('codex-reader', 'Codex Reader', 'collection', 'Complete 50 codex entries.', 'codex', 50, 25),
  a('bestiarist', 'Bestiarist', 'collection', 'Record 60 creatures in the bestiary.', 'bestiary', 60, 25),
  a('legend-wielder', 'Legend Wielder', 'legendary', 'Obtain 5 legendary items.', 'legendary-items', 5, 40, { hidden: true }),
  a('quest-keeper', 'Quest Keeper', 'progression', 'Complete 30 quests.', 'quests', 30, 25),
];
