import styles from "./auth.module.css";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.root}>
      <div className={styles.bg} aria-hidden />
      <div className={styles.card}>{children}</div>
    </div>
  );
}
