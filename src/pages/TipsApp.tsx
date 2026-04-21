import { Header } from '../components/Header';
import { trackEvent } from '../utils/analytics';

export function TipsApp() {
  return (
    <div className="app">
      <Header
        title="Tips & Strategies"
        subtitle="Advanced techniques to solve Pokedoku faster"
      />

      <section className="content-section">
        <h2>Core Strategies</h2>

        <h3>Start with the most restrictive squares</h3>
        <p>
          Look for squares where the fewest Pokémon are possible. These are often where
          row and column constraints overlap in ways that reduce options the most.
          Filling these first can eliminate possibilities from other squares.
        </p>

        <h3>Use negative constraints wisely</h3>
        <p>
          If you see "Not Fully Evolved" or category constraints like "Legendary," combine them
          with other constraints to narrow down options faster. A legendary that's also a
          first-stage Pokémon is much easier to identify.
        </p>

        <h3>Leverage dual-type Pokémon</h3>
        <p>
          Dual-type Pokémon can satisfy two constraints at once. When a row
          requires Fire and a column requires Flying, a Fire/Flying Pokémon fits both.
          This is especially powerful early in the puzzle.
        </p>
      </section>

      <section className="content-section">
        <h2>Advanced Techniques</h2>

        <h3>Track your elimination</h3>
        <p>
          If a Pokémon has already been used in a row or column, it can't appear again.
          The helper automatically shows only unused Pokémon, but mentally tracking
          eliminations helps predict what fits elsewhere.
        </p>

        <h3>Know your evolution chains</h3>
        <p>
          Eevee, Snorlax, and other branched Pokémon have 7-8+ evolutions.
          If a row or column has "First Stage" or "Branched," these are your best bets.
          Similarly, Mega and Gigantamax forms don't evolve further.
        </p>

        <h3>Regional forms change everything</h3>
        <p>
          Alolan, Galarian, Hisuian, and Paldean forms have different types and
          categories than their Kanto counterparts. A "Galar" region constraint
          specifically targets regional variants, not the original forms.
        </p>

        <h3>Use the share feature</h3>
        <p>
          Create a constraint combination, then click "Share puzzle" to copy the URL.
          You can send it to friends or save it to come back to later.
        </p>
      </section>

      <section className="content-section">
        <h2>TypeMatchups</h2>

        <h3>Common dual-type combinations</h3>
        <p>
          Some type combinations appear more frequently in Pokedoku. Fire/Flying (Charizard, Rapidash),
          Water/Flying (Gyarados, Salamence), and Psychic/Ghost (Mismagius, Banette)
          are common category targets.
        </p>

        <h3>Mono-type shortcuts</h3>
        <p>
          When a constraint is "Monotype," you only need Pokémon with one type.
          This simplifies checking but limits options significantly.
        </p>

        <h3>Event Pokémon and forms</h3>
        <p>
          Pay attention to special forms. Gigantamax forms (ending in "gmax") have unique
          categories but don't evolve further. Some event-exclusive forms have unique
          type/category combinations.
        </p>
      </section>

      <section className="content-section faq">
        <h2>Quick Reference</h2>

        <h3>Evolution Stages</h3>
        <p>
          <strong>First Stage:</strong> Pokémon that evolve further (e.g., Bulbasaur)<br/>
          <strong>Middle Stage:</strong> Pokémon between first and final (e.g., Ivysaur)<br/>
          <strong>Final Stage:</strong> Last form in evolution chain (e.g., Venusaur)<br/>
          <strong>No Evolution Line:</strong> Pokémon that don't evolve (e.g., Ditto)<br/>
          <strong>Not Fully Evolved:</strong> First Stage OR Middle Stage (combines both)
        </p>

        <h3>Category Shortcuts</h3>
        <p>
          <strong>Legendary:</strong> Tapu, Regis, weather trio, creation trio, some Paradox<br/>
          <strong>Mythical:</strong> Mew, Celebi, Jirachi, Victini, etc.<br/>
          <strong>Ultra Beast:</strong> Nihilego, Buzzvolt, Kartana, etc.<br/>
          <strong>Paradox:</strong> Great Tusk, Brute Belt, Slither Wing, Flutter Mane, Roaring Moon<br/>
          <strong>Fossil:</strong> Aerodactyl, Kabuto, Omanyte, Lileep, Anorith, Cranidos, Tirtouga, Tyrunt, Amaura, Archen<br/>
          <strong>Baby:</strong> Pichu, Clefairy, Igglybuff, Togepi, etc.<br/>
          <strong>Starter:</strong> All Gen 1-9 first-stage Pokémon (includes forms like Pikachu starter)
        </p>

        <h3>Weird Rules & Edge Cases</h3>
        <p>
          <strong>Regional Origin:</strong> A Pokémon counts for the region it <em>originally</em> comes from, not where it's caught. Pidgey exists in many regions but counts as <strong>Kanto</strong> only.<br/><br/>
          <strong>Mega Evolution Regions:</strong> Mega Evolutions count for their original form's region. Mega Charizard is <strong>Kanto</strong>, even though it's a special form.<br/><br/>
          <strong>What counts as "First Stage":</strong> Any Pokémon that can evolve further. Baby Pokémon (like Pichu) ARE first stage because they evolve from eggs.<br/><br/>
          <strong>What counts as "Branched":</strong> Pokémon with 3+ evolutions (Eevee: 8, Gloom: 2, Poliwhirl: 2). Regional evolutions don't count as branched.<br/><br/>
          <strong>Dual-type bonus:</strong> Fire/Flying fits BOTH Fire AND Flying constraints. Use this to your advantage!<br/><br/>
          <strong>One answer vs. multiple:</strong> Some squares have only one valid answer, others have many. The helper shows all possibilities.<br/><br/>
          <strong>9 guesses only:</strong> You only get 9 tries in the daily puzzle. Choose wisely!<br/><br/>
          <strong>Type matching works differently:</strong> When a column says "Ghost" and row says "Fire," you need ONE Pokémon that has BOTH types OR you show which types match. A dual-type like Chandelure (Ghost/Fire) fits BOTH! But if just one type matches, that also works.
        </p>

        <h3>TypeMatchups That Appear Often</h3>
        <p>
          <strong>Fire/Flying:</strong> Charizard, Talonflame, Charizard Gmax, Moltres, Ho-Oh<br/>
          <strong>Water/Ground:</strong> Swampert, Quagsire, Paldean Wooper, Gastrodon<br/>
          <strong>Psychic/Ghost:</strong> Mismagius, Banette, Hisuian Zoroark/Zorua<br/>
          <strong>Grass/Poison:</strong> Bulbasaur, Venusaur, Tangela, Victreebel, Bellossom<br/>
          <strong>Electric/Steel:</strong> Magnemite, Magnezone, Steelix, Joltik, Galvantula<br/>
          <strong>Bug/Flying:</strong> Butterfree, Beedrill, Scolipede, Volcarona<br/>
          <strong>Ice/Flying:</strong> Articuno, Glaceon, Vanilluxe, Cryogonal
        </p>

        <h3>Hard-to-Find Combinations</h3>
        <p>
          <strong>Ghost/Starter:</strong> NONE - no Ghost-type starters exist (not even in Gen 9)<br/>
          <strong>Dragon/Starter:</strong> NONE - only pseudo-Legendary Dragons later<br/>
          <strong>Normal/Legendary:</strong> Only Kyurem (can be White/Black), Zacian, Zamazenta<br/>
          <strong>Fairy/Legendary:</strong> Only Xerneas, while Yveltal is Dark<br/>
          <strong>Steel/Mythical:</strong> Only Victini (and Keldeo if counting Sword/Shield)<br/>
          <strong>Water/Ultra Beast:</strong> Only Poipole, Naganadel (some count as Bug too)<br/>
          <strong>Fighting/Paradox:</strong> Only The Indigo Disc or The Bloody Willow<br/>
          <strong>Ghost/Mythical:</strong> Only Meloetta (can be Ghost form in PLA)
        </p>

        <h3>Common Mistakes to Avoid</h3>
        <p>
          • Putting Mega Salamence under Hoenn - it's actually Kanto (original form)<br/>
          • Thinking Galarian Slowbro counts for Water - it counts as Poison/Psychic<br/>
          • Forgetting Baby Pokémon exist in the first stage pool<br/>
          • Not considering that some Pokémon have NO valid answer for certain combinations<br/>
          • Using a Pokémon that's already in the grid - duplicates aren't allowed<br/>
          • Putting a Pokémon in the wrong region - check the ORIGINAL region, not where you caught it<br/>
          • Forgetting dual-types work for BOTH constraints<br/>
          • Thinking "final stage" includes Mega/Gigantamax - they don't evolve further
        </p>
      </section>

      <footer>
        <a href="/" onClick={() => trackEvent('click_home', { url: 'home' })}>Back to Pokedoku Helper</a>
      </footer>
    </div>
  );
}