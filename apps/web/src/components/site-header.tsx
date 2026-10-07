import { LogOut, Plus } from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import { CsvExportButton } from "../features/data-export/csv-export-button.tsx";
import { LanguageSelector } from "../features/preferences/language-selector.tsx";
import { ThemeSelector } from "../features/preferences/theme-selector.tsx";
import { siteHeaderStyles } from "./site-header.styles.ts";
import { type SiteHeaderProps, useSiteHeader } from "./site-header.ts";
import { Button } from "./ui/button.tsx";

const styles = siteHeaderStyles();

export function SiteHeader(props: SiteHeaderProps) {
  const view = useSiteHeader(props);
  return (
    <header className={styles.root()}>
      <div className={styles.content()}>
        <Link to="/" className={styles.brand()}>
          Xenia Way
        </Link>
        <nav className={styles.navigation()} aria-label={view.navigationLabel}>
          {view.navigationLinks.map(({ to, label, end }) => (
            <NavLink key={to} to={to} end={end} className={view.navigationLinkClassName}>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className={styles.controls()}>
          {view.readAccountId && (
            <div className={styles.account()}>
              <span className={styles.email()}>{view.email}</span>
              <Button
                variant="ghost"
                size="sm"
                className={styles.logoutButton()}
                onClick={view.handleLogout}
                disabled={view.logout.isPending}
              >
                <div className={styles.logoutText()}>{view.logoutLabel}</div>
                <LogOut aria-hidden="true" size={15} strokeWidth={2} />
              </Button>
            </div>
          )}
          <div className={styles.actions()}>
            {view.user.data && (
              <Button disabled={!view.access.canMutate} variant="outline" size="sm" onClick={view.handleCreate}>
                <Plus aria-hidden="true" size={15} /> {view.addJobLabel}
              </Button>
            )}
            {view.user.data && view.access.canMutate && <CsvExportButton />}
            {!view.user.isPending && !view.readAccountId && (
              <Button asChild variant="outline" size="sm">
                <Link to="/login">{view.loginLabel}</Link>
              </Button>
            )}
            <ThemeSelector />
            <LanguageSelector />
          </div>
        </div>
      </div>
    </header>
  );
}
