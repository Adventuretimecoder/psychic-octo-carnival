/** Lookup tables over all content. */
import type { BossDef, CreatureDef, HouseDef, ItemTemplate, MaterialDef, QuestDef, RecipeDef, RegionDef, SecretDef } from '../types';
import { ABILITIES, ABILITY_BY_ID } from './abilities';
import { BLOODLINES, BLOODLINE_BY_ID, FUSIONS, MUTATIONS, MUTATION_BY_ID, STAGE_NAMES } from './bloodlines';
import { BOSSES } from './bosses';
import { CREATURES } from './creatures';
import { FORMS, FORM_BY_ID } from './forms';
import { HOUSES } from './houses';
import { ITEMS } from './items';
import { MATERIALS } from './materials';
import { QUESTS } from './quests';
import { PATHS, RANKS } from './ranks';
import { RECIPES } from './recipes';
import { REGIONS } from './regions';
import { SECRETS } from './secrets';

const byId = <T extends { id: string }>(arr: T[]) => Object.fromEntries(arr.map((x) => [x.id, x])) as Record<string, T>;

export const CREATURE_BY_ID: Record<string, CreatureDef> = byId(CREATURES);
export const BOSS_BY_ID: Record<string, BossDef> = byId(BOSSES);
export const HOUSE_BY_ID: Record<string, HouseDef> = byId(HOUSES);
export const ITEM_BY_ID: Record<string, ItemTemplate> = byId(ITEMS);
export const MATERIAL_BY_ID: Record<string, MaterialDef> = byId(MATERIALS);
export const QUEST_BY_ID: Record<string, QuestDef> = byId(QUESTS);
export const RECIPE_BY_ID: Record<string, RecipeDef> = byId(RECIPES);
export const REGION_BY_ID: Record<string, RegionDef> = byId(REGIONS);
export const SECRET_BY_ID: Record<string, SecretDef> = byId(SECRETS);
export const PATH_BY_ID = byId(PATHS);

/** House signature abilities are folded into the ability table. */
for (const h of HOUSES) ABILITY_BY_ID[h.signature.id] = h.signature;
for (const h of HOUSES) ITEM_BY_ID[h.uniqueItem.id] = h.uniqueItem;

export {
  ABILITIES, ABILITY_BY_ID, BLOODLINES, BLOODLINE_BY_ID, FUSIONS, MUTATIONS, MUTATION_BY_ID, STAGE_NAMES, BOSSES, CREATURES,
  FORMS, FORM_BY_ID, HOUSES, ITEMS, MATERIALS, QUESTS, PATHS, RANKS, RECIPES, REGIONS, SECRETS,
};
