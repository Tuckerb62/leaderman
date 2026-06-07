const isoToday = () => new Date().toISOString().slice(0, 10);

const sourceTitle = (id) => sourceCards.find((source) => source.id === id)?.title || 'the source tradition';

const historicalExamples = {
  'ask-before-advise': {
    title: 'Socrates in Athens',
    summary:
      'Plato’s dialogues present Socrates as a teacher who often used questions before assertions. Whether one treats the dialogues as philosophy, literature, or civic memory, the pattern is useful: questioning exposed assumptions before advice hardened into doctrine.',
    analogy:
      'Advice is like grabbing the steering wheel from a learner driver; a good question is more like turning on the dashboard lights so they can see the road themselves.',
  },
  'separate-impact-intent': {
    title: 'The Cuban Missile Crisis',
    summary:
      'During the 1962 Cuban Missile Crisis, U.S. leaders had to interpret Soviet actions without assuming every signal had the same intention. The disciplined separation of observable moves, possible motives, and consequences helped create room for back-channel negotiation.',
    analogy:
      'Impact and intent are like smoke and the source of a fire: smoke tells you something is happening, but you still need to investigate before declaring what caused it.',
  },
  'decision-type': {
    title: 'Apollo 13',
    summary:
      'After the Apollo 13 oxygen tank explosion in 1970, NASA had to separate urgent technical decisions from broader mission tradeoffs. Some choices needed immediate engineering action; others required careful coordination because the cost of being wrong was life or death.',
    analogy:
      'Decision process is like choosing a vehicle: a bicycle works for a short errand, but you do not cross an ocean on it.',
  },
  'hidden-rule': {
    title: 'Toyota production learning',
    summary:
      'Toyota’s production system became famous partly because problems could be surfaced rather than hidden. The exact practices varied across plants and eras, but the leadership principle is stable: quality improves when people are permitted to name defects early.',
    analogy:
      'A hidden rule is like an invisible tripwire. People may look clumsy, but the real problem is that nobody marked the wire.',
  },
  'power-test': {
    title: 'The Roman Republic’s fear of kingship',
    summary:
      'Roman political culture carried a long suspicion of concentrated personal rule. The details are complex, but the recurring lesson is clear: power without visible limits creates fear even when leaders claim necessity.',
    analogy:
      'Power is like a loaded tool in a shared room. It may be useful, but everyone needs to know where it points and who is allowed to touch it.',
  },
  'calm-is-contagious': {
    title: 'George Washington at Newburgh',
    summary:
      'In 1783, George Washington addressed officers frustrated by unpaid compensation. His restraint and appeal to shared duty helped prevent a dangerous confrontation between the army and civilian authority.',
    analogy:
      'A leader’s mood is like the temperature in a room. People may not notice the thermostat, but they feel the air.',
  },
  'technical-adaptive': {
    title: 'The British abolition campaign',
    summary:
      'The long campaign against the British slave trade required more than a legal technicality. Activists, politicians, religious groups, and public opinion had to shift norms, incentives, and political will over time.',
    analogy:
      'A technical fix is changing a lightbulb; an adaptive challenge is teaching the whole building to stop overloading the circuit.',
  },
  'criteria-first': {
    title: 'Civil service reform',
    summary:
      'Civil service reforms in the United States and Britain aimed to reduce patronage by using more standardized criteria for public roles. The systems were imperfect, but the reform logic was that public judgment improves when offices are not simply rewards for friends.',
    analogy:
      'Criteria are like a ruler placed on the table before measuring. If you pick the ruler afterward, it is too easy to choose the one that gives your favorite answer.',
  },
  'interests-not-positions': {
    title: 'Camp David Accords',
    summary:
      'The 1978 Camp David negotiations were not solved by pretending Egypt and Israel had the same position. Progress required attention to deeper interests: security, sovereignty, recognition, and political survival.',
    analogy:
      'Positions are the sticker price; interests are why the buyer and seller came to the market in the first place.',
  },
  'legitimacy-control': {
    title: 'Augustus and Roman legitimacy',
    summary:
      'Augustus held extraordinary power, but he wrapped that power in restored institutions, public order, and familiar Roman forms. Historians debate the balance between republic and monarchy, but the case shows how raw control seeks legitimacy to endure.',
    analogy:
      'Control is a lock on a door; legitimacy is people believing the building should have that door in the first place.',
  },
  'ai-verification': {
    title: 'Early aviation checklists',
    summary:
      'Aviation safety improved as pilots and engineers adopted checklists for complex machines. The lesson transfers carefully to AI: complexity demands verification routines because fluent operation can hide fragile assumptions.',
    analogy:
      'AI output is like a confident intern with a huge library and no lived accountability. Useful, but not the final signer.',
  },
  'small-promise': {
    title: 'Washington’s resignation of command',
    summary:
      'Washington’s resignation as commander in chief in 1783 strengthened trust because it made a public promise about civilian authority real. The act mattered because restraint became visible.',
    analogy:
      'Trust is built like masonry. Grand speeches are banners; kept promises are bricks.',
  },
  'feedback-example': {
    title: 'After-action review tradition',
    summary:
      'Military and emergency-response teams often use after-action reviews to move from vague judgment to specific observation. The point is not blame first; it is learning what actually happened.',
    analogy:
      'Vague feedback is fog. A concrete example is a road sign.',
  },
  'productive-stress': {
    title: 'The Meiji Restoration',
    summary:
      'Japan’s Meiji-era reforms involved intense pressure to adapt institutions, industry, military capacity, and education. The historical case is too complex for simple praise, but it shows that change requires pressure and scaffolding together.',
    analogy:
      'Productive stress is like training weight: enough resistance builds strength; too much causes injury.',
  },
  'speak-last': {
    title: 'Abraham Lincoln’s cabinet',
    summary:
      'Lincoln’s cabinet included strong personalities and former rivals. Accounts differ in emphasis, but his leadership is often studied for how he listened, absorbed disagreement, and still owned final decisions.',
    analogy:
      'If the loudest instrument starts first, the orchestra tunes itself around it. Sometimes the conductor must listen before setting tempo.',
  },
  'diagnosis-before-goal': {
    title: 'The Marshall Plan',
    summary:
      'The Marshall Plan was not merely a goal of “help Europe.” It diagnosed economic breakdown, political instability, and reconstruction needs after World War II, then aligned resources with that diagnosis.',
    analogy:
      'A goal without diagnosis is a prescription written before examining the patient.',
  },
  'boundary-next-step': {
    title: 'Washington’s two-term precedent',
    summary:
      'Washington’s decision to leave office after two terms created a boundary around personal power before it was legally required. The precedent helped teach a young republic what restraint could look like.',
    analogy:
      'A boundary is a fence with a gate and a sign. If nobody knows where it is or what happens at the gate, it is just a wish.',
  },
  'map-feedback-loop': {
    title: 'The Dust Bowl',
    summary:
      'The Dust Bowl emerged from drought interacting with farming practices, economic pressure, and ecological fragility. It is a classic reminder that repeated harm often comes from loops, not one villain.',
    analogy:
      'A feedback loop is like a microphone too close to a speaker. The screech is not one note; it is the system feeding itself.',
  },
  'charisma-character': {
    title: 'Demagogues in democratic history',
    summary:
      'Ancient and modern democracies have repeatedly worried about charismatic figures who can mobilize crowds while weakening judgment. The point is not that charisma is bad; it is that attraction is not proof of character.',
    analogy:
      'Charisma is stage lighting. It can reveal substance, but it can also make a cardboard wall look solid.',
  },
  'agency-in-coaching': {
    title: 'Booker T. Washington and institution-building',
    summary:
      'Whatever one thinks of Washington’s politics, his institution-building at Tuskegee emphasized capacity, skill, and self-sustaining development. Leadership was not only instruction; it was building capability.',
    analogy:
      'Solving every problem for someone is handing them fish; building capacity is teaching them how to repair the net.',
  },
  'moral-disagreement': {
    title: 'The U.S. constitutional debates',
    summary:
      'The Federalist and Anti-Federalist debates were not only technical disagreements. They reflected competing fears and values: order, liberty, scale, representation, and concentrated power.',
    analogy:
      'A moral conflict is often two alarms ringing at once. The work is to identify what each alarm is trying to protect.',
  },
  'make-work-visible': {
    title: 'Wartime operations rooms',
    summary:
      'Operations rooms in war and emergency management make work visible so dispersed actors can coordinate. The lesson transfers to ordinary leadership: visibility reduces guessing when it clarifies ownership and state.',
    analogy:
      'Visible work is like air traffic control. The point is not to stare at every plane; it is to prevent collisions.',
  },
  'two-way-door': {
    title: 'Scientific experimentation',
    summary:
      'Scientific progress often depends on reversible tests, peer criticism, and revision. Leaders can borrow the discipline without pretending every human decision is a laboratory experiment.',
    analogy:
      'A reversible decision is a pencil sketch; an irreversible one is wet concrete.',
  },
  'listen-for-resistance': {
    title: 'Public health resistance',
    summary:
      'Public health campaigns repeatedly show that resistance can signal distrust, misinformation, overload, or real tradeoffs. Treating all resistance as ignorance often makes adoption harder.',
    analogy:
      'Resistance is like noise in an engine. It may be annoying, but it can tell you where the system is under strain.',
  },
  'public-private-standard': {
    title: 'Cincinnatus as civic myth',
    summary:
      'The Roman story of Cincinnatus, whether treated as history or civic legend, became a symbol of private restraint and public duty. The useful lesson is the standard it represented: power should not become personal appetite.',
    analogy:
      'Private habits are roots. The public tree eventually shows what has been growing underground.',
  },
  'objective-criteria': {
    title: 'Arbitration and treaty practice',
    summary:
      'Diplomacy and arbitration often depend on standards that both sides can recognize, even when they dislike the result. Objective criteria do not remove conflict, but they can reduce pure ego contests.',
    analogy:
      'Criteria are the measuring tape both carpenters agree to use before arguing whether the table is level.',
  },
  'tell-the-tradeoff': {
    title: 'Churchill’s wartime communication',
    summary:
      'Winston Churchill’s early wartime speeches did not promise easy victory. Whatever one thinks of his broader record, his communication is studied for naming danger while sustaining resolve.',
    analogy:
      'A hidden tradeoff is a bill slipped under the door. Eventually someone pays it, and trust falls when they learn it was hidden.',
  },
  'learning-after-error': {
    title: 'Aviation safety culture',
    summary:
      'Modern aviation safety relies heavily on learning from incidents, near misses, and system conditions. Accountability remains, but the deeper aim is preventing recurrence rather than simply finding a person to shame.',
    analogy:
      'An error is a cracked tile. You can blame the foot that stepped there, or you can inspect why the floor keeps cracking.',
  },
  'least-privilege-life': {
    title: 'Compartmentalization in security history',
    summary:
      'Military, intelligence, and computer-security practices all use compartmentalization to limit damage when something fails. The leadership translation is scoped trust: enough access to act, not enough to endanger the whole system unnecessarily.',
    analogy:
      'Least privilege is like watertight compartments on a ship. A leak is still bad, but it does not have to sink everything.',
  },
  'meaning-without-spin': {
    title: 'Viktor Frankl after catastrophe',
    summary:
      'Frankl’s work is often remembered for meaning under suffering, but the careful lesson is not that suffering is good. It is that truthful meaning can help people endure what should still be named honestly.',
    analogy:
      'Meaning is a compass, not a blindfold. It should orient people without covering the terrain.',
  },
  'challenge-with-care': {
    title: 'Quaker abolitionist organizing',
    summary:
      'Many abolitionist networks combined moral seriousness with community discipline and persuasion. The lesson is not politeness alone; it is the pairing of care for people with direct challenge to harm.',
    analogy:
      'Care without challenge is a soft chair that never lets someone stand. Challenge without care is a shove.',
  },
  'authority-pattern': {
    title: 'Court politics across monarchies',
    summary:
      'Royal courts often rewarded flattery, fear, and indirect communication. The recurring pattern is that authority changes behavior around it, sometimes before the authority figure realizes it.',
    analogy:
      'Authority is gravity in a room. Even when invisible, it bends how people move.',
  },
  'context-before-delegation': {
    title: 'Mission command',
    summary:
      'Mission command traditions emphasize intent, context, and disciplined initiative rather than mere task lists. The idea is that people can adapt when they understand the purpose and boundaries.',
    analogy:
      'Delegating without context is handing someone a map with no destination. They may move, but not necessarily toward the mission.',
  },
  'bias-check': {
    title: 'Intelligence failures',
    summary:
      'Major intelligence failures are often studied for how confident stories can harden before contradictory signals are weighed. The lesson is not that intuition is useless, but that confidence needs challenge.',
    analogy:
      'A confident story is a bright flashlight. It helps you see one path while making the shadows around it deeper.',
  },
  'shape-the-path': {
    title: 'Public sanitation reforms',
    summary:
      'Public health improvements often came from changing environments: clean water systems, waste removal, safer streets, and better defaults. Moral exhortation mattered less when the path itself changed.',
    analogy:
      'Willpower is pushing a boulder uphill; path design is laying a track.',
  },
  'productive-conflict': {
    title: 'The Federal Convention',
    summary:
      'The U.S. Constitutional Convention involved sharp disagreement over representation, power, and structure. The result was imperfect and morally compromised, but it shows that consequential design required conflict, not shallow harmony.',
    analogy:
      'Productive conflict is like a forge. Heat can destroy, but controlled heat shapes metal.',
  },
  'calibrated-question': {
    title: 'Shuttle diplomacy',
    summary:
      'Diplomats often use carefully framed questions to reveal constraints without forcing public humiliation. The method works when it creates room for problem solving rather than a trap.',
    analogy:
      'A calibrated question is a hinge. It opens a heavy door without kicking it down.',
  },
  'public-accountability': {
    title: 'The Nuremberg principle',
    summary:
      'After World War II, the Nuremberg trials reinforced the idea that official authority does not erase accountability for choices. The broader leadership lesson is that power needs visible answerability.',
    analogy:
      'Accountability is a receipt for power. It shows who spent what, why, and with whose permission.',
  },
  'opposing-truths': {
    title: 'Lincoln and emancipation timing',
    summary:
      'Lincoln’s decisions around emancipation involved moral urgency, constitutional argument, military timing, and political coalition. The history is contested, but it shows leadership under competing truths rather than simple slogans.',
    analogy:
      'Opposing truths are like two hands carrying a fragile object. Drop either hand and the object falls.',
  },
  'attention-budget': {
    title: 'Monastic rules of attention',
    summary:
      'Religious and philosophical traditions have long treated attention as a moral discipline. Monastic rules, Stoic exercises, and study practices all recognized that attention shapes the person who acts.',
    analogy:
      'Attention is a treasury. Spend it carelessly and even a rich mind becomes poor.',
  },
  'source-of-resistance': {
    title: 'Reform resistance in empires',
    summary:
      'Large reform efforts in empires and states often met resistance from groups protecting status, livelihood, identity, or security. Treating all resistance as evil misses useful diagnosis.',
    analogy:
      'Resistance is not one substance. It can be brake fluid, rust, or a warning light, and each calls for a different repair.',
  },
  'decision-record': {
    title: 'Cabinet minutes and institutional memory',
    summary:
      'Governments and organizations keep minutes because memory is political and fragile. A decision record makes future learning possible by preserving what was known, chosen, and deferred.',
    analogy:
      'A decision record is a trail marker. It does not walk the path for you, but it helps future travelers know why the route bent.',
  },
  'technology-human-cost': {
    title: 'Industrial Revolution labor',
    summary:
      'The Industrial Revolution produced enormous productivity while also disrupting labor, family life, cities, and political movements. Technology leadership must count human consequences alongside output.',
    analogy:
      'A new machine is a lever. It moves weight, but it also changes who stands where.',
  },
  'repair-after-harm': {
    title: 'Truth and reconciliation processes',
    summary:
      'Truth and reconciliation efforts vary widely and are often incomplete, but they rest on a core idea: societies cannot repair what they refuse to name. Acknowledgment is not the whole repair, but it begins the work.',
    analogy:
      'Repair is not painting over a crack; it is finding the stress point and strengthening it.',
  },
  'coalition-map': {
    title: 'Civil rights coalition-building',
    summary:
      'The U.S. civil rights movement involved churches, students, labor allies, legal strategists, local organizers, and national politicians. Coalition power came from aligning different interests around shared pressure and moral purpose.',
    analogy:
      'A coalition is a bridge made of different materials. Strength depends on how the pieces bear load together.',
  },
  'standard-of-truth': {
    title: 'Watergate and institutional truth-seeking',
    summary:
      'The Watergate investigations showed the importance of records, journalism, courts, and congressional oversight when executive power concealed truth. The lesson is institutional as much as personal.',
    analogy:
      'Truth standards are load-bearing beams. Remove them quietly and the building may stand for a while, but it is no longer safe.',
  },
  'stoic-control': {
    title: 'Epictetus under empire',
    summary:
      'Epictetus lived in the Roman world and taught that freedom begins with disciplined judgment about what is and is not up to us. His life is often used carefully as an example of inner agency under external constraint.',
    analogy:
      'Stoic control is like sorting tools before a storm: you cannot command the weather, but you can decide what you carry and how you stand.',
  },
  'stoic-memento-mori': {
    title: 'Marcus Aurelius on campaign',
    summary:
      'Marcus Aurelius wrote much of what became Meditations while carrying imperial responsibility and military pressure. The repeated attention to mortality was not gloom; it was a way to keep ambition, irritation, and fear in proportion.',
    analogy:
      'Memento mori is a ruler held against urgency. It does not make life smaller; it reveals which demands are actually large.',
  },
  'stoic-view-from-above': {
    title: 'Roman cosmopolitan imagination',
    summary:
      'Stoic writers often asked people to imagine themselves as citizens of a wider whole rather than prisoners of local insult or status. That mental widening helped shrink vanity and strengthen duty.',
    analogy:
      'The view from above is like climbing a hill before judging a traffic jam: the pattern becomes clearer when your ego is not stuck inside one car.',
  },
  'virtue-as-habit': {
    title: 'Aristotle’s polis and character',
    summary:
      'Aristotle wrote about virtue as cultivated through habit, education, and practical judgment inside a community. The historical setting differs sharply from modern life, but the basic insight remains: character is trained by repeated action.',
    analogy:
      'Virtue is not a trophy in a case; it is a path worn into the ground by walking it many times.',
  },
  'plato-cave': {
    title: 'Athenian democracy and philosophical suspicion',
    summary:
      'Plato wrote after Athens had condemned Socrates and after democratic politics had shown both power and volatility. The cave image warns leaders that what a group treats as obvious may be only shadow.',
    analogy:
      'The cave is like mistaking a dashboard warning light for the whole engine. The signal matters, but it is not the full reality.',
  },
  'epicurean-enough': {
    title: 'Epicurus and the garden',
    summary:
      'Epicurus taught in a community remembered as the Garden, where philosophy focused on friendship, moderation, and freedom from needless fear. The school is often misread as indulgence, but its deeper pattern is disciplined enoughness.',
    analogy:
      'Epicurean enoughness is like clearing apps from a crowded phone: the device becomes more useful when fewer things steal power.',
  },
  'cynic-freedom-from-status': {
    title: 'Diogenes confronting convention',
    summary:
      'Stories about Diogenes are part history, part philosophical theater, but they consistently mock status, luxury, and social pretense. Cynicism asks what remains when applause no longer controls you.',
    analogy:
      'Cynic freedom is like taking off a costume you forgot you were wearing. The first shock is embarrassment; the second is relief.',
  },
  'confucian-ritual': {
    title: 'Confucius and social repair',
    summary:
      'Confucius taught during political disorder and treated ritual, learning, and humane conduct as ways to repair relationships and government. Ritual was not empty performance when rightly understood; it trained attention to roles, respect, and obligation.',
    analogy:
      'Ritual is like the grammar of social life. You can speak without grammar, but shared form helps people understand and trust one another.',
  },
  'daoist-wu-wei': {
    title: 'Daoist suspicion of over-control',
    summary:
      'Daoist texts such as the Dao De Jing often warn that forced order can create disorder. Wu wei is not laziness; it is action so well fitted to reality that it does not fight the grain.',
    analogy:
      'Wu wei is like steering a canoe with the current instead of thrashing against the river until everyone is exhausted.',
  },
  'buddhist-impermanence': {
    title: 'The Buddha’s renunciation story',
    summary:
      'Traditional accounts describe the Buddha confronting sickness, aging, death, and renunciation. Whatever one’s religious view, the philosophical pattern is powerful: denial of impermanence distorts desire and judgment.',
    analogy:
      'Impermanence is like weather. You do not become wise by pretending it will not change; you become wise by learning how to travel through change.',
  },
  'existential-choice': {
    title: 'Existentialism after European crisis',
    summary:
      'Existentialist writers worked in the shadow of war, occupation, alienation, and modern uncertainty. They insisted that refusing to choose is still a choice, and that meaning requires responsibility.',
    analogy:
      'Existential choice is like signing your name in wet cement. Even hesitation leaves a mark.',
  },
  'pragmatic-truth': {
    title: 'American pragmatism and democratic experiment',
    summary:
      'Pragmatists such as William James and John Dewey treated ideas as instruments tested in experience. In democratic life, this made inquiry, education, revision, and consequences central.',
    analogy:
      'Pragmatism is like testing a bridge by engineering standards and real traffic, not by admiring the blueprint alone.',
  },
  'habit-identity': {
    title: 'Benjamin Franklin’s habit ledger',
    summary:
      'Franklin’s famous virtue-tracking system was imperfect and self-conscious, but it shows an old pattern behind modern habit science: identity changes through repeated visible practice, not through aspiration alone.',
    analogy:
      'A habit is like a vote cast every day. One vote rarely changes the whole election, but repeated votes decide who governs.',
  },
  'proactive-circle': {
    title: 'Nelson Mandela on Robben Island',
    summary:
      'Mandela’s prison years are often studied for disciplined attention to what remained governable: conduct, learning, relationships, and symbolic restraint. The case should not romanticize imprisonment; it shows agency under severe constraint.',
    analogy:
      'A circle of influence is like a campfire in bad weather: it does not control the storm, but it gives you a place to work from.',
  },
  'deep-work-protection': {
    title: 'Darwin’s protected thinking routine',
    summary:
      'Charles Darwin’s work at Down House mixed observation, correspondence, walking, and protected thought over years. The broader lesson is that serious insight often needs guarded attention and slow synthesis.',
    analogy:
      'Deep work is like cultivating a garden. If every passerby can dig in the soil, nothing delicate grows.',
  },
  'growth-mindset-practice': {
    title: 'Tuskegee and capacity building',
    summary:
      'Booker T. Washington’s institution-building at Tuskegee is contested in political terms, but the capacity-building lesson is useful: education, repetition, and practical skill can change what people believe they are capable of doing.',
    analogy:
      'Ability is like a path through woods. The first walk is rough; repeated travel makes the route visible.',
  },
  'grit-with-direction': {
    title: 'Shackleton’s Antarctic expedition',
    summary:
      'Ernest Shackleton’s Endurance expedition is remembered less for reaching the original goal than for redirecting persistence toward survival. Grit without updated direction would have been ruinous.',
    analogy:
      'Grit is an engine; direction is the steering wheel. More power does not help if the vehicle points at a cliff.',
  },
  'keystone-habit': {
    title: 'Public sanitation reforms',
    summary:
      'Sanitation reforms in cities changed many outcomes at once because they altered a repeated environmental pattern. A keystone habit works similarly at personal scale: one repeated practice can reshape many downstream choices.',
    analogy:
      'A keystone habit is like the first gear in a machine. Move it and several other gears begin to turn.',
  },
  'frankenstein-responsibility': {
    title: 'The nuclear age and creator responsibility',
    summary:
      'Mary Shelley’s Frankenstein long predates nuclear weapons and artificial intelligence, but later technological history made its warning feel durable: creation without responsibility can abandon others to consequences the creator refuses to face.',
    analogy:
      'A creation is like a fire you light in a shared house. Genius is not enough; someone must watch the flame.',
  },
  'first-impressions': {
    title: 'Intelligence assessment before crises',
    summary:
      'Governments and organizations have repeatedly suffered when first impressions hardened into certainty before contradictory evidence was weighed. Austen’s social insight transfers carefully: perception can be skilled, but pride and prejudice distort it.',
    analogy:
      'A first impression is a pencil sketch, not a verdict carved into stone.',
  },
  'obsession-narrows-vision': {
    title: 'Napoleon’s invasion of Russia',
    summary:
      'Napoleon’s 1812 campaign is often used as a warning about overreach, fixation, logistics, and the refusal to update. The historical details are vast, but the leadership pattern is clear: obsession can shrink the field of vision.',
    analogy:
      'Obsession is a telescope held too long to one eye. It magnifies one target and hides the cliff beside you.',
  },
  'mercy-and-justice': {
    title: 'Postwar reconciliation and accountability',
    summary:
      'Societies after war often struggle to balance punishment, truth, mercy, and repair. Les Miserables helps train this moral imagination: law without mercy can become cruelty, while mercy without responsibility can become evasion.',
    analogy:
      'Justice and mercy are two hands on the same wheel. Use only one and the vehicle pulls off course.',
  },
  'moral-complexity': {
    title: 'Truth and reconciliation processes',
    summary:
      'Truth commissions and reconciliation efforts show that public moral repair rarely fits simple innocence and guilt categories. The Brothers Karamazov trains attention to conscience, responsibility, and the hidden interior life behind public actions.',
    analogy:
      'Moral judgment is like entering a room with several lights. One bright bulb can still leave corners in shadow.',
  },
  'return-to-purpose': {
    title: 'Washington returning power to civilian rule',
    summary:
      'The Odyssey is a story of wandering, cunning, temptation, violence, and homecoming. In leadership terms, it pairs well with civic cases where the test is not only winning power but returning to purpose after danger passes.',
    analogy:
      'Purpose is a harbor. Strategy is the sailing skill that matters only because there is somewhere worth returning to.',
  },
  'melian-power': {
    title: 'The Melian Dialogue',
    summary:
      'Thucydides presents Athens telling Melos that the strong do what they can and the weak suffer what they must. Whether read as analysis, warning, or tragic realism, it is a permanent lesson in power without justice.',
    analogy:
      'Power without justice is like a sword used as a ruler. It can impose a line, but it cannot make the line fair.',
  },
  'republic-norm-decay': {
    title: 'The late Roman Republic',
    summary:
      'The Roman Republic did not fall in one moment. Ambition, emergency powers, faction, inequality, violence, and norm-breaking accumulated until familiar institutions could no longer contain personal power.',
    analogy:
      'Norms are like mortar between bricks. You notice them most after the wall starts moving.',
  },
  'revolution-legitimacy': {
    title: 'The French Revolution',
    summary:
      'The French Revolution shows how fiscal crisis, inequality, legitimacy failure, ideology, war, and fear can interact. It is too large for one lesson, but it warns that broken legitimacy can make reform arrive late and violence arrive fast.',
    analogy:
      'Legitimacy is pressure in a pipe. Ignore the cracks long enough and repair becomes explosion control.',
  },
  'mobilization-trap': {
    title: 'Europe in August 1914',
    summary:
      'The opening of World War I is often studied for alliances, mobilization timetables, honor, fear, and rigid plans. Leaders became trapped partly by systems they had built to move faster than judgment.',
    analogy:
      'A plan can become railroad tracks: useful while aimed correctly, dangerous when nobody can turn.',
  },
  'rivals-coalition': {
    title: 'Lincoln’s wartime cabinet',
    summary:
      'Lincoln’s cabinet included rivals, strong egos, and competing views during civil war. The lesson is not sentimental unity; it is that a leader can use disagreement as information while still owning the final decision.',
    analogy:
      'A coalition is like a bridge made from different materials. Its strength depends on how the tensions are joined.',
  },
  'civil-rights-discipline': {
    title: 'The U.S. civil rights movement',
    summary:
      'The civil rights movement combined moral argument, legal strategy, religious organizing, disciplined protest, media visibility, and enormous courage. Its history warns that moral power still requires strategy and sacrifice.',
    analogy:
      'Disciplined protest is like a lens focusing sunlight. Moral heat existed already; organization concentrated it.',
  },
  'reconstruction-unfinished': {
    title: 'Reconstruction after the U.S. Civil War',
    summary:
      'Reconstruction showed that winning a war and building a just political order are different tasks. Constitutional change, federal enforcement, local violence, economic power, and abandoned commitments shaped what followed.',
    analogy:
      'Victory is opening a door. Institution-building is making sure people can safely live in the room beyond it.',
  },
};

