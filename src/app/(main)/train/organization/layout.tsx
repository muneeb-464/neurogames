import styles from "../gameViewport.module.css";

export default function OrganizationTrainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className={styles.fill}>{children}</div>;
}
