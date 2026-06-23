import Link from "next/link";
import styles from "./dashboard.module.css";

export default function DashboardPage() {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div>
          <p className={styles.kicker}>Today&apos;s session</p>
          <h1 className={styles.greeting}>Good morning, edu.</h1>
          <p className={styles.lead}>
            Stay sharp with gentle motion training — timing, focus, and calm
            reactions.
          </p>
        </div>
        <Link href="/train" className={styles.cta}>
          <span>Start Now</span>
          <span className={styles.ctaArrow} aria-hidden>
            →
          </span>
        </Link>
      </section>

      <div className={styles.stats}>
        {[
          { label: "Total training", value: "12h", icon: "▣" },
          { label: "Current streak", value: "5 days", icon: "◇" },
          { label: "Best combo", value: "24×", icon: "◎" },
          { label: "Accuracy", value: "94%", icon: "○" },
        ].map((s) => (
          <div key={s.label} className={styles.statCard}>
            <span className={styles.statIcon} aria-hidden>
              {s.icon}
            </span>
            <div className={styles.statValue}>{s.value}</div>
            <div className={styles.statLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className={styles.lower}>
        <section className={styles.chartCard}>
          <div className={styles.sectionHead}>
            <h2>Training activity</h2>
            <span className={styles.pill}>Last 7 days</span>
          </div>
          <div className={styles.chart} aria-hidden>
            <svg viewBox="0 0 400 120" className={styles.chartSvg}>
              <defs>
                <linearGradient id="fill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="rgba(168,144,254,0.45)" />
                  <stop offset="100%" stopColor="rgba(168,144,254,0)" />
                </linearGradient>
              </defs>
              <path
                d="M0,90 C40,95 60,40 100,55 S180,20 220,35 S320,10 400,25 L400,120 L0,120 Z"
                fill="url(#fill)"
              />
              <path
                d="M0,90 C40,95 60,40 100,55 S180,20 220,35 S320,10 400,25"
                fill="none"
                stroke="#A890FE"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </section>

        <section className={styles.listCard}>
          <div className={styles.sectionHead}>
            <h2>Recent sessions</h2>
          </div>
          <ul className={styles.sessionList}>
            {[
              { title: "Color Pattern Moving", meta: "Today · 100% focus" },
              { title: "Number sequence", meta: "5 days ago · 100% acc." },
              { title: "Reaction grid", meta: "1 week ago · 92% acc." },
            ].map((row) => (
              <li key={row.title} className={styles.sessionRow}>
                <span className={styles.sessionIcon} aria-hidden>
                  ◎
                </span>
                <div>
                  <div className={styles.sessionTitle}>{row.title}</div>
                  <div className={styles.sessionMeta}>{row.meta}</div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
