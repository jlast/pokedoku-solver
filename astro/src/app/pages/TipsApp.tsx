import { useEffect, useState } from "react";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { trackEvent } from "../../../../lib/browser/analytics";

type TipLevel = "beginner" | "advanced" | "gotcha";

interface TipItem {
  id: string;
  level: TipLevel;
  question: string;
  answer: string;
  examples?: string[];
  link?: {
    href: string;
    label: string;
  };
}

const TIPS: TipItem[] = [
  {
    id: "beginner-pp",
    level: "beginner",
    question: "What is PP in Pokedoku?",
    answer: "In Pokedoku, PP refers to the number of grid intersections where a Pokemon can be used legally. Lower PP usually means a more niche pick, which can be valuable in tighter squares.",
  },
  {
    id: "beginner-priority",
    level: "beginner",
    question: "What should I prioritize first?",
    answer: "You should prioritize Pokemon with very few categories first, because they are harder to place later once your flexible options are gone.",
    link: {
      href: "/pokemon-list/?sortBy=difficulty-asc",
      label: "View low-category Pokemon",
    },
  },
  {
    id: "beginner-reuse",
    level: "beginner",
    question: "Can I reuse the same Pokemon in multiple squares?",
    answer: "No, each Pokemon can only be used once in a single puzzle grid. Every placement changes what remains possible for the rest of the board.",
  },
  {
    id: "beginner-shiny",
    level: "beginner",
    question: "What are shiny odds in Pokedoku?",
    answer: "In Pokedoku, shiny odds are 1/100 without prestige, and each prestige increases shiny chances by 25%. That means your first prestige gives you a 1.25% shiny chance.",
  },
  {
    id: "advanced-dex",
    level: "advanced",
    question: "How do I optimize for dex completion over pure rarity?",
    answer: "If your goal is dex progress, use broad and replaceable picks on easy squares and preserve niche picks for constrained cells. This keeps more options open for remaining intersections and reduces endgame traps.",
    examples: ["A practical approach is to spend flexible dual-type options first and save one-off category fits for late-game decisions."],
  },
  {
    id: "advanced-order",
    level: "advanced",
    question: "Best solving order for strong consistency?",
    answer: "The most reliable solving order is to start with the squares that have the fewest valid candidates. Handling narrow intersections first reduces dead-ends and keeps your decision tree more flexible.",
  },
  {
    id: "advanced-common-trap",
    level: "advanced",
    question: "When should I avoid obvious answers?",
    answer: "You should avoid obvious answers when they are also your only reliable option for another difficult square. Popular Pokemon are often multi-purpose, so using them too early can collapse later options.",
    examples: ["If one Pokemon is both your safest Starter answer and your only regional overlap elsewhere, save it for later."],
  },
  {
    id: "gotcha-linking-cord",
    level: "gotcha",
    question: "Why do Alakazam, Machamp, Golem, and Gengar count for Evolved by Item?",
    answer: "They count because Pokedoku includes the Legends: Arceus Linking Cord method for those trade evolutions. In this ruleset, that path is treated as item-based evolution.",
    examples: ["For example, Machoke evolving into Machamp with a Linking Cord is counted as an item evolution in this ruleset."],
  },
  {
    id: "gotcha-gholdengo",
    level: "gotcha",
    question: "Why are Gholdengo and Kingambit not Evolved by Item?",
    answer: "They do not count because their evolution methods are not treated as direct use-or-hold item evolutions in Pokedoku. The category separates explicit evolution items from progression-based mechanics.",
    examples: ["Gimmighoul coins and the Leader's Crest condition are therefore excluded from the item-evolution category."],
  },
  {
    id: "gotcha-first-partner",
    level: "gotcha",
    question: "What counts for First Partner + No Evo Line?",
    answer: "The most common valid answers are Partner Pikachu and Partner Eevee from the Let's Go games. Regular Pikachu and regular Eevee are categorized differently from those partner variants.",
    examples: ["When you see No Evo Line + First Partner, you usually need the Partner forms rather than the standard species entries."],
  },
  {
    id: "gotcha-regions",
    level: "gotcha",
    question: "Why do some region results feel inconsistent?",
    answer: "These results happen because Pokedoku applies its own internal category mapping for forms and special cases. Some Pokemon are grouped by puzzle-rule definitions rather than by the regional logic many players expect.",
    examples: ["Meltan and Melmetal, along with Zygarde form cases, are recurring examples that regularly confuse players."],
  },
  {
    id: "gotcha-branched",
    level: "gotcha",
    question: "Why does Branched Evolution exclude some form splits?",
    answer: "In most Pokedoku contexts, branched evolution means evolving into different Pokemon species, not alternate forms of one species. That is why some form splits look branched but still fail this category.",
    examples: ["Players often compare Cosmoem with Kubfu into Urshifu forms, but form-based outcomes are commonly excluded."],
  },
  {
    id: "gotcha-hisui",
    level: "gotcha",
    question: "Who fits Hisui + Monotype when starters fail?",
    answer: "A common valid answer is White-Striped Basculin, which many players overlook. Players often focus on famous Hisuian forms and miss base-form eligibility for this intersection.",
    examples: ["A frequent mistake is assuming Rowlet or Cyndaquil will qualify for this exact intersection."],
  },
];

