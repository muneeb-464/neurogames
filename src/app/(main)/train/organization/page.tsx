import Link from "next/link";
import NumberSequenceGame from "@/components/games/NumberSequenceGame";
import styles from "./page.module.css";

export default function OrganizationTrainPage() {
  return (
    <div className={styles.page}>
      <header className={styles.toolbar}>
        <Link href="/train" className={styles.back}>
          ← Train
        </Link>
        <div className={styles.crumbs}>
          <span className={styles.sep}>/</span>
          <strong>Organization</strong>
          <span className={styles.sep}>/</span>
          <span>Number sequence</span>
        </div>
      </header>
      <NumberSequenceGame />
    </div>
  );
}
