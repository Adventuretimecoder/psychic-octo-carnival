import type { QuestDef, BloodlineId, QuestObjective } from '../types';

/**
 * Quest content for Sanguinis. Hidden quests carry a leading 'secret'
 * objective naming the secret that wakes them.
 */

const MAIN: QuestDef[] = [
  // ───────── ACT I — The Ruined Keep ─────────
  {
    id: 'mq-01', name: 'Ashes of the Haven', category: 'main', giver: 'seneschal',
    summary: 'Blackmoor Haven is a ruin with a deed. The seneschal wants proof the dynasty can bleed for its walls: descend into the Hollow Wood and feed.',
    objectives: [
      { type: 'depth', region: 'hollow-wood', floor: 2, text: 'Reach the second floor of the Hollow Wood.' },
      { type: 'feed', blood: 'any', count: 3, text: 'Feed three times in the wood.' },
    ],
    reward: { gold: 150, xp: 120, materials: [{ id: 'bone-shard', count: 3 }] },
    next: ['mq-02'],
  },
  {
    id: 'mq-02', name: 'The Mother of Wolves', category: 'main', giver: 'huntmaster',
    summary: 'Something old howls beneath the Hollow Wood and the Wolfkin do not answer it. Silence her, or learn what she wants.',
    objectives: [
      { type: 'kill', tag: 'wolf', count: 12, text: 'Cull the wolves that guard her den.' },
      { type: 'boss', boss: 'mother-of-wolves', text: 'Face the Mother of Wolves.' },
    ],
    reward: { gold: 250, xp: 300, materials: [{ id: 'wolf-pelt', count: 4 }] },
    choice: {
      prompt: 'The Mother is dying, and her pack watches you. What is left of her is owed something.',
      options: [
        { text: 'Take her pelt and the pack\'s fear.', outcome: 'The wolves scatter. The Haven gains a trophy and an enemy that will not forget.', effects: { gold: 200, items: ['relic-mother-of-wolves'], standing: [{ house: 'sylvaine', value: -8 }], corruption: 4, flag: 'slew-the-mother' } },
        { text: 'Cut her chains and let the pack go free.', outcome: 'She breathes her last in the moon-shadow. The Wolfkin will remember who opened the cage.', effects: { standing: [{ house: 'sylvaine', value: 10 }, { house: 'aurelith', value: 5 }], purity: 5, flag: 'freed-the-wolves' } },
        { text: 'Drink what she offers: a wolf-oath, bitter and binding.', outcome: 'Her blood is hot and strange. You owe the wood a debt, and the wood collects.', effects: { materials: [{ id: 'beast-fang', count: 3 }], flag: 'wolf-oath-sworn', corruption: 2 } },
      ],
    },
    requires: { quests: ['mq-01'] }, next: ['mq-03'],
  },
  {
    id: 'mq-03', name: 'Bones Beneath', category: 'main', giver: 'alchemist',
    summary: 'The alchemist needs grave-dust and the Ossuary Deep has more than its share. So, it seems, does someone else: the dead are being gathered.',
    objectives: [
      { type: 'depth', region: 'ossuary-deep', floor: 3, text: 'Descend to the third floor of the Ossuary Deep.' },
      { type: 'kill', tag: 'undead', count: 15, text: 'Put fifteen of the restless dead to rest.' },
      { type: 'collect', item: 'grave-dust', count: 5, text: 'Gather grave-dust.' },
    ],
    reward: { gold: 280, xp: 340, standing: [{ house: 'mortavane', value: 5 }] },
    requires: { quests: ['mq-02'] }, next: ['mq-04'],
  },
  {
    id: 'mq-04', name: 'The Hollow King', category: 'main', giver: 'spymaster',
    summary: 'A crowned thing sits at the bottom of the ossuary and every skull in the Deep faces it. The spymaster says it was not always dead, and not always a king.',
    objectives: [
      { type: 'boss', boss: 'hollow-king', text: 'Unseat the Hollow King.' },
      { type: 'secret', secret: 'sec-ossuary-hymn', text: 'Find the hymn the skulls were singing.' },
    ],
    reward: { gold: 400, xp: 520, items: ['potion-crimson'] },
    choice: {
      prompt: 'The Hollow King\'s crown carries a Council seal. Someone sent him here.',
      options: [
        { text: 'Bring the seal to the Council openly.', outcome: 'The lords murmur. Dynasties that carry bad news are rarely thanked, but Veyrath marks your honesty.', effects: { standing: [{ house: 'veyrath', value: 8 }], flag: 'exposed-the-seal' } },
        { text: 'Sell the seal to the Gilded Ledger.', outcome: 'Ormund pays well and asks no questions. That, too, is an answer.', effects: { gold: 600, standing: [{ house: 'ormund', value: 10 }], flag: 'sold-the-seal' } },
        { text: 'Keep it. Let the sender wonder.', outcome: 'The spymaster smiles for the first time since you met.', effects: { items: ['potion-vitae'], flag: 'kept-the-seal' } },
      ],
    },
    requires: { quests: ['mq-03'] }, next: ['mq-05'],
  },
  {
    id: 'mq-05', name: 'A Summons to Vel\'Sanguis', category: 'main', giver: 'veyrath',
    summary: 'The Night Council has noticed the new dynasty. A sealed invitation, in a hand that is not the Sovereign\'s, bids you attend court.',
    objectives: [
      { type: 'rank', rank: 2, text: 'Attain the second rank of blood.' },
      { type: 'standing', house: 'veyrath', value: 10, text: 'Earn House Veyrath\'s regard.' },
    ],
    reward: { gold: 500, xp: 450, prestige: 5 },
    requires: { quests: ['mq-04'] }, next: ['mq-06', 'mq-07'],
  },

  // ───────── ACT II — The Usurper's Court ─────────
  {
    id: 'mq-06', name: 'The Drowned Bishop', category: 'main', giver: 'alchemist',
    summary: 'In Mirewater, a bishop of no church holds a drowned congregation. His sermons raise fever across the Tithe lands.',
    objectives: [
      { type: 'depth', region: 'mirewater', floor: 3, text: 'Wade to the third floor of Mirewater.' },
      { type: 'boss', boss: 'drowned-bishop', text: 'Silence the Drowned Bishop.' },
    ],
    reward: { gold: 600, xp: 800, materials: [{ id: 'swamp-root', count: 5 }] },
    choice: {
      prompt: 'The Bishop confesses with his last breath that the Regent paid for the plague.',
      options: [
        { text: 'Carry the confession to the Council.', outcome: 'Half the Seven look away. The other half begin to count their friends.', effects: { standing: [{ house: 'thalassar', value: 8 }, { house: 'veyrath', value: 4 }], flag: 'knows-regent-plague' } },
        { text: 'Bury it. Use it later.', outcome: 'Some secrets are coin that appreciates.', effects: { gold: 300, flag: 'knows-regent-plague', corruption: 3 } },
      ],
    },
    requires: { quests: ['mq-05'] }, next: ['mq-07'],
  },
  {
    id: 'mq-07', name: 'Court of Masks', category: 'main', giver: 'spymaster',
    summary: 'The Gilded Regent rules in the Sovereign\'s sleep. He expects every minor house to kneel. The sleeping Sovereign\'s loyalists expect the opposite.',
    objectives: [
      { type: 'depth', region: 'crimson-capital', floor: 2, text: 'Enter the court floors of Vel\'Sanguis.' },
      { type: 'standing', house: 'ormund', value: 10, text: 'Be received by the Gilded Ledger.' },
    ],
    reward: { gold: 700, xp: 900, prestige: 10 },
    choice: {
      prompt: 'The Regent offers you a seat on his side of the hall. Refuse, and every door in the capital closes.',
      options: [
        { text: 'Kneel to the Regent.', outcome: 'He lifts you with a smile too wide for his face. You are now a piece on his board.', effects: { standing: [{ house: 'ormund', value: 15 }, { house: 'castellane', value: 8 }, { house: 'veyrath', value: -10 }], gold: 500, flag: 'sided-with-regent', corruption: 5 } },
        { text: 'Pledge to the sleeping Sovereign.', outcome: 'The hall goes quiet, then someone laughs. A few of the old houses incline their heads.', effects: { standing: [{ house: 'veyrath', value: 15 }, { house: 'isenreth', value: 8 }, { ormund: 0 } as never].slice(0, 2) as never, purity: 4, flag: 'sided-with-sovereign' } },
        { text: 'Answer to no one. Stay in the dark.', outcome: 'A minor house with no friends has no obligations. And no shield.', effects: { standing: [{ house: 'noctharis', value: 10 }], flag: 'sided-with-none' } },
      ],
    },
    requires: { quests: ['mq-05'] }, next: ['mq-08', 'mq-09'],
  },
  {
    id: 'mq-08', name: 'The Regent\'s Commission', category: 'main', giver: 'ormund',
    summary: 'The Regent wants hunters removed from the capital roads: Sovereign\'s loyalists who might wake the Throne. He pays well.',
    objectives: [
      { type: 'kill', tag: 'hunter', count: 15, text: 'Remove fifteen hunters from the capital roads.' },
      { type: 'gold', amount: 300, text: 'Pay the Gilded Ledger\'s patronage fee.' },
    ],
    reward: { gold: 1200, xp: 1100, standing: [{ house: 'ormund', value: 10 }] },
    requires: { quests: ['mq-07'], flags: ['sided-with-regent'] }, next: ['mq-10'],
  },
  {
    id: 'mq-09', name: 'The Sleeper\'s Vigil', category: 'main', giver: 'veyrath',
    summary: 'The Sovereign\'s torpor is not natural. Loyalists need proof, and proof sleeps in the Throne chamber\'s antechambers.',
    objectives: [
      { type: 'depth', region: 'crimson-capital', floor: 3, text: 'Reach the lowest floor of the capital.' },
      { type: 'kill', tag: 'knight', count: 12, text: 'Break the Regent\'s guard.' },
    ],
    reward: { gold: 700, xp: 1100, standing: [{ house: 'veyrath', value: 12 }] },
    requires: { quests: ['mq-07'], notFlags: ['sided-with-regent'] }, next: ['mq-10'],
  },
  {
    id: 'mq-10', name: 'The Gilded Regent', category: 'main', giver: 'a stranger',
    summary: 'He wears the Sovereign\'s ring and a face that is never quite the same twice. End the usurpation, or inherit it.',
    objectives: [
      { type: 'boss', boss: 'gilded-regent', text: 'Confront the Gilded Regent.' },
    ],
    reward: { gold: 1500, xp: 1800, prestige: 25, title: 'Throne-Breaker' },
    choice: {
      prompt: 'The Regent is down. The Sovereign\'s ring lies in the blood, and the Council is watching through the doors.',
      options: [
        { text: 'Return the ring to the sleeping Sovereign.', outcome: 'The Throne stirs, faintly. Loyalists weep openly. Minor houses will remember what you did not take.', effects: { standing: [{ house: 'veyrath', value: 20 }, { house: 'ormund', value: -10 }], purity: 6, flag: 'returned-the-ring' } },
        { text: 'Pocket it. Name your price at the Council.', outcome: 'The ring is warm. It fits you far too well.', effects: { gold: 2000, standing: [{ house: 'veyrath', value: -15 }, { house: 'ormund', value: 10 }], corruption: 8, flag: 'took-the-ring' } },
        { text: 'Burn the Regent\'s ledgers, and everyone\'s secrets with them.', outcome: 'Half the court thanks you. The other half will not forget what you read first.', effects: { standing: [{ house: 'castellane', value: -10 }, { house: 'noctharis', value: 10 }], flag: 'burned-the-ledgers' } },
      ],
    },
    requires: { quests: ['mq-08'] }, next: ['mq-11'],
  },

  // ───────── ACT III — The Red Star ─────────
  {
    id: 'mq-11', name: 'The Ashen Empress', category: 'main', giver: 'huntmaster',
    summary: 'Beyond the capital the Ash Schism never ended. An empress without a throne rules the Ashen Reach and feeds her court to the fire.',
    objectives: [
      { type: 'depth', region: 'ashen-reach', floor: 3, text: 'Cross three floors of the Ashen Reach.' },
      { type: 'boss', boss: 'ashen-empress', text: 'Break the Ashen Empress.' },
    ],
    reward: { gold: 1800, xp: 2400, standing: [{ house: 'kharvoss', value: 10 }], materials: [{ id: 'cinder-heart', count: 2 }] },
    requires: { quests: ['mq-10'], rank: 4 }, next: ['mq-12'],
  },
  {
    id: 'mq-12', name: 'The Rime Queen', category: 'main', giver: 'ancestor',
    summary: 'The ancestor stirs at night and speaks of cold: a queen in Frostmere who kept something the Sundering missed. Go and see.',
    objectives: [
      { type: 'depth', region: 'frostmere', floor: 4, text: 'Reach the final floor of Frostmere.' },
      { type: 'boss', boss: 'rime-queen', text: 'Meet the Rime Queen.' },
    ],
    reward: { gold: 2200, xp: 3000, items: ['elixir-purity'] },
    choice: {
      prompt: 'The Rime Queen offers a bargain before the final blow: a frozen heart, kept beating for six hundred years.',
      options: [
        { text: 'Take the heart. Drink it.', outcome: 'Her power slides into you like winter into a well. It will want something back.', effects: { items: ['relic-rime-queen'], corruption: 6, standing: [{ house: 'isenreth', value: -10 }], flag: 'drank-frozen-heart' } },
        { text: 'Leave the heart in the ice.', outcome: 'You walk out lighter, and the Rimeborn send a single raven in thanks.', effects: { standing: [{ house: 'isenreth', value: 15 }], purity: 5, flag: 'left-frozen-heart' } },
      ],
    },
    requires: { quests: ['mq-11'] }, next: ['mq-13'],
  },
  {
    id: 'mq-13', name: 'The Archive of Names', category: 'main', giver: 'spymaster',
    summary: 'Every erased name is somewhere. The Sunken Archive keeps what the Devourer did not finish eating.',
    objectives: [
      { type: 'depth', region: 'sunken-archive', floor: 3, text: 'Descend through the drowned stacks.' },
      { type: 'collect', item: 'ancient-parchment', count: 6, text: 'Recover six surviving pages.' },
      { type: 'boss', boss: 'devourer-of-names', text: 'Defeat the Devourer of Names.' },
    ],
    reward: { gold: 2600, xp: 3800, prestige: 20 },
    choice: {
      prompt: 'The Archive is saturated with names no living scholar has ever read. The Devourer waits in every page. There is a way to end it, and a way to keep it.',
      options: [
        { text: 'Burn the Archive.', outcome: 'Centuries of memory become a plume over the water. The Devourer starves. So do the scholars.', effects: { standing: [{ house: 'seraphel', value: -20 }, { house: 'kharvoss', value: 8 }], flag: 'burned-the-archive', purity: 2 } },
        { text: 'Seal it and send the key to House Seraphel.', outcome: 'The Scarlet Scholars bow lower than you have ever seen a scholar bow.', effects: { standing: [{ house: 'seraphel', value: 20 }], flag: 'sealed-the-archive' } },
        { text: 'Copy the pages that matter. Burn the rest.', outcome: 'You take what you need. The rest is smoke.', effects: { items: ['elixir-awakening'], standing: [{ house: 'seraphel', value: -5 }], flag: 'burned-the-archive', corruption: 3 } },
      ],
    },
    requires: { quests: ['mq-12'] }, next: ['mq-14'],
  },
  {
    id: 'mq-14', name: 'The Pale Huntress', category: 'main', giver: 'huntmaster',
    summary: 'In Moonfell the old pact between wolf and vampire has frayed. A huntress in white keeps the line and has begun to cross it.',
    objectives: [
      { type: 'depth', region: 'moonfell', floor: 4, text: 'Reach the last terrace of Moonfell.' },
      { type: 'boss', boss: 'pale-huntress', text: 'Face the Pale Huntress.' },
    ],
    reward: { gold: 3000, xp: 4400, materials: [{ id: 'moonpetal', count: 5 }] },
    requires: { quests: ['mq-13'], rank: 6 }, next: ['mq-15'],
  },
  {
    id: 'mq-15', name: 'The Crimson Saint', category: 'main', giver: 'confessor',
    summary: 'Saint Aldric the Crimson drank vampire blood to win the Dawn\'s war, and the Dawn has kept him in their cathedral ever since. The confessor says he can still be asked questions.',
    objectives: [
      { type: 'depth', region: 'cathedral-dawn', floor: 4, text: 'Fight through the Cathedral of Dawn.' },
      { type: 'boss', boss: 'crimson-saint', text: 'Meet Saint Aldric.' },
    ],
    reward: { gold: 3500, xp: 5200, prestige: 25 },
    choice: {
      prompt: 'Aldric kneels in the bleeding light. He asks for neither mercy nor death, only a witness.',
      options: [
        { text: 'Hear him out and spare him.', outcome: 'He tells you where the First Betrayer\'s trail ends. Then he asks you to leave him in the light.', effects: { standing: [{ house: 'halcyra', value: 12 }], purity: 8, flag: 'spared-saint' } },
        { text: 'End him. A saint should not outlive his sins.', outcome: 'He dies smiling. The Dawn calls it martyrdom. You carry his ash.', effects: { items: ['relic-crimson-saint'], corruption: 6, standing: [{ house: 'halcyra', value: -10 }], flag: 'slew-the-saint' } },
      ],
    },
    requires: { quests: ['mq-14'], rank: 7 }, next: ['mq-16', 'mq-17'],
  },
  {
    id: 'mq-16', name: 'The Saint\'s Gift', category: 'main', giver: 'confessor',
    summary: 'Aldric left a key and a name. The confessor will take you to the vault beneath the Cathedral where the Dawn hid the Seraph\'s blood.',
    objectives: [
      { type: 'collect', item: 'saint-relic', count: 5, text: 'Collect five saint\'s relics.' },
      { type: 'feed', blood: 'holy', count: 5, text: 'Take holy blood to open the vault seal.' },
    ],
    reward: { gold: 2000, xp: 4000, items: ['elixir-purity', 'tonic-sunward'], title: 'Light-Walker' },
    requires: { quests: ['mq-15'], flags: ['spared-saint'] }, next: ['mq-18'],
  },
  {
    id: 'mq-17', name: 'The Saint\'s Ashes', category: 'main', giver: 'ancestor',
    summary: 'You carry Aldric\'s ash and the ancestor wants it. The dead have uses for burned saints.',
    objectives: [
      { type: 'collect', item: 'cursed-sigil', count: 5, text: 'Gather cursed sigils for the ash rite.' },
      { type: 'feed', blood: 'corrupted', count: 5, text: 'Feed the ash on corrupted blood.' },
    ],
    reward: { gold: 2000, xp: 4000, items: ['draught-fury', 'salt-of-warding'], title: 'Ash-Bearer' },
    requires: { quests: ['mq-15'], notFlags: ['spared-saint'] }, next: ['mq-18'],
  },

  // ───────── ACT IV — The Unwritten ─────────
  {
    id: 'mq-18', name: 'The First Betrayer', category: 'main', giver: 'ancestor',
    summary: 'In the ruins of Ur-Velkhar, the ancestor\'s memory and the Shattered Throne finally agree. One of the Seven is still down there, still betraying.',
    objectives: [
      { type: 'depth', region: 'shattered-throne', floor: 5, text: 'Descend to the throne room of Ur-Velkhar.' },
      { type: 'boss', boss: 'first-betrayer', text: 'Confront the First Betrayer.' },
    ],
    reward: { gold: 5000, xp: 8000, prestige: 40, title: 'Betrayer\'s Bane' },
    choice: {
      prompt: 'The Betrayer does not deny it. He tells you why, and the reason is the most terrible thing you have ever heard: it was a mercy.',
      options: [
        { text: 'Strike him down regardless.', outcome: 'Mercy or not, the chalice is empty now. The throne is silent.', effects: { items: ['relic-first-betrayer'], purity: 5, flag: 'slew-the-betrayer' } },
        { text: 'Take his confession and let the Council judge.', outcome: 'He dies later, in chains, before the Seven. They will never forgive you for making them listen.', effects: { standing: [{ house: 'veyrath', value: 10 }, { house: 'grimvald', value: 8 }], flag: 'took-the-confession' } },
        { text: 'Take his offer: the Grail\'s last drop.', outcome: 'It burns. It is the sweetest thing you have ever tasted.', effects: { items: ['elixir-awakening'], corruption: 10, flag: 'drank-the-grail' } },
      ],
    },
    requires: { quests: ['mq-16'] }, next: ['mq-19'],
  },
  {
    id: 'mq-19', name: 'The Star-Eater', category: 'main', giver: 'ancestor',
    summary: 'The Red Star is falling toward Eryndor, and something in Starfall Spire is feeding on it. The Augury of Ash is no longer a poem.',
    objectives: [
      { type: 'depth', region: 'starfall-spire', floor: 5, text: 'Climb to the heart of Starfall Spire.' },
      { type: 'boss', boss: 'star-eater', text: 'Face the Star-Eater.' },
      { type: 'secret', secret: 'sec-starchart', text: 'Read the Starchart of the Returning.' },
    ],
    reward: { gold: 6000, xp: 11000, prestige: 50 },
    requires: { quests: ['mq-18'], rank: 9 }, next: ['mq-20'],
  },
  {
    id: 'mq-20', name: 'The Forgotten Progenitor', category: 'main', giver: 'ancestor',
    summary: 'In the Maw, where the Sundering did not finish, the Seventh waits with no name to call him by. The Throne will drink of new blood or drown in old.',
    objectives: [
      { type: 'depth', region: 'the-maw', floor: 5, text: 'Reach the bottom of the Maw.' },
      { type: 'boss', boss: 'forgotten-progenitor', text: 'Stand before the Forgotten Progenitor.' },
    ],
    reward: { gold: 10000, xp: 20000, prestige: 100, title: 'Heir of No House', items: ['relic-forgotten-progenitor'] },
    choice: {
      prompt: 'He is the Unwritten, and he is tired. The Throne is not a seat. It is a lid.',
      options: [
        { text: 'Write his name. Let him be remembered.', outcome: 'The Devourer\'s hunger breaks. The dead remember, and so do the living. The Throne wakes.', effects: { standing: [{ house: 'veyrath', value: 20 }, { house: 'grimvald', value: 15 }], purity: 15, flag: 'wrote-the-name' } },
        { text: 'End him, and the Seven with him.', outcome: 'The Red Star dims. The Covenant rewrites itself without mercy.', effects: { corruption: 5, flag: 'ended-the-seventh' } },
        { text: 'Take the Throne he guards.', outcome: 'The Unwritten sighs and passes the weight into your hands. It does not feel like a crown.', effects: { corruption: 15, gold: 5000, flag: 'crowned-by-the-unwritten' } },
      ],
    },
    requires: { quests: ['mq-19'], rank: 10 },
  },
];

