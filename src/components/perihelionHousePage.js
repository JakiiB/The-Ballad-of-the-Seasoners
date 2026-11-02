/**
 * Perihelion House - Stronghold Component
 * Word-for-word reproduction of Perhelion House.pdf
 */
import { state } from '../state.js';

export function renderPerihelionHousePage() {
  return `
    <div class="perihelion-page-container">
      
      <!-- Top Hero Card (Word-for-Word Intro from PDF) -->
      <div class="perihelion-hero-card">
        <div class="perihelion-hero-content">
          <div class="perihelion-badge-row">
            <span class="perihelion-badge badge-sigil">Sigil</span>
            <span class="perihelion-badge badge-guild">Equinox</span>
            <span class="perihelion-badge badge-ward">Clerk's Ward & Market Ward</span>
          </div>
          <h1 class="perihelion-title">PERIHELION HOUSE</h1>
          <p class="vagrant-subtitle" style="margin-bottom: 0.5rem;">
            Founded by the Seasoners, Equinox is a guild of professional adventurers who share contacts, resources, and leads on all manner of unusual and dangerous work.
          </p>
          <p class="vagrant-subtitle">
            In Sigil, Equinox operates out of a handsome estate known as Perihelion House, straddling the border of the Clerk's Ward and Market Ward. In addition to contracts, members of Equinox can gain the benefits of its facilities: cheap room and board, training rooms, and even a portal conflux for the most experienced parties who would seek adventure in dimensions beyond.
          </p>
        </div>
        <div class="perihelion-hero-actions">
          <button class="btn btn-secondary" onclick="window.switchTab('party')">← Return to Party Vitals</button>
        </div>
      </div>

      <!-- SPECIAL FEATURES (Word-for-Word from PDF) -->
      <div class="perihelion-section">
        <div class="section-header-row">
          <h2 class="section-title">🏛️ SPECIAL FEATURES</h2>
        </div>

        <div class="facilities-grid">

          <!-- 1. PORTAL CONFLUX -->
          <div class="facility-card">
            <div class="facility-header">
              <h3 class="facility-name">PORTAL CONFLUX</h3>
            </div>
            <p class="facility-desc">
              This room can maintain up to three portals. Each of these portals follows the rules of the <em>gate</em> spell, excepting that they allow for two-way travel, do not require spell slots or a materials cost, do not require concentration, cannot forcibly draw creatures through them, and have an indefinite duration.
            </p>
            <p class="facility-desc" style="margin-top: 0.5rem;">
              These portals can only be destroyed with a casting of <em>dispel magic</em> at 7th-level or higher, or with the destruction of this room or the structure itself. If the room and structure still stand, a destroyed portal will be reformed after 30 days, leading to a location chosen by the owners of this structure.
            </p>
          </div>

          <!-- 2. INVOCATION CHAMBER -->
          <div class="facility-card">
            <div class="facility-header">
              <h3 class="facility-name">INVOCATION CHAMBER</h3>
              <div class="facility-staff">Maintained by: <strong>Hraldr Brightblade</strong> (cleric)</div>
            </div>
            <p class="facility-desc">
              Adorned with gold and symbols, this room is designed for communion with interplanar beings. Maintained by the cleric Hraldr Brightblade, the room's central dais has been enchanted with a permanent <em>magic circle</em> spell (DC 15). The magic circle can only be dispelled with a casting of <em>dispel magic</em> of 7th-level or greater.
            </p>
            <p class="facility-desc" style="margin-top: 0.5rem;">
              Once each day, a creature that possesses the Spellcasting or Pact Magic feature, has access to 5th level spell slots, and is one of the owners of this structure (or one of their allies), can use this room to invoke a powerful entity, beseeching it for aid or knowledge.
            </p>
            <p class="facility-desc" style="margin-top: 0.5rem;">
              That creature then casts either <em>contact other plane</em> or <em>scrying</em> without expending a spell slot. When cast in this way, the creature has advantage on the Intelligence saving throw required by <em>contact other plane</em>, and a creature targeted by the <em>scrying</em> spell has disadvantage on its Wisdom saving throw.
            </p>
            <p class="facility-desc" style="margin-top: 0.5rem;">
              Additionally, once every 30 days a creature that meets the above requirements, and can cast at least one 6th level spell, can cast the <em>planar ally</em> spell within this room without expending a spellslot.
            </p>
            <p class="facility-desc" style="margin-top: 0.5rem;">
              A planar ally conjured within this room cannot leave it for 8 hours without permission from the creature that summoned it, and is unable to attack or bring harm to its summoner while its summoner remains within this room.
            </p>
          </div>

          <!-- 3. GARDENS -->
          <div class="facility-card">
            <div class="facility-header">
              <h3 class="facility-name">GARDENS</h3>
              <div class="facility-staff">Overseen by: <strong>Tarin Cloudgaze</strong> (firbolg of the Elksmark tribe)</div>
            </div>
            <p class="facility-desc">
              Carefully overseen by Tarin Cloudgaze, a firbolg of the Elksmark tribe, these gardens host a variety of rare plants and fungi.
            </p>
            <p class="facility-desc" style="margin-top: 0.5rem;">
              One plant in the Gardens has three magical fruits growing on it. Any creature that eats one of these fruits gains the benefit of a <em>Lesser Restoration</em> spell. Fruits that aren't eaten within 24 hours of being picked lose their magic. The plant replaces all picked fruits daily at dawn, and it can't be transplanted without killing it.
            </p>
            <p class="facility-desc" style="margin-top: 0.5rem;">
              Once every 30 days, the Gardens can be harvested for herbs. A creature proficient with the relevant listed tools can spend 8 hours gathering enough herbs to create one of the items listed below:
            </p>
            <ul class="facility-desc" style="margin: 0.35rem 0; padding-left: 1.25rem;">
              <li>Midnight Tears (requires Poisoner's Kit)</li>
              <li>Pale Tincture (requires Poisoner's Kit)</li>
              <li>Potion of Greater Healing (requires Herbalism Kit)</li>
              <li>Torpor (requires Poisoner's Kit)</li>
              <li>Truth Serum (requires Poisoner's Kit)</li>
            </ul>
            <p class="facility-desc" style="margin-top: 0.35rem;">
              Alternatively, Tarin can be instructed to gather herbs and create one of the listed items - creating an item in this way takes seven days.
            </p>
          </div>

          <!-- 4. TRAINING ROOMS -->
          <div class="facility-card">
            <div class="facility-header">
              <h3 class="facility-name">TRAINING ROOMS</h3>
              <div class="facility-staff">Instruction: <strong>Lhamo</strong> (aarakocra)</div>
            </div>
            <p class="facility-desc">
              A spacious dojo occupies the basement of Perihelion House; racks of weapons surround sparring spaces and targets. Here, under the instruction of an aarakocra named Lhamo, members of Equinox sharpen their minds, bodies, and spirits.
            </p>
            <p class="facility-desc" style="margin-top: 0.5rem;">
              A creature can train and meditate using this facility over a period of 7 days. If they leave Perihelion House during this time, they gain no benefit.
            </p>
            <p class="facility-desc" style="margin-top: 0.5rem;">
              Otherwise, at the end of the seventh day, they gain Advantage on two kinds of saving throws for the next 7 days, chosen randomly from the Fortified Saves table. (Reroll duplicate results.)
            </p>
            <div class="facility-boon-box boon-cyan" style="margin-top: 0.6rem;">
              <div class="boon-badge">FORTIFIED SAVES (d6 Saving Throw)</div>
              <div class="boon-text">
                1: Strength | 2: Dexterity | 3: Constitution | 4: Intelligence | 5: Wisdom | 6: Charisma
              </div>
            </div>
          </div>

          <!-- 5. TAVERN (THE SPICE RACK) -->
          <div class="facility-card">
            <div class="facility-header">
              <h3 class="facility-name">TAVERN (THE SPICE RACK)</h3>
              <div class="facility-staff">Operated by: <strong>Captain Sedna</strong> (water genasi, former privateer from Omnia)</div>
            </div>
            <p class="facility-desc">
              Built on an adjacent wing of Perihelion House, the Spice Rack is a nautical themed tavern, operated by the colorful Captain Sedna, a water genasi and former privateer from Omnia.
            </p>
            <p class="facility-desc" style="margin-top: 0.5rem;">
              In addition to generating income, Captain Sedna maintains a network of spies and other sources of information scattered through Sigil and other settlements in the Outlands. These spies frequent the tavern, often incognito, reporting their findings.
            </p>
            <p class="facility-desc" style="margin-top: 0.5rem;">
              Once every seven days, the owners of Perihelion House can gather information from Captain Sedna:
            </p>
            <ul class="facility-desc" style="margin: 0.35rem 0; padding-left: 1.25rem;">
              <li>The owners can learn information about a specific location, and what events will transpire there over the next seven days.</li>
              <li>The owners can learn the location of a specific creature or person the party is familiar with, provided the creature is not hidden by magic or confined to a location that the DM deems is beyond the spy network's ability to locate. If the spies learn the target's location, they also learn where that creature has been for the previous 7 days.</li>
            </ul>
            <p class="facility-desc" style="margin-top: 0.35rem;">
              Finally, the Spice Rack has a signature beverage - <strong>The Tallest Halfling</strong>; a stout brew which grants any creature who drinks it the enlarge effect of an <em>Enlarge/Reduce</em> spell. This effect has a duration of 24 hours, for which the creature gets no saving throw.
            </p>
          </div>

          <!-- 6. DINING HALL -->
          <div class="facility-card">
            <div class="facility-header">
              <h3 class="facility-name">DINING HALL</h3>
              <div class="facility-staff">Kitchens: <strong>Skerrin</strong> (halfling cook and former sailor)</div>
            </div>
            <p class="facility-desc">
              Adventurers who pay their dues to Equinox can receive room and board at Perihelion House. The dining hall is an impressive room, with a long table, a grand hearth, and a splendid painting of the Fall of the Gleaming Gate.
            </p>
            <p class="facility-desc" style="margin-top: 0.5rem;">
              Skerrin, a halfling cook and former sailor, mans the kitchens. Once every 30 days, the owners of Perihelion House can decide to hold a lavish banquet in the Dining Hall. This banquet takes 1 hour to prepare, and 1 hour to consume.
            </p>
            <p class="facility-desc" style="margin-top: 0.5rem;">
              The effects of this lavish banquet are identical to the effects of the <em>heroes' feast</em> spell, save that it is able to feed twice as many creatures. Creatures only gain these benefits if they eat the food at the banquet itself, and this food loses its potency after 24 hours.
            </p>
          </div>

          <!-- 7. HEADQUARTERS -->
          <div class="facility-card">
            <div class="facility-header">
              <h3 class="facility-name">HEADQUARTERS</h3>
              <div class="facility-staff">Coordinated by: <strong>Corcoran</strong> (veteran soldier from Omnia)</div>
            </div>
            <p class="facility-desc">
              Connected to Equinox's other guildhalls through an arcane array of pneumatic tubes and miniaturised portals, Headquarters is not only the nerve centre of Perihelion House, but of Equinox as a whole.
            </p>
            <p class="facility-desc" style="margin-top: 0.5rem;">
              Corcoran, a veteran soldier from the world of Omnia, receives reports and intelligence from other guildhalls across the planes, coordinating recruitment and contracts - as well as the day-to-day administration of Perihelion House and its defences.
            </p>
            <p class="facility-desc" style="margin-top: 0.5rem;">
              A single creature can use this facility over a period of 7 days to make plans for their next adventure - researching potential obstacles or foes, devising countermeasures and masterminding schemes. If they leave Perihelion House during this time, they gain no benefit.
            </p>
            <p class="facility-desc" style="margin-top: 0.5rem;">
              Otherwise, at the end of the seventh day, the creature rolls two d20s and records the numbers rolled. For the next seven days, the creature can then replace any attack roll, saving throw, or ability check made by themself, or another creature that they can see, with one of these planning rolls.
            </p>
            <p class="facility-desc" style="margin-top: 0.5rem;">
              Each planning roll can be used only once, and a creature can only replace a roll in this way once per turn.
            </p>
          </div>

        </div>
      </div>

      <!-- STRONGHOLD ACTIONS (Word-for-Word from PDF) -->
      <div class="perihelion-section">
        <div class="section-header-row">
          <h2 class="section-title">⚡ STRONGHOLD ACTIONS</h2>
        </div>
        <p class="vagrant-subtitle" style="margin-bottom: 1rem;">
          Perihelion House represents the strength and skill of the Seasoners as a group; accordingly, the Seasoners gain the use of Stronghold Actions when fighting within Perihelion House. On initiative count 20 (losing initiative ties), a member of the Seasoners can take their individual stronghold action to cause one of the following effects. They must be within 120 feet of their stronghold, and can't use the same effect again until after a short or long rest.
        </p>

        <div class="actions-grid">
          
          <div class="action-card">
            <div class="action-header">
              <span class="action-character text-accent">Pasquale</span>
              <span class="action-name">Power Chord</span>
            </div>
            <div class="action-effect">
              Until initiative count 20 on the next round, all inspiration dice produce their maximum result when rolled, followed by the sounding of a two-note chord: one root note and another a fifth higher than the root.
            </div>
          </div>

          <div class="action-card">
            <div class="action-header">
              <span class="action-character text-cyan">Tang</span>
              <span class="action-name">An End to Suffering</span>
            </div>
            <div class="action-effect">
              Until initiative count 20 on the next round, you transcend your physical form. For the duration, you are immune to all but psychic damage, and you gain truesight out to a range of 60 feet.
            </div>
          </div>

          <div class="action-card">
            <div class="action-header">
              <span class="action-character text-purple">Petrus</span>
              <span class="action-name">Arcane Apotheosis</span>
            </div>
            <div class="action-effect">
              You immediately cast three spells from your list of known spells, using spell slots as normal.
            </div>
          </div>

          <div class="action-card">
            <div class="action-header">
              <span class="action-character text-rose">Meridon</span>
              <span class="action-name">Swift and Certain</span>
            </div>
            <div class="action-effect">
              Until initiative count 20 on the next round, all enemies within 60 feet of you are marked for death. The first time you hit a marked enemy on a turn, roll half the number of Sneak Attack dice for your level (round up) - the marked creature takes necrotic damage equal to the roll's total.
            </div>
          </div>

          <div class="action-card">
            <div class="action-header">
              <span class="action-character text-emerald">Sister Agnes</span>
              <span class="action-name">Aflame with the Ashen Gaze</span>
            </div>
            <div class="action-effect">
              Shafts of golden light stab down from the sky, penetrating walls and ceilings. The beams target all hostile creatures within 60 feet of you, even those hidden or invisible. Roll a number of d8s equal to your Wisdom modifier - creatures who fail a Wisdom saving throw against your spell save DC take radiant damage equal to your roll.
            </div>
          </div>

        </div>
      </div>

    </div>
  `;
}
