import type { CodexEntry, TimelineEvent, WorldEventDef } from '../types';

// ═════════════════════════════════════════════════════════════════════
//  TIMELINE — years counted from the Sundering (negative = B.S.)
// ═════════════════════════════════════════════════════════════════════

const ED = 'The Elder Dark';
const AY = 'Age of Ysmar';
const W7 = 'War of the Seven';
const AA = 'Age of Ash';
const AH = 'Age of Houses';
const AC = 'Age of the Covenant';

const t = (year: number, era: string, title: string, text: string): TimelineEvent => ({ year, era, title, text });

export const TIMELINE: TimelineEvent[] = [
  // ───── The Elder Dark ─────
  t(-12000, ED, `The Wandering Star`,
    `The northern hunters cut the first record of Sanguis into cave-stone: a red eye that opens once in the lifetime of a mountain. They called it the Wound That Watches. Their tallies do not say what they did when it came.`),
  t(-9000, ED, `The Stones of Moonfell`,
    `A ring of standing stones is raised in the glades that will become Moonfell, aligned not to the moon but to the Red Star's path. No people of the age had the craft to cut them. No one has ever learned who did.`),

  // ───── Age of Ysmar ─────
  t(-6000, AY, `The Founding of Ur-Velkhar`,
    `Sorcerer-clans of the river delta raise Ur-Velkhar, a city of lead-glass towers and stepped altars. Its first law is written in a priest's blood, and every law after follows the custom.`),
  t(-5100, AY, `The Concordance of Veins`,
    `The magi of Ysmar codify blood sorcery: that blood remembers, that blood obeys, that blood may be spent like coin. The empire grows rich on the arithmetic of other people's veins.`),
  t(-4310, AY, `Caedrith Crowned`,
    `Caedrith, youngest archmage of his century, takes the throne of Ysmar and orders the star-tables recalculated. His astronomers warn that the Red Star is near. He answers that he is counting on it.`),
  t(-4200, AY, `The Wound`,
    `Beneath the Red Star at its zenith, Caedrith opens the Wound and draws the star's blood down into the Grail of Ur. He drinks and does not die. He is the first vampire.`),
  t(-4200, AY, `The Seven Drink`,
    `Caedrith shares the Grail with six chosen companions: Ishara, Vorr, Nhal, Seliene, Morwen, and the youngest, whose name is now lost. Ysmar is ruled by night from that year on, and the Warm are taxed in blood.`),
  t(-3400, AY, `Vorr and the Last Dragon`,
    `Vorr the Unbroken hunts the last great dragon of the eastern peaks for nine years and drinks it dry. His blood never cools again. The Dragonblood and Beastblood lines both trace their heat to that kill.`),
  t(-2900, AY, `The Silver Shrines`,
    `Ishara of the Silver Veil builds her shrines among the old stones of Moonfell. She is the only one of the Seven who asks the stones what they are for. They do not tell the court what she learned.`),
  t(-1200, AY, `Nhal's Descent`,
    `Nhal walks into the dark beneath Ur-Velkhar with a lamp and returns forty years later without it, and without the whites of his eyes. He never says what he found. The Voidblood begins with his return.`),
  t(-800, AY, `The City Beneath the City`,
    `Morwen the Pale Mother begins her necropolis, burying the Warm and the turned alike, and teaching the bones to keep accounts. The deepest galleries of the Ossuary Deep are hers.`),
  t(-300, AY, `The Keepers of Hours Drink`,
    `The timekeepers of Ur-Velkhar are given the Grail in its last days, by a hand their records refuse to name. They become the first line of House Vesperine, and the oldest house in Eryndor.`),

  // ───── War of the Seven ─────
  t(-97, W7, `The Question at the Feast`,
    `At the Feast of the Seventh Century, the youngest Progenitor asks aloud what the Grail is for. Caedrith seals the Grail that night and forbids it to all but himself. The Seven divide by dawn.`),
  t(-88, W7, `Seliene Turns to the Sun`,
    `Seliene the Radiant walks out of Ur-Velkhar at noon and does not come back. In that age the sun did not yet burn the Grail's children, and she is seen kneeling before it in the eastern hills.`),
  t(-61, W7, `The Unwriting`,
    `The Devourer of Names eats the name of the Seventh Progenitor, and the Maw opens in the earth the same hour. Who summoned the Devourer is the first great mystery of the war, and the most carefully unasked.`),
  t(-40, W7, `The Hollow King's Bargain`,
    `A march-king of Ysmar's border sells his name to the Unwritten for a victory over Vorr's host. The victory is erased the next dawn, and so is the king. He is still in the Ossuary Deep, wearing a crown that casts no shadow.`),
  t(-9, W7, `The Last Parley`,
    `Six Progenitors meet under truce in the throne-hall of Ur-Velkhar. Ishara leaves early and writes to her siblings that she has seen the Grail darken. She names no one.`),
  t(-1, W7, `The Poisoned Cup`,
    `On the final night of the war, one of the Seven lifts the sealed Grail and poisons it. Every account of who did so contradicts every other.`),
  t(0, W7, `The Sundering`,
    `The poisoned Grail breaks. Ur-Velkhar shatters into the Shattered Throne, the sky cracks, and the Sunscar is laid upon all who carry the Red Star's blood. The calendar of Eryndor begins here, with the end of everything before.`),

  // ───── Age of Ash ─────
  t(1, AA, `The Long Morning`,
    `The first sunrise after the Sundering burns half the vampires of Ysmar where they stand. The survivors learn the new law of the world from ash on the wind.`),
  t(9, AA, `The Vanishing of the Seven`,
    `By the ninth year, none of the Progenitors can be found. Some are said to sleep, some to have died, some to have walked into the places they made. Caedrith's body is never recovered from the ruin.`),
  t(77, AA, `Hrimmara's Litter`,
    `In the Hollow Wood, Hrimmara bears the first Wolfkin litter. The Wolfkin will not say who sired it, and grow very quiet when vampires ask.`),
  t(140, AA, `The Salt Road Treaties`,
    `Starving mortal provinces agree to give blood to the broods in exchange for protection from worse broods. It is the first Tithe. The Warm sign in ink; the broods sign in what they are owed.`),

  // ───── Age of Houses ─────
  t(212, AH, `House Veyrath Founded`,
    `Lysenne Veyrath, First Heir of Caedrith's line, gathers the scattered royal blood and raises a keep from the ash that will become Vel'Sanguis. The Age of Houses begins with a crown no one voted for.`),
  t(220, AH, `The Briar Pact`,
    `Iseult Sylvaine makes her pact with the Hollow Wood and founds House Sylvaine. Her blood mends itself thereafter; the forest has never said what it took in return.`),
  t(231, AH, `The Unsigned Letters`,
    `Ilvane Noctharis, the Quiet Duchess, founds House Noctharis on debts and anonymous correspondence. Within a decade, every brood in Eryndor has received a letter it cannot answer.`),
  t(238, AH, `The Gravewife's Registry`,
    `Veshara Mortavane founds House Mortavane in the ossuary vaults of Morwen's old necropolis and begins the Registry of the Dead. The Registry still has blank lines reserved for the living.`),
  t(247, AH, `The Hammer-Born`,
    `Gorath Dravenmoor drinks the dragon-tainted blood of Vorr's line and founds House Dravenmoor, sworn to guard the Shattered Throne. Whether they guard the world from the ruin or the ruin from the world is not recorded.`),
  t(259, AH, `The Soft Word and the Hard Oath`,
    `Mirelle Velmora founds House Velmora upon suggestions whispered to the dreaming. The next winter, in 260, Edric Grimvald founds House Grimvald to witness oaths, and is the first who refuses her.`),
  t(266, AH, `The Silver Veil Lifted`,
    `Seliora Aurelith founds House Aurelith at Moonfell, claiming Ishara's moon-rites by right of blood. The Wolfkin of Moonfell attend the founding feast, uninvited, and are not turned away.`),
  t(274, AH, `The Unburnt Queen`,
    `Karvessa Kharvoss walks through the burning of her own hall and out the other side, and founds House Kharvoss in the Ashen Reach. Her heirs have burned and risen ever since.`),
  t(283, AH, `Physicians and Penitents`,
    `Oriel Seraphel founds House Seraphel to keep the blood-knowledge of Ysmar alive. In 290, Ostrel Halcyra, the Last Choir of Seliene, founds House Halcyra from vampires who still pray toward the sun that burns them.`),
  t(301, AH, `The Wreck-Queen and the Sleeper`,
    `Nerissa Thalassar founds House Thalassar on the drowned cargo of the Sundering coasts. In 318, Velka Isenreth rises from a century buried in the glaciers of Frostmere and founds House Isenreth, colder than she went in.`),
  t(333, AH, `The Spire Raised`,
    `Amaranth Eshkarra founds House Eshkarra and begins Starfall Spire upon a fallen star's crater. The first chart drawn there predicts the Red Star's return. It is filed and forgotten.`),
  t(371, AH, `The Stormborn`,
    `Hrogar Valdrek, struck by lightning on the night of his Embrace, founds House Valdrek and offers its swords to any brood that will pay. Most of them do, on credit.`),
  t(377, AH, `The First Chapel of the Dawn`,
    `Mortal survivors of a burned village raise a chapel to the Radiant Lady and swear to scour the night. The Order of the Dawn is born in a single room with one window facing east.`),
  t(402, AH, `The Gilded Ledger`,
    `Castor Ormund, who lent coin to the starving broods of the Age of Ash, collects by marrying a bankrupt Veyrath cadet line. House Ormund is founded on royal blood bought at interest.`),
  t(455, AH, `The Wedding of Roses`,
    `Ilsabet Zerevan poisons an entire wedding party and marries the sole survivor, founding House Zerevan. The surviving groom is said to have been grateful.`),
  t(512, AH, `The Doorless Lord`,
    `Seth Nyxaris, who claims Nhal's blood, founds House Nyxaris and is seen leaving a sealed room in which he was never seen to enter. The suspicion of the First Betrayal follows the name from that night.`),
  t(588, AH, `Who Was Two`,
    `Ysabeau Castellane drinks her twin sister on the night of her Embrace and founds House Castellane. Her reflection attends the founding without her.`),

  // ───── Age of the Covenant ─────
  t(641, AC, `The Covenant of Night`,
    `The houses sign the Covenant of Night in Vel'Sanguis, establishing the Crimson Throne, the Night Council of Seven Seats, and the Six Articles. Lysenne Veyrath is acclaimed first Sovereign. Grimvald witnesses every signature and keeps a copy no one else has read.`),
  t(709, AC, `The First Hunt of Ashes`,
    `A Kharvoss cadet slays his brother over a Tithe-road, and the Council calls the first Hunt of Ashes under the Fourth Article. Every house sends a hunter. The cadet's ashes are divided seven ways.`),
  t(788, AC, `The First Dawn Crusade`,
    `The Order of the Dawn marches on Vel'Sanguis with relic-banners and noon-mirrors and is drowned in the Mirewater before it arrives. The Order calls it a martyrdom and begins recruiting.`),
  t(860, AC, `The Grey Thirst`,
    `The First Plague sours the blood of the Warm across three provinces; vampires who feed on it go mad or grey. The Tithe is suspended for nine years, and the houses learn how thin their civility is when hungry.`),
  t(913, AC, `The Second Crusade and the Drowned Bishop`,
    `Bishop Maelor Vass leads the Second Crusade into the Mirewater to cleanse it and walks beneath the water at the head of his column. The swamp keeps him. His sermons can still be heard at low tide.`),
  t(1031, AC, `The Fall of Saint Aldric`,
    `During the Third Crusade, Aldric, the Order's greatest hunter, drinks the blood of his prey to keep fighting. He becomes the Crimson Saint. The Order canonises him in secret and seals him beneath the Cathedral of Dawn.`),
  t(1104, AC, `The Weeping Fever`,
    `The Second Plague passes from the Warm to the houses through the Tithe itself. Seraphel sells the cure to the Council and, by some accounts, sold the fever first.`),
  t(1188, AC, `The Betrayal at Lantern Hall`,
    `Sovereign Lysenne is slain at a banquet in Lantern Hall by her own Blood Marshal, who swore to her that morning. The Hunt of Ashes takes him within the week. Why he did it is never asked aloud; Aurek Veyrath I is acclaimed before the ashes cool.`),
  t(1391, AC, `The Ash Schism`,
    `Empress Vheyra leads the Kharvoss schismatics against the Council and, rather than yield her capital, burns it to the ground. The Ashen Reach has not stopped smouldering since. The Schism's true cause remains disputed.`),
  t(1502, AC, `The Hollow Plague`,
    `The Third Plague empties the cities of the Warm and leaves the Tithe-rolls half blank. House Eshkarra predicted it to the night; they were believed only afterwards.`),
  t(1611, AC, `The Acclamation of Aurek III`,
    `Sovereign Aurek Veyrath II dies in circumstances the Council record calls "concluded", and his son Aurek III is acclaimed the same night. The vote count is never published. A minor house that objected does not survive the decade.`),
  t(1702, AC, `The Freezing of the Court`,
    `Ysolde, the Rime Queen of Frostmere, freezes her entire court in living ice to keep it from ageing. They still stand in the Frozen Court, attending a duel that never ends.`),
  t(1839, AC, `The Throne Sleeps`,
    `Sovereign Aurek Veyrath III falls into an unwaking torpor. The Council names Ilvane Ormund steward of the Sleeping Throne, and the Gilded Regency begins. A year earlier, the Sovereign had travelled to Frostmere alone; no one has explained why.`),
  t(1844, AC, `The First Blood Moon`,
    `For the first time in living memory, the moon rises red over Vel'Sanguis. Eshkarra confirm what the barge-folk already sing: the Red Star is returning.`),
  t(1847, AC, `The Heir of No House`,
    `By Council decree, a new and minor dynasty is granted the ruined keep of Blackmoor Haven. Most of the Council voted for the grant without reading it. Some of them read it very carefully indeed.`),
];