const POLITICAL: QuestDef[] = [
  { id: 'pq-ledger-of-debts', name: 'The Ledger of Debts', category: 'political', giver: 'ormund', summary: 'House Ormund buys and sells obligation. Show you can pay, and be seen to pay.',
    objectives: [{ type: 'gold', amount: 1000, text: 'Deposit a thousand crowns at the Gilded Ledger.' }, { type: 'standing', house: 'ormund', value: 20, text: 'Be known at the Ledger.' }],
    reward: { gold: 400, xp: 300, standing: [{ house: 'ormund', value: 8 }], prestige: 5 }, requires: { rank: 2 } },
  { id: 'pq-whispering-court', name: 'A Whisper at Court', category: 'political', giver: 'velmora', summary: 'The Whispering Court trades in rumour. A well-placed lie can break a house; a well-placed truth can break two.',
    objectives: [{ type: 'standing', house: 'velmora', value: 25, text: 'Be welcomed at the Whispering Court.' }, { type: 'feed', blood: 'noble', count: 4, text: 'Feed on noble blood to learn their manners.' }],
    reward: { gold: 500, xp: 500, standing: [{ house: 'velmora', value: 10 }, { house: 'castellane', value: -5 }] },
    choice: { prompt: 'You overhear a rumour that could ruin House Castellane. What is it worth?', options: [
      { text: 'Spread it.', outcome: 'The Mirror Court cracks, and Velmora applauds.', effects: { standing: [{ house: 'velmora', value: 10 }, { house: 'castellane', value: -15 }], flag: 'spread-the-rumour' } },
      { text: 'Warn Castellane in exchange for a favour.', outcome: 'A favour from the Mirror Court is a strange, sharp thing to own.', effects: { standing: [{ house: 'castellane', value: 12 }], gold: 300 } },
    ] }, requires: { rank: 3 } },
  { id: 'pq-iron-oath', name: 'The Iron Oath', category: 'political', giver: 'dravenmoor', summary: 'The Iron Blood respect only strength. Prove yours before their champion.',
    objectives: [{ type: 'kill', tag: 'elite', count: 10, text: 'Slay ten elite foes.' }, { type: 'standing', house: 'dravenmoor', value: 20, text: 'Win House Dravenmoor\'s respect.' }],
    reward: { gold: 600, xp: 600, standing: [{ house: 'dravenmoor', value: 12 }], items: ['draught-fury'] }, requires: { rank: 3 } },
  { id: 'pq-starwatch-alliance', name: 'The Starwatch Alliance', category: 'political', giver: 'eshkarra', summary: 'The Starwatchers read the Red Star\'s return in your blood. They will help, for a price.',
    objectives: [{ type: 'standing', house: 'eshkarra', value: 25, text: 'Be received by the Starwatchers.' }, { type: 'gold', amount: 800, text: 'Fund their observatory.' }],
    reward: { gold: 300, xp: 700, standing: [{ house: 'eshkarra', value: 15 }], prestige: 10 }, requires: { rank: 4 } },
  { id: 'pq-land-and-title', name: 'Land and Title', category: 'political', giver: 'seneschal', summary: 'A dynasty without land is a family. Claim a territory the Council will recognise.',
    objectives: [{ type: 'own', region: 'hollow-wood', text: 'Hold the Hollow Wood in your name.' }, { type: 'standing', house: 'veyrath', value: 15, text: 'Win the Council\'s acknowledgement.' }],
    reward: { gold: 800, xp: 800, prestige: 15 }, requires: { rank: 3 } },
  { id: 'pq-poisoned-cup', name: 'The Poisoned Cup', category: 'political', giver: 'zerevan', summary: 'The Venom Rose offers friendship in a cup. Everyone knows what is in it.',
    objectives: [{ type: 'standing', house: 'zerevan', value: 20, text: 'Earn an audience with the Venom Rose.' }, { type: 'collect', item: 'venom-gland', count: 4, text: 'Bring four venom glands as a courtesy.' }],
    reward: { gold: 500, xp: 700, standing: [{ house: 'zerevan', value: 12 }] },
    choice: { prompt: 'The cup is offered. Everyone watches.', options: [
      { text: 'Drink it.', outcome: 'Your hands do not shake. House Zerevan has never been so impressed, or so wary.', effects: { standing: [{ house: 'zerevan', value: 15 }], corruption: 3, flag: 'drank-the-rose' } },
      { text: 'Swap cups with the host.', outcome: 'The host drinks. He lives, barely. You are not invited back.', effects: { standing: [{ house: 'zerevan', value: -5 }, { house: 'castellane', value: 5 }], gold: 400 } },
    ] }, requires: { rank: 4 } },
  { id: 'pq-hollow-crowns', name: 'The Oath-Ghosts', category: 'political', giver: 'grimvald', summary: 'House Grimvald binds souls to oaths. A promise you made in the first week of your reign is about to come due.',
    objectives: [{ type: 'standing', house: 'grimvald', value: 20, text: 'Be known to the Hollow Crowns.' }, { type: 'kill', tag: 'spirit', count: 15, text: 'Release fifteen oath-broken spirits.' }],
    reward: { gold: 600, xp: 800, standing: [{ house: 'grimvald', value: 12 }], items: ['potion-vitae'] }, requires: { rank: 4 } },
];