function buildLessonArticle(lesson) {
  const sourceNames = lesson.sourceIds.map(sourceTitle).join(', ');
  const example = historicalExamples[lesson.slug] || {
    title: 'Historical leadership pattern',
    summary:
      'Across history, leaders have repeatedly succeeded or failed based on whether they matched their method to the human reality in front of them. The details differ by era, but the durable pattern is that judgment, restraint, and clear process matter most when pressure rises.',
    analogy:
      'A leadership idea is like a tool in a workshop: useful when matched to the material, dangerous when swung at every problem the same way.',
  };

  return [
    `${lesson.title} is not a slogan; it is a decision habit. This lesson draws on ${sourceNames}, but it is deliberately paraphrased rather than treated as a substitute for the original works. The core idea is simple: ${lesson.coreIdea}`,
    `The leadership mistake this guards against is using one comfortable move for every situation. ${lesson.whatItGetsRight} At the same time, ${lesson.whatItMisses.toLowerCase()} A serious learner should hold the useful idea and the limitation together rather than turning either into doctrine.`,
    `Historical example: ${example.title}. ${example.summary} The point is not that history gives an identical script for today. The point is that history gives tested patterns: people react to incentives, power changes what can be said, information arrives unevenly, and decisions carry second-order consequences.`,
    `Analogy: ${example.analogy} In your own life, the practical question is not “do I understand this concept?” but “can I recognize the moment when this concept should change my behavior?” The practice rep is: ${lesson.practiceRep}`,
    `Use the idea with discipline. ${lesson.opposingView} That opposing view may be right in some contexts, especially when urgency, safety, or formal authority matters more than dialogue. The fidelity rule for this lesson is to cite the source tradition, use the historical example as a pattern rather than proof, and avoid pretending one book or case settles every situation.`,
    `Caution: ${lesson.ethicsCheck} A future leader needs power literacy, but power literacy should increase truthfulness, consent, accountability, and restraint. Review question: ${lesson.reviewPrompt}`,
  ];
}

