import Link from "next/link";
import styles from "./train.module.css";

const games = [
  {
    slug: "/train/color-pattern",
    title: "Color Pattern Moving",
    desc: "Tap the glowing target color among floating shapes — focus & timing.",
    accent: "var(--accent)",
    progress: "Play now",
  },
  {
    slug: "/train/organization",
    title: "Organization · Number sequence",
    desc: "Sequencing & pattern recall — watch digits, replay in order under time pressure.",
    accent: "var(--accent-teal)",
    progress: "Play now",
  },
  {
    slug: "/train/number-recall",
    title: "Number Recall",
    desc: "All digits flash at once — memorise in 5s, then replay in order. Easy/Medium/Hard or custom count.",
    accent: "var(--accent-teal)",
    progress: "Play now",
  },
  {
    slug: "/train/math",
    title: "Mathematics",
    desc: "Logic & numerical reasoning — Quick Math, combos, and more.",
    accent: "var(--accent-teal)",
    progress: "Play now",
  },
  {
    slug: "/train/boxing",
    title: "Arena Boxing",
    desc: "Dark arena reaction drill — J punch, K leg shot, crowd energy.",
    accent: "var(--accent-orange)",
    progress: "Play now",
  },
  {
    slug: "/train/boxing-combo",
    title: "Boxing Combo Arena",
    desc: "Auto-play combo trainer — combo name above, real move clip below, cycling by difficulty.",
    accent: "var(--accent-orange)",
    progress: "Play now",
  },
  {
    slug: "/train",
    title: "Reaction grid",
    desc: "Speed & reaction with soft visual cues.",
    accent: "var(--accent-gold)",
    progress: "No sessions yet",
    disabled: true,
  },
  {
    slug: "/train",
    title: "Visual tracking",
    desc: "Smooth pursuit and peripheral awareness.",
    accent: "var(--accent-pink)",
    progress: "No sessions yet",
    disabled: true,
  },
  {
    slug: "/train",
    title: "Memory span",
    desc: "Hold and reproduce short symbol chains.",
    accent: "var(--accent-mint)",
    progress: "No sessions yet",
    disabled: true,
  },
  {
    slug: "/train",
    title: "Cognitive switch",
    desc: "Alternate rules on gentle cues — flexible control.",
    accent: "var(--accent-orange)",
    progress: "No sessions yet",
    disabled: true,
  },
];

export default function TrainPage() {
  return (
    <div className={styles.page}>
      <p className={styles.kicker}>Train</p>
      <h1 className={styles.title}>Games & drills</h1>
      <p className={styles.sub}>
        Ten dimensions of cognitive performance — start with focus-friendly
        motion training.
      </p>

      <div className={styles.grid}>
        {games.map((g) => {
          const inner = (
            <>
              <div className={styles.cardTop}>
                <span
                  className={styles.cardGlyph}
                  style={{ color: g.accent }}
                  aria-hidden
                >
                  ◎
                </span>
                <span className={styles.cardArrow} aria-hidden>
                  ↗
                </span>
              </div>
              <h2 className={styles.cardTitle}>{g.title}</h2>
              <p className={styles.cardDesc}>{g.desc}</p>
              <p className={styles.cardMeta}>{g.progress}</p>
            </>
          );
          if (g.disabled) {
            return (
              <div
                key={g.title}
                className={`${styles.card} ${styles.cardDisabled}`}
              >
                {inner}
              </div>
            );
          }
          return (
            <Link key={g.title} href={g.slug} className={styles.card}>
              {inner}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