const EXPLORATION: QuestDef[] = [
  { id: 'eq-wood-deep', name: 'Roots Under the Wood', category: 'exploration', giver: 'huntmaster', summary: 'The Hollow Wood has a third floor nobody maps.',
    objectives: [{ type: 'depth', region: 'hollow-wood', floor: 3, text: 'Reach the third floor of the Hollow Wood.' }, { type: 'collect', item: 'moonpetal', count: 3, text: 'Pick three moonpetals.' }],
    reward: { gold: 150, xp: 200 } },
  { id: 'eq-ossuary-hymn', name: 'The Ossuary Hymn', category: 'exploration', giver: 'confessor', summary: 'The dead sing in the Ossuary. Someone should write it down.',
    objectives: [{ type: 'depth', region: 'ossuary-deep', floor: 2, text: 'Reach the second floor of the Ossuary Deep.' }, { type: 'secret', secret: 'sec-ossuary-hymn', text: 'Find the Ossuary Hymn.' }],
    reward: { gold: 250, xp: 350, items: ['salt-of-warding'] }, requires: { rank: 2 } },
  { id: 'eq-ash-tablet', name: 'The Ash Tablet', category: 'exploration', giver: 'spymaster', summary: 'A tablet in the Ashen Reach records the Ash Schism. Someone has been defacing it.',
    objectives: [{ type: 'depth', region: 'ashen-reach', floor: 3, text: 'Reach the third floor of the Ashen Reach.' }, { type: 'secret', secret: 'sec-ash-tablet', text: 'Find the Ash Tablet.' }],
    reward: { gold: 500, xp: 700, materials: [{ id: 'ash-ember', count: 4 }] }, requires: { rank: 4 } },
  { id: 'eq-frozen-heart', name: 'The Frozen Heart', category: 'exploration', giver: 'alchemist', summary: 'A heart that never thawed. The alchemist would very much like to study it.',
    objectives: [{ type: 'depth', region: 'frostmere', floor: 3, text: 'Reach the third floor of Frostmere.' }, { type: 'secret', secret: 'sec-frozen-heart', text: 'Find the Frozen Heart.' }],
    reward: { gold: 800, xp: 1200, materials: [{ id: 'frost-shard', count: 5 }] }, requires: { rank: 5 } },
  { id: 'eq-drowned-stacks', name: 'The Drowned Stacks', category: 'exploration', giver: 'seraphel', summary: 'House Seraphel will pay for any page that survived the flooding.',
    objectives: [{ type: 'depth', region: 'sunken-archive', floor: 4, text: 'Reach the bottom of the Archive.' }, { type: 'collect', item: 'ancient-parchment', count: 5, text: 'Recover five pages.' }],
    reward: { gold: 1000, xp: 1600, standing: [{ house: 'seraphel', value: 10 }] }, requires: { rank: 6 } },
  { id: 'eq-moon-stairs', name: 'Moonfell Stairs', category: 'exploration', giver: 'aurelith', summary: 'The Moonlit say the stairs of Moonfell lead somewhere only under a Blood Moon.',
    objectives: [{ type: 'depth', region: 'moonfell', floor: 3, text: 'Climb to the third terrace of Moonfell.' }, { type: 'secret', secret: 'sec-starchart', text: 'Find the Starchart.' }],
    reward: { gold: 900, xp: 1600, standing: [{ house: 'aurelith', value: 10 }] }, requires: { rank: 6 } },
  { id: 'eq-throne-bones', name: 'The Throne of Bones', category: 'exploration', giver: 'a stranger', summary: 'A stranger in the Haven gate hands you a map and does not wait to be thanked.',
    objectives: [{ type: 'depth', region: 'shattered-throne', floor: 4, text: 'Reach the fourth floor of the Shattered Throne.' }, { type: 'secret', secret: 'sec-eclipse-mural', text: 'Find the Eclipse Mural.' }],
    reward: { gold: 2000, xp: 4000, prestige: 10 }, requires: { rank: 8 } },
];