export const domains = [
  'Self-Command',
  'Communication',
  'Influence',
  'Judgment',
  'Teams',
  'Ethics',
  'Power',
  'Conflict',
  'Systems',
  'Technology/Future',
  'Philosophy',
  'Self-Help',
  'Literature',
  'History',
];

export const philosophySchools = [
  {
    id: 'stoicism',
    name: 'Stoicism',
    era: 'Hellenistic and Roman',
    summary: 'Train judgment, attention, courage, and restraint by separating what depends on you from what does not.',
    lessonSlugs: ['stoic-control', 'stoic-memento-mori', 'stoic-view-from-above'],
  },
  {
    id: 'virtue-ethics',
    name: 'Aristotelian Virtue Ethics',
    era: 'Classical Greek',
    summary: 'Build character through repeated action, practical wisdom, and the search for the fitting mean between extremes.',
    lessonSlugs: ['virtue-as-habit'],
  },
  {
    id: 'platonism',
    name: 'Platonism',
    era: 'Classical Greek',
    summary: 'Question appearances, educate desire, and ask what truth, justice, and the good require beyond popularity.',
    lessonSlugs: ['plato-cave'],
  },
  {
    id: 'epicureanism',
    name: 'Epicureanism',
    era: 'Hellenistic Greek',
    summary: 'Seek stable contentment by reducing vain desires, fearing less, and valuing friendship, moderation, and peace.',
    lessonSlugs: ['epicurean-enough'],
  },
  {
    id: 'cynicism',
    name: 'Cynicism',
    era: 'Hellenistic Greek',
    summary: 'Use simplicity and shameless honesty to expose status games, convention, and false need.',
    lessonSlugs: ['cynic-freedom-from-status'],
  },
  {
    id: 'confucianism',
    name: 'Confucianism',
    era: 'Classical Chinese',
    summary: 'Treat leadership as cultivated character expressed through ritual, duty, family, education, and humane conduct.',
    lessonSlugs: ['confucian-ritual'],
  },
  {
    id: 'daoism',
    name: 'Daoism',
    era: 'Classical Chinese',
    summary: 'Learn when less force creates better order, and when over-control makes systems brittle.',
    lessonSlugs: ['daoist-wu-wei'],
  },
  {
    id: 'buddhist-philosophy',
    name: 'Buddhist Philosophy',
    era: 'Ancient Indian and global traditions',
    summary: 'Study impermanence, craving, attention, compassion, and the causes of suffering without turning insight into passivity.',
    lessonSlugs: ['buddhist-impermanence'],
  },
  {
    id: 'existentialism',
    name: 'Existentialism',
    era: 'Modern European',
    summary: 'Own choice, responsibility, anxiety, and meaning when no system can make the decision for you.',
    lessonSlugs: ['existential-choice'],
  },
  {
    id: 'pragmatism',
    name: 'Pragmatism',
    era: 'Modern American',
    summary: 'Judge ideas by their consequences, revise through experience, and treat truth-seeking as disciplined inquiry.',
    lessonSlugs: ['pragmatic-truth'],
  },
];

