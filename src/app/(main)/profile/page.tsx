import GameVideoManager from "@/components/settings/GameVideoManager";
import styles from "./profile.module.css";

export default function ProfilePage() {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Profile</h1>
      <GameVideoManager />
    </div>
  );
}