const LEVELS: { level: TipLevel; title: string; description: string }[] = [
  {
    level: "beginner",
    title: "Beginner Q&A",
    description: "Core terms, puzzle flow, and first-day mistakes to avoid.",
  },
  {
    level: "advanced",
    title: "Advanced Q&A",
    description: "Decision-making patterns for consistency and dex progress.",
  },
  {
    level: "gotcha",
    title: "Common Category Gotchas",
    description: "Frequent edge-cases with concrete Pokemon examples.",
  },
];

export default function TipsApp() {
  const [expanded, setExpanded] = useState<string | null>(() => {
    if (typeof window === "undefined") return TIPS[0].id;
    const hashId = window.location.hash.replace("#", "");
    if (hashId && TIPS.some((tip) => tip.id === hashId)) {
      return hashId;
    }
    return TIPS[0].id;
  });
  const faqStructuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: TIPS.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: [item.answer, ...(item.examples ?? [])].join(" "),
      },
    })),
  };

  const toggle = (item: TipItem) => {
    setExpanded((prev) => {
      const next = prev === item.id ? null : item.id;

      if (typeof window !== "undefined") {
        const base = `${window.location.pathname}${window.location.search}`;
        if (next) {
          window.history.replaceState({}, "", `${base}#${item.id}`);
        } else {
          window.history.replaceState({}, "", base);
        }
      }

      trackEvent("toggle_tip", {
        id: item.id,
        level: item.level,
        state: next ? "open" : "closed",
      });
      return next;
    });
  };

  useEffect(() => {
    trackEvent("view_tips_page", { total_questions: TIPS.length });
  }, []);

  useEffect(() => {
    const syncFromHash = () => {
      const hashId = window.location.hash.replace("#", "");
      if (!hashId) return;
      if (!TIPS.some((tip) => tip.id === hashId)) return;
      setExpanded(hashId);
      requestAnimationFrame(() => {
        document.getElementById(hashId)?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    };

    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  return (
    <div className="app">
      <Header
        title="Pokedoku Tips & Tricks"
        subtitle="Beginner-friendly explanations and advanced category strategy, including common gotchas from the community."
        currentPage="tips"
      />

      <section className="content-section flex flex-col gap-7">
        <script type="application/ld+json">
          {JSON.stringify(faqStructuredData)}
        </script>
        {LEVELS.map((section) => {
          const items = TIPS.filter((tip) => tip.level === section.level);
          return (
            <div
              className="rounded-[14px] border border-slate-200 bg-slate-50/40 p-4"
              key={section.level}
            >
              <div>
                <h2>{section.title}</h2>
                <p className="mb-2.5">{section.description}</p>
              </div>

              <div className="flex flex-col gap-2.5">
                {items.map((item) => {
                  const isOpen = expanded === item.id;
                  const tipLink = item.link;
                  return (
                    <article
                      className="rounded-[10px] border border-slate-200 bg-white"
                      key={item.id}
                      id={item.id}
                    >
                      <button
                        className="flex w-full cursor-pointer items-center justify-between gap-2 bg-transparent px-3.5 py-3 text-left text-[0.98rem] font-semibold text-slate-800 transition-colors hover:bg-slate-50"
                        onClick={() => toggle(item)}
                        aria-expanded={isOpen}
                      >
                        <span>{item.question}</span>
                        <span className="text-lg text-slate-600">{isOpen ? "-" : "+"}</span>
                      </button>

                      <div
                        className={`overflow-hidden transition-all duration-200 ease-in-out ${
                          isOpen
                            ? "max-h-[480px] border-t border-slate-200 px-3.5 pt-2.5 pb-3"
                            : "max-h-0 border-t-0 px-3.5 py-0"
                        }`}
                        aria-hidden={!isOpen}
                      >
                        <p className="mb-2.5 leading-7 text-slate-600">{item.answer}</p>
                        {item.examples && item.examples.length > 0 && (
                          <ul className="m-0 list-disc pl-[18px] text-slate-600">
                            {item.examples.map((example) => (
                              <li className="mb-1.5" key={example}>{example}</li>
                            ))}
                          </ul>
                        )}
                        {tipLink && (
                          <p className="mt-2.5">
                            <a
                              className="text-indigo-600 underline-offset-2 hover:underline"
                              href={`${import.meta.env.BASE_URL}${tipLink.href.replace(/^\//, "")}`}
                              onClick={() =>
                                trackEvent("click_tip_link", {
                                  id: item.id,
                                  level: item.level,
                                  href: tipLink.href,
                                })
                              }
                            >
                              {tipLink.label}
                            </a>
                          </p>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          );
        })}
      </section>

      <Footer />
    </div>
  );
}