const DUNGEON: QuestDef[] = [
  { id: 'dq-cull-the-pack', name: 'Cull the Pack', category: 'dungeon', giver: 'huntmaster', summary: 'The wolves are growing bold. Show them why they should not.',
    objectives: [{ type: 'kill', tag: 'wolf', count: 20, text: 'Kill twenty wolves.' }, { type: 'depth', region: 'hollow-wood', floor: 2, text: 'Reach floor two.' }],
    reward: { gold: 200, xp: 250, materials: [{ id: 'wolf-pelt', count: 3 }] } },
  { id: 'dq-ghoul-warren', name: 'The Ghoul Warren', category: 'dungeon', giver: 'alchemist', summary: 'Ghouls are tunnelling under the Haven. Find the warren and end it.',
    objectives: [{ type: 'kill', tag: 'ghoul', count: 20, text: 'Kill twenty ghouls.' }, { type: 'depth', region: 'ossuary-deep', floor: 3, text: 'Reach the Ossuary\'s lowest floor.' }],
    reward: { gold: 350, xp: 450, materials: [{ id: 'grave-dust', count: 5 }] } },
  { id: 'dq-zealot-purge', name: 'The Zealot Purge', category: 'dungeon', giver: 'confessor', summary: 'The confessor knows where the Dawn\'s zealots gather. He asks you to be quick and merciful. You may do one.',
    objectives: [{ type: 'kill', tag: 'zealot', count: 15, text: 'Kill fifteen zealots.' }, { type: 'feed', blood: 'holy', count: 3, text: 'Feed on holy blood three times.' }],
    reward: { gold: 700, xp: 1000, items: ['potion-vitae'] }, requires: { rank: 5 } },
  { id: 'dq-golem-quarry', name: 'The Golem Quarry', category: 'dungeon', giver: 'seneschal', summary: 'The Haven needs iron and the old quarry is full of constructs.',
    objectives: [{ type: 'kill', tag: 'golem', count: 12, text: 'Smash twelve golems.' }, { type: 'collect', item: 'iron-ore', count: 8, text: 'Gather eight iron ore.' }],
    reward: { gold: 500, xp: 700, materials: [{ id: 'silver-ingot', count: 3 }] }, requires: { rank: 3 } },
  { id: 'dq-wraith-tide', name: 'The Wraith Tide', category: 'dungeon', giver: 'ancestor', summary: 'Wraiths drift toward the Haven each midnight. The ancestor will not say why.',
    objectives: [{ type: 'kill', tag: 'wraith', count: 25, text: 'Banish twenty-five wraiths.' }, { type: 'depth', region: 'mirewater', floor: 3, text: 'Reach the third floor of Mirewater.' }],
    reward: { gold: 600, xp: 900, materials: [{ id: 'ectoplasm', count: 5 }] }, requires: { rank: 3 } },
  { id: 'dq-knight-vigil', name: 'Vigil of Knights', category: 'dungeon', giver: 'dravenmoor', summary: 'Armoured dead keep watch in the Cathedral\'s crypts. House Dravenmoor wants their swords.',
    objectives: [{ type: 'kill', tag: 'knight', count: 20, text: 'Break twenty knights.' }, { type: 'depth', region: 'cathedral-dawn', floor: 3, text: 'Reach the Cathedral\'s third floor.' }],
    reward: { gold: 1200, xp: 2000, standing: [{ house: 'dravenmoor', value: 10 }] }, requires: { rank: 7 } },
  { id: 'dq-maw-descent', name: 'Into the Maw', category: 'dungeon', giver: 'huntmaster', summary: 'The Maw swallows hunters. The huntmaster has never asked anyone to go in. He is asking now.',
    objectives: [{ type: 'depth', region: 'the-maw', floor: 4, text: 'Reach the fourth floor of the Maw.' }, { type: 'kill', tag: 'aberration', count: 30, text: 'Kill thirty aberrations.' }],
    reward: { gold: 4000, xp: 9000, items: ['elixir-awakening'] }, requires: { rank: 10 } },
];