export const sourceCards = [
  {
    id: 'src-ccl-fundamental-4',
    title: 'The Fundamental 4',
    author: 'Center for Creative Leadership',
    domain: 'Self-Command',
    coreArgument: 'Leadership development repeatedly returns to self-awareness, communication, influence, and learning agility.',
    usefulIdea: 'Treat leadership as a practice loop, not a title or personality trait.',
    blindSpot: 'The model is broad, so it needs scenarios and reps to become behavior.',
    opposingView: 'Some traditions put character, ethics, or systems thinking before skill taxonomies.',
    application: 'Use the four skills as a weekly diagnostic for where your leadership is weakest.',
    tags: ['leadership', 'self-awareness', 'learning'],
  },
  {
    id: 'src-harvard-adaptive',
    title: 'Adaptive Leadership',
    author: 'Ronald Heifetz / Harvard Kennedy School',
    domain: 'Systems',
    coreArgument: 'Some problems require learning, coalition work, and changed behavior rather than expert fixes.',
    usefulIdea: 'Separate technical problems from adaptive challenges before choosing an intervention.',
    blindSpot: 'Adaptive work can become vague unless tied to concrete next actions.',
    opposingView: 'In emergencies, technical command and speed may matter more than broad participation.',
    application: 'Label the type of challenge before deciding how much authority, dialogue, and experimentation are needed.',
    tags: ['adaptive', 'change', 'systems'],
  },
  {
    id: 'src-wef-skills',
    title: 'Future Skills Outlook',
    author: 'World Economic Forum',
    domain: 'Technology/Future',
    coreArgument: 'Analytical thinking, resilience, technological literacy, leadership, and systems thinking remain valuable as work changes.',
    usefulIdea: 'Future leaders need judgment around technology, not only technical fluency.',
    blindSpot: 'Employer surveys do not answer moral or civic questions about what work should become.',
    opposingView: 'Humanistic education argues that meaning, history, and ethics deserve equal weight.',
    application: 'Build a learning plan that mixes AI literacy with communication, ethics, and systems judgment.',
    tags: ['future', 'skills', 'AI'],
  },
  {
    id: 'src-rework-teams',
    title: 'Team Effectiveness Research',
    author: 'Google re:Work / Project Aristotle',
    domain: 'Teams',
    coreArgument: 'Strong teams depend on norms like psychological safety, dependability, structure, meaning, and impact.',
    usefulIdea: 'A leader can improve performance by making expectations and speaking norms explicit.',
    blindSpot: 'Research summaries can hide context, selection effects, and limits across cultures.',
    opposingView: 'High-stakes teams sometimes need command clarity before open-ended discussion.',
    application: 'Make the hidden meeting rule visible before asking people to contribute.',
    tags: ['teams', 'safety', 'collaboration'],
  },
  {
    id: 'src-adp-622',
    title: 'ADP 6-22: Army Leadership',
    author: 'U.S. Army doctrine',
    domain: 'Power',
    coreArgument: 'Leadership combines character, presence, intellect, leading, developing, and achieving.',
    usefulIdea: 'Competence and results are not enough if character fails under pressure.',
    blindSpot: 'Military doctrine must be translated carefully for civilian, family, and civic life.',
    opposingView: 'Participatory traditions are wary of command frameworks becoming too hierarchical.',
    application: 'Ask whether a decision strengthens character, competence, and trust at the same time.',
    tags: ['character', 'doctrine', 'results'],
  },
  {
    id: 'src-meditations',
    title: 'Meditations',
    author: 'Marcus Aurelius',
    domain: 'Self-Command',
    coreArgument: 'A leader should govern attention, desire, anger, and fear before trying to govern others.',
    usefulIdea: 'Self-command starts by distinguishing what is up to you from what is not.',
    blindSpot: 'Stoic restraint can become emotional distance if it avoids needed vulnerability.',
    opposingView: 'Relational leadership argues that emotion can carry moral information.',
    application: 'Pause before reacting and name the controllable next action.',
    tags: ['stoicism', 'character', 'attention'],
  },
  {
    id: 'src-enchiridion',
    title: 'The Enchiridion',
    author: 'Epictetus',
    domain: 'Self-Command',
    coreArgument: 'Freedom begins with disciplined judgment about what one can control.',
    usefulIdea: 'The first leadership move is often refusing to be ruled by panic or praise.',
    blindSpot: 'Control language can underplay injustice or material constraints.',
    opposingView: 'Collective action traditions focus on changing external conditions together.',
    application: 'Before a difficult conversation, identify one thing you control: tone, clarity, or follow-through.',
    tags: ['stoicism', 'control', 'discipline'],
  },
  {
    id: 'src-frankl',
    title: "Man's Search for Meaning",
    author: 'Viktor Frankl',
    domain: 'Self-Command',
    coreArgument: 'Meaning can steady people through suffering and uncertainty.',
    usefulIdea: 'Leaders help people connect effort to purpose without denying pain.',
    blindSpot: 'Meaning should not be used to romanticize preventable harm.',
    opposingView: 'Materialist critiques argue that purpose talk can mask bad conditions.',
    application: 'When morale is low, name both the hardship and the reason the work matters.',
    tags: ['meaning', 'resilience', 'purpose'],
  },
  {
    id: 'src-goleman-eq',
    title: 'Emotional Intelligence',
    author: 'Daniel Goleman',
    domain: 'Self-Command',
    coreArgument: 'Self-awareness and emotional regulation shape leadership outcomes.',
    usefulIdea: 'A leader’s unmanaged emotion becomes environmental noise for everyone else.',
    blindSpot: 'EQ can become a vague label unless tied to observable behavior.',
    opposingView: 'Structural critics argue that interpersonal skill cannot solve bad systems alone.',
    application: 'Track what emotion you spread in meetings: urgency, calm, contempt, or curiosity.',
    tags: ['emotion', 'self-regulation', 'awareness'],
  },
  {
    id: 'src-nvc',
    title: 'Nonviolent Communication',
    author: 'Marshall Rosenberg',
    domain: 'Communication',
    coreArgument: 'Conflict improves when people distinguish observations, feelings, needs, and requests.',
    usefulIdea: 'Describe behavior before judging motive.',
    blindSpot: 'Over-soft language can obscure accountability when harm is serious.',
    opposingView: 'Direct accountability frameworks prioritize clear consequences over empathy first.',
    application: 'Replace character claims with observed behavior and a specific request.',
    tags: ['conversation', 'conflict', 'feedback'],
  },
  {
    id: 'src-crucial',
    title: 'Crucial Conversations',
    author: 'Patterson, Grenny, McMillan, Switzler',
    domain: 'Communication',
    coreArgument: 'High-stakes conversations need safety, shared purpose, and disciplined candor.',
    usefulIdea: 'The goal is not comfort; it is enough safety for truth to enter the room.',
    blindSpot: 'Some contexts need formal protection, not just better dialogue.',
    opposingView: 'Power-aware approaches warn that safety is unevenly distributed.',
    application: 'Start a hard conversation by naming the shared goal.',
    tags: ['feedback', 'stakes', 'dialogue'],
  },
  {
    id: 'src-difficult-conversations',
    title: 'Difficult Conversations',
    author: 'Stone, Patton, Heen',
    domain: 'Communication',
    coreArgument: 'Hard conversations usually involve facts, feelings, and identity at once.',
    usefulIdea: 'Ask which layer of the conversation is actually stuck.',
    blindSpot: 'Private skill does not erase formal power differences.',
    opposingView: 'Labor and legal frameworks may be needed when incentives are misaligned.',
    application: 'Before responding, identify whether the person is arguing facts, emotion, or identity threat.',
    tags: ['identity', 'feedback', 'listening'],
  },
  {
    id: 'src-thanks-feedback',
    title: 'Thanks for the Feedback',
    author: 'Douglas Stone and Sheila Heen',
    domain: 'Communication',
    coreArgument: 'Receiving feedback well is a leadership skill independent of whether the feedback is perfectly delivered.',
    usefulIdea: 'Find the useful signal before defending your self-image.',
    blindSpot: 'Bad feedback can still be biased, manipulative, or wrong.',
    opposingView: 'Justice-oriented approaches emphasize challenging unfair feedback systems.',
    application: 'Ask for one example and one future behavior, then decide what to use.',
    tags: ['feedback', 'learning', 'humility'],
  },
  {
    id: 'src-cialdini',
    title: 'Influence',
    author: 'Robert Cialdini',
    domain: 'Influence',
    coreArgument: 'Human decisions are shaped by patterns like reciprocity, commitment, authority, and social proof.',
    usefulIdea: 'Influence is powerful because people use shortcuts under uncertainty.',
    blindSpot: 'Persuasion tools can become manipulation when consent and clarity disappear.',
    opposingView: 'Ethical leadership centers transparency and respect over conversion tactics.',
    application: 'Use influence by making good choices easier, not by hiding tradeoffs.',
    tags: ['persuasion', 'ethics', 'behavior'],
  },
  {
    id: 'src-carnegie',
    title: 'How to Win Friends and Influence People',
    author: 'Dale Carnegie',
    domain: 'Influence',
    coreArgument: 'Respect, appreciation, and sincere attention change how people receive ideas.',
    usefulIdea: 'People listen better when they feel seen rather than reduced to an obstacle.',
    blindSpot: 'Charm without truth becomes performance.',
    opposingView: 'Radical candor argues that care must pair with direct challenge.',
    application: 'Before asking for buy-in, state what you genuinely understand about the other person’s concern.',
    tags: ['trust', 'rapport', 'attention'],
  },
  {
    id: 'src-speed-trust',
    title: 'The Speed of Trust',
    author: 'Stephen M. R. Covey',
    domain: 'Influence',
    coreArgument: 'Trust lowers friction and speeds coordination.',
    usefulIdea: 'Credibility grows from character and competence together.',
    blindSpot: 'Trust can be weaponized if people are pressured to ignore evidence.',
    opposingView: 'Institutional design argues that checks and transparency matter more than personal trust.',
    application: 'Make one promise smaller and keep it publicly.',
    tags: ['trust', 'credibility', 'coordination'],
  },
  {
    id: 'src-kahneman',
    title: 'Thinking, Fast and Slow',
    author: 'Daniel Kahneman',
    domain: 'Judgment',
    coreArgument: 'Human judgment mixes fast intuition with slower reasoning, both prone to bias.',
    usefulIdea: 'Slow down when stakes are high, evidence is thin, or confidence is unusually strong.',
    blindSpot: 'Bias lists can create cynicism without better decision process.',
    opposingView: 'Naturalistic decision research shows expert intuition can be valid in high-feedback environments.',
    application: 'Ask what evidence would change your mind before finalizing a call.',
    tags: ['bias', 'decision', 'reasoning'],
  },
  {
    id: 'src-noise',
    title: 'Noise',
    author: 'Kahneman, Sibony, Sunstein',
    domain: 'Judgment',
    coreArgument: 'Organizations often suffer from unwanted variation in judgment, not only bias.',
    usefulIdea: 'Consistent criteria can be fairer than confident individual discretion.',
    blindSpot: 'Too much standardization can erase context and human nuance.',
    opposingView: 'Craft traditions value experienced judgment over procedural scoring.',
    application: 'Write the criteria before reviewing options.',
    tags: ['criteria', 'fairness', 'process'],
  },
  {
    id: 'src-rumelt',
    title: 'Good Strategy Bad Strategy',
    author: 'Richard Rumelt',
    domain: 'Judgment',
    coreArgument: 'Good strategy diagnoses the challenge, chooses a guiding policy, and creates coherent action.',
    usefulIdea: 'A goal without a diagnosis is not a strategy.',
    blindSpot: 'Strategy language can overvalue planning when fast adaptation is needed.',
    opposingView: 'Lean approaches favor validated learning over grand strategy when uncertainty is extreme.',
    application: 'For one goal, write the diagnosis in one sentence before listing actions.',
    tags: ['strategy', 'diagnosis', 'focus'],
  },
  {
    id: 'src-fearless',
    title: 'The Fearless Organization',
    author: 'Amy Edmondson',
    domain: 'Teams',
    coreArgument: 'Psychological safety helps people speak up about mistakes, risks, and ideas.',
    usefulIdea: 'Safety is built by what leaders reward after inconvenient truth.',
    blindSpot: 'Safety does not mean lack of standards or consequences.',
    opposingView: 'Execution-focused leaders worry that too much consensus slows performance.',
    application: 'Thank someone for surfacing a risk before judging the risk itself.',
    tags: ['safety', 'teams', 'learning'],
  },
  {
    id: 'src-team-teams',
    title: 'Team of Teams',
    author: 'Stanley McChrystal et al.',
    domain: 'Teams',
    coreArgument: 'Complex environments require shared consciousness and empowered execution.',
    usefulIdea: 'Fast teams need context distributed widely, not bottled at the top.',
    blindSpot: 'Empowerment fails when people lack training, trust, or boundaries.',
    opposingView: 'Centralized command can still matter in tightly coupled crises.',
    application: 'Give the reason behind a decision, not only the task.',
    tags: ['coordination', 'context', 'teams'],
  },
  {
    id: 'src-lencioni',
    title: 'The Five Dysfunctions of a Team',
    author: 'Patrick Lencioni',
    domain: 'Teams',
    coreArgument: 'Trust, conflict, commitment, accountability, and results build on one another.',
    usefulIdea: 'Avoiding conflict can weaken commitment.',
    blindSpot: 'The model is simplified and should not replace diagnosis of incentives and power.',
    opposingView: 'Systems thinkers look first at structures that produce team dysfunction.',
    application: 'Ask what disagreement the team is avoiding.',
    tags: ['teamwork', 'conflict', 'trust'],
  },
  {
    id: 'src-prince',
    title: 'The Prince',
    author: 'Niccolo Machiavelli',
    domain: 'Power',
    coreArgument: 'Power depends on incentives, perception, fear, loyalty, and timing.',
    usefulIdea: 'Good intentions do not remove the need to understand power.',
    blindSpot: 'Strategy detached from ethics can normalize cruelty and paranoia.',
    opposingView: 'Civic and moral traditions argue legitimacy matters more than control.',
    application: 'Ask whether a tactic increases legitimate trust or only immediate compliance.',
    tags: ['power', 'strategy', 'legitimacy'],
  },
  {
    id: 'src-manipulation',
    title: 'Manipulation and Coercion Ethics',
    author: 'Stanford Encyclopedia of Philosophy',
    domain: 'Ethics',
    coreArgument: 'Influence becomes ethically dangerous when it bypasses agency, consent, or reasoning.',
    usefulIdea: 'Ethical persuasion keeps options and reasons visible.',
    blindSpot: 'Philosophical distinctions can be hard to apply in messy organizational life.',
    opposingView: 'Pragmatists argue that all leadership involves some shaping of choices.',
    application: 'Before persuading, ask whether the other person can understand, question, and refuse.',
    tags: ['ethics', 'coercion', 'agency'],
  },
  {
    id: 'src-haidt',
    title: 'The Righteous Mind',
    author: 'Jonathan Haidt',
    domain: 'Ethics',
    coreArgument: 'People reason morally through different intuitions and group loyalties.',
    usefulIdea: 'Moral disagreement is often not stupidity; it is different sacred value weighting.',
    blindSpot: 'Explaining disagreement can drift into excusing harm.',
    opposingView: 'Universalist ethics argues some rights should not depend on moral taste.',
    application: 'In a conflict, name the value each side thinks it is protecting.',
    tags: ['morality', 'identity', 'conflict'],
  },
  {
    id: 'src-getting-yes',
    title: 'Getting to Yes',
    author: 'Fisher, Ury, Patton',
    domain: 'Conflict',
    coreArgument: 'Negotiation improves when people separate people from problems, focus on interests, and use objective criteria.',
    usefulIdea: 'Positions are demands; interests explain why the demands exist.',
    blindSpot: 'Bad-faith actors may exploit openness.',
    opposingView: 'Hard-bargaining traditions emphasize leverage and credible alternatives.',
    application: 'Ask what interest sits underneath the stated position.',
    tags: ['negotiation', 'interests', 'criteria'],
  },
  {
    id: 'src-voss',
    title: 'Never Split the Difference',
    author: 'Chris Voss',
    domain: 'Conflict',
    coreArgument: 'Tactical empathy and calibrated questions can change negotiation dynamics.',
    usefulIdea: 'People become more open when they feel understood before being pushed.',
    blindSpot: 'Tactics can become manipulative if empathy is only instrumental.',
    opposingView: 'Collaborative negotiation warns against turning every conversation into leverage.',
    application: 'Use “How would we make that work?” to surface constraints.',
    tags: ['negotiation', 'questions', 'empathy'],
  },
  {
    id: 'src-boundaries',
    title: 'Set Boundaries, Find Peace',
    author: 'Nedra Glover Tawwab',
    domain: 'Conflict',
    coreArgument: 'Healthy boundaries clarify what is acceptable and what will happen next.',
    usefulIdea: 'A boundary without follow-through is only a wish.',
    blindSpot: 'Boundary language can become avoidance if used to escape responsibility.',
    opposingView: 'Restorative approaches emphasize repair and dialogue after harm.',
    application: 'State one clear limit and one concrete next step.',
    tags: ['boundaries', 'clarity', 'conflict'],
  },
  {
    id: 'src-fifth-discipline',
    title: 'The Fifth Discipline',
    author: 'Peter Senge',
    domain: 'Systems',
    coreArgument: 'Organizations behave through feedback loops, mental models, shared vision, and learning capacity.',
    usefulIdea: 'Today’s problem is often yesterday’s solution coming due.',
    blindSpot: 'Systems language can become abstract without ownership.',
    opposingView: 'Operator mindsets prioritize direct accountability and execution cadence.',
    application: 'Map one feedback loop before assigning blame.',
    tags: ['systems', 'feedback', 'learning'],
  },
  {
    id: 'src-switch',
    title: 'Switch',
    author: 'Chip Heath and Dan Heath',
    domain: 'Systems',
    coreArgument: 'Change works better when reason, emotion, and environment point in the same direction.',
    usefulIdea: 'Shape the path instead of relying only on willpower.',
    blindSpot: 'Behavioral design can become paternalistic if people are not respected.',
    opposingView: 'Justice-oriented change asks who gets to shape whose path.',
    application: 'Remove one friction point from a behavior you want repeated.',
    tags: ['change', 'behavior', 'environment'],
  },
  {
    id: 'src-lean-startup',
    title: 'The Lean Startup',
    author: 'Eric Ries',
    domain: 'Technology/Future',
    coreArgument: 'Uncertain work should test assumptions through small experiments and learning loops.',
    usefulIdea: 'A fast experiment beats a beautiful untested plan.',
    blindSpot: 'Experiments are unethical when other people bear hidden costs.',
    opposingView: 'Public-sector and safety-critical work often needs deliberation before testing.',
    application: 'Name the riskiest assumption and design the smallest honest test.',
    tags: ['experiments', 'startup', 'learning'],
  },
  {
    id: 'src-ai-literacy',
    title: 'AI Literacy for Leaders',
    author: 'Current technology leadership practice',
    domain: 'Technology/Future',
    coreArgument: 'Leaders need to understand AI’s capabilities, failure modes, incentives, and governance implications.',
    usefulIdea: 'AI shifts judgment toward verification, accountability, and workflow design.',
    blindSpot: 'AI enthusiasm can hide privacy, labor, and safety risks.',
    opposingView: 'Skeptics argue many AI uses are automation theater without durable value.',
    application: 'For every AI output, ask who verifies it and who is accountable if it is wrong.',
    tags: ['AI', 'verification', 'governance'],
  },
  {
    id: 'src-cyber',
    title: 'Cybersecurity Leadership Basics',
    author: 'Security practice synthesis',
    domain: 'Technology/Future',
    coreArgument: 'Security is a leadership issue because incentives, habits, and risk decisions shape technical exposure.',
    usefulIdea: 'Trustworthy systems require least privilege, backups, updates, and incident rehearsal.',
    blindSpot: 'Security advice can become fear-based if not tied to practical habits.',
    opposingView: 'Growth teams may trade friction against security controls.',
    application: 'Identify the one account or system whose failure would hurt most, then strengthen it.',
    tags: ['security', 'risk', 'resilience'],
  },
  {
    id: 'src-stoicism',
    title: 'Stoicism',
    author: 'Epictetus, Seneca, Marcus Aurelius',
    domain: 'Philosophy',
    coreArgument: 'Human freedom grows when judgment, desire, and action are disciplined around what is actually within one’s power.',
    usefulIdea: 'Separate control from concern, then act with courage, justice, temperance, and practical wisdom.',
    blindSpot: 'Stoicism can be misused as emotional suppression or passive acceptance of injustice.',
    opposingView: 'Romantic and relational traditions argue that emotion, attachment, and vulnerability can carry truth.',
    application: 'Use Stoic exercises to regulate attention before high-pressure action.',
    tags: ['stoicism', 'control', 'virtue'],
  },
  {
    id: 'src-aristotle-ethics',
    title: 'Nicomachean Ethics',
    author: 'Aristotle',
    domain: 'Philosophy',
    coreArgument: 'A good life is formed by virtue, habit, practical wisdom, and action aimed at human flourishing.',
    usefulIdea: 'Character is built through repeated choices until good action becomes more stable.',
    blindSpot: 'Aristotle’s social world included exclusions and assumptions that modern readers must not inherit uncritically.',
    opposingView: 'Rule-based ethics argues that habit and judgment need firmer universal principles.',
    application: 'Choose one virtue and practice its concrete middle between deficiency and excess.',
    tags: ['virtue', 'aristotle', 'character'],
  },
  {
    id: 'src-plato-republic',
    title: 'The Republic',
    author: 'Plato',
    domain: 'Philosophy',
    coreArgument: 'Justice requires ordering the soul and city toward truth rather than appetite, illusion, or popularity.',
    usefulIdea: 'Leaders must question appearances and educate desire before claiming wisdom.',
    blindSpot: 'Plato’s political model can become anti-democratic and overly controlling if treated as a blueprint.',
    opposingView: 'Democratic and pragmatic traditions distrust philosopher-rule and prefer open correction.',
    application: 'Ask what shadow or appearance people may be mistaking for reality.',
    tags: ['plato', 'truth', 'justice'],
  },
  {
    id: 'src-epicureanism',
    title: 'Epicurean Philosophy',
    author: 'Epicurus and later Epicureans',
    domain: 'Philosophy',
    coreArgument: 'Peace comes from reducing vain desire, fearing death less, and valuing friendship, moderation, and simple pleasures.',
    usefulIdea: 'Not every desire deserves obedience; many forms of enough are more stable than conquest.',
    blindSpot: 'Withdrawal from public ambition can become avoidance when duty calls for action.',
    opposingView: 'Civic traditions argue that responsible people cannot retreat entirely from public life.',
    application: 'Notice one desire that promises status but creates anxiety.',
    tags: ['epicureanism', 'desire', 'enough'],
  },
  {
    id: 'src-cynicism',
    title: 'Cynicism',
    author: 'Diogenes and Cynic tradition',
    domain: 'Philosophy',
    coreArgument: 'Freedom comes from needing less approval, luxury, and convention than society teaches people to need.',
    usefulIdea: 'Status games lose power when a person can live without their rewards.',
    blindSpot: 'Contempt for convention can become cruelty, theatrical rebellion, or refusal of real responsibility.',
    opposingView: 'Confucian and civic traditions argue that forms, roles, and manners can preserve care.',
    application: 'Ask which status signal is quietly governing your behavior.',
    tags: ['cynicism', 'status', 'freedom'],
  },
  {
    id: 'src-confucianism',
    title: 'Confucian Philosophy',
    author: 'Confucius, Mencius, Xunzi',
    domain: 'Philosophy',
    coreArgument: 'Good order begins with cultivated character, humane conduct, ritual propriety, education, and rightly held roles.',
    usefulIdea: 'Leadership is moral formation expressed through relationships and daily conduct.',
    blindSpot: 'Role ethics can become rigid hierarchy if reciprocity, humanity, and correction disappear.',
    opposingView: 'Liberal traditions worry that strong role obligations can suppress individual freedom.',
    application: 'Treat one routine interaction as character training, not mere etiquette.',
    tags: ['confucianism', 'ritual', 'roles'],
  },
  {
    id: 'src-daoism',
    title: 'Daoism',
    author: 'Dao De Jing, Zhuangzi',
    domain: 'Philosophy',
    coreArgument: 'Wise action fits the grain of reality and often uses less force, less ego, and less over-management.',
    usefulIdea: 'Not every problem improves when a leader grips harder.',
    blindSpot: 'Non-forcing can be misread as passivity in moments that require protection or decision.',
    opposingView: 'Legalist and command traditions argue that order often needs clear rules and enforcement.',
    application: 'Find one place where removing friction would work better than adding pressure.',
    tags: ['daoism', 'wu wei', 'systems'],
  },
  {
    id: 'src-buddhist-philosophy',
    title: 'Buddhist Philosophy',
    author: 'Early Buddhist and later traditions',
    domain: 'Philosophy',
    coreArgument: 'Suffering is tied to craving, ignorance, impermanence, and mistaken attachment to fixed self or conditions.',
    usefulIdea: 'Attention, compassion, and acceptance of change can reduce reactive leadership.',
    blindSpot: 'Detachment can be misread as indifference or social withdrawal.',
    opposingView: 'Activist traditions stress that inner liberation must connect to outer responsibility.',
    application: 'Notice one attachment that makes a changing situation harder to see clearly.',
    tags: ['buddhism', 'impermanence', 'attention'],
  },
  {
    id: 'src-existentialism',
    title: 'Existentialism',
    author: 'Kierkegaard, Nietzsche, Sartre, Camus, de Beauvoir',
    domain: 'Philosophy',
    coreArgument: 'Human beings must choose, act, and make meaning under uncertainty, anxiety, freedom, and responsibility.',
    usefulIdea: 'Avoiding choice does not remove responsibility; it usually hides it.',
    blindSpot: 'Existential language can become self-absorption if severed from obligations to others.',
    opposingView: 'Religious and virtue traditions argue that meaning is discovered or cultivated, not invented alone.',
    application: 'Name the choice you are making by not choosing.',
    tags: ['existentialism', 'choice', 'meaning'],
  },
  {
    id: 'src-pragmatism',
    title: 'Pragmatism',
    author: 'William James, Charles Peirce, John Dewey',
    domain: 'Philosophy',
    coreArgument: 'Ideas should be tested by experience, consequences, inquiry, and their power to help people navigate reality.',
    usefulIdea: 'Treat beliefs as working commitments that must stay open to correction.',
    blindSpot: 'Pragmatism can become shallow expediency if truth is reduced to whatever works right now.',
    opposingView: 'Platonist and realist traditions insist that truth cannot be only usefulness.',
    application: 'Ask what experience would confirm, revise, or disconfirm a belief.',
    tags: ['pragmatism', 'inquiry', 'truth'],
  },
  {
    id: 'src-atomic-habits',
    title: 'Atomic Habits',
    author: 'James Clear',
    domain: 'Self-Help',
    coreArgument: 'Small repeated behaviors compound when they are tied to identity, cues, environment, and feedback.',
    usefulIdea: 'Ask what kind of person a repeated action trains you to become.',
    blindSpot: 'Habit advice can underplay trauma, poverty, disability, and environments people do not control.',
    opposingView: 'Structural approaches argue that systems and incentives often matter more than private discipline.',
    application: 'Choose one tiny repeatable action that casts a vote for the identity you want.',
    tags: ['habits', 'identity', 'behavior'],
  },
  {
    id: 'src-seven-habits',
    title: 'The 7 Habits of Highly Effective People',
    author: 'Stephen R. Covey',
    domain: 'Self-Help',
    coreArgument: 'Effectiveness begins with character, proactivity, priorities, mutual benefit, listening, and renewal.',
    usefulIdea: 'Work first where you have responsibility and influence rather than rehearsing helplessness.',
    blindSpot: 'Proactivity language can be misused to blame people for constraints they did not create.',
    opposingView: 'Power-aware traditions stress collective action and institutional reform alongside personal agency.',
    application: 'List one concern you cannot control and one action inside your influence.',
    tags: ['agency', 'priorities', 'character'],
  },
  {
    id: 'src-deep-work',
    title: 'Deep Work',
    author: 'Cal Newport',
    domain: 'Self-Help',
    coreArgument: 'High-value cognitive work needs protected attention in a distracted environment.',
    usefulIdea: 'Attention is a scarce production asset, not a casual mood.',
    blindSpot: 'Not every role or life stage allows long uninterrupted blocks.',
    opposingView: 'Relational and operational work often requires responsiveness, availability, and interruption handling.',
    application: 'Protect one short block for a real thinking task and remove the default interruption.',
    tags: ['focus', 'attention', 'work'],
  },
  {
    id: 'src-power-of-habit',
    title: 'The Power of Habit',
    author: 'Charles Duhigg',
    domain: 'Self-Help',
    coreArgument: 'Habits often run through cue, routine, and reward loops that can be studied and redesigned.',
    usefulIdea: 'Find the loop before trying to overpower the behavior.',
    blindSpot: 'The habit-loop frame can oversimplify addiction, mental health, and social pressure.',
    opposingView: 'Clinical and social models argue that some behaviors require care, treatment, or changed conditions.',
    application: 'Name the cue, routine, and reward for one repeated behavior.',
    tags: ['habit loop', 'behavior', 'change'],
  },
  {
    id: 'src-mindset',
    title: 'Mindset',
    author: 'Carol Dweck',
    domain: 'Self-Help',
    coreArgument: 'People learn better when ability is treated as developable through effort, strategy, feedback, and time.',
    usefulIdea: 'Praise process and strategy, not fixed identity.',
    blindSpot: 'Growth mindset can become hollow if people lack instruction, resources, or fair opportunity.',
    opposingView: 'Equity-focused educators warn against telling people to try harder while leaving barriers intact.',
    application: 'Replace one fixed-label statement with a practice-focused statement.',
    tags: ['learning', 'mindset', 'practice'],
  },
  {
    id: 'src-grit',
    title: 'Grit',
    author: 'Angela Duckworth',
    domain: 'Self-Help',
    coreArgument: 'Long-term effort and commitment matter when attached to meaningful goals and deliberate practice.',
    usefulIdea: 'Persistence needs purpose, feedback, and a reason to continue.',
    blindSpot: 'Grit can be used to romanticize overwork or ignore bad strategy.',
    opposingView: 'Adaptive leadership argues that quitting or pivoting can be wisdom when reality changes.',
    application: 'Ask whether your persistence still serves the mission or only your pride.',
    tags: ['persistence', 'purpose', 'practice'],
  },
  {
    id: 'src-frankenstein',
    title: 'Frankenstein',
    author: 'Mary Shelley',
    domain: 'Literature',
    coreArgument: 'Creation without responsibility can produce suffering that ambition refuses to own.',
    usefulIdea: 'A leader is responsible for downstream consequences, not only brilliant beginnings.',
    blindSpot: 'The novel is not a simple anti-science tract; it is also about abandonment, recognition, and moral isolation.',
    opposingView: 'Innovation traditions argue that risk is unavoidable and must be managed rather than feared.',
    application: 'For one project, name who could be harmed if the creator walks away.',
    tags: ['novel', 'technology', 'responsibility'],
  },
  {
    id: 'src-pride-prejudice',
    title: 'Pride and Prejudice',
    author: 'Jane Austen',
    domain: 'Literature',
    coreArgument: 'Social judgment is distorted by pride, first impressions, status, and selective evidence.',
    usefulIdea: 'Good judgment often requires revising your first read of a person.',
    blindSpot: 'The social world of the novel is constrained by class, gender, and inheritance in ways modern readers must notice.',
    opposingView: 'Decision theorists warn that revision should still be evidence-based, not just emotional reversal.',
    application: 'Identify one person you may have reduced to a first impression.',
    tags: ['novel', 'judgment', 'perception'],
  },
  {
    id: 'src-moby-dick',
    title: 'Moby-Dick',
    author: 'Herman Melville',
    domain: 'Literature',
    coreArgument: 'Obsession can turn leadership into a private crusade that endangers everyone attached to it.',
    usefulIdea: 'A mission can become corrupt when it serves ego more than reality.',
    blindSpot: 'The novel is symbolically dense and resists one tidy moral.',
    opposingView: 'Great endeavors sometimes require unusual fixation, sacrifice, and refusal to quit.',
    application: 'Ask whether the mission still serves people or now serves your fixation.',
    tags: ['novel', 'obsession', 'mission'],
  },
  {
    id: 'src-les-miserables',
    title: 'Les Miserables',
    author: 'Victor Hugo',
    domain: 'Literature',
    coreArgument: 'Law, mercy, poverty, conscience, and redemption collide in ways simple rule-following cannot resolve.',
    usefulIdea: 'Justice needs humanity or it becomes mechanical cruelty.',
    blindSpot: 'Mercy can become sentimental if it avoids responsibility, victims, or repair.',
    opposingView: 'Rule-of-law traditions warn that personal mercy cannot replace institutions and standards.',
    application: 'Ask whether a rule is protecting justice or only protecting itself.',
    tags: ['novel', 'justice', 'mercy'],
  },
  {
    id: 'src-brothers-karamazov',
    title: 'The Brothers Karamazov',
    author: 'Fyodor Dostoevsky',
    domain: 'Literature',
    coreArgument: 'Human beings carry moral complexity, rationalization, faith, doubt, desire, and responsibility together.',
    usefulIdea: 'Do not flatten people into a single motive when conscience and appetite are both at work.',
    blindSpot: 'The novel’s religious and philosophical frame should be read as a world of argument, not as a management manual.',
    opposingView: 'Operational leadership sometimes needs action before complete moral interpretation is possible.',
    application: 'Name the competing motives in one conflict before judging it too quickly.',
    tags: ['novel', 'conscience', 'complexity'],
  },
  {
    id: 'src-odyssey',
    title: 'The Odyssey',
    author: 'Homeric epic tradition',
    domain: 'Literature',
    coreArgument: 'Survival, cunning, temptation, loyalty, violence, and homecoming test whether a person remembers their purpose.',
    usefulIdea: 'Strategy matters because it helps a leader return to what the struggle was for.',
    blindSpot: 'The epic reflects ancient honor, hierarchy, and violence that should not be imported uncritically.',
    opposingView: 'Modern ethics may reject heroic models that excuse domination or revenge.',
    application: 'Ask what home, duty, or purpose your strategy is meant to serve.',
    tags: ['epic', 'purpose', 'strategy'],
  },
  {
    id: 'src-thucydides',
    title: 'History of the Peloponnesian War',
    author: 'Thucydides',
    domain: 'History',
    coreArgument: 'Fear, honor, interest, rhetoric, plague, faction, and power shaped the war between Athens and Sparta.',
    usefulIdea: 'Power politics without moral restraint corrodes both victim and victor.',
    blindSpot: 'Thucydides is analytical and selective, not a complete moral encyclopedia of ancient Greece.',
    opposingView: 'Idealist traditions argue that law, institutions, and norms can restrain power more than realism admits.',
    application: 'When using leverage, ask what norm you are teaching others to use later.',
    tags: ['history', 'war', 'power'],
  },
  {
    id: 'src-roman-republic',
    title: 'The Roman Republic',
    author: 'Historical case synthesis',
    domain: 'History',
    coreArgument: 'Republican institutions can weaken through inequality, emergency powers, faction, military loyalty, and norm decay.',
    usefulIdea: 'Institutions fail gradually before they fail suddenly.',
    blindSpot: 'Ancient Rome should not be treated as a one-to-one map for modern democracies.',
    opposingView: 'Material historians emphasize economics and military structures over elite virtue alone.',
    application: 'Notice which norm is being broken because the immediate win feels worth it.',
    tags: ['history', 'republic', 'institutions'],
  },
  {
    id: 'src-french-revolution',
    title: 'The French Revolution',
    author: 'Historical case synthesis',
    domain: 'History',
    coreArgument: 'Legitimacy crisis, inequality, fiscal strain, ideology, war, and fear can turn reform pressure into revolutionary rupture.',
    usefulIdea: 'Late reform is more dangerous than early repair.',
    blindSpot: 'The revolution contains many phases and factions; simple hero-villain readings mislead.',
    opposingView: 'Conservative readings stress order; radical readings stress justice delayed by entrenched power.',
    application: 'Ask what grievance will become harder to resolve if ignored another year.',
    tags: ['history', 'revolution', 'legitimacy'],
  },
  {
    id: 'src-guns-august',
    title: 'The Guns of August',
    author: 'Barbara W. Tuchman',
    domain: 'History',
    coreArgument: 'The opening of World War I shows how plans, alliances, assumptions, and honor can trap leaders in escalation.',
    usefulIdea: 'Systems designed for speed can outrun reflection.',
    blindSpot: 'The book is influential narrative history, not the final word on World War I causation.',
    opposingView: 'Other historians weigh long-term imperial, military, and domestic causes differently.',
    application: 'Identify which plan would be hard to stop once triggered.',
    tags: ['history', 'war', 'escalation'],
  },
  {
    id: 'src-team-rivals',
    title: 'Team of Rivals',
    author: 'Doris Kearns Goodwin',
    domain: 'History',
    coreArgument: 'Lincoln’s leadership is often studied for coalition-building, political timing, patience, and moral decision under civil war pressure.',
    usefulIdea: 'Rivals can become sources of information and legitimacy when managed with purpose.',
    blindSpot: 'Great-person narratives can understate institutions, movements, and ordinary people.',
    opposingView: 'Social historians emphasize broader anti-slavery organizing, military realities, and structural forces.',
    application: 'Invite one serious critic into the decision process without surrendering judgment.',
    tags: ['history', 'lincoln', 'coalition'],
  },
  {
    id: 'src-civil-rights',
    title: 'The U.S. Civil Rights Movement',
    author: 'Historical case synthesis',
    domain: 'History',
    coreArgument: 'Moral clarity became politically powerful through organizing, legal strategy, disciplined protest, media visibility, and local courage.',
    usefulIdea: 'Justice movements need both moral argument and operational discipline.',
    blindSpot: 'Movement history is broad and contested; no single leader or tactic explains it all.',
    opposingView: 'Some traditions argue that disruptive pressure, not persuasion alone, moved institutions.',
    application: 'Pair one moral claim with one concrete organizing mechanism.',
    tags: ['history', 'justice', 'organizing'],
  },
  {
    id: 'src-reconstruction',
    title: 'Reconstruction',
    author: 'Historical case synthesis',
    domain: 'History',
    coreArgument: 'After the U.S. Civil War, constitutional change, federal power, racial violence, economics, and political will shaped the unfinished work of freedom.',
    usefulIdea: 'Winning a conflict does not automatically build the institutions needed for justice afterward.',
    blindSpot: 'Reconstruction is often oversimplified; it requires attention to federal, state, local, racial, and economic dynamics.',
    opposingView: 'Different historians debate the weight of policy design, white resistance, economic structure, and political abandonment.',
    application: 'After a victory, ask what institution must exist so the win survives.',
    tags: ['history', 'institutions', 'justice'],
  },
];

