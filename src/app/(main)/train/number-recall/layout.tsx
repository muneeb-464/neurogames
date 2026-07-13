import styles from "../gameViewport.module.css";

export default function NumberRecallTrainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className={styles.fill}>{children}</div>;
}
