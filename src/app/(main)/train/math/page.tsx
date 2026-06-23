import Link from "next/link";
import styles from "./category.module.css";

const exercises = [
  {
    href: "/train/math/quick",
    title: "Quick Math",
    desc: "Speed arithmetic",
    available: true,
  },
  {
    href: "/train/math/training",
    title: "Math Training",
    desc: "Speed calculations with combos",
    available: true,
  },
  {
    href: "#",
    title: "Equation Puzzle",
    desc: "Symbol substitution",
    available: false,
  },
] as const;

export default function MathematicsCategoryPage() {
  return (
    <div className={styles.page}>
      <Link href="/train" className={styles.back}>
        ← All categories
      </Link>

      <header className={styles.hero}>
        <div className={styles.heroTop}>
          <div className={styles.iconBox} aria-hidden>
            🧮
          </div>
          <div>
            <h1 className={styles.heroTitle}>Mathematics</h1>
            <p className={styles.heroSub}>Logic & numerical reasoning</p>
          </div>
        </div>
        <div className={styles.stats}>
          <span>5 sessions</span>
          <span>16m trained</span>
          <span>3 exercises</span>
        </div>
      </header>

      <ul className={styles.list}>
        {exercises.map((ex) => (
          <li key={ex.title}>
            {ex.available ? (
              <Link
                href={ex.href}
                className={`${styles.exerciseCard} ${styles.exerciseCardAvailable}`}
              >
                <div className={styles.exerciseInfo}>
                  <h2 className={styles.exerciseTitle}>{ex.title}</h2>
                  <p className={styles.exerciseDesc}>{ex.desc}</p>
                </div>
                <span className={styles.startBtn}>
                  Start <span aria-hidden>▶</span>
                </span>
              </Link>
            ) : (
              <div
                className={`${styles.exerciseCard} ${styles.exerciseCardLocked}`}
              >
                <div className={styles.exerciseInfo}>
                  <h2 className={styles.exerciseTitle}>{ex.title}</h2>
                  <p className={styles.exerciseDesc}>{ex.desc}</p>
                </div>
                <span className={styles.soonBadge}>
                  <span aria-hidden>🔒</span> Soon
                </span>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
