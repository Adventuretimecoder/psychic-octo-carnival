import type { RecipeDef } from '../types';

type Input = [id: string, count: number];

/**
 * Recipe helper. Pass `research` to make the recipe hidden (must be discovered first).
 * Inputs are material ids or `blood:<BloodType>`.
 */
const r = (
  id: string,
  name: string,
  station: RecipeDef['station'],
  inputs: Input[],
  gold: number,
  output: RecipeDef['output'],
  description: string,
  research?: number,
): RecipeDef => ({
  id,
  name,
  station,
  inputs: inputs.map(([inputId, count]) => ({ id: inputId, count })),
  gold,
  output,
  description,
  ...(research !== undefined ? { hidden: true, research } : {}),
});

const item = (id: string, count = 1): RecipeDef['output'] => ({ item: id, count });
const affix = (id: string): RecipeDef['output'] => ({ affix: id });

export const RECIPES: RecipeDef[] = [
  // ── Alchemy: consumables ──
  r('recipe-potion-crimson', 'Crimson Potion', 'alchemy', [['swamp-root', 2], ['blood:common', 2]], 40, item('potion-crimson', 2),
    'Boil swamp root in common blood until the broth turns the colour of a fresh wound.'),
  r('recipe-potion-vitae', 'Vitae Phial', 'alchemy', [['blood:noble', 3], ['grave-dust', 1]], 60, item('potion-vitae'),
    'Seal noble blood with a pinch of grave dust so it keeps for a week.'),
  r('recipe-elixir-purity', 'Elixir of Purity', 'alchemy', [['saint-relic', 1], ['silver-ingot', 1], ['blood:holy', 2]], 300, item('elixir-purity'),
    'Steep a saint relic in silver and holy blood until the corruption separates out.'),
  r('recipe-elixir-awakening', 'Elixir of Awakening', 'alchemy', [['moonpetal', 2], ['blood:royal', 2], ['void-pearl', 1]], 350, item('elixir-awakening'),
    'Distil moonpetal and royal blood beneath a pearl of the void.'),
  r('recipe-tonic-sunward', 'Sunward Tonic', 'alchemy', [['gold-leaf', 1], ['moonpetal', 1], ['blood:holy', 1]], 120, item('tonic-sunward', 2),
    'Layer gold leaf over a moonpetal infusion and sweeten with holy blood.'),
  r('recipe-draught-fury', 'Draught of Fury', 'alchemy', [['demon-horn', 1], ['cinder-heart', 1], ['blood:beast', 2]], 220, item('draught-fury'),
    'Grind a demon horn over a cinder heart and quench it in beast blood.'),
  r('recipe-salt-of-warding', 'Salt of Warding', 'alchemy', [['silver-ingot', 1], ['blood:holy', 1]], 90, item('salt-of-warding', 3),
    'Burn silver and holy blood to a white salt.'),
  r('recipe-tonic-iron-skin', 'Iron-Skin Tonic', 'alchemy', [['iron-ore', 2], ['obsidian', 1], ['blood:common', 1]], 70, item('tonic-iron-skin', 2),
    'Crush iron ore and obsidian into common blood and let it harden overnight.'),
  r('recipe-sanguine-broth', 'Sanguine Broth', 'alchemy', [['wolf-pelt', 1], ['swamp-root', 1], ['blood:common', 2]], 15, item('sanguine-broth', 3),
    'Simmer a wolf pelt and swamp root in common blood until it thickens.'),
  r('recipe-hunter-draught', "Hunter's Draught", 'alchemy', [['nightshade', 1], ['venom-gland', 1], ['blood:beast', 2]], 180, item('hunter-draught'),
    'Macerate nightshade and a venom gland in beast blood for a sharp, clear draught.'),

  // ── Alchemy: hidden ──
  r('recipe-elixir-of-ages', 'Elixir of Ages', 'alchemy', [['sand-of-hours', 1], ['moonpetal', 1], ['blood:ancient', 3]], 500, item('elixir-of-ages'),
    'Let the sand of hours run through ancient blood until the vial stops aging.', 60),
  r('recipe-ichor-distillate', 'Ichor Distillate', 'alchemy', [['primordial-ichor', 1], ['blood:corrupted', 3], ['cursed-sigil', 1]], 420, item('ichor-distillate'),
    'Distil primordial ichor with corrupted blood under a cursed sigil.', 45),
  r('recipe-mirror-draught', 'Mirror Draught', 'alchemy', [['mirror-shard', 2], ['wraith-silk', 1], ['blood:spectral', 2]], 380, item('mirror-draught'),
    'Dissolve mirror shards and wraith silk in spectral blood; the surface must not reflect you.', 35),

  // ── Forge: weapons and armor ──
  r('recipe-ghoulfang-claws', 'Ghoulfang Claws', 'forge', [['beast-fang', 4], ['iron-ore', 3], ['blood:beast', 2]], 120, item('ghoulfang-claws'),
    'Set beast fangs into iron claws and quench them in beast blood.'),
  r('recipe-bloody-sword', 'Bloody Sword', 'forge', [['iron-ore', 4], ['blood:noble', 2], ['bone-shard', 2]], 150, item('bloody-sword'),
    'Fold noble blood and bone shards into a sword fuller.'),
  r('recipe-ember-staff', 'Ember Staff', 'forge', [['ash-ember', 3], ['iron-ore', 1], ['blood:magical', 2]], 160, item('ember-staff'),
    'Bind ash embers into an oak staff with a ferrule of iron.'),
  r('recipe-barbed-lash', 'Barbed Lash', 'forge', [['iron-ore', 2], ['beast-fang', 3], ['blood:beast', 1]], 110, item('barbed-lash'),
    'Knot beast fangs into a braided lash and set it with iron barbs.'),
  r('recipe-ironbound-mail', 'Ironbound Mail', 'forge', [['iron-ore', 6], ['silver-ingot', 1], ['blood:common', 1]], 140, item('ironbound-mail'),
    'Rivet iron rings with a silver pin and quench them in common blood.'),
  r('recipe-warden-scale', 'Warden Scale Mail', 'forge', [['dragon-scale', 2], ['iron-ore', 3], ['frost-shard', 1]], 340, item('warden-scale'),
    'Harden wyrm scales in salt and frost, then lace them onto iron.'),

  // ── Forge: hidden ──
  r('recipe-starforged-blade', 'Starforged Blade', 'forge', [['star-iron', 4], ['storm-glass', 1], ['blood:primordial', 1]], 800, item('starforged-blade'),
    'Hammer star iron around a storm-glass core while it is still hot from the sky.', 80),
  r('recipe-saints-bane', "Saint's Bane", 'forge', [['saint-relic', 2], ['silver-ingot', 3], ['blood:holy', 3]], 700, item("saints-bane"),
    'Fuse saint relics into a greatsword with silver and holy blood. The smith must not pray.', 75),
  r('recipe-reaper-of-the-hollow', 'Reaper of the Hollow', 'forge', [['bone-shard', 6], ['soul-gem', 1], ['blood:ancient', 2]], 600, item('reaper-of-the-hollow'),
    'Forge a scythe of bone around a soul gem that still remembers the grave.', 55),
  r('recipe-judgement-of-the-dawn', 'Judgement of the Dawn', 'forge', [['saint-relic', 3], ['silver-ingot', 4], ['blood:holy', 2]], 800, item('judgement-of-the-dawn'),
    'Cast the crossbow at the first light of dawn, using only relics the Order has surrendered.', 70),
  r('recipe-nightwarden-cuirass', 'Nightwarden Cuirass', 'forge', [['cinder-heart', 1], ['obsidian', 3], ['cursed-sigil', 2]], 500, item('nightwarden-cuirass'),
    'Beat black steel around a cinder heart and seal it with cursed sigils.', 40),
  r('recipe-eclipsed-shroud', 'Eclipsed Shroud', 'forge', [['wraith-silk', 4], ['sand-of-hours', 1], ['raven-feather', 3]], 650, item('eclipsed-shroud'),
    'Weave wraith silk and raven feathers during a total eclipse; the sand keeps the hour still.', 50),

  // ── Enchant: affixes ──
  r('recipe-enchant-keen', 'Keen Edge', 'enchant', [['iron-ore', 2], ['blood:common', 1]], 40, affix('keen'),
    'Whet an edge with iron dust and a drop of common blood.'),
  r('recipe-enchant-vampiric', 'Vampiric Ward', 'enchant', [['blood:noble', 3], ['nightshade', 1]], 120, affix('vampiric'),
    'Steep the item in noble blood and nightshade so it remembers the taste of victims.'),
  r('recipe-enchant-swift', 'Swift Thread', 'enchant', [['wraith-silk', 1], ['blood:magical', 1]], 90, affix('swift'),
    'Thread the item with wraith silk and magical blood for speed.'),
  r('recipe-enchant-warded', 'Warded Mark', 'enchant', [['silver-ingot', 2], ['blood:holy', 1]], 80, affix('warded'),
    'Engrave a silver ward and anoint it with holy blood.'),
  r('recipe-enchant-sanguine', 'Sanguine Veins', 'enchant', [['blood-ruby', 1], ['blood:royal', 2]], 200, affix('sanguine'),
    'Inlay a blood ruby beneath the surface and feed it royal blood.'),
  r('recipe-enchant-umbral', 'Umbral Veil', 'enchant', [['wraith-silk', 2], ['ectoplasm', 1], ['blood:spectral', 1]], 150, affix('umbral'),
    'Cloud the item in ectoplasm and spectral blood until it fades from sight.'),
  r('recipe-enchant-ember', 'Ember Brand', 'enchant', [['ash-ember', 2], ['blood:magical', 1]], 90, affix('ember'),
    'Burn an ember brand into the item with magical blood as the quench.'),
  r('recipe-enchant-rime', 'Rime Frost', 'enchant', [['frost-shard', 2], ['blood:ancient', 1]], 130, affix('rime'),
    'Rime the item with frost shards and ancient blood.'),
  r('recipe-enchant-tempest', 'Tempest Charge', 'enchant', [['storm-glass', 1], ['blood:magical', 2]], 200, affix('tempest'),
    'Charge the item with storm glass until it crackles in the hand.'),
  r('recipe-enchant-blessed-bane', 'Blessed Bane', 'enchant', [['saint-relic', 1], ['blood:holy', 2], ['silver-ingot', 1]], 260, affix('blessed-bane'),
    'Consecrate the item in holy blood so that it wounds only the unholy.'),

  // ── Runes ──
  r('recipe-rune-might', 'Rune of Might', 'runes', [['iron-ore', 2], ['blood:beast', 2], ['demon-horn', 1]], 100, affix('rune-might'),
    'Carve might into the item with a demon horn and beast blood.'),
  r('recipe-rune-haste', 'Rune of Haste', 'runes', [['raven-feather', 2], ['spider-silk', 2], ['blood:common', 2]], 90, affix('rune-haste'),
    'Inscribe haste with raven feathers and spider silk.'),
  r('recipe-rune-ward', 'Rune of Ward', 'runes', [['silver-ingot', 1], ['blood:royal', 1]], 120, affix('rune-ward'),
    'Engrave a ward in silver and royal blood.'),
  r('recipe-rune-hunger', 'Rune of Hunger', 'runes', [['cursed-sigil', 1], ['bone-shard', 2], ['blood:corrupted', 2]], 110, affix('rune-hunger'),
    'Carve a hungry rune with a cursed sigil and corrupted blood.'),

  // ── Restoration: boss relics and hidden relics ──
  r('recipe-relic-crimson-saint', "Aldric's Reliquary", 'restoration', [['saint-relic', 4], ['gold-leaf', 3], ['blood:holy', 4], ['primordial-ichor', 1]], 800, item('relic-crimson-saint'),
    'Restore the reliquary of Saint Aldric from the fragments the Order has guarded for a century.'),
  r('recipe-relic-pale-huntress', 'Moonlit Quiver Charm', 'restoration', [['moonpetal', 4], ['raven-feather', 3], ['blood:royal', 3], ['void-pearl', 1]], 700, item('relic-pale-huntress'),
    'Restore the quiver charm of the Pale Huntress under a full moon.'),
  r('recipe-relic-star-eater', 'Fragment of the Eaten Sky', 'restoration', [['star-iron', 4], ['void-pearl', 2], ['blood:primordial', 2], ['mirror-shard', 2]], 800, item('relic-star-eater'),
    'Restore the sky-shard the Star-Eater dropped, using iron forged under a meteor.'),
  r('recipe-soul-lantern', 'Soul Lantern', 'restoration', [['soul-gem', 2], ['ectoplasm', 3], ['blood:spectral', 3], ['gold-leaf', 2]], 600, item('soul-lantern'),
    'Bottle the light of drowned souls inside a lantern of gold leaf.', 70),
  r('recipe-stormbell-tongue', 'Stormbell Tongue', 'restoration', [['storm-glass', 2], ['iron-ore', 3], ['blood:magical', 2]], 350, item('stormbell-tongue'),
    'Cast a new clapper from storm glass and iron, rung in magical blood.', 30),
  r('recipe-hourglass-of-the-hollow', 'Hourglass of the Hollow', 'restoration', [['sand-of-hours', 2], ['grave-dust', 5], ['blood:ancient', 2]], 450, item('hourglass-of-the-hollow'),
    'Refill a hollow hourglass with grave dust and sand that has already run its course.', 40),

  // ── Bloodlab ──
  r('recipe-bloodlab-potency-noble', 'Noble Potency Culture', 'bloodlab', [['blood:noble', 4], ['blood-ruby', 1]], 100, { potency: 5 },
    'Culture noble blood around a blood ruby to strengthen the gene line.'),
  r('recipe-bloodlab-potency-royal', 'Royal Potency Culture', 'bloodlab', [['blood:royal', 3], ['blood-ruby', 1], ['moonpetal', 1]], 250, { potency: 12 },
    'Feed royal blood and moonpetal to a ruby culture until the gene line sings.'),
  r('recipe-bloodlab-purity-holy', 'Holy Purification', 'bloodlab', [['blood:holy', 3], ['saint-relic', 1]], 300, { purity: 10 },
    'Filter holy blood through a saint relic to strip the corruption away.'),
  r('recipe-bloodlab-purity-primordial', 'Primordial Distillation', 'bloodlab', [['blood:primordial', 2], ['void-pearl', 1], ['saint-relic', 1]], 600, { purity: 20 },
    'Distil the first blood with a void pearl and a saint relic until it runs clear.'),
];
