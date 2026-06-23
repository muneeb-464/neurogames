"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import styles from "./AppShell.module.css";

const nav = [
  { href: "/", label: "Dashboard", icon: "◆" },
  { href: "/train", label: "Train", icon: "◎" },
  { href: "/analytics", label: "Analytics", icon: "▣" },
  { href: "/profile", label: "Profile", icon: "○" },
  { href: "/admin", label: "Admin", icon: "◇" },
];

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  function handleSignOut() {
    logout();
    router.replace("/login");
  }

  const displayName = user?.username ?? "Trainer";
  const displayEmail = user?.email ?? "";
  const avatarChar = displayName.charAt(0).toUpperCase();

  return (
    <div className={styles.root}>
      <aside className={styles.sidebar}>
        <Link href="/" className={styles.brand}>
          <div className={styles.brandMark} aria-hidden>
            <span className={styles.brain} />
          </div>
          <div>
            <div className={styles.brandTitle}>NeuroFocus</div>
            <div className={styles.brandSub}>Trainer</div>
          </div>
        </Link>
        <nav className={styles.nav} aria-label="Main">
          {nav.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={active ? styles.navItemActive : styles.navItem}
              >
                <span className={styles.navIcon} aria-hidden>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className={styles.profile}>
          {user?.image ? (
            <img src={user.image} alt="" className={styles.avatarImg} referrerPolicy="no-referrer" />
          ) : (
            <div className={styles.avatar} aria-hidden>{avatarChar}</div>
          )}
          <div className={styles.profileText}>
            <div className={styles.profileName}>{displayName}</div>
            <div className={styles.profileEmail}>{displayEmail}</div>
          </div>
          <button type="button" className={styles.signOut} onClick={handleSignOut}>
            Sign out
          </button>
        </div>
      </aside>

      <div className={styles.mainWrap}>
        <main className={styles.main}>{children}</main>
      </div>

      <nav className={styles.mobileNav} aria-label="Mobile main">
        {nav.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href ||
                pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={active ? styles.mobileItemActive : styles.mobileItem}
            >
              <span aria-hidden>{item.icon}</span>
              <span className={styles.mobileLabel}>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