// ═════════════════════════════════════════════════════════════════════
//  CODEX
// ═════════════════════════════════════════════════════════════════════

const c = (
  id: string, title: string, category: CodexEntry['category'], paras: string[], unlockedBy?: string,
): CodexEntry => ({ id, title, category, body: paras.join('\n\n'), ...(unlockedBy ? { unlockedBy } : {}) });

export const CODEX: CodexEntry[] = [
  // ───────────────────────── HISTORY ─────────────────────────
  c('codex-war-of-the-seven', `The War of the Seven`, 'history', [
    `For four thousand years the Seven Progenitors ruled Ysmar together, and for ninety-seven they tore it apart. The war began with a question asked at a feast and ended with a cup lifted in the dark.`,
    `No battle of the war is recorded the same way twice. Ishara's shrines say Vorr broke the river-gates; Dravenmoor's annals say Nhal opened them from inside. The Archive's accounts have holes where whole campaigns used to be.`,
    `What is agreed is the ending: one of the Seven poisoned the Grail of Ur, and the world broke along the crack. Every house has an opinion as to who. Every house is careful to whom it says so.`,
  ]),
  c('codex-cinder-crown', `The Cinder Crown`, 'history', [
    `The Cinder Tablet records a rite the Council has struck from every register: the Kharvoss crown-rite, by which a sovereign is crowned not by acclamation but by fire. Empress Vheyra performed it upon herself in 1390.`,
    `For one year, there were two Thrones in Eryndor. Six houses sent quiet envoys to the Ashen Reach; their names are scorched off the tablet, but the number of seals is not.`,
    `When Vheyra burned her capital in 1391, she was not denying it to the Council. She was destroying the evidence of who had knelt to her. Some of those who knelt sit on the Council still.`,
  ], 'sec-ash-tablet'),
  c('codex-regents-ledger', `The Regent's Ledger`, 'history', [
    `In the Gilded Regent's private vault lies a ledger in Ormund hand. Every night of the Regency is entered as a loan: to the Throne, from House Ormund, at compound interest. Should Aurek III wake, the debt is void. Should he never wake, the Throne belongs to the bank.`,
    `A second column records payments to House Valdrek "for readiness". A third records a nightly delivery to the Sovereign's bedchamber: one vial of Weaver tincture, signed for by the Regent, or by a very good copy of the Regent's hand.`,
    `The last page is a mirror. Whoever was keeping the ledger knew that someone else would one day read it, and wished to see their face when they did.`,
  ], 'boss:gilded-regent'),
  c('codex-seven-faces', `The Seven Faces`, 'history', [
    `The thing in the Broken Court wears Nhal's eyes and the Unwritten's absence, and when it speaks, all Seven speak with it. Dravenmoor have guarded it for sixteen centuries without once asking its name.`,
    `It claims it poisoned the Grail for love. It does not say love of what. When pressed, it says the Sundering was a mercy: that the Grail was not giving the Seven eternity but taking them, one swallow at a time, into the Red Star.`,
    `It may be the First Betrayer. It may be every one of the Seven, pressed together by the ruin into a single grief. It may simply be the shape the Shattered Throne takes when someone comes looking for an answer. It is very good at not being the answer.`,
  ], 'boss:first-betrayer'),

  // ───────────────────────── MYTH ─────────────────────────
  c('codex-myth-ysmari', `The Court Telling: The God's Heir`, 'myth', [
    `So the Veyrath court tells it: before the world was cold there was a god of red light, and his brothers slew him and cast his body into the sky. His wound is Sanguis, the Red Star, still bleeding light.`,
    `Caedrith alone among mortals understood that blood is inheritance. He opened the Wound to claim the dead god's legacy, as a son claims his father's crown, and shared it with six worthy servants. Thus the Crimson Throne is not a usurpation of heaven but its rightful succession.`,
    `The court version ends with the Betrayal, which it calls the Envy: a servant who wanted the inheritance whole. The Sunscar, it teaches, is the dead god's brothers punishing the heir for his servant's crime. It is the most flattering telling. It is taught first.`,
  ]),
  c('codex-myth-dawn', `The Dawn Telling: The Thief of Heaven`, 'myth', [
    `The Order of the Dawn teaches that the Red Star is no god but an ember of the Pit, flung upward in the first rebellion of the dark. Caedrith was a thief who drank from it and taught six others to steal.`,
    `Of those six, one repented. Seliene went out into the morning and asked forgiveness, and the sun wrapped her in its mantle and named her the Radiant Lady. In the Dawn's hymns, it was the Lady who "turned the cup to judgement", though the hymnals disagree on what that verse means.`,
    `The Sundering, in this telling, was heaven's verdict, and the Sunscar is mercy: a mark so that the faithful may know the damned by daylight. The Dawn's priests recite it at every burning, and believe it.`,
  ]),
  c('codex-myth-wolfkin', `The Wolfkin Telling: The Wolf's Eye`, 'myth', [
    `The Wolfkin do not tell this to vampires. The Red Star, they say, is the eye of the Great Wolf who hunts at the edge of the sky, and the moon is his mate. Once a mountain's lifetime he comes close enough to see whether his children are well fed.`,
    `The Seven were not heirs nor thieves but poachers. They stole from the Wolf's bowl while he looked away, and the Sundering was the Wolf's bite when he looked back. The sun burns vampires because the sun is the Wolf's hearth, and thieves are not welcome at it.`,
    `The telling ends with a pact: that one of the poachers came to the Wood after the bite, ashamed, with dragon-scale on his knuckles, and swore an oath beneath the oldest oak. From that oath the Wolfkin were born. The Wolfkin will not name him. The oath carved in the roots does.`,
  ], 'sec-wolf-oath'),

  // ───────────────────────── FAITH ─────────────────────────
  c('codex-order-of-the-dawn', `The Order of the Dawn`, 'faith', [
    `The mortal church of the Radiant Lady, founded in 377 in a chapel with one east-facing window, and since grown into the white-and-gold fortress of the Cathedral of Dawn. Its inquisitors patrol in pairs; its bells ring at noon like a threat.`,
    `The Order has launched three Dawn Crusades against the houses. All three were swallowed by the Mirewater. The Order counts this as proof of the Lady's patience, not her absence.`,
    `Its doctrine forbids any dealing with the night, yet its coffers swell in years the Tithe goes unpaid, and its Grand Inquisitors live a very long time. The faithful are taught not to count.`,
  ]),
  c('codex-cult-of-the-unwritten', `The Cult of the Unwritten`, 'faith', [
    `Vampires and Warm alike, the Cult worships the Seventh Progenitor and seeks to restore what the Devourer erased. Its members burn their own names from every register and go to the Maw to be forgotten on purpose.`,
    `They have no scripture but the Codex Unwritten, which no one can read, and no prayers but silence held for exactly as long as it takes to say a name. Their sign is a blank seal pressed in black wax.`,
    `The Council outlaws them. The Archivists track them. Every so often a cultist is caught and questioned, and the interrogator finds that his own name has become slightly harder to remember.`,
  ]),
  c('codex-ancestor-veneration', `The Veneration of Blood`, 'faith', [
    `The houses pray to no god. They pray to their blood. Each great house keeps an Ancestral Vault where the dust of its founders is mixed with wine and tasted on high nights, so that the dead may judge the living from within.`,
    `Every lineage traces itself to a Progenitor, and the Progenitors are honoured as ancestors, not deities: obeyed, feared, and frequently blamed. To swear "by the Seven" is to swear by family, which in Eryndor is the more dangerous oath.`,
    `In the older houses, the ancestors are said to answer. In Mortavane, this is not considered a figure of speech.`,
  ]),

  // ───────────────────────── LAW ─────────────────────────
  c('codex-article-one', `The First Article: Of Primordial Blood`, 'law', [
    `"Reveal not the blood of a Progenitor." Primordial blood, the undiluted inheritance of the Seven, is a state secret. Its possession is not a crime; its disclosure is.`,
    `The Article was the first signed in 641, before the Throne itself was named. The houses who carried Progenitor blood would not sign anything else until they were assured no one could prove what they carried.`,
    `In practice, the First Article means that every heir is tested in secret and the results are sealed by Grimvald. In practice, it also means that whoever holds those seals holds the Council.`,
  ]),
  c('codex-article-two', `The Second Article: Of the Tithe`, 'law', [
    `"Feed not upon another house's Tithe." Every mortal province pays blood to one house under treaties older than the Covenant, beginning with the Salt Road Treaties of 140 A.S. The Tithe is property, inherited, mortgaged and fought over.`,
    `To feed from another's Tithe is theft and an insult both. Tithe-wagons travel under house colours, and poaching them is the commonest cause of blood duels in Eryndor.`,
    `The Warm call it the Red Levy and have rebelled against it a dozen times. The houses call it the Covenant's foundation. Both are right, which is why it has never been reformed.`,
  ]),
  c('codex-article-three', `The Third Article: Of Heirs and the Rite of Commingling`, 'law', [
    `"None shall be Embraced or born without the Council's leave." No vampire may be made, by bite or by birth, unless the Council has recorded consent. Unlicensed get are destroyed; their makers answer for them.`,
    `Noble heirs are made by the Rite of Commingling: two vampires mingle their blood in a chalice and pour it into a chosen mortal vessel, who wakes carrying the heritage of both. Heirs inherit the bloodline gifts of each parent, and so every marriage between houses is a treaty, and every treaty a marriage.`,
    `The Council's leave is never refused outright. It is merely delayed, sometimes for a century, until the petitioning house remembers whom it ought to have married.`,
  ]),
  c('codex-article-four', `The Fourth Article: Of Kin-Slaying and the Hunt of Ashes`, 'law', [
    `"Kin-slaying is answered by the Hunt of Ashes." To destroy another vampire of the Covenant without the Council's sentence is the gravest crime in the realm.`,
    `When the Hunt is called, every house must send a hunter, and none may shelter the accused. The quarry is burned at dawn, and the ashes divided among the houses, so that each has a share in the act and none may later call it murder.`,
    `The first Hunt was called in 709. Some have been called on rumour, and at least one on a forged warrant. Grimvald, who keep the warrants, say there has never been a mistake. Grimvald are not known for their sense of humour.`,
  ]),
  c('codex-article-five', `The Fifth Article: Of the Sun`, 'law', [
    `"The Sun is the enemy of all. None shall treat with the Dawn." No house may parley, trade or correspond with the Order of the Dawn, nor shelter its servants. The penalty is the Hunt of Ashes.`,
    `It is the shortest of the Articles and the most often broken. Halcyra pray toward the sun. Thalassar's toll-ledgers have paid the Drowned Bishop for twelve generations. Every house hires Warm informers who also confess to Dawn priests.`,
    `The Council enforces the Fifth Article with great severity, whenever it is useful to.`,
  ]),
  c('codex-article-six', `The Sixth Article: Of the Throne and Acclamation`, 'law', [
    `"The Throne passes by Council acclamation, never by blood alone." When a Sovereign falls, the Night Council convenes beneath the Opera Dome and each of the Seven Seats speaks a name. The Throne is given when five speak the same one.`,
    `Acclamation is spoken aloud and witnessed by Grimvald, who seal it with the Sovereign's Signet in the new Sovereign's own blood. A Throne taken without the voices is no Throne, though it has occasionally been sat upon.`,
    `Veyrath have been acclaimed every time. Veyrath insist this is a coincidence of merit.`,
  ]),
  c('codex-guest-right', `Guest-Right`, 'law', [
    `Older than the Covenant and honoured more faithfully, guest-right binds host and guest from the moment blood is offered and accepted at the threshold. A guest may not be fed upon, harmed, or turned out before the next dusk.`,
    `The host offers a drop from the wrist, the guest touches it to their lips, and both are bound. To break guest-right is not kin-slaying under the Fourth Article, but every house treats it as worse.`,
    `The Wedding of Roses, by which House Zerevan was founded, was technically within guest-right: the poison was in the wine, and the wine was not the host's to offer. Zerevan have made a careful study of technicalities ever since.`,
  ]),

  // ───────────────────────── CULTURE ─────────────────────────
  c('codex-bloodline-festivals', `Bloodline Festivals and the Red Feasts`, 'culture', [
    `Each great house holds a festival on the anniversary of its founding: Aurelith feast at the full moon, Kharvoss light pyres in the Reach, Isenreth hold a feast at which no one may touch the food. Rival houses attend, smile, and count the guests.`,
    `The Red Feast is the oldest of these: a long table, a vintage of Warm volunteers, and a seating order negotiated for weeks. To be seated below the salt-cellar is a declaration of war; to be seated beside the host, a warning.`,
    `Festivals end with the masque. Everyone wears a face that is not theirs. Castellane attend all of them, and no one has ever been certain how many.`,
  ]),
  c('codex-blood-duels', `The Blood Duel`, 'culture', [
    `When honour cannot be settled by the Council, it is settled by the blade, and the blade is the duellist's own blood. Combatants open a vein and shape what flows into a weapon, and fight until one yields or runs dry.`,
    `Killing in a blood duel is not kin-slaying if both parties swore before a Grimvald witness. Grimvald charge for the service, and are always, somehow, available.`,
    `The finest duellists bleed beautifully. The most dangerous bleed very little. A courtier who refuses a duel is not dishonoured, merely invited to more dinners than is safe.`,
  ]),
  c('codex-mourning', `The Ash-Veil: Customs of Mourning`, 'culture', [
    `A vampire who dies leaves only ash, and the ash is gathered into a silver urn by the nearest kin before dawn. Mourners wear a veil of grey silk for one year and a night, and touch no blood that is not offered.`,
    `The ash is divided: a portion to the Ancestral Vault, a portion to the house of the spouse, a portion scattered at the Tithe-boundary so the dead may keep watch over what they were owed.`,
    `Among the Mortavane, mourning is not observed, on the grounds that the departed have merely moved downstairs.`,
  ]),
  c('codex-council-etiquette', `Etiquette of the Night Council`, 'culture', [
    `No one sits before the Sovereign sits, and since 1839 the Sovereign has not sat, so the Council stands through its sessions now. Some speeches have grown shorter. Others have not.`,
    `A Seat may speak only when the Speaker's chalice is passed to it. To interrupt is to forfeit the chalice for the night. To drink from it is permitted; to drink it dry is a declaration of no confidence.`,
    `Weapons are surrendered at the door; poisons are not, since there is no way to search for them politely. Envoys of lesser houses may attend from the gallery, where they are seen and occasionally used.`,
  ]),

  // ───────────────────────── ARTIFACT ─────────────────────────
  c('codex-grail-of-ur', `The Grail of Ur`, 'artifact', [
    `A chalice of dull Ysmari silver, plain to the point of insult, which held the blood of the Red Star at the Wound. From it the Seven drank, and from it every vampire in Eryndor descends.`,
    `It broke at the Sundering. Its shards are scattered through the Shattered Throne, and each one remembers the voices in the throne room on the final night. Seraphel have spent sixteen centuries trying to make one of them repeat itself.`,
    `Dravenmoor say the Grail cannot be remade. Seraphel say it can. Nobody has asked what it would hold if it were.`,
  ]),
  c('codex-sovereigns-signet', `The Sovereign's Signet`, 'artifact', [
    `A ring of black iron set with a drop of Primordial blood that has never dried. No acclamation is valid until the Signet is pressed into the new Sovereign's own blood before the Council. Aurek III wears it still, in his sleep.`,
    `The Crimson Requiem, an execution-score hidden behind the Opera Dome's organ and dated the last night of Aurek Veyrath II, tells what the Council's record omits. Its choir was assembled before the Council even convened. That night the Signet was taken from the hand of Aurek II before the acclamation was spoken, and the son pressed it in his own blood while the Seats were still speaking. The acclamation was given afterwards, to a Sovereign already crowned.`,
    `By the Sixth Article, the Throne has been empty since 1611. Grimvald hold the proof in an oath-crown in their vault, and have been waiting a long time for someone to ask for it.`,
  ], 'sec-requiem-score'),
  c('codex-sunscar-bell', `The Sunscar Bell`, 'artifact', [
    `The great bell of the Cathedral of Dawn rings at noon, and every vampire within a league feels the toll as a burn. It was cast in 790, after the First Crusade drowned, from silver the Order will only call "consecrated".`,
    `Aldric's last confession names the silver: shards of the Grail of Ur, carried out of the Shattered Throne by Dawn pilgrims. The Bell does not ring with sunlight. It rings with the Sundering, and every vampire hears the night their blood was cursed.`,
    `The confession says more. The Order's Grand Inquisitors drink stolen vampire blood to live as long as they do. The Radiant Lady's statue was cast from Seliene's own death-mask. And the oldest psalter, kept beneath the altar, says plainly that the Lady "made the cup bitter, that her siblings might sleep and not be swallowed". The Order recites this as a hymn of mercy. Aldric read it as a confession.`,
  ], 'boss:crimson-saint'),
  c('codex-codex-unwritten', `The Codex Unwritten`, 'artifact', [
    `The holy book of the Cult of the Unwritten is a volume of blank vellum that is somehow also full. Reading it leaves only a feeling; reading it twice leaves the reader's own name slightly loose.`,
    `The Devourer kept it at the bottom of the Sunken Archive, and its final pages explain why. The Codex is the Devourer's index: every name it has ever eaten, entered in its own silence. The Seventh's name is on the first page, and the first page has been eaten too.`,
    `In the margin of that page, in faded Ysmari ink, is the summoning seal used to call the Devourer in 61 B.S.: a crowned ring. It is the device of Ysmar's royal house. The Cult believes this proves Caedrith erased his own youngest companion. The Archivists point out that the seal was used by every royal servant in the empire.`,
  ], 'boss:devourer-of-names'),
  c('codex-heart-in-the-ice', `The Heart in the Ice`, 'artifact', [
    `Beneath the dais of the Frozen Court, a heart is preserved in clear ice. It beats once each minute. It has done so since 1838, when the Rimeborn Chronicle records that the Sovereign came to Frostmere alone and asked the Rime Queen to freeze something precious.`,
    `The Isenreth physicians will say only that it is a Veyrath heart, and very old. If it is Aurek III's, then the body in the Vermilion Palace has an empty chest, and the Zerevan chalice and the Weaver tincture have been poisoning nothing at all.`,
    `A heart kept from harm is a heart kept from someone. The Chronicle does not say whom the Sovereign feared. It only notes that he wept, and that the tears froze before they fell.`,
  ], 'sec-frozen-heart'),

  // ───────────────────────── PROPHECY ─────────────────────────
  c('codex-augury-of-ash', `The Augury of Ash`, 'prophecy', [
    `"When the Red Star drinks the moon, the heir of no house shall wake the Firstborn, and the Throne shall drink of new blood or drown in old." Found scratched in Ysmari script on a cinder-slab in the Age of Ash, its author unknown.`,
    `Every house reads it differently. Veyrath read the Firstborn as Caedrith, and the heir as their own coming saviour. The Cult reads the Firstborn as the Seventh, who was "first before the First". Ormund read it as a warning about lending.`,
    `The barge-folk of the Mirewater sing a longer version with a last line no house will repeat: "and the old will not let go."`,
  ]),
  c('codex-keepers-hour', `The Keeper's Hour`, 'prophecy', [
    `House Vesperine has a motto of two words, "Not yet", and a prophecy of not many more: "At the last hour, the Keeper will speak the name, and every clock will begin again."`,
    `The Dusk Keepers claim to have seen the Sundering coming and to have said nothing, because it was not yet time. The Council has never forgiven them, nor stopped inviting them.`,
    `Fewer than a dozen Vesperine remain. The last Keeper of Hours is said to carry a brass hourglass that stopped on the night of the Sundering. When asked when the last hour will come, she checks it, and says: not yet.`,
  ]),
  c('codex-wolf-mothers-howl', `The Wolf-Mother's Howl`, 'prophecy', [
    `Hrimmara taught her litters one howl that is never used in the hunt. Its words, in the old tongue of the Wood: "When the eye opens wide, the debt comes due; the thief's children will pay the thief's price, and the Wood will be paid in full."`,
    `The Wolfkin understand the "eye" to be the Red Star at its nearest. The thief is whichever of the Seven first stole from the Wolf's bowl. The "children" are everyone.`,
    `Defeated, the Mother of Wolves said one thing more, as a creditor speaks to a debtor: that the debt was not owed by the Seven but by the one who swore the oath beneath the oak, and that his blood still runs hot in the house that guards the Shattered Throne.`,
  ], 'boss:mother-of-wolves'),
  c('codex-falling-chart', `The Falling Chart`, 'prophecy', [
    `Eshkarra's last true chart maps where the stars will fall, and something else besides: the Red Star's path, drawn across three thousand years of observation. The path bends. Each return is a little lower, a little earlier, as if the star is being drawn down.`,
    `The line ends not in the sky but at the Maw. Something at the bottom of the world is pulling the Red Star home.`,
    `In the margin, an Eshkarra astrologer has corrected the Augury of Ash. The Ysmari word read as "moon" is ishar, which is also the root of a name. "When the Red Star drinks Ishara." Beneath, in a shakier hand: "she is still there, under Moonfell. She has been waiting for it."`,
  ], 'sec-starchart'),

  // ───────────────────────── PLACE ─────────────────────────
  c('codex-place-hollow-wood', `The Hollow Wood`, 'place', [
    `A forest of hollow oaks grown around the dead, where the Wolfkin have held their territories since the Age of Ash. Tithe-roads run through it; wolves count the wagons.`,
    `The Covenant never quite claimed the Wood. House Sylvaine speaks for it at Council, though they insist they are its mouthpiece, not its mistress. No two maps of it agree.`,
  ]),
  c('codex-place-ossuary-deep', `The Ossuary Deep`, 'place', [
    `Morwen's necropolis, begun eight centuries before the Sundering and kept by House Mortavane since 238. Its galleries spiral downward, each older than the last, every bone filed and accounted for.`,
    `The dead were meant to sleep here. Something taught them a chant. In the lowest crypt sits the Hollow King, who sold his name in the War of the Seven and has been trying to remember it since.`,
  ]),
  c('codex-place-mirewater', `Mirewater`, 'place', [
    `A black bayou of toll-barges, drowned villages and slow green lantern-light, threaded with Thalassar's trade canals and everyone else's smuggling.`,
    `Three Dawn Crusades walked into the Mirewater and none walked out; their Bishop still preaches beneath the surface. The barge-folk say the swamp is not hungry. It is merely keeping accounts.`,
  ]),
  c('codex-place-crimson-capital', `Vel'Sanguis, the Crimson Capital`, 'place', [
    `Raised from the ash by Lysenne Veyrath after 212 and consecrated as capital when the Covenant was signed in 641, Vel'Sanguis is a city of red spires, opera and knives. Every house keeps an ambassador here, and every ambassador keeps a second door.`,
    `Since the Throne fell asleep the halls have begun to rot from the top down. The court dances anyway. It is considered poor form to look at the ceiling.`,
  ]),
  c('codex-place-ashen-reach', `The Ashen Reach`, 'place', [
    `A plateau of fused slag and drifting cinders, once the heart of House Kharvoss. In 1391 Empress Vheyra burned her own capital rather than yield it to the Council, and the Burnt Citadel has been warm ever since.`,
    `Kharvoss still trade in glass and iron from its edges. Its centre belongs to Vheyra, who may be dead, and to the fire, which has not been told.`,
  ]),
  c('codex-place-frostmere', `Frostmere`, 'place', [
    `A frozen lake-kingdom beneath black cliffs, seat of House Isenreth, where no fire is permitted and the blood keeps. The Rimeborn sought to slow death by cold and succeeded in slowing everything.`,
    `In 1702 the Rime Queen froze her whole court to spare it from age. The courtiers still stand in the Frozen Court, watching her duels. They never applaud.`,
  ]),
  c('codex-place-sunken-archive', `The Sunken Archive`, 'place', [
    `A flooded library where the Archivists keep everything Eryndor has ever written down, shelves rising out of black water. House Seraphel pays for its upkeep and its discretion.`,
    `Lately something has been eating the index. The Archivists no longer ask which chapters are gone; they write around the holes, and keep their own names on a card in their breast pocket, just in case.`,
  ]),
  c('codex-place-moonfell', `Moonfell`, 'place', [
    `The silver-lit ruins of Ishara's shrines, built among standing stones older than Ysmar. The moon has never entirely left them, and the nights there are said to be too beautiful to survive.`,
    `House Aurelith keeps its oldest rites in the glades, and the Wolfkin clans keep the rest. Both claim the shrines; neither will spend a night alone in the deepest of them.`,
  ]),
  c('codex-place-cathedral-dawn', `The Cathedral of Dawn`, 'place', [
    `The white-and-gold fortress of the Order of the Dawn, built over a drained crater of the Sundering. Its nave is flooded with consecrated sunlight, and its bell is felt more than heard.`,
    `Beneath the altar the Order keeps its relics, its archives, and its saint: Aldric the Crimson, sealed in the crypt and praying still. The Cathedral is the one place in Eryndor where a vampire cannot hide in the shade, because the shade is also holy.`,
  ]),
  c('codex-place-shattered-throne', `The Shattered Throne`, 'place', [
    `The ruin of Ur-Velkhar, where Caedrith drank from the Grail and where the Grail was poisoned. Its towers float in a cracked sky; its throne-hall still echoes with the last night of the War of the Seven.`,
    `House Dravenmoor guards it, and lately guards it from very far away. The Iron Vigil at its gate has not changed watch in some time. Nobody lives in the Shattered Throne who can still remember it.`,
  ]),
  c('codex-place-starfall-spire', `Starfall Spire`, 'place', [
    `A needle of black stone on the crater of a fallen star, the tallest tower in Eryndor, raised by House Eshkarra to chart the return of the Red Star.`,
    `When the sky cracked, the stars began to fall, and the astrologers followed them up. The observatories are abandoned now. The charts are still pinned to the domes, and they are still being updated, by no hand anyone has seen.`,
  ]),
  c('codex-place-the-maw', `The Maw`, 'place', [
    `A sinkhole that does not echo, ringed by the camps of the Cult of the Unwritten. It opened on the day the Devourer ate the Seventh's name, and it has been getting deeper ever since.`,
    `Pilgrims go down to be forgotten. Few are allowed to leave remembered. House Nyxaris keeps a door in its crypt that opens onto the Maw, and lately something on the other side has been knocking.`,
  ]),
  c('codex-place-blackmoor-haven', `Blackmoor Haven`, 'place', [
    `A ruined keep on a moor of black heather, granted by Council decree in 1847 to a new dynasty of no house. The grant was passed in a single session with no debate, which in Vel'Sanguis is itself a kind of debate.`,
    `Blackmoor was the seat of House Ravelle, the minor house that objected to the acclamation of 1611 and was extinguished within the decade. Their crest has been chiselled from every lintel. Their portraits face the walls.`,
    `The keep's cellars go further down than its towers go up. The steward who handed over the keys mentioned this as though it were a feature.`,
  ]),
  c('codex-place-vermilion-palace', `The Vermilion Palace`, 'place', [
    `The palace of the Crimson Throne crowns Vel'Sanguis, its spires lacquered the colour of old blood. Beneath its Opera Dome the Night Council sits; above it, in a bedchamber no one may enter without a Veyrath escort, the Sovereign sleeps.`,
    `Its halls are lined with portraits of every Sovereign and, by tradition, a covered frame for the next. Since 1839 servants report the cloth over that frame has been lifted from inside, more than once.`,
  ]),

  // ───────────────────────── FIGURE ─────────────────────────
  c('codex-figure-caedrith', `Caedrith the Crowned`, 'figure', [
    `Archmage-king of Ysmar, opener of the Wound, the first vampire. He drank the blood of the Red Star in 4200 B.S. and ruled for four thousand years by night. All Royal and Primordial blood descends from him.`,
    `He shared the Grail with six, and then, in the War of the Seven, took it back. His body was never found in the ruin of Ur-Velkhar. Those who drink from the Primordial Well beneath the throne dais claim to hear a heartbeat that is not their own.`,
  ]),
  c('codex-figure-ishara', `Ishara of the Silver Veil`, 'figure', [
    `Second to drink, mother of the Moonblood, keeper of the Silver Shrines of Moonfell. She was the only Progenitor who asked the old stones what they were for.`,
    `Before the end she wrote to her siblings that she had seen the Grail darken in the hand of "the one who wished us whole", and asked their forgiveness for not acting. She did not say whose hand. Her huntress still guards the shrines, waiting for an order that never came.`,
  ]),
  c('codex-figure-vorr', `Vorr the Unbroken`, 'figure', [
    `Warlord of the Seven, father of the Beastblood, who hunted the last great dragon for nine years and drank it, and so fathered the Dragonblood as well. His blood never cooled again.`,
    `House Dravenmoor descends from his line. The Wolfkin speak of a burning stranger with dragon-scale on his knuckles who came to the Hollow Wood in the Age of Ash. Vorr is said to have died at the Sundering. No one who says so was present.`,
  ]),
  c('codex-figure-nhal', `Nhal the Hollow-Eyed`, 'figure', [
    `Father of the Voidblood, who walked into the dark beneath Ur-Velkhar and came back with eyes like empty wells. House Nyxaris claims his line and wears his reputation as a crown.`,
    `Nhal is the Progenitor most often named as the First Betrayer. The Seraphel assayers who examined the Grail shards found a sediment at the lip that they could match to only one blood: Voidblood, black as the Maw. Nyxaris reply that dregs show who drank last, not who poured.`,
  ]),
  c('codex-figure-seliene', `Seliene the Radiant`, 'figure', [
    `Mother of the Celestial blood, who walked out of Ur-Velkhar at noon in 88 B.S. and knelt to the sun. In that age the sun did not yet burn the Grail's children. After the Sundering, it burned everyone but her memory.`,
    `The Order of the Dawn reveres her as the Radiant Lady. House Halcyra, descended from those who followed her, prays to her and burns a little every time. Whether she still lives, no one on either side will say aloud.`,
  ]),
  c('codex-figure-morwen', `Morwen the Pale Mother`, 'figure', [
    `Mother of the Graveblood and the Soulblood, builder of the city beneath the city. She taught the dead to keep accounts and the living to keep their distance.`,
    `Her own epitaph, cut before the Sundering, reads: "I drank and did not forget. I buried and did not weep. If the Grail was poisoned, then I was the first to taste it." Mortavane say this is grief. Others note it is also an alibi.`,
  ]),
  c('codex-figure-the-unwritten', `The Unwritten`, 'figure', [
    `The Seventh Progenitor was the youngest of the Grail's companions and the only one who asked what the Grail was for. The answer, he wrote, was that the Grail did not give; it borrowed. Every century of eternity was a mouthful the Red Star meant to take back.`,
    `For asking, he was erased. Not by the poisoner, his testament says, but by "the one who asked me to stay silent". He is the rumoured source of Timeblood and Mirrorblood, which is why House Vesperine keep the hours and House Castellane keep their mirrors covered.`,
    `What remains in the Maw is a shape the void pours itself around, a hunger that remembers being a king. It asks only that someone say his name. Nobody can. Some fear that the first who does will have answered the Augury.`,
  ], 'boss:forgotten-progenitor'),
  c('codex-figure-aurek', `Aurek Veyrath III`, 'figure', [
    `Sovereign of the Crimson Throne, acclaimed in 1611 on the night of his father's fall, and for two centuries the most capable ruler the Covenant had known. In 1839 he lay down and did not rise.`,
    `Veyrath keep vigil at his bedside in shifts. Zerevan are blamed for the chalice he drank from that night; Ormund are blamed for profiting; Velmora are blamed on principle. The year before, he went to Frostmere alone, and returned colder than any Veyrath ought to be.`,
  ]),
  c('codex-figure-aldric', `Saint Aldric the Crimson`, 'figure', [
    `The greatest hunter the Order of the Dawn ever raised, who in the Third Crusade of 1031 drank the blood of his prey to keep fighting, and became what he swore to destroy.`,
    `The Order canonised him in secret and sealed him alive beneath the Cathedral of Dawn, where he prays still, though the prayers burn him now. His confessional is sealed in wax. The thumbprint in the seal has never quite dried.`,
  ]),
  c('codex-figure-gilded-regent', `The Gilded Regent`, 'figure', [
    `Ilvane Ormund, steward of the Sleeping Throne, named by a narrow Council vote in 1839 to rule in the Sovereign's name. Gold leaf has replaced half the Regent's flesh, and no one recalls the Regent ever eating in company.`,
    `The Regent insists the Throne is merely resting and bills the Council for every night of it. House Castellane are rumoured to be on retainer. Sharp-eyed courtiers have noted that the Regent's gilding is on the left side at some sessions, and the right at others.`,
  ]),

  // ───────────────────────── PHENOMENON ─────────────────────────
  c('codex-phenomenon-sunscar', `The Sunscar`, 'phenomenon', [
    `Since the Sundering, sunlight burns all who carry the Red Star's blood. Before it, the Seven walked by day. The Sunscar is not heat but memory: the light remembers the night the sky cracked, and reminds the blood.`,
    `Old vampires burn slower, and young ones in moments. Halcyra pray in the light and live, a little less each time. Seraphel have tinctures that turn the burn to a blister, for a price and a while.`,
  ]),
  c('codex-phenomenon-red-star', `The Red Star and the Blood Moons`, 'phenomenon', [
    `Sanguis, the Red Star, returns roughly once each eighteen centuries. Its light stirs old blood: wounds open, torpid elders turn in their sleep, and dormant bloodlines wake in heirs who never knew they carried them.`,
    `When it draws near, the moon rises red. Blood Moons were legend until 1844; now they come every few seasons. Beneath them, every vein runs richer and every beast runs mad, and the Warm bar their doors.`,
    `The Eshkarra say the star is returning. They have stopped saying when.`,
  ]),
  c('codex-phenomenon-torpor', `Torpor`, 'phenomenon', [
    `A vampire starved, wounded beyond mending, or simply too old may fall into torpor: a sleep without dreams, breath or end. Most wake within a decade. Some are woken by blood of sufficient age. Some are never woken, and become furniture.`,
    `Torpor can be induced. Weaver tinctures can hold a sleeper under; Primordial blood is said to rouse one. It is the second fact that makes the first so dangerous to a sleeping Sovereign.`,
  ]),
  c('codex-phenomenon-hunger', `The Hunger and the Frenzy`, 'phenomenon', [
    `The Hunger is the Red Star's due: a drain that never ceases, paid in the blood of the living. Fed, it is a quiet tenant. Starved, it is the landlord.`,
    `Frenzy is what follows when the Hunger is left unpaid, or when blood is spilled too near: the mind leaves, and the teeth stay. A vampire in frenzy remembers nothing and is held responsible for everything.`,
    `House Seraphel is said to possess a cure for the Hunger. If so, it would free vampirekind from the Tithe, the Warm, and every treaty built on both. It is perhaps for the best that it is only said.`,
  ]),
  c('codex-phenomenon-mutation', `Bloodline Mutation`, 'phenomenon', [
    `The Rite of Commingling does not merely add one heritage to another. Sometimes the blood argues with itself, and from the argument comes something neither parent carried: a new gift, a new flaw, a new hunger.`,
    `Mutations surge under the Red Star. The Council registers every one under the First Article, and seals the register. Houses who breed for them deny it; houses who do not, envy them.`,
  ]),
  c('codex-phenomenon-unwriting', `The Unwriting`, 'phenomenon', [
    `When the Devourer eats a name, the thing named does not die. It is simply unwritten: absent from records, from memory, from the shape of the sentences around it. What is left behind is a hole exactly the size of what was there.`,
    `The Archivists have learned to read the holes. In every account of the poisoning of the Grail, there is a gap where the poisoner's name should be, and it is the same shape as the gap left by the Seventh.`,
    `The Archivists also note that the Devourer eats everywhere, and that a hole shaped like the Seventh is precisely what the Devourer would leave behind no matter whose name was there before it. They have stamped the question "unresolved" three times and struck it each time. Something keeps writing it back.`,
  ], 'sec-unwritten-page'),
];