const LEGENDARY: QuestDef[] = [
  { id: 'lq-star-eater-hunt', name: 'The Hunt of Stars', category: 'legendary', giver: 'eshkarra', summary: 'The Starwatchers offer everything they have to be rid of the thing that feeds on their sky.',
    objectives: [{ type: 'boss', boss: 'star-eater', text: 'Slay the Star-Eater.' }, { type: 'rank', rank: 9, text: 'Reach rank nine.' }],
    reward: { gold: 8000, xp: 15000, title: 'Starfall Hunter', prestige: 40, items: ['relic-star-eater'] }, requires: { rank: 9 } },
  { id: 'lq-throne-reckoning', name: 'The Reckoning of Ur-Velkhar', category: 'legendary', giver: 'veyrath', summary: 'House Veyrath will name you a Peer of the Realm if you can enter the Shattered Throne and live.',
    objectives: [{ type: 'boss', boss: 'first-betrayer', text: 'Defeat the First Betrayer.' }, { type: 'rank', rank: 9, text: 'Reach rank nine.' }],
    reward: { gold: 7000, xp: 14000, title: 'Peer of Veyrath', prestige: 40, standing: [{ house: 'veyrath', value: 20 }] }, requires: { rank: 9 } },
  { id: 'lq-maw-heart', name: 'The Heart of the Maw', category: 'legendary', giver: 'ancestor', summary: 'The ancestor was bound to the Haven the night the Maw opened. He wants it closed.',
    objectives: [{ type: 'depth', region: 'the-maw', floor: 5, text: 'Reach the bottom of the Maw.' }, { type: 'boss', boss: 'forgotten-progenitor', text: 'Defeat the Forgotten Progenitor.' }, { type: 'rank', rank: 10, text: 'Reach rank ten.' }],
    reward: { gold: 15000, xp: 30000, title: 'Maw-Breaker', prestige: 75 }, requires: { rank: 10 } },
  { id: 'lq-eleven-ranks', name: 'Ascendant', category: 'legendary', giver: 'seneschal', summary: 'No heir of Blackmoor has ever climbed the eleventh rank. The seneschal has a ledger for just that day.',
    objectives: [{ type: 'rank', rank: 11, text: 'Reach the eleventh rank of blood.' }, { type: 'boss', boss: 'star-eater', text: 'Defeat the Star-Eater.' }],
    reward: { gold: 20000, xp: 50000, title: 'Ascendant', prestige: 100 }, requires: { rank: 10 } },
  { id: 'lq-nine-bosses', name: 'The Ninth Name', category: 'legendary', giver: 'spymaster', summary: 'Three names, three bosses, one breathless month. The spymaster will not say who offered the wager.',
    objectives: [{ type: 'boss', boss: 'crimson-saint', text: 'Defeat the Crimson Saint.' }, { type: 'boss', boss: 'first-betrayer', text: 'Defeat the First Betrayer.' }, { type: 'boss', boss: 'star-eater', text: 'Defeat the Star-Eater.' }],
    reward: { gold: 12000, xp: 25000, title: 'Name-Taker', prestige: 60 }, requires: { rank: 9 } },
];