const lessonSpecs = [
  ['ask-before-advise', 'Ask Before You Advise', 'Teams', ['src-ccl-fundamental-4'], 'Strong leaders do not rush to be the smartest voice in the room. One good question can reveal whether the person needs skill, courage, resources, or a decision.', 'A teammate says they are stuck with a client and wants you to solve it.', ['Give immediate advice', 'Ask what they have tried', 'Take over the client', 'Tell them to calm down'], 'Ask: “What have you tried, and where exactly does it break?”', 'Did the question increase their agency or make them feel interrogated?', 'Good coaching usually increases agency rather than dependency.', 'Questions should clarify, not corner someone into your pre-decided answer.'],
  ['separate-impact-intent', 'Separate Impact From Intent', 'Communication', ['src-nvc', 'src-difficult-conversations'], 'People defend themselves when accused of motives. Leaders get farther by naming observable impact and inviting context.', 'A colleague missed two handoffs and the team stayed late.', ['You never care about deadlines', 'The late handoff changed the team plan', 'I guess I will do it myself', 'Everyone is frustrated with you'], 'Name the behavior and impact before asking what happened.', 'Did I describe behavior without attacking identity?', 'Impact language is stronger than motive guessing.', 'Do not soften serious harm until accountability disappears.'],
  ['decision-type', 'Decide the Decision Type', 'Judgment', ['src-rumelt', 'src-harvard-adaptive'], 'Not every decision deserves the same process. Reversible, low-harm decisions can move fast; high-trust or high-harm decisions need broader input.', 'Your team is choosing a meeting format and compensation policy in the same week.', ['Treat both as quick experiments', 'Treat both as consensus decisions', 'Match process to reversibility and harm', 'Delegate both quietly'], 'Label one decision today: reversible, hard-to-reverse, or high-harm.', 'Did the process match the stakes?', 'Fast decisions work best when reversibility is high and harm is low.', 'Never call something an experiment when others carry hidden risk.'],
  ['hidden-rule', 'Make the Hidden Rule Visible', 'Teams', ['src-rework-teams', 'src-fearless'], 'Teams often underperform because the real norms are invisible. Leaders reduce anxiety by naming how participation should work.', 'New team members stay quiet during planning.', ['Wait for them to speak', 'Tell them to be confident', 'Name that rough ideas are welcome', 'Ask only senior people'], 'Say: “Rough ideas are welcome here before polished answers.”', 'Did anyone participate who usually stays silent?', 'Clarity and safety work together.', 'Do not claim safety if dissent is punished later.'],
  ['power-test', 'The Power Test', 'Ethics', ['src-manipulation', 'src-prince'], 'Influence becomes dangerous when it bypasses someone’s ability to reason, refuse, or consent. Ethical leadership keeps choices visible.', 'You want someone to accept an unpopular assignment.', ['Hide the downside', 'Explain need, tradeoff, and options', 'Use peer pressure', 'Offer praise until they agree'], 'State the real need and the person’s actual options.', 'Would this feel fair if I had less authority?', 'Pressure, hidden consequences, and selective information are warning signs.', 'Never frame manipulation as advanced leadership.'],
  ['calm-is-contagious', 'Make Calm Operational', 'Self-Command', ['src-meditations', 'src-goleman-eq'], 'A leader’s emotional state becomes part of the working environment. Calm is not passivity; it is the ability to act without spreading panic.', 'A deadline slips and everyone starts escalating in chat.', ['Match the panic', 'Disappear until it settles', 'Name facts and next action', 'Blame the owner'], 'Write the next action and owner before adding commentary.', 'Did my response lower noise or add heat?', 'Calm leaders reduce cognitive load for others.', 'Do not use calmness to avoid urgency or accountability.'],
  ['technical-adaptive', 'Technical or Adaptive?', 'Systems', ['src-harvard-adaptive'], 'Technical problems have known fixes. Adaptive problems require people to learn, change priorities, and tolerate discomfort.', 'A team keeps missing deadlines even after adding better planning software.', ['Buy more software', 'Diagnose incentives and norms', 'Blame effort', 'Cancel planning'], 'For one stubborn problem, write the technical part and the adaptive part.', 'Which part requires people to change behavior?', 'Wrongly treating adaptive work as technical work creates repeated fixes.', 'Do not use “adaptive” as a vague excuse for no action.'],
  ['criteria-first', 'Write Criteria Before Judging', 'Judgment', ['src-noise'], 'Criteria written after seeing options often rationalize preference. Criteria written before reviewing options protects fairness.', 'You are choosing between two candidates you already like differently.', ['Pick the one you trust', 'Write criteria first', 'Ask who is more charismatic', 'Delay indefinitely'], 'Write three criteria before comparing options.', 'Did the criteria reduce favoritism?', 'Fair process starts before preference hardens.', 'Criteria can still encode bias; inspect them too.'],
  ['interests-not-positions', 'Find the Interest Under the Position', 'Conflict', ['src-getting-yes'], 'Positions are what people demand; interests are why they demand it. Negotiation opens when interests become visible.', 'A partner insists a launch date cannot move.', ['Argue over the date', 'Ask what the date protects', 'Threaten escalation', 'Concede immediately'], 'Ask: “What does that date protect for you?”', 'Did the conversation move from demand to reason?', 'Interests reveal possible trades that positions hide.', 'Do not use interest discovery to exploit someone’s vulnerability.'],
  ['legitimacy-control', 'Control Is Not Legitimacy', 'Power', ['src-prince', 'src-adp-622'], 'People may comply with power they do not respect, but fragile compliance breaks under pressure. Legitimacy comes from competence, fairness, and believable purpose.', 'You can force a change through, but the team thinks it is self-serving.', ['Force it quietly', 'Win legitimacy through reasons and process', 'Punish dissent', 'Delay forever'], 'Explain the reason, tradeoff, and accountability for one unpopular decision.', 'Did people understand why, even if they disagreed?', 'Power lasts longer when it is seen as deserved and constrained.', 'Legitimacy is not a costume for control.'],
  ['ai-verification', 'Verify the Machine', 'Technology/Future', ['src-ai-literacy', 'src-wef-skills'], 'AI can make weak claims sound fluent. Leaders need verification routines, not blind trust or reflexive fear.', 'An AI-generated report recommends cutting a program.', ['Accept the report', 'Reject all AI', 'Trace sources and assumptions', 'Forward it as-is'], 'Ask: “What evidence would prove this wrong?” before acting on an AI output.', 'Who is accountable if this output is wrong?', 'AI raises the value of judgment and verification.', 'Do not outsource moral responsibility to a tool.'],
  ['small-promise', 'Keep a Smaller Promise', 'Influence', ['src-speed-trust'], 'Trust grows when promises are visible and kept. A small reliable commitment beats a grand uncertain one.', 'You want to rebuild credibility after missing a deliverable.', ['Promise a huge turnaround', 'Make a smaller promise and keep it', 'Avoid the topic', 'Blame constraints'], 'Make one concrete commitment that can be completed this week.', 'Did I choose reliability over impression management?', 'Trust compounds through kept commitments.', 'Do not use trust language to pressure people past reasonable skepticism.'],
  ['feedback-example', 'Ask for the Example', 'Communication', ['src-thanks-feedback'], 'Feedback is easier to use when it becomes concrete. The example turns vague praise or criticism into learnable behavior.', 'Someone says you need to be more strategic.', ['Defend yourself', 'Ask for one specific example', 'Ignore it', 'Ask five people to vote'], 'Ask: “Can you point to one moment where that showed up?”', 'What behavior can I actually change?', 'Specific examples turn identity threats into practice targets.', 'Do not accept biased feedback as truth without reflection.'],
  ['productive-stress', 'Keep Stress Productive', 'Systems', ['src-harvard-adaptive'], 'Change requires enough tension to learn but not so much that the system shuts down. Leaders regulate pressure.', 'A reorg creates anxiety and people avoid decisions.', ['Remove all pressure', 'Add pressure without support', 'Name the work and support', 'Pretend nothing changed'], 'Name one pressure and one support in the same message.', 'Did the system move toward learning or avoidance?', 'Productive stress sits between comfort and overwhelm.', 'Do not manufacture stress to feel powerful.'],
  ['speak-last', 'Speak Last When It Matters', 'Influence', ['src-carnegie', 'src-fearless'], 'Authority shapes what others are willing to say. Speaking last can preserve information quality.', 'You ask for options but everyone waits for your opinion.', ['Give your opinion first', 'Ask others first and withhold yours', 'Cancel the discussion', 'Ask only allies'], 'In one meeting, ask for two views before offering yours.', 'Did I receive information I would have missed?', 'Leaders can accidentally silence the room by speaking too early.', 'Speaking last should invite truth, not trap people.'],
  ['diagnosis-before-goal', 'Diagnose Before Goal-Setting', 'Judgment', ['src-rumelt'], 'A goal without a diagnosis becomes aspiration theater. Diagnosis focuses energy on the real obstacle.', 'The team says the goal is “grow community.”', ['Set a bigger target', 'Diagnose the bottleneck', 'Add more channels', 'Copy a competitor'], 'Write the obstacle before writing the target.', 'Did the goal become more specific after diagnosis?', 'Good strategy starts with the nature of the challenge.', 'Do not use diagnosis as endless analysis.'],
  ['boundary-next-step', 'Boundary Plus Next Step', 'Conflict', ['src-boundaries'], 'A boundary is clearer when it includes the behavior, limit, and next step. It is not a mood or hint.', 'Someone repeatedly sends urgent non-urgent requests late at night.', ['Complain vaguely', 'State the response window', 'Ignore them forever', 'Reply angrily'], 'Say when you will respond and what counts as urgent.', 'Did I make the limit actionable?', 'Boundaries protect attention and trust.', 'Do not use boundary language to avoid commitments you actually made.'],
  ['map-feedback-loop', 'Map the Feedback Loop', 'Systems', ['src-fifth-discipline'], 'Recurring problems usually have a loop. Blame points at people; systems thinking asks what keeps reproducing the pattern.', 'A support queue is always overloaded by Friday.', ['Blame support', 'Map intake, capacity, and escalation', 'Demand heroics', 'Ignore patterns'], 'Draw the loop that creates the repeated issue.', 'What reinforces the problem?', 'Repeated issues usually have repeated causes.', 'Systems thinking should not erase personal responsibility.'],
  ['charisma-character', 'Charisma Is Not Character', 'Ethics', ['src-adp-622', 'src-prince'], 'Charisma can move people quickly, but it does not prove discipline, truthfulness, or care. Leaders must separate attraction from trustworthiness.', 'A charismatic colleague rallies support while hiding important risks.', ['Follow the energy', 'Ask for evidence and tradeoffs', 'Attack their personality', 'Stay silent'], 'Before endorsing someone, ask what evidence supports the claim.', 'Did I confuse confidence with reliability?', 'Presence without character is dangerous.', 'Do not reward charm that conceals harm.'],
  ['agency-in-coaching', 'Build Capacity, Not Dependency', 'Teams', ['src-harvard-adaptive', 'src-ccl-fundamental-4'], 'Good leadership leaves people more capable. If every solution depends on you, the system is getting weaker.', 'Your team asks you to approve every small choice.', ['Approve faster', 'Clarify decision rights', 'Take back control', 'Criticize dependence'], 'Give one decision back with clear boundaries.', 'Did I increase capability?', 'Leadership includes developing judgment in others.', 'Do not abandon people under the label of empowerment.'],
  ['moral-disagreement', 'Name the Sacred Value', 'Ethics', ['src-haidt'], 'Many conflicts are value conflicts wearing practical clothing. Naming the protected value can reduce contempt.', 'Two groups argue over a policy change.', ['Assume one side is stupid', 'Name each side’s protected value', 'Pick your favorite', 'Avoid the issue'], 'Ask: “What value would this option protect?”', 'Did naming values reduce caricature?', 'People defend what feels morally sacred.', 'Understanding is not the same as excusing harm.'],
  ['make-work-visible', 'Make Work Visible', 'Teams', ['src-team-teams', 'src-rework-teams'], 'Hidden work creates mistrust and bad coordination. Visible work lets people coordinate without constant status chasing.', 'Everyone thinks everyone else is blocked.', ['Hold more status meetings', 'Create a visible owner/status list', 'Ask for updates hourly', 'Wait'], 'Make owner, next action, and blocker visible for one project.', 'Did visibility reduce interruptions?', 'Shared context speeds coordination.', 'Visibility should not become surveillance.'],
  ['two-way-door', 'Two-Way Door Decisions', 'Judgment', ['src-lean-startup'], 'Some decisions are reversible enough to test. Treating every decision as permanent slows learning.', 'You are debating a new intake form for a week.', ['Debate another week', 'Run a reversible trial', 'Make it permanent', 'Cancel the project'], 'Choose one reversible decision and set a review date.', 'What would tell me to keep, change, or stop?', 'Reversibility permits speed.', 'Experiments need consent when they affect others.'],
  ['listen-for-resistance', 'Listen for Resistance Data', 'Systems', ['src-harvard-adaptive'], 'Resistance is often information about loss, identity, incentives, or overload. Leaders learn from it before deciding how to push.', 'A department quietly resists a new process.', ['Call them negative', 'Ask what loss they see', 'Bypass them', 'Threaten deadlines'], 'Ask what the change puts at risk for them.', 'What did resistance teach me?', 'Resistance can reveal the hidden cost of change.', 'Do not let resistance become a veto without examination.'],
  ['public-private-standard', 'Private Weakness, Public Consequence', 'Power', ['src-adp-622', 'src-meditations'], 'A leader’s private habits eventually shape public outcomes. Undisciplined attention, resentment, or vanity leaks into decisions.', 'You notice you avoid people who challenge you.', ['Keep avoiding them', 'Invite one challenge', 'Find easier allies', 'Pretend neutrality'], 'Schedule one conversation with someone who sees a risk you miss.', 'What private tendency affects my leadership?', 'Self-command is public infrastructure for a leader.', 'Do not use self-improvement language to hide structural problems.'],
  ['objective-criteria', 'Use Objective Criteria', 'Conflict', ['src-getting-yes', 'src-noise'], 'When people argue preferences, objective criteria can move the dispute to standards. Criteria reduce ego fights.', 'Two teams both want the same limited resource.', ['Give it to your favorite', 'Use agreed criteria', 'Split randomly', 'Let them fight'], 'Write the standard before allocating the resource.', 'Would the losing side understand the standard?', 'Fairness improves when criteria are visible.', 'Criteria can still be chosen unfairly.'],
  ['tell-the-tradeoff', 'Tell the Tradeoff', 'Communication', ['src-crucial', 'src-manipulation'], 'Trust grows when leaders name what is being gained and what is being sacrificed. Hidden tradeoffs create later betrayal.', 'A faster launch means less testing.', ['Only sell the upside', 'Name speed and risk', 'Hide testing concerns', 'Delay without explanation'], 'In one decision, explicitly name the tradeoff.', 'Did I make the cost visible?', 'Adults can handle tradeoffs better than spin.', 'Do not disguise persuasion as transparency if the decision is already locked.'],
  ['learning-after-error', 'Turn Error Into Learning', 'Teams', ['src-fearless', 'src-ccl-fundamental-4'], 'A learning culture examines errors without jumping straight to shame. The goal is repair and prevention.', 'A mistake reaches a client.', ['Find someone to blame', 'Ask what allowed the error', 'Hide it', 'Lower standards'], 'After one error, ask “what made this possible?” before “who failed?”', 'Did accountability and learning both happen?', 'Learning agility requires usable feedback from mistakes.', 'Do not use “no blame” to avoid consequences for negligence.'],
  ['least-privilege-life', 'Use Least Privilege Thinking', 'Technology/Future', ['src-cyber'], 'Least privilege is also a leadership mindset: give enough access and authority for the work, not unlimited exposure.', 'A contractor asks for full access to every file.', ['Grant everything', 'Grant scoped access', 'Refuse all help', 'Share your password'], 'Reduce one unnecessary access or permission today.', 'What is the smallest access that lets the work happen?', 'Good systems limit blast radius.', 'Security should protect people, not become control theater.'],
  ['meaning-without-spin', 'Meaning Without Spin', 'Self-Command', ['src-frankl'], 'People need meaning, but meaning should not deny pain or excuse preventable harm. Honest purpose names both.', 'Your team is exhausted by a difficult project.', ['Say suffering builds character', 'Name hardship and purpose honestly', 'Ignore morale', 'Demand positivity'], 'State why the work matters and what burden needs reducing.', 'Did I honor reality and purpose?', 'Meaning steadies effort when it remains truthful.', 'Do not use purpose to exploit people.'],
  ['challenge-with-care', 'Challenge With Care', 'Communication', ['src-crucial', 'src-carnegie'], 'Candor without care feels like attack; care without candor becomes avoidance. Leadership needs both.', 'A friend or teammate is underperforming.', ['Avoid it', 'Attack the flaw', 'State care and the gap', 'Drop hints'], 'Start with commitment to the relationship, then name the gap.', 'Was I clear and respectful?', 'Directness lands better inside visible care.', 'Care language should not become emotional manipulation.'],
  ['authority-pattern', 'Notice Your Authority Pattern', 'Power', ['src-harvard-adaptive'], 'People carry habits around authority: over-compliance, rebellion, rescue seeking, or control. Leaders need to notice their pattern.', 'A senior person disagrees and you immediately retreat.', ['Retreat automatically', 'Notice the pattern and ask one question', 'Attack them', 'Seek approval'], 'Name your default authority reaction before a high-stakes meeting.', 'What pattern did I bring into the room?', 'Authority dynamics shape judgment before facts do.', 'Do not over-psychologize legitimate disagreement.'],
  ['context-before-delegation', 'Give Context Before Delegating', 'Teams', ['src-team-teams'], 'Delegation without context creates fragile execution. Context lets people adapt when reality changes.', 'You assign outreach but the situation shifts midweek.', ['Give only tasks', 'Share intent and boundaries', 'Micromanage', 'Blame confusion'], 'When delegating, include intent, constraints, and decision rights.', 'Could they adapt without asking me?', 'Shared intent increases intelligent autonomy.', 'Do not call dumping work delegation.'],
  ['bias-check', 'Check the Confident Story', 'Judgment', ['src-kahneman'], 'Confidence is not evidence. The most dangerous story is often the one that feels complete too early.', 'You instantly know why a project failed.', ['Trust the first story', 'Ask for disconfirming evidence', 'Announce blame', 'Move on'], 'Ask for one fact that could disprove your explanation.', 'Did my certainty soften or sharpen?', 'Fast stories need slow checks.', 'Do not use bias language to dismiss intuition with real evidence.'],
  ['shape-the-path', 'Shape the Path', 'Systems', ['src-switch'], 'Behavior changes more easily when the environment supports it. Leaders should reduce friction, not just demand willpower.', 'People keep forgetting a weekly review.', ['Send guilt messages', 'Put review in the workflow', 'Cancel it', 'Assume laziness'], 'Move one desired behavior closer to where work already happens.', 'Did the environment make the action easier?', 'Path design beats repeated scolding.', 'Behavior design should not remove informed choice.'],
  ['productive-conflict', 'Invite Productive Conflict', 'Teams', ['src-lencioni', 'src-crucial'], 'Teams that avoid disagreement often commit weakly. Productive conflict surfaces assumptions before they become execution problems.', 'Everyone nods in the meeting but complains afterward.', ['Enjoy the agreement', 'Ask what concern is unspoken', 'Call them disloyal', 'Make the decision alone'], 'Ask: “What is the strongest objection to this plan?”', 'Did dissent improve the decision?', 'Conflict can serve commitment when bounded by shared purpose.', 'Do not provoke conflict for drama or dominance.'],
  ['calibrated-question', 'Use a Calibrated Question', 'Conflict', ['src-voss'], 'A calibrated question invites problem-solving without direct accusation. It can expose constraints and responsibility.', 'A stakeholder demands an impossible timeline.', ['Say impossible', 'Ask how we would make it work safely', 'Agree and fail', 'Threaten escalation'], 'Ask: “How would we make that work without breaking quality?”', 'Did the question reveal constraints?', 'Good questions shift pressure into joint problem solving.', 'Do not use questions as traps.'],
  ['public-accountability', 'Make Accountability Visible', 'Ethics', ['src-adp-622', 'src-speed-trust'], 'Power becomes safer when accountability is visible. People should know who owns the decision and how correction happens.', 'You approve a risky change.', ['Hide ownership', 'Name owner and review point', 'Delegate blame', 'Avoid measurement'], 'Attach one decision to an owner and review date.', 'Could someone challenge this later?', 'Accountability protects trust after uncertainty.', 'Do not create accountability theater with no real consequence.'],
  ['opposing-truths', 'Hold Opposing Truths', 'Judgment', ['src-harvard-adaptive', 'src-haidt'], 'Leaders often face tensions where both sides protect something real. Better judgment starts by naming both truths.', 'Speed matters, but inclusion matters too.', ['Choose one and mock the other', 'Name both goods and decide tradeoff', 'Delay forever', 'Pretend no conflict'], 'Write the two values in tension before deciding.', 'Did naming both improve the decision?', 'Maturity often means acting without flattening complexity.', 'Do not use complexity to avoid moral clarity.'],
  ['attention-budget', 'Guard the Attention Budget', 'Self-Command', ['src-meditations', 'src-cyber'], 'Attention is a strategic resource. Fragmented attention weakens judgment and makes leaders reactive.', 'Notifications pull you away from deep planning every few minutes.', ['Accept interruption', 'Create one protected block', 'Multitask harder', 'Blame technology'], 'Protect a 25-minute block for one decision or review.', 'What improved when attention was protected?', 'Attention control supports better power and judgment.', 'Do not impose your focus style on everyone else without context.'],
  ['source-of-resistance', 'Diagnose Resistance Source', 'Power', ['src-harvard-adaptive', 'src-prince'], 'Resistance can come from loss, fear, bad incentives, distrust, or real disagreement. Each needs a different response.', 'A senior operator blocks your reform.', ['Assume sabotage', 'Identify the source of resistance', 'Remove them immediately', 'Give up'], 'List three possible reasons for resistance before responding.', 'Which response fits the source?', 'Power literacy includes reading incentives without paranoia.', 'Do not label every critic as a threat.'],
  ['decision-record', 'Write the Decision Record', 'Communication', ['src-noise', 'src-rumelt'], 'Decision records preserve rationale, tradeoffs, and accountability. They reduce revisionist memory.', 'A project decision may be questioned later.', ['Trust memory', 'Write a short decision record', 'Hide disagreement', 'Over-document everything'], 'Capture decision, reason, tradeoff, owner, review date.', 'Would this be understandable in one month?', 'Records make learning and accountability possible.', 'Documentation should clarify, not bury responsibility.'],
  ['technology-human-cost', 'Count the Human Cost', 'Technology/Future', ['src-ai-literacy', 'src-manipulation'], 'Technology decisions change labor, attention, privacy, dignity, and power. Leaders must count human cost alongside efficiency.', 'A tool will monitor worker behavior to improve output.', ['Optimize only for output', 'Assess privacy, consent, and dignity', 'Reject all tools', 'Hide monitoring'], 'For one tool, write who benefits, who bears risk, and who can refuse.', 'Did I count people, not just metrics?', 'Technical adoption is also moral design.', 'Do not normalize surveillance as leadership.'],
  ['repair-after-harm', 'Repair After Harm', 'Ethics', ['src-nvc', 'src-fearless'], 'Leadership is tested after harm. Repair requires acknowledgment, changed behavior, and sometimes restitution.', 'Your decision caused avoidable extra work for others.', ['Explain intent only', 'Acknowledge impact and repair', 'Wait for it to fade', 'Blame ambiguity'], 'Say what happened, what you own, and what will change.', 'Did I repair trust or only defend myself?', 'Intent does not erase impact.', 'Do not perform apology without changing behavior.'],
  ['coalition-map', 'Map the Coalition', 'Influence', ['src-prince', 'src-getting-yes'], 'Change depends on supporters, blockers, undecideds, and the interests behind each. Mapping prevents naive persuasion.', 'You need approval across multiple groups.', ['Pitch everyone the same way', 'Map interests and influence', 'Only convince your allies', 'Avoid blockers'], 'List allies, blockers, undecideds, and their interests.', 'Who needs a different argument or assurance?', 'Influence is partly coalition design.', 'Coalition work should not become secrecy or manipulation.'],
  ['standard-of-truth', 'Protect the Standard of Truth', 'Power', ['src-adp-622', 'src-manipulation'], 'Once leaders reward convenient falsehoods, the system learns to hide reality. Truth standards are infrastructure.', 'A report flatters your plan but omits risks.', ['Use it anyway', 'Ask for risks to be restored', 'Punish the analyst', 'Ignore details'], 'Publicly reward one inconvenient truth.', 'Did people learn that truth is safe?', 'Leaders get the information they reward.', 'Do not demand honesty then punish its consequences.'],
  ['stoic-control', 'Control What Is Yours', 'Philosophy', ['src-stoicism', 'src-enchiridion'], 'Stoicism begins by separating what depends on your judgment and action from what belongs to fortune, other people, or events already in motion.', 'A public criticism lands before an important decision.', ['Control the criticism', 'Control your next judgment and action', 'Pretend it does not hurt', 'Retaliate quickly'], 'Write two columns: what is mine to govern, and what is only mine to respond to.', 'Did I spend energy on action or on trying to command reality?', 'Stoic control is not control of the world; it is disciplined authorship of your response.', 'Do not use Stoicism to accept injustice that you have a duty and ability to resist.'],
  ['stoic-memento-mori', 'Remember Death Without Becoming Dark', 'Philosophy', ['src-stoicism', 'src-meditations'], 'Memento mori uses mortality to put ambition, fear, resentment, and distraction back into proportion.', 'You are furious about a slight that will not matter next year.', ['Nurse the slight', 'Use mortality to resize it', 'Withdraw from everything', 'Win the status exchange'], 'Ask whether this will matter at the end of life, then choose the honorable action now.', 'Did mortality make me clearer, kinder, or more disciplined?', 'Remembering death can clarify what deserves attention.', 'Do not use mortality to become numb, fatalistic, or careless with other people’s pain.'],
  ['stoic-view-from-above', 'Take the View From Above', 'Philosophy', ['src-stoicism', 'src-meditations'], 'The view from above is a Stoic imagination exercise that widens perspective beyond ego, insult, and local status.', 'A small office conflict feels like the whole world.', ['Zoom into the insult', 'Widen the frame', 'Dismiss everyone involved', 'Avoid the decision'], 'Imagine the conflict from the scale of the city, country, history, and human life.', 'What changed when I reduced my ego’s camera angle?', 'Perspective can shrink vanity without shrinking responsibility.', 'Do not use distance as an excuse to avoid care or repair.'],
  ['virtue-as-habit', 'Make Virtue a Habit', 'Philosophy', ['src-aristotle-ethics'], 'Aristotle treats character as something trained by repeated action, practical judgment, and the search for the fitting response.', 'You want to become courageous but keep avoiding difficult conversations.', ['Wait to feel courageous', 'Practice one measured courageous act', 'Swing into recklessness', 'Call avoidance prudence'], 'Choose one virtue and practice it in a small visible action today.', 'Which repeated action is shaping my character?', 'Virtue becomes reliable through practice.', 'Do not mistake habit for goodness if the habit serves vanity or domination.'],
  ['plato-cave', 'Leave the Cave of Appearances', 'Philosophy', ['src-plato-republic'], 'Plato’s cave warns that groups can mistake shadows, popularity, and habit for reality.', 'Everyone agrees a project is healthy because the dashboard looks good.', ['Trust the shadows', 'Ask what the numbers hide', 'Punish doubt', 'Ignore evidence'], 'Ask what unseen reality might sit behind a visible signal.', 'What appearance did I treat as truth?', 'Leadership requires suspicion of easy appearances.', 'Do not turn suspicion into arrogance or contempt for ordinary people.'],
  ['epicurean-enough', 'Know What Is Enough', 'Philosophy', ['src-epicureanism'], 'Epicurean philosophy teaches that many desires create anxiety because they are vain, competitive, or limitless.', 'You keep accepting status work that destroys sleep and friendship.', ['Pursue more status', 'Define enough', 'Reject all ambition', 'Hide the exhaustion'], 'Name one desire that creates more anxiety than value.', 'What became easier when I wanted less?', 'Enoughness can be a form of strategic freedom.', 'Do not use simplicity to abandon duties or people who depend on you.'],
  ['cynic-freedom-from-status', 'Question the Status Game', 'Philosophy', ['src-cynicism'], 'Cynicism asks what social convention, luxury, or approval is secretly controlling your freedom.', 'You are about to make a decision mainly because it looks impressive.', ['Chase the signal', 'Ask what need is real', 'Mock everyone', 'Perform rebellion'], 'Identify one status signal and ask what would happen if you stopped serving it.', 'Which approval system owns me more than I admit?', 'Freedom grows when false needs lose authority.', 'Do not confuse honest simplicity with cruelty, contempt, or performative rebellion.'],
  ['confucian-ritual', 'Use Ritual to Train Respect', 'Philosophy', ['src-confucianism'], 'Confucian thought treats ritual and role as ways to train attention, respect, duty, and humane conduct.', 'A recurring meeting has become careless and disrespectful.', ['Ignore the form', 'Redesign the ritual to show respect and purpose', 'Demand warmth without structure', 'Cancel all formality'], 'Make one routine interaction more respectful through a clear opening, turn-taking rule, or closing.', 'Did form improve care rather than replace it?', 'Ritual can make values repeatable.', 'Do not let roles become rigid hierarchy without humanity, reciprocity, or correction.'],
  ['daoist-wu-wei', 'Lead With Less Force', 'Philosophy', ['src-daoism'], 'Daoist wu wei means fitting action to reality so the leader stops fighting the grain of the situation.', 'You keep adding rules to a process that people already find brittle.', ['Add another rule', 'Remove friction and let the system breathe', 'Do nothing forever', 'Blame people'], 'Find one place where less force would create more order.', 'What improved when I stopped over-controlling?', 'Sometimes the best intervention is removing the intervention that created resistance.', 'Do not use non-force as a mask for cowardice when protection or decision is required.'],
  ['buddhist-impermanence', 'Practice With Impermanence', 'Philosophy', ['src-buddhist-philosophy'], 'Buddhist philosophy teaches that clinging to what changes creates suffering and distorts perception.', 'A role, relationship, or plan is changing and you keep trying to freeze it.', ['Deny the change', 'Notice craving and respond clearly', 'Detach from everyone', 'Force the old version back'], 'Name what is changing, what you are clinging to, and what compassionate action remains.', 'Did accepting change make me passive or clearer?', 'Impermanence can sharpen attention and compassion.', 'Do not use detachment to become indifferent to harm or responsibility.'],
  ['existential-choice', 'Own the Choice You Are Making', 'Philosophy', ['src-existentialism'], 'Existentialism insists that avoiding choice is still a choice, and that freedom brings responsibility.', 'You keep delaying a decision because no option feels pure.', ['Pretend delay is neutral', 'Name the choice inside the delay', 'Blame the situation only', 'Let others absorb the cost'], 'Write the decision you are making by not deciding.', 'What responsibility have I been hiding inside uncertainty?', 'Meaning is shaped by owned action under uncertainty.', 'Do not turn existential freedom into self-absorption; other people bear consequences too.'],
  ['pragmatic-truth', 'Test Ideas by Consequences', 'Philosophy', ['src-pragmatism'], 'Pragmatism treats ideas as commitments tested through experience, consequences, and disciplined inquiry.', 'A beautiful theory keeps failing in practice.', ['Protect the theory', 'Study consequences and revise', 'Reject all principles', 'Declare victory'], 'Ask what experience would confirm, revise, or disconfirm this belief.', 'What did reality teach that the theory missed?', 'Ideas become wiser when they stay answerable to experience.', 'Do not reduce truth to whatever is convenient or popular in the short term.'],
  ['habit-identity', 'Build Identity Through Reps', 'Self-Help', ['src-atomic-habits', 'src-power-of-habit'], 'Popular habit books converge on a useful point: repeated behavior is identity training. The question is not only what you did today, but what kind of person the repetition is making easier to become.', 'You want to become disciplined but keep designing huge resets that collapse after three days.', ['Write a grand new plan', 'Choose one tiny repeatable rep', 'Wait for motivation', 'Buy another tool'], 'Pick one two-minute behavior and attach it to a clear cue for seven days.', 'What identity did this tiny rep train?', 'Small repeated actions compound when they are clear enough to repeat.', 'Do not use habit language to blame people for constraints, illness, grief, or environments they cannot control.'],
  ['proactive-circle', 'Work Your Circle of Influence', 'Self-Help', ['src-seven-habits', 'src-stoicism'], 'A future leader needs the self-help idea of agency without turning it into denial. Separate concern from influence, then act where responsibility is real.', 'You are angry about a large institutional problem but your day is disappearing into rumination.', ['Ruminate harder', 'Name one influence-zone action', 'Pretend the problem is fine', 'Attack someone nearby'], 'Draw two circles: concern and influence. Put one action in the influence circle.', 'Did I convert concern into responsible action?', 'Agency grows when attention moves from complaint to stewardship.', 'Do not use proactivity to excuse unjust systems or tell harmed people that everything is their fault.'],
  ['deep-work-protection', 'Protect Deep Work', 'Self-Help', ['src-deep-work', 'src-meditations'], 'Deep work is the self-help version of guarding the mind as a strategic asset. Serious judgment requires protected attention, especially when noise is profitable to everyone except the person trying to think.', 'You need to make a hard decision but keep checking messages every few minutes.', ['Multitask through it', 'Protect one focused block', 'Ask others to decide', 'Keep refreshing messages'], 'Set a 30-minute block with one question, no notifications, and a written output.', 'What changed when attention was protected?', 'Protected attention increases the quality of thought.', 'Do not impose deep-work rules on people whose roles require responsiveness without redesigning their workload.'],
  ['growth-mindset-practice', 'Make Ability Trainable', 'Self-Help', ['src-mindset'], 'Growth mindset is useful when it becomes practice design, not empty positivity. The leader’s move is to connect effort, strategy, feedback, and support.', 'A teammate says they are simply bad at presenting.', ['Agree with the label', 'Design one practice rep with feedback', 'Give vague encouragement', 'Take over forever'], 'Replace one fixed label with a practice plan: rep, feedback, next attempt.', 'Did the practice plan make improvement believable?', 'Ability becomes more trainable when practice is specific.', 'Do not say “growth mindset” while ignoring real barriers, weak instruction, or unfair opportunity.'],
  ['grit-with-direction', 'Pair Grit With Direction', 'Self-Help', ['src-grit', 'src-rumelt'], 'Grit matters only when persistence serves a worthy direction. Leaders need the courage to continue and the humility to pivot when evidence changes.', 'You keep pushing a project because quitting would embarrass you.', ['Push harder', 'Review mission, evidence, and pivot options', 'Quit everything', 'Hide the data'], 'Write what would justify continuing, changing course, or stopping.', 'Is my persistence serving purpose or ego?', 'Persistence becomes wisdom when paired with feedback and direction.', 'Do not romanticize endurance when people are being harmed or the strategy is plainly broken.'],
  ['keystone-habit', 'Find the Keystone Habit', 'Self-Help', ['src-power-of-habit', 'src-switch'], 'A keystone habit is a repeated practice that improves other behaviors because it changes cues, energy, identity, or environment. Leaders should look for leverage, not just more rules.', 'Your evenings keep falling apart and sleep, reading, and planning all suffer.', ['Fix everything at once', 'Change the one evening cue that affects the rest', 'Shame yourself', 'Ignore the pattern'], 'Find one upstream behavior that makes two other good behaviors easier.', 'What downstream behaviors changed from one upstream habit?', 'Good habit design changes the system around behavior.', 'Do not treat all human difficulty as a habit problem; some problems require help, care, or structural change.'],
  ['frankenstein-responsibility', 'Own What You Create', 'Literature', ['src-frankenstein', 'src-ai-literacy'], 'Frankenstein is essential leadership reading because it separates brilliance from responsibility. Creating something powerful does not end the moment it works; responsibility begins when consequences reach other people.', 'You launch an automation that saves time but quietly creates errors for another team.', ['Celebrate the launch only', 'Own the downstream consequences', 'Blame users', 'Hide the issue'], 'For one project, name maintenance, harm, and accountability before launch.', 'Who lives with the consequences of what I create?', 'Creation requires stewardship after invention.', 'Do not use innovation language to escape accountability for foreseeable harm.'],
  ['first-impressions', 'Revise First Impressions', 'Literature', ['src-pride-prejudice', 'src-kahneman'], 'Pride and Prejudice trains a leader to distrust easy social certainty. First impressions may contain signal, but status, attraction, resentment, and ego can make weak evidence feel complete.', 'You decide a new colleague is arrogant after one meeting.', ['Freeze the judgment', 'Seek more evidence and context', 'Gossip about it', 'Overcorrect and trust blindly'], 'Write your first impression, then write what evidence could revise it.', 'What did I assume before I had enough evidence?', 'Social judgment improves when it stays revisable.', 'Do not confuse open-mindedness with ignoring repeated harmful behavior.'],
  ['obsession-narrows-vision', 'Do Not Let Mission Become Obsession', 'Literature', ['src-moby-dick', 'src-rumelt'], 'Moby-Dick is a warning about a leader whose private fixation captures a collective mission. The leadership question is whether the goal still serves reality and people, or whether people now serve the leader’s obsession.', 'You keep escalating a failing initiative because it has become your signature project.', ['Escalate again', 'Ask whether the mission still serves people', 'Silence critics', 'Rename the failure success'], 'Ask one critic what cost your fixation may be hiding.', 'Where has mission become ego?', 'Great focus needs correction mechanisms.', 'Do not call obsession vision when others are paying the price.'],
  ['mercy-and-justice', 'Hold Mercy and Justice Together', 'Literature', ['src-les-miserables', 'src-manipulation'], 'Les Miserables gives leaders a moral workout: law matters, but law without mercy can become inhuman; mercy matters, but mercy without responsibility can become evasion.', 'Someone broke a rule for understandable reasons and the policy says the penalty is automatic.', ['Apply the rule blindly', 'Consider justice, mercy, repair, and precedent', 'Ignore the rule completely', 'Punish harder to look fair'], 'Name the rule, the human context, the repair need, and the precedent.', 'Did I preserve both humanity and standards?', 'Wise judgment asks what justice is for.', 'Do not use mercy selectively for favorites or justice selectively for outsiders.'],
  ['moral-complexity', 'Read Motives in Layers', 'Literature', ['src-brothers-karamazov', 'src-haidt'], 'The Brothers Karamazov trains patience with moral complexity. Leaders often misread conflict because they want one clean motive when people are usually mixtures of fear, pride, love, belief, appetite, and conscience.', 'Two partners accuse each other of bad faith and both seem partly right.', ['Pick one villain fast', 'Map the layered motives and responsibilities', 'Avoid judgment forever', 'Treat all motives as equal'], 'Write three possible motives and one responsibility for each side.', 'Did complexity improve judgment or become avoidance?', 'Layered motives make repair more realistic.', 'Do not use complexity to excuse cruelty or avoid consequences.'],
  ['return-to-purpose', 'Return to Purpose After Winning', 'Literature', ['src-odyssey', 'src-meditations'], 'The Odyssey is not just adventure; it is a test of whether cunning and survival still point back toward home, duty, and order. Leaders can win tactics and still forget what the journey was for.', 'You achieve a major goal and immediately chase the next conquest without repairing relationships.', ['Chase the next win', 'Return to purpose and repair', 'Celebrate only yourself', 'Pretend no one helped'], 'After one win, write what must be restored, thanked, or repaired.', 'What purpose should success return me to?', 'Strategy should serve a home worth returning to.', 'Do not use heroic struggle to justify neglecting people who carried the cost.'],
  ['melian-power', 'Study Power Without Justice', 'History', ['src-thucydides', 'src-prince'], 'The Melian Dialogue is a cold education in what power sounds like when it stops answering to justice. A future leader must understand realism without becoming owned by it.', 'You have leverage over a weaker party and can force a favorable deal.', ['Use maximum pressure', 'Ask what norm this use of power teaches', 'Pretend power is irrelevant', 'Hide the asymmetry'], 'Before using leverage, write what precedent your action creates.', 'Would I accept this norm if I were weaker?', 'Power analysis must be paired with moral restraint.', 'Do not quote realism as permission to abandon justice.'],
  ['republic-norm-decay', 'Notice Norm Decay Early', 'History', ['src-roman-republic', 'src-prince'], 'The Roman Republic teaches that institutions are not only laws; they are habits, limits, expectations, and restraint. Norm decay often looks useful before it looks catastrophic.', 'Your group wants to bypass a rule because this case feels urgent and politically convenient.', ['Bypass it quietly', 'Name the norm and the precedent', 'Attack anyone objecting', 'Pretend rules never bend'], 'Ask what would happen if your opponents used the same exception.', 'What norm am I weakening for a short-term win?', 'Institutions depend on repeated restraint.', 'Do not worship norms that protect injustice, but do not casually destroy guardrails for convenience.'],
  ['revolution-legitimacy', 'Repair Legitimacy Before Rupture', 'History', ['src-french-revolution', 'src-harvard-adaptive'], 'The French Revolution warns that legitimacy can decay faster than rulers believe. When grievance, inequality, fiscal stress, and contempt accumulate, reform may arrive too late to control the form of change.', 'People in your organization no longer believe leadership listens or sacrifices fairly.', ['Dismiss the anger', 'Repair legitimacy with visible sacrifice and reform', 'Tighten control only', 'Offer slogans'], 'Name one legitimate grievance and one visible repair action.', 'What would make authority believable again?', 'Legitimacy is maintained by repair before rupture.', 'Do not use fear of disorder to silence legitimate demands for justice.'],
  ['mobilization-trap', 'Do Not Let Plans Trap Judgment', 'History', ['src-guns-august', 'src-fifth-discipline'], 'August 1914 is a lesson in systems that move faster than leaders can rethink. Mobilization plans, alliances, fear, and honor created momentum that became hard to stop.', 'A launch plan has many automated commitments and reversing course would embarrass several leaders.', ['Let the plan run', 'Install a pause point for judgment', 'Deny the risk', 'Blame the calendar'], 'Add one explicit stop-check before a plan becomes irreversible.', 'Where could momentum outrun judgment?', 'Plans need brakes as much as engines.', 'Do not hide behind process when human beings will bear the cost.'],
  ['rivals-coalition', 'Use Rivals Without Losing Command', 'History', ['src-team-rivals', 'src-team-teams'], 'Lincoln’s cabinet is a useful study in turning rivalry into information, legitimacy, and execution. The skill is not liking disagreement; it is governing it without surrendering the decision.', 'You avoid a talented critic because they challenge your authority.', ['Exclude them', 'Give them a defined role in the decision', 'Let them dominate', 'Only consult loyalists'], 'Invite one critic to pressure-test a plan with clear decision rights.', 'Did rivalry improve the decision?', 'Strong coalitions can include controlled tension.', 'Do not stage-manage dissent as decoration after the decision is already closed.'],
  ['civil-rights-discipline', 'Pair Moral Clarity With Discipline', 'History', ['src-civil-rights', 'src-crucial'], 'The civil rights movement shows that moral clarity becomes more powerful when joined to training, legal strategy, narrative discipline, coalition work, and courage.', 'Your group has a just complaint but no plan beyond outrage.', ['Post outrage only', 'Pair the moral claim with disciplined strategy', 'Drop the claim', 'Attack internal questions'], 'Write the moral claim, audience, tactic, risk, and next organizing step.', 'Did discipline strengthen the moral claim?', 'Justice work needs both conscience and craft.', 'Do not use discipline language to make oppressed people endlessly patient with harm.'],
  ['reconstruction-unfinished', 'Build Institutions After Victory', 'History', ['src-reconstruction', 'src-adp-622'], 'Reconstruction teaches that victory is not the same as durable justice. After a win, leaders must build enforcement, incentives, protection, memory, and institutions that can survive backlash.', 'Your reform passes, but the old incentives and hostile actors remain in place.', ['Declare victory', 'Build the institution that protects the win', 'Move on immediately', 'Trust goodwill alone'], 'After one win, name the enforcement, ownership, and review mechanism.', 'What makes this victory durable?', 'A just outcome needs institutions that can carry it.', 'Do not confuse symbolic victory with lived protection.'],
];

