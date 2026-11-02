/**
 * How to Use This Page - Interactive Guide Modal Component
 */

export function renderGuideModal() {
  return `
    <dialog class="modal-dialog guide-dialog" id="guideModal" closedby="any" aria-labelledby="guideModalTitle">
      <div class="modal-box guide-modal-box">
        
        <!-- Header -->
        <div class="modal-header">
          <div class="modal-title-wrap">
            <div class="guide-title-row">
              <span class="guide-icon">📖</span>
              <h3 id="guideModalTitle">How to Use This Command Center</h3>
            </div>
            <p class="modal-subtitle">
              Live spectator HUD & reference guide for <strong>The Ballad of the Seasoners</strong>.
            </p>
          </div>
          <button type="button" class="btn-close" onclick="window.closeGuideModal()" aria-label="Close guide" title="Close">✕</button>
        </div>

        <!-- Body -->
        <div class="modal-body guide-modal-body custom-scrollbar">
          
          <div class="guide-grid">
            
            <!-- Section 1: Party Vitals & Tabletop Modes -->
            <div class="guide-card">
              <div class="guide-card-header">
                <span class="guide-badge text-gold">⚔ PARTY HUD</span>
                <h4>Party Vitals & Tabletop Modes</h4>
              </div>
              <p>Reads live character data directly from each player's public D&D Beyond sheet:</p>
              <ul>
                <li><strong>Full Vitals:</strong> Shows HP, AC, initiative, speed, and passive senses. Click any card to inspect that character's full sheet.</li>
                <li><strong>Battle Deck:</strong> Compact horizontal view for tablets and combat tracking.</li>
                <li><strong>Abilities & Charges:</strong> Expand the drawer on any character card to see limited-use features and item charges.</li>
              </ul>
            </div>

            <!-- Section 2: Live Rolls -->
            <div class="guide-card">
              <div class="guide-card-header">
                <span class="guide-badge text-accent">⚡ LIVE ROLLS</span>
                <h4>Live Rolls (Right Sidebar)</h4>
              </div>
              <p>Tracks real-time character sheet changes from D&D Beyond:</p>
              <ul>
                <li><strong>HP & Spell Slots:</strong> Logs damage taken, healing, temporary HP, and expended spell slots.</li>
                <li><strong>Concentration Alerts:</strong> When a concentrating character takes damage, calculates their Concentration DC (half damage or DC 10).</li>
                <li><strong>Shared Across Players:</strong> Concentration tags and ship state sync automatically across everyone's open dashboard.</li>
              </ul>
            </div>

            <!-- Section 3: Quick Party Search (Ctrl+K) -->
            <div class="guide-card">
              <div class="guide-card-header">
                <span class="guide-badge text-cyan">🔍 SHORTCUTS</span>
                <h4>Quick Party Search (Ctrl + K)</h4>
              </div>
              <p>Search any spell, item, trait, or action across all five characters:</p>
              <ul>
                <li>Press <kbd class="guide-kbd">Ctrl K</kbd> (or click <strong>Search</strong> in the header).</li>
                <li>Type a spell, item, or feature name (e.g. <em>"Counterspell"</em>, <em>"Heroes' Feast"</em>, <em>"Sneak Attack"</em>).</li>
                <li>Press <kbd class="guide-kbd">Enter</kbd> or click a result to jump directly to it on that character's sheet.</li>
              </ul>
            </div>

            <!-- Section 4: The Vagrant -->
            <div class="guide-card">
              <div class="guide-card-header">
                <span class="guide-badge text-gold">⚓ SPELLJAMMER</span>
                <h4>The Vagrant</h4>
              </div>
              <p>Spelljammer stat block, hull HP tracker, and weapon dice roller:</p>
              <ul>
                <li><strong>Stats:</strong> AC 17 (wood & copper plating), 450 HP, Damage Threshold 30, fly 50 ft. (5 1/2 mph), 155 ft. keel / 25 ft. beam, 30 crew, 20 tons cargo.</li>
                <li><strong>Actions (3 / Turn):</strong> Fire Eldritch Blasters (4x 10d6 force), Fire Magic Missile Silos (2x 11d8 force, auto-hits if stationary), and Move & Piercing Ram (16d10 piercing).</li>
                <li><strong>Features:</strong> Spelljammer Helm, Storm Drive (Fog Cloud at will), Immovable Anchors (4), Portal Conflux (Plane Shift 1/24h), and Special Quarters (demiplane).</li>
              </ul>
            </div>

            <!-- Section 5: Perihelion House -->
            <div class="guide-card">
              <div class="guide-card-header">
                <span class="guide-badge text-purple">🏰 STRONGHOLD</span>
                <h4>Perihelion House</h4>
              </div>
              <p>Headquarters of the Equinox guild in Sigil (Clerk's Ward & Market Ward border):</p>
              <ul>
                <li><strong>7 Rooms & Staff:</strong> Portal Conflux (3 Gates), Invocation Chamber (Hraldr Brightblade), Gardens (Tarin Cloudgaze & Count Thulan), Training Rooms (Lhamo), Tavern - The Spice Rack (Captain Sedna), Dining Hall (Skerrin), and Headquarters (Corcoran).</li>
                <li><strong>Stronghold Actions (Initiative Count 20):</strong> 5 character actions usable once per short or long rest when fighting within 120 feet of the stronghold.</li>
              </ul>
            </div>

            <!-- Section 6: Sync & Session Management -->
            <div class="guide-card">
              <div class="guide-card-header">
                <span class="guide-badge text-emerald">⚙ REFRESH & SETUP</span>
                <h4>Syncing & Party URLs</h4>
              </div>
              <p>Manage D&D Beyond syncing and active characters:</p>
              <ul>
                <li><strong>Live Sync (20s):</strong> Polls D&D Beyond every 20 seconds and syncs shared state across players every 4 seconds.</li>
                <li><strong>↻ Refresh Now:</strong> Immediately re-fetches all character sheets.</li>
                <li><strong>⚙ Party URLs:</strong> Toggle characters on or off for the session or add guest URLs.</li>
              </ul>
            </div>

          </div>

        </div>

        <!-- Footer -->
        <div class="modal-footer guide-modal-footer">
          <div class="guide-footer-tip">
            <span>💡 Tip: Press <kbd class="guide-kbd">Esc</kbd> or click outside any dialog to close it.</span>
          </div>
          <button type="button" class="btn btn-primary" autofocus onclick="window.closeGuideModal()">Got it</button>
        </div>

      </div>
    </dialog>
  `;
}