const PERSONAL: QuestDef[] = [
  { id: 'pe-seneschal-ledger', name: 'The Missing Ledger', category: 'personal', giver: 'seneschal', summary: 'Half the Haven\'s accounts vanished before you arrived. The seneschal suspects theft, and does not say whom.',
    objectives: [{ type: 'gold', amount: 500, text: 'Repay a creditor\'s claim.' }, { type: 'collect', item: 'ancient-parchment', count: 3, text: 'Recover three old records.' }],
    reward: { gold: 600, xp: 500 }, requires: { rank: 2 } },
  { id: 'pe-alchemist-tincture', name: 'A Tincture for Dawn', category: 'personal', giver: 'alchemist', summary: 'The alchemist is quietly trying to make a cure for the Sunscar. He will not say who it is for.',
    objectives: [{ type: 'collect', item: 'nightshade', count: 6, text: 'Gather six nightshade.' }, { type: 'collect', item: 'moonpetal', count: 4, text: 'Gather four moonpetals.' }],
    reward: { gold: 300, xp: 600, items: ['tonic-sunward'] }, requires: { rank: 3 } },
  { id: 'pe-spymaster-friend', name: 'A Friend Abroad', category: 'personal', giver: 'spymaster', summary: 'The spymaster has a debt, and a friend inside House Castellane who is going to disappear if you do nothing.',
    objectives: [{ type: 'standing', house: 'castellane', value: 10, text: 'Gain access to Castellane\'s inner court.' }, { type: 'kill', tag: 'cultist', count: 10, text: 'Clear the friend\'s pursuers.' }],
    reward: { gold: 700, xp: 900, standing: [{ house: 'castellane', value: 8 }] },
    choice: { prompt: 'The friend asks to be taken out of the capital. The spymaster asks you to leave her in place.', options: [
      { text: 'Take her out.', outcome: 'She is safe. The spymaster\'s network is not.', effects: { standing: [{ house: 'castellane', value: -5 }], purity: 3, flag: 'saved-the-friend' } },
      { text: 'Leave her in place.', outcome: 'She feeds the spymaster rumours for ten more years. She dies in a way no one remarks on.', effects: { gold: 500, corruption: 3, flag: 'left-the-friend' } },
    ] }, requires: { rank: 4 } },
  { id: 'pe-ancestor-name', name: 'The Founder\'s Name', category: 'personal', giver: 'ancestor', summary: 'The ancestor cannot recall his own name. He remembers everyone else\'s.',
    objectives: [{ type: 'secret', secret: 'sec-unwritten-page', text: 'Find the Unwritten Page.' }, { type: 'kill', tag: 'spirit', count: 20, text: 'Banish twenty spirits who might know it.' }],
    reward: { gold: 1000, xp: 2000, prestige: 20 }, requires: { rank: 5 } },
  { id: 'pe-huntmaster-pupil', name: 'The Huntmaster\'s Pupil', category: 'personal', giver: 'huntmaster', summary: 'Every huntmaster has one student who died. He would like to see how this one ends.',
    objectives: [{ type: 'kill', tag: 'elite', count: 15, text: 'Kill fifteen elite foes.' }, { type: 'boss', boss: 'mother-of-wolves', text: 'Slay a boss of the wood.' }],
    reward: { gold: 700, xp: 900, items: ['draught-fury'] }, requires: { rank: 3 } },
  { id: 'pe-confessor-sin', name: 'A Confessor\'s Sin', category: 'personal', giver: 'confessor', summary: 'The confessor has been hiding something in the Haven chapel. He asks you to hear him out.',
    objectives: [{ type: 'feed', blood: 'holy', count: 3, text: 'Take holy blood from a Dawn envoy.' }, { type: 'depth', region: 'cathedral-dawn', floor: 2, text: 'Reach the Cathedral\'s second floor.' }],
    reward: { gold: 800, xp: 1500, items: ['elixir-purity'] },
    choice: { prompt: 'He confesses he took the vows of the Dawn as a mask and a weapon. Some days he forgets which.', options: [
      { text: 'Absolve him.', outcome: 'He weeps. Of everyone in the Haven, he is the one who needed it.', effects: { purity: 5, flag: 'absolved-the-confessor' } },
      { text: 'Keep his secret, and hold it.', outcome: 'He will never forgive you for understanding.', effects: { gold: 400, corruption: 3, flag: 'holds-confessors-secret' } },
    ] }, requires: { rank: 6 } },
];