export const microLessons = lessonSpecs.map((spec, index) => {
  const [
    slug,
    title,
    domain,
    sourceIds,
    coreIdea,
    scenario,
    decisionOptions,
    practiceRep,
    reflectionPrompt,
    reviewPrompt,
    ethicsCheck,
  ] = spec;

  return {
    id: `lesson-${slug}`,
    slug,
    order: index + 1,
    title,
    domain,
    sourceIds,
    coreIdea,
    whatItGetsRight: `${title} gives a leader a concrete move that can be practiced in a real conversation or decision today.`,
    whatItMisses: 'The move is not universal; context, power differences, and timing determine whether it helps.',
    opposingView: 'A competing view would choose speed, authority, or formal process before reflection and dialogue.',
    scenario,
    decisionOptions,
    preferredOption: decisionOptions[1] || decisionOptions[0],
    practiceRep,
    reflectionPrompt,
    reviewPrompt,
    ethicsCheck,
    minutes: 6 + (index % 7),
    difficulty: ['Beginner', 'Intermediate', 'Advanced'][index % 3],
    tags: [domain, index % 2 === 0 ? 'judgment' : 'practice', index % 3 === 0 ? 'ethics' : 'leadership'],
    articleParagraphs: null,
    historicalExample: historicalExamples[slug] || null,
    sourceBasis: sourceIds.map((id) => sourceTitle(id)),
    fidelityNote:
      'This reading is a copyright-safe synthesis. It paraphrases known leadership ideas, names the source basis, and uses history as an illustrative pattern rather than invented proof.',
  };
}).map((lesson) => ({
  ...lesson,
  articleParagraphs: buildLessonArticle(lesson),
  minutes: Math.max(10, lesson.minutes + 5),
}));

export const createInitialState = () => ({
  schemaVersion: 1,
  sources: sourceCards,
  lessons: microLessons,
  reviews: microLessons.reduce((acc, lesson, index) => {
    acc[lesson.id] = {
      lessonId: lesson.id,
      status: 'new',
      ease: 2,
      intervalDays: 0,
      dueAt: index < 12 ? isoToday() : null,
      lastReviewedAt: null,
      attempts: 0,
      known: 0,
      needsWork: 0,
    };
    return acc;
  }, {}),
  sessions: [],
  reflections: [],
  notes: {},
  settings: {
    dailyGoalCards: 10,
    currentFocus: 'Decision Quality',
    streakDays: 0,
    lastStudiedDate: null,
    resume: {
      view: 'feed',
      lessonId: null,
      feedLessonId: null,
      updatedAt: null,
    },
  },
});
