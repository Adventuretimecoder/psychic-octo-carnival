import type { SecretDef, BloodlineId } from '../types';

type G = NonNullable<SecretDef['grants']>;
const s = (id: string, name: string, kind: SecretDef['kind'], text: string, grants?: G): SecretDef =>
  ({ id, name, kind, text, ...(grants ? { grants } : {}) });
const sanct = (id: string, name: string, text: string, bloodline: BloodlineId, amount: number) =>
  s(id, name, 'sanctuary', text, { potency: { bloodline, amount } });

export const SECRETS: SecretDef[] = [
  // ───── Hollow Wood ─────
  s('sec-wolf-oath', 'The Wolf Oath', 'ability',
    'A pelt-bound oath is carved into the roots of the oldest oak, sworn between a Wolfkin matriarch and a wandering vampire lord. The words rise in your throat unbidden. Your teeth feel longer.',
    { ability: 'secret-moonfang' }),
  s('sec-wolfkin-tally', 'Wolfkin Tally-Stick', 'lore',
    'A notched stick records every Tithe-wagon the pack let through, and every one it did not. The last forty notches are all for the Warm, and none for the Crown. Someone has scratched beneath: "The Throne is not collecting. Why?"'),
  s('sec-hunters-journal', 'Scout\'s Journal', 'lore',
    'A Dawn scout\'s journal, last entry torn mid-sentence. "They say the Radiant Lady was once a woman named Seliene who drank the Grail and then repented. If so, we are hunting her children. I have not told Brother Hale."',
    { item: 'potion-crimson' }),

  // ───── Ossuary Deep ─────
  s('sec-ossuary-hymn', 'The Ossuary Hymn', 'ability',
    'Behind a wall of stacked skulls, a choir-niche holds a chant etched on a single femur. When you read it, the bones in the walls begin to hum back. They know the next verse.',
    { ability: 'secret-choir-of-bones' }),
  s('sec-nameless-niche', 'The Nameless Niche', 'quest',
    'A niche stripped of every inscription, its occupant\'s bones laid out as if sleeping. A stone tablet beneath his skull reads only: "Find the one who was first before the First." The dust whispers like a task.',
    { quest: 'hq-name-of-the-first' }),
  s('sec-pale-mothers-epitaph', 'Epitaph of the Pale Mother', 'lore',
    'Morwen\'s own epitaph, chiselled before the Sundering: "I drank and did not forget. I buried and did not weep. If the Grail was poisoned, then I was the first to taste it." Beneath, another hand has added: "She knew."'),

  // ───── Mirewater ─────
  s('sec-soul-lantern-notes', 'Soul-Lantern Notes', 'recipe',
    'A drowned tinker\'s oilskin notes describe how to trap a spectral glow in glass and a thread of silk. Ink-stained fingers have marked a warning in the margin: "Do not use your own."',
    { recipe: 'recipe-soul-lantern' }),
  s('sec-drowned-ledger', 'The Drowned Ledger', 'lore',
    'A waterlogged account book from a Thalassar toll-station. It records, for twelve generations, a quiet payment to "the Bishop" from a house that signed the Covenant. The Dawn was taking coin from the Council all along.'),
  s('sec-barge-song', 'The Barge-Folk\'s Last Verse', 'lore',
    'A hand-written song pinned to a barge-post. "The Red Star drinks the moon, the heir of no house wakes the king; the Throne will drink of new blood or drown in old, and the old will not let go." A child has added a little drawing of a heart.',
    { item: 'potion-vitae' }),

  // ───── Crimson Capital ─────
  s('sec-requiem-score', 'The Crimson Requiem', 'ability',
    'Sheet music found behind the Opera Dome\'s false pipe organ, written for a choir that does not exist. The score rewrites the blood in your veins as you hum it. It is meant to be sung at an execution.',
    { ability: 'secret-crimson-requiem' }),
  s('sec-weeping-portrait', 'The Weeping Portrait', 'quest',
    'A gallery portrait of a noblewoman weeps blood whenever unobserved. Behind the frame, a letter begs the finder to learn what became of her husband. It is signed in a hand you have seen on Council seals.',
    { quest: 'hq-weeping-portrait' }),
  sanct('sec-glass-vault', 'The Glass Vault', 'A Castellane vault hidden behind a mirror that does not reflect you. Inside, a still pool shows other versions of you, each a half-step wrong. You step in and feel the possibilities settle.', 'mirror', 12),

  // ───── Ashen Reach ─────
  s('sec-ash-tablet', 'The Cinder Tablet', 'ability',
    'A slab of slag-glass etched with the Kharvoss crown-rite, still warm. Reading it burns a halo across your vision. For one moment you wear a crown of coals.',
    { ability: 'secret-cinder-crown' }),
  s('sec-ash-letters', 'Letters in the Ash', 'quest',
    'Singed letters from the Ash Schism, tied with wire and hidden in a charred vault. The last pleads for someone to deliver the remaining pages to a house that no longer exists. A name on the final envelope matches a house in the Council.',
    { quest: 'hq-ash-letters' }),
  s('sec-schism-confession', 'Confession of the Ash Schism', 'lore',
    'An officer\'s confession, burned in the margins. "We did not burn the capital to deny the Throne. We burned it because the Throne\'s heir was already dying, and we feared who would take the seat." The page stops there.'),

  // ───── Frostmere ─────
  s('sec-frozen-heart', 'The Frozen Heart', 'ability',
    'Beneath the dais of the Rime Queen\'s court lies a heart preserved in ice, still beating once a minute. When you touch it, the cold swallows your hand and gives something back. Your breath leaves ghosts.',
    { ability: 'secret-glacial-heart' }),
  s('sec-last-vesperine', 'The Last Vesperine', 'quest',
    'A frozen figure in a courtier\'s gown clutches a brass hourglass that has stopped. A pocket-watch beside her hums. Her note: "The Dusk Keepers are not extinct. One of us is simply late."',
    { quest: 'hq-the-last-vesperine' }),
  s('sec-rimeborn-chronicle', 'The Rimeborn Chronicle', 'lore',
    'Preserved in a block of clear ice, the Isenreth chronicle records one event repeatedly: the night the Sovereign visited, alone, and told the queen the Throne would soon sleep. He asked her to keep the secret, and to freeze something precious.',
    { item: 'elixir-purity' }),

  // ───── Sunken Archive ─────
  s('sec-elixir-formula', 'Formula of the Ages', 'recipe',
    'A stained card slipped between two volumes, in an Archivist\'s tight script. It lists a blood-distillation said to add a century to the drinker\'s life. The final ingredient has been struck out and replaced with "regret".',
    { recipe: 'recipe-elixir-of-ages' }),
  s('sec-mirror-draught-recipe', 'The Mirror Draught', 'recipe',
    'A mirror-glass flask with a recipe etched in the bottom. A Castellane alchemist has scratched "do not look" beside the last step.',
    { recipe: 'recipe-mirror-draught' }),
  s('sec-erased-index', 'The Erased Index', 'lore',
    'An index card for a name that no longer exists, the card itself blank except for an ink-stain in the shape of a crown. The Archivists have stamped it "Seventh" three times and struck it each time. Something wrote it back.'),

  // ───── Moonfell ─────
  s('sec-eclipse-mural', 'The Eclipse Mural', 'ability',
    'A mural in the oldest shrine shows the moon eaten by a black disc, and a vampire standing in the dark unharmed. Stare long enough and the dark steps off the wall to stand behind you.',
    { ability: 'secret-umbral-eclipse' }),
  s('sec-moonless-bride', 'The Moonless Bride', 'quest',
    'A veil, a ring and a bridal bouquet wilted into silver dust lie before a collapsed altar. A voice that is not quite there asks, politely, if you have seen her groom.',
    { quest: 'hq-moonless-bride' }),
  s('sec-ishara-letter', 'Ishara\'s Last Letter', 'lore',
    'A letter in a silver case, addressed "to my brothers and sisters in blood." Ishara writes that she saw the Grail darken and knew one of the Seven had lifted it; she names no one, only "the hand that wished us whole." It ends: "Forgive me for not acting."',
    { item: 'elixir-awakening' }),

  // ───── Cathedral of Dawn ─────
  s('sec-saints-bane-recipe', 'Saint\'s Bane', 'recipe',
    'A forbidden blessing-formula, hidden in a hymnal by a doubting acolyte. It describes a tincture meant to unmake saints, distilled from relic-dust and bitter grace.',
    { recipe: 'recipe-saints-bane' }),
  s('sec-aldric-confessional', 'Aldric\'s Confessional', 'lore',
    'A confessional booth sealed with wax and prayer, where Saint Aldric dictated his last testament. He admits the Order feeds its Grand Inquisitors on stolen vampire blood, and that the Radiant Lady\'s statue was cast from Seliene\'s own death-mask. The wax seal bears a man\'s thumbprint, drying still.',
    { item: 'tonic-sunward' }),
  sanct('sec-radiant-sanctum', 'The Radiant Sanctum', 'Behind the altar, a chamber of unclouded gold light lies untouched by the Sunscar. A relic of Seliene burns in its heart, and its warmth does not hurt. You kneel and receive something you are unsure you wanted.', 'celestial', 15),

  // ───── Shattered Throne ─────
  s('sec-ichor-recipe', 'Ichor Distillate', 'recipe',
    'A shard of Ysmari lead-glass etched with the first chemist\'s notation. It outlines how to distil primordial blood into a single, terrible dose.',
    { recipe: 'recipe-ichor-distillate' }),
  s('sec-grail-shard', 'Shard of the Grail', 'lore',
    'A sliver of dull silver embedded in a ruined stair. It remembers the voices in the throne room when the Grail was lifted. One of them was laughing; one was weeping; one was a voice that, when you listen too hard, has no name at all.'),
  sanct('sec-primordial-well', 'The Primordial Well', 'A hairline crack in the throne dais opens onto a well of undiluted starblood, older than the Covenant. The Wound has not closed here. You drink, and hear Caedrith\'s first heartbeat.', 'primordial', 20),

  // ───── Starfall Spire ─────
  s('sec-starchart', 'The Falling Star-Chart', 'ability',
    'A gilded chart pinned to the observatory dome, mapping where stars will fall next. The next one is above you. Your fingers learn the shape of the sky.',
    { ability: 'secret-falling-sky' }),
  s('sec-starforged-recipe', 'Starforged Blade', 'recipe',
    'A smith\'s diagram on a sheet of beaten star-iron, explaining how to quench a blade in falling light. A note: "It will never be sheathed again."',
    { recipe: 'recipe-starforged-blade' }),
  sanct('sec-star-sanctum', 'The Starwatcher\'s Sanctum', 'A hidden room at the Spire\'s apex where the stars drift at arm\'s length. The Eshkarra left a seat for the heir of no house, as if they knew. You sit in it.', 'star', 20),

  // ───── The Maw ─────
  s('sec-unwritten-page', 'The Unwritten Page', 'ability',
    'A page of vellum that is somehow blank and also full. As you read it, the words eat each other, leaving only a feeling. Your name feels loose in your mouth.',
    { ability: 'secret-name-unwritten' }),
  sanct('sec-void-sanctum', 'The Voidwalker\'s Sanctum', 'A chamber carved out of nothing, where Nhal the Hollow-Eyed once knelt. The silence here pushes back. You step through it and come out shaped differently.', 'void', 25),
  s('sec-seventh-testament', 'Testament of the Seventh', 'lore',
    'Carved into the wall by nails: "I was the youngest of the Seven, and the only one who asked what the Grail was for. For this I was erased, not by the poisoner, but by the one who asked me to stay silent. Say my name, whoever you are. I cannot."'),
];