const HIDDEN: QuestDef[] = [
  { id: 'hq-weeping-portrait', name: 'The Weeping Portrait', category: 'hidden', giver: 'a stranger', summary: 'A portrait in the Eclipse Mural has begun to weep real blood. It looks like someone you almost know.',
    objectives: [{ type: 'secret', secret: 'sec-eclipse-mural', text: 'Discover the Eclipse Mural.' }, { type: 'feed', blood: 'spectral', count: 4, text: 'Feed on spectral blood to hear its voice.' }, { type: 'depth', region: 'moonfell', floor: 3, text: 'Find the portrait\'s twin in Moonfell.' }],
    reward: { gold: 1500, xp: 2500, prestige: 15 },
    choice: { prompt: 'The portrait says: free me, or finish me.', options: [
      { text: 'Free her.', outcome: 'A woman in a long-gone dress steps out and thanks you in a language that died with Ysmar.', effects: { standing: [{ house: 'aurelith', value: 10 }], purity: 5, flag: 'freed-the-portrait' } },
      { text: 'Finish it. Some images should not outlive their subject.', outcome: 'The weeping stops. The wall is only a wall.', effects: { items: ['potion-vitae'], corruption: 2, flag: 'broke-the-portrait' } },
    ] } },
  { id: 'hq-the-last-vesperine', name: 'The Last Vesperine', category: 'hidden', giver: 'a stranger', summary: 'House Vesperine is thought extinct. A starchart in the Haven says otherwise.',
    objectives: [{ type: 'secret', secret: 'sec-starchart', text: 'Read the Starchart.' }, { type: 'collect', item: 'sand-of-hours', count: 4, text: 'Gather four measures of hour-sand.' }, { type: 'night', nights: 3, text: 'Wait three nights at the appointed hour.' }],
    reward: { gold: 1800, xp: 3000, standing: [{ house: 'vesperine', value: 25 }], prestige: 20 },
    choice: { prompt: 'She is very old, very tired, and in possession of a clock that counts down to the Sundering.', options: [
      { text: 'Give her sanctuary in the Haven.', outcome: 'The Haven gains a keeper of hours and the Sovereign\'s torpor gains a clock.', effects: { standing: [{ house: 'vesperine', value: 20 }], flag: 'sheltered-vesperine' } },
      { text: 'Take the clock and let her go.', outcome: 'The clock is the most dangerous thing you have ever held. It also tells the time perfectly.', effects: { items: ['elixir-awakening'], flag: 'took-the-clock', corruption: 3 } },
    ] } },
  { id: 'hq-name-of-the-first', name: 'The Name of the First', category: 'hidden', giver: 'a stranger', summary: 'A page that was never written, in a hand that was never taught, spells a name the Devourer could not swallow.',
    objectives: [{ type: 'secret', secret: 'sec-unwritten-page', text: 'Find the Unwritten Page.' }, { type: 'kill', tag: 'cultist', count: 20, text: 'Defeat cultists of the Unwritten.' }, { type: 'boss', boss: 'devourer-of-names', text: 'Defeat the Devourer of Names.' }],
    reward: { gold: 3000, xp: 6000, prestige: 30 },
    choice: { prompt: 'The page asks to be read aloud.', options: [
      { text: 'Read it. Say the name.', outcome: 'It does not sound like anything. Then it sounds like everything. Something old turns over in its sleep.', effects: { ability: 'secret-name-unwritten', corruption: 8, flag: 'spoke-the-name' } },
      { text: 'Burn it unread.', outcome: 'The page curls and whispers. You smell lilac and iron.', effects: { purity: 8, flag: 'burned-the-name' } },
    ] } },
  { id: 'hq-moonless-bride', name: 'The Moonless Bride', category: 'hidden', giver: 'a stranger', summary: 'A wolf-oath carved in bone speaks of a bride given to the dark so that the moon might rise on her wedding night.',
    objectives: [{ type: 'secret', secret: 'sec-wolf-oath', text: 'Find the Wolf-Oath.' }, { type: 'kill', tag: 'werebeast', count: 15, text: 'Face the werebeasts that guard the oath.' }, { type: 'depth', region: 'moonfell', floor: 4, text: 'Reach the last terrace of Moonfell.' }],
    reward: { gold: 2000, xp: 3500, standing: [{ house: 'aurelith', value: 10 }, { house: 'sylvaine', value: 10 }] },
    choice: { prompt: 'The bride is not dead. She is not alive. She wants to know what you would give her.', options: [
      { text: 'A moon.', outcome: 'The next Blood Moon is brighter than it should have been. She smiles at the window.', effects: { items: ['relic-pale-huntress'], purity: 4, flag: 'gave-her-a-moon' } },
      { text: 'A husband.', outcome: 'You have no right. She knows. It is done.', effects: { corruption: 6, gold: 1000, flag: 'gave-her-a-husband' } },
    ] } },
  { id: 'hq-ash-letters', name: 'The Ash Letters', category: 'hidden', giver: 'a stranger', summary: 'A requiem score was never meant to be played. The ash on its margins reads as letters to someone who never wrote back.',
    objectives: [{ type: 'secret', secret: 'sec-requiem-score', text: 'Find the Requiem Score.' }, { type: 'collect', item: 'ash-ember', count: 6, text: 'Gather ash embers to read the letters.' }, { type: 'kill', tag: 'undead', count: 20, text: 'Play the dead a bar of the music.' }],
    reward: { gold: 2200, xp: 4000, prestige: 25 },
    choice: { prompt: 'The last letter asks that the requiem be sung for the writer. It does not say who the writer was.', options: [
      { text: 'Perform the requiem.', outcome: 'The score turns to ash in your hands, and the music stays. You will never forget a note.', effects: { ability: 'secret-crimson-requiem', corruption: 4, flag: 'sang-the-requiem' } },
      { text: 'Bury the letters.', outcome: 'You do not know whom you wronged by not singing it. You will.', effects: { gold: 1000, purity: 3, flag: 'buried-the-letters' } },
    ] } },
];

// ───────── Repeatable contracts ─────────
const REPEATABLE: QuestDef[] = [
  { id: 'rq-wolf-bounty', name: 'Wolf Bounty', category: 'repeatable', giver: 'huntmaster', summary: 'A standing bounty on wolves threatening the roads.',
    objectives: [{ type: 'kill', tag: 'wolf', count: 15, text: 'Kill fifteen wolves.' }], reward: { gold: 180, xp: 220 } },
  { id: 'rq-grave-tithe', name: 'The Grave Tithe', category: 'repeatable', giver: 'seneschal', summary: 'The Haven\'s larder runs lean. Feed, and feed well.',
    objectives: [{ type: 'feed', blood: 'common', count: 8, text: 'Feed eight times on common blood.' }], reward: { gold: 150, xp: 180 } },
  { id: 'rq-bone-harvest', name: 'Bone Harvest', category: 'repeatable', giver: 'alchemist', summary: 'The alchemist always needs more bone.',
    objectives: [{ type: 'collect', item: 'bone-shard', count: 8, text: 'Collect eight bone shards.' }], reward: { gold: 160, xp: 200 } },
  { id: 'rq-hunter-bounty', name: 'Hunter\'s Reckoning', category: 'repeatable', giver: 'spymaster', summary: 'Mortal hunters keep coming. They keep dying. Someone should keep count.',
    objectives: [{ type: 'kill', tag: 'hunter', count: 12, text: 'Kill twelve hunters.' }], reward: { gold: 280, xp: 350 } },
  { id: 'rq-noble-vintage', name: 'A Noble Vintage', category: 'repeatable', giver: 'seneschal', summary: 'Guests are coming. They will not be satisfied with commoners.',
    objectives: [{ type: 'feed', blood: 'noble', count: 4, text: 'Feed four times on noble blood.' }], reward: { gold: 300, xp: 320 } },
  { id: 'rq-ember-run', name: 'Ember Run', category: 'repeatable', giver: 'alchemist', summary: 'The forge is cold.',
    objectives: [{ type: 'collect', item: 'ash-ember', count: 6, text: 'Collect six ash embers.' }], reward: { gold: 220, xp: 260 } },
  { id: 'rq-restless-dead', name: 'The Restless Dead', category: 'repeatable', giver: 'confessor', summary: 'The dead do not rest. The confessor prays. You do the rest.',
    objectives: [{ type: 'kill', tag: 'undead', count: 25, text: 'Lay twenty-five undead to rest.' }], reward: { gold: 250, xp: 300 } },
  { id: 'rq-spirit-purge', name: 'Spirit Purge', category: 'repeatable', giver: 'ancestor', summary: 'Spirits crowd the Haven\'s halls. The ancestor mutters about it.',
    objectives: [{ type: 'kill', tag: 'spirit', count: 15, text: 'Banish fifteen spirits.' }, { type: 'collect', item: 'ectoplasm', count: 4, text: 'Collect four ectoplasm.' }], reward: { gold: 300, xp: 400 } },
];