// ═════════════════════════════════════════════════════════════════════
//  WORLD EVENTS
// ═════════════════════════════════════════════════════════════════════

export const WORLD_EVENTS: WorldEventDef[] = [
  {
    id: 'blood-moon',
    name: 'Blood Moon',
    icon: 'evil-moon',
    color: '#b3122e',
    description: 'Blood abilities deal +30% damage and feeding yields +50% blood. Enemies have +20% HP, ancient blood drops more often, and experience is increased by 30%.',
    lore: 'The Red Star draws near and the moon rises the colour of an open vein. Old blood stirs in every crypt. The Warm bar their doors and pray it is only a moon.',
    durationNights: 2,
    weight: 10,
    effects: {
      playerMods: [{ stat: 'bloodDmg', mul: 0.3 }, { stat: 'feedPower', mul: 0.5 }],
      enemyHpMul: 1.2,
      bloodTypeBoost: 'ancient',
      xpMul: 1.3,
    },
  },
  {
    id: 'ancient-awakening',
    name: 'Ancient Awakening',
    icon: 'coffin',
    color: '#cfc8aa',
    description: 'The Hollow King appears in a random region, and ancient blood drops more often.',
    lore: 'Something in the lowest crypts has remembered wanting a name. The bones of the Ossuary Deep begin their chant again, and the crown that casts no shadow is seen walking above ground.',
    durationNights: 3,
    weight: 3,
    effects: { region: 'random', bossOverride: 'hollow-king', bloodTypeBoost: 'ancient' },
  },
  {
    id: 'royal-coronation',
    name: 'Royal Coronation',
    icon: 'crown',
    color: '#d4a84a',
    description: 'A house crowns a new head, shifting the balance of the Council.',
    lore: 'A house has acclaimed a new head, and every envoy in Vel\'Sanguis is rewriting their letters. The coronation feast is lavish. The seating plan is a declaration of war.',
    durationNights: 2,
    weight: 3,
    effects: { houseEvent: 'coronation' },
  },
  {
    id: 'noble-rebellion',
    name: 'Noble Rebellion',
    icon: 'rally-the-troops',
    color: '#7a2a1a',
    description: 'A house rises against the Council, upsetting alliances and rivalries.',
    lore: 'With the Throne asleep, someone has decided the Covenant is asleep too. Banners go up in the provinces, and the Council remembers that the Hunt of Ashes needs every house to answer.',
    durationNights: 3,
    weight: 3,
    effects: { houseEvent: 'rebellion' },
  },
  {
    id: 'bloodline-discovery',
    name: 'Bloodline Discovery',
    icon: 'dna1',
    color: '#9a2a6a',
    description: 'Blood Affinity is increased by 3, and Elixirs of Awakening are 40% cheaper.',
    lore: 'A dormant heritage has woken in an heir who never knew they carried it, and the Council\'s registrars are busy. Alchemists sell awakening draughts cheap, hoping to find the next one first.',
    durationNights: 2,
    weight: 4,
    effects: {
      playerMods: [{ stat: 'aff', add: 3 }],
      priceMul: { 'elixir-awakening': 0.6 },
    },
  },
  {
    id: 'dungeon-invasion',
    name: 'Dungeon Invasion',
    icon: 'dungeon-gate',
    color: '#5a4a6a',
    description: 'Enemies in a random region have +30% HP and drop 50% more crowns.',
    lore: 'Something has broken out of the deep places and taken the roads above. The region\'s lords are offering bounties in gold, because they have nothing else left to offer.',
    durationNights: 2,
    weight: 10,
    effects: { region: 'random', enemyHpMul: 1.3, goldMul: 1.5 },
  },
  {
    id: 'plague-of-the-damned',
    name: 'Plague of the Damned',
    icon: 'plague-doctor-profile',
    color: '#6a7a3a',
    description: 'Feeding has a 25% chance to corrupt, corrupted blood drops more often, and crimson potions and warding salt cost far more.',
    lore: 'The blood of the Warm has soured again, as it did in the Grey Thirst and the Hollow Plague. Every house watches its Tithe-rolls and its neighbours. Seraphel, as ever, has a cure for sale.',
    durationNights: 3,
    weight: 4,
    effects: {
      corruptionChance: 0.25,
      bloodTypeBoost: 'corrupted',
      priceMul: { 'potion-crimson': 1.8, 'salt-of-warding': 2 },
    },
  },
  {
    id: 'dragon-appearance',
    name: 'Ashen Wings',
    icon: 'spiked-dragon-head',
    color: '#ff7a30',
    description: 'The Ashen Empress appears in a random region, and experience is increased by 50%.',
    lore: 'Dragon-shadow passes over the provinces and ash falls like snow. The Empress Vheyra has left her embers to see what the Council has made of the world she burned. She is not impressed.',
    durationNights: 2,
    weight: 2,
    effects: { region: 'random', bossOverride: 'ashen-empress', xpMul: 1.5 },
  },
  {
    id: 'royal-tournament',
    name: 'Royal Tournament',
    icon: 'crossed-swords',
    color: '#c8a040',
    description: 'A grand tournament of blood duels is held, and crowns found are increased by 30%.',
    lore: 'The Gilded Regent has called a tournament of blood duels beneath the Opera Dome, so that the houses may bleed on each other instead of on the Regency. The purses are generous. The Regent is billing them to the Throne.',
    durationNights: 3,
    weight: 3,
    effects: { houseEvent: 'tournament', goldMul: 1.3 },
  },
  {
    id: 'bloodline-festival',
    name: 'Bloodline Festival',
    icon: 'carnival-mask',
    color: '#c0305a',
    description: 'Feeding yields 25% more blood, and Elixirs of Awakening are 40% cheaper.',
    lore: 'A great house celebrates its founding with a Red Feast and a masque, and the Warm of the province are generously compensated. Everyone wears a face that is not theirs. Castellane attend, in some number.',
    durationNights: 2,
    weight: 10,
    effects: {
      playerMods: [{ stat: 'feedPower', mul: 0.25 }],
      priceMul: { 'elixir-awakening': 0.6 },
    },
  },
  {
    id: 'eclipse-of-shadows',
    name: 'Eclipse of Shadows',
    icon: 'eclipse',
    color: '#2a2040',
    description: 'Stealth is increased by 30% and shadow resistance by 20%, but enemies deal 10% more damage.',
    lore: 'A black disc eats the sun at midday, and for an hour the Sunscar forgets itself. The oldest murals of Moonfell show a vampire standing unharmed in such a dark. The Order rings every bell it has.',
    durationNights: 1,
    weight: 4,
    effects: {
      playerMods: [{ stat: 'stealth', add: 0.3 }, { stat: 'res_shadow', add: 0.2 }],
      enemyDmgMul: 1.1,
    },
  },
  {
    id: 'progenitor-awakening',
    name: 'Progenitor Stirring',
    icon: 'bleeding-eye',
    color: '#9d4aff',
    description: 'Primordial blood drops more often and experience is doubled, but enemies have +50% HP and deal 30% more damage.',
    lore: 'Somewhere beneath the world, one of the Seven has turned in their sleep. Every vampire in Eryndor feels it in the teeth. The Augury of Ash is quoted in every salon, and no one laughs.',
    durationNights: 1,
    weight: 1,
    effects: { bloodTypeBoost: 'primordial', enemyHpMul: 1.5, enemyDmgMul: 1.3, xpMul: 2 },
  },
];