// ───────── Bloodline Ascension trials (stage 3) ─────────
const BL: Array<[BloodlineId, string, string, QuestObjective[]]> = [
  ['primordial', 'The Trial of the First Blood', 'Drink the oldest vintage in the world and not drown in it.', [
    { type: 'feed', blood: 'primordial', count: 5, text: 'Feed on primordial blood five times.' },
    { type: 'boss', boss: 'first-betrayer', text: 'Defeat the First Betrayer.' },
  ]],
  ['void', 'The Trial of the Empty Hand', 'Let nothing touch you until nothing is left to touch.', [
    { type: 'feed', blood: 'magical', count: 8, text: 'Feed on magical blood eight times.' },
    { type: 'depth', region: 'the-maw', floor: 3, text: 'Reach the third floor of the Maw.' },
  ]],
  ['dragon', 'The Trial of the Wyrm', 'Carry the dragon\'s heat without becoming its meal.', [
    { type: 'collect', item: 'dragon-scale', count: 5, text: 'Collect five dragon scales.' },
    { type: 'boss', boss: 'ashen-empress', text: 'Defeat the Ashen Empress.' },
  ]],
  ['moon', 'The Trial of the Veil', 'Walk in Ishara\'s silver without wanting to follow it home.', [
    { type: 'collect', item: 'moonpetal', count: 6, text: 'Gather six moonpetals.' },
    { type: 'boss', boss: 'pale-huntress', text: 'Defeat the Pale Huntress.' },
  ]],
  ['grave', 'The Trial of the Pale Mother', 'Hold death by the hand until it stops squeezing.', [
    { type: 'kill', tag: 'undead', count: 30, text: 'Lay thirty undead to rest.' },
    { type: 'boss', boss: 'hollow-king', text: 'Defeat the Hollow King.' },
  ]],
  ['royal', 'The Trial of the Crown', 'Sit where no one sat and rise without bowing.', [
    { type: 'feed', blood: 'royal', count: 5, text: 'Feed on royal blood five times.' },
    { type: 'boss', boss: 'gilded-regent', text: 'Defeat the Gilded Regent.' },
    { type: 'standing', house: 'veyrath', value: 40, text: 'Win House Veyrath\'s trust.' },
  ]],
  ['storm', 'The Trial of the Thunder', 'Ask the lightning for its name and answer it.', [
    { type: 'collect', item: 'storm-glass', count: 6, text: 'Collect six pieces of storm-glass.' },
    { type: 'depth', region: 'shattered-throne', floor: 3, text: 'Reach the third floor of the Shattered Throne.' },
  ]],
  ['frost', 'The Trial of the White Silence', 'Be as still as the ice and twice as patient.', [
    { type: 'collect', item: 'frost-shard', count: 8, text: 'Collect eight frost shards.' },
    { type: 'boss', boss: 'rime-queen', text: 'Defeat the Rime Queen.' },
  ]],
  ['dream', 'The Trial of the Lull', 'Wake up inside the dream and do not tell anyone.', [
    { type: 'collect', item: 'dream-moth-wing', count: 6, text: 'Collect six dream-moth wings.' },
    { type: 'depth', region: 'sunken-archive', floor: 3, text: 'Reach the third floor of the Archive.' },
  ]],
  ['abyssal', 'The Trial of the Deep', 'Walk to the bottom and listen.', [
    { type: 'feed', blood: 'corrupted', count: 6, text: 'Feed on corrupted blood six times.' },
    { type: 'boss', boss: 'drowned-bishop', text: 'Defeat the Drowned Bishop.' },
  ]],
  ['celestial', 'The Trial of the Radiant Lady', 'Let the sun brand your name and mean it.', [
    { type: 'feed', blood: 'holy', count: 6, text: 'Feed on holy blood six times.' },
    { type: 'boss', boss: 'crimson-saint', text: 'Defeat the Crimson Saint.' },
  ]],
  ['beast', 'The Trial of the Pack', 'Eat the beast before it eats the vampire.', [
    { type: 'feed', blood: 'beast', count: 12, text: 'Feed on beast blood twelve times.' },
    { type: 'boss', boss: 'mother-of-wolves', text: 'Defeat the Mother of Wolves.' },
  ]],
  ['shadow', 'The Trial of the Unseen', 'Be there and not there.', [
    { type: 'kill', tag: 'hunter', count: 20, text: 'Kill twenty hunters from the dark.' },
    { type: 'depth', region: 'crimson-capital', floor: 3, text: 'Reach the capital\'s lowest floor.' },
  ]],
  ['weaver', 'The Trial of the Thread', 'Spin until the web holds your weight.', [
    { type: 'collect', item: 'spider-silk', count: 8, text: 'Collect eight spider-silk bundles.' },
    { type: 'depth', region: 'frostmere', floor: 3, text: 'Reach the third floor of Frostmere.' },
  ]],
  ['time', 'The Trial of the Hours', 'Wait. Then wait again.', [
    { type: 'collect', item: 'sand-of-hours', count: 5, text: 'Collect five measures of hour-sand.' },
    { type: 'boss', boss: 'devourer-of-names', text: 'Defeat the Devourer of Names.' },
    { type: 'night', nights: 3, text: 'Wait out three nights.' },
  ]],
  ['soul', 'The Trial of the Lamp', 'Carry a soul without spilling.', [
    { type: 'collect', item: 'soul-gem', count: 6, text: 'Collect six soul gems.' },
    { type: 'feed', blood: 'spectral', count: 8, text: 'Feed on spectral blood eight times.' },
  ]],
  ['venom', 'The Trial of the Rose', 'Be poison to the one thing that cannot be poisoned.', [
    { type: 'collect', item: 'venom-gland', count: 8, text: 'Collect eight venom glands.' },
    { type: 'collect', item: 'nightshade', count: 6, text: 'Gather six nightshade.' },
    { type: 'depth', region: 'mirewater', floor: 3, text: 'Reach the third floor of Mirewater.' },
  ]],
  ['life', 'The Trial of the Green Hunger', 'Heal what you eat.', [
    { type: 'feed', blood: 'noble', count: 8, text: 'Feed on noble blood eight times.' },
    { type: 'collect', item: 'swamp-root', count: 6, text: 'Gather six swamp roots.' },
  ]],
  ['mirror', 'The Trial of the Seventh Face', 'See yourself and look away first.', [
    { type: 'collect', item: 'mirror-shard', count: 6, text: 'Collect six mirror shards.' },
    { type: 'standing', house: 'castellane', value: 30, text: 'Earn the Mirror Court\'s favour.' },
  ]],
  ['star', 'The Trial of the Red Star', 'Bleed light.', [
    { type: 'collect', item: 'star-iron', count: 5, text: 'Collect five lumps of star-iron.' },
    { type: 'boss', boss: 'star-eater', text: 'Defeat the Star-Eater.' },
  ]],
];

const BLOODLINE: QuestDef[] = BL.map(([id, name, summary, objectives], i) => ({
  id: `bq-${id}`,
  name,
  category: 'bloodline' as const,
  giver: 'ancestor',
  summary,
  objectives,
  reward: { xp: 4000 + i * 300, prestige: 20 + Math.floor(i / 2) * 2 },
}));

export const QUESTS: QuestDef[] = [
  ...MAIN,
  ...POLITICAL,
  ...EXPLORATION,
  ...DUNGEON,
  ...LEGENDARY,
  ...PERSONAL,
  ...REPEATABLE,
  ...BLOODLINE,
  ...HIDDEN,
];
