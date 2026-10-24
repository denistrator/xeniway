import { LogOut, Plus, Settings, WifiOff } from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import { LanguageSelector } from "../features/preferences/language-selector.view";
import { PreferenceFeedback } from "../features/preferences/preference-feedback.view";
import { ThemeSelector } from "../features/preferences/theme-selector.view";
import { type SiteHeaderProps, useSiteHeader } from "./site-header.model";
import { siteHeaderStyles } from "./site-header.styles";
import { Button } from "./ui/button.view";

const styles = siteHeaderStyles();

export function SiteHeader(props: SiteHeaderProps) {
  const view = useSiteHeader(props);
  return (
    <header className={styles.root()}>
      <div className={styles.content()}>
        <Link to="/" className={styles.brand()}>
          Xenia Way
        </Link>
        {view.readAccountId && (
          <div className={styles.account()}>
            <span dir="ltr" title={view.email} className={styles.email()}>
              {view.email}
            </span>
            <button
              type="button"
              className={styles.logoutButton()}
              onClick={view.handleLogout}
              disabled={view.logout.isPending}
            >
              <div className={styles.logoutText()}>{view.logoutLabel}</div>
              <LogOut aria-hidden="true" size={15} strokeWidth={2} />
            </button>
          </div>
        )}
        <nav className={styles.navigation()} aria-label={view.navigationLabel}>
          {view.navigationLinks.map(({ to, label, end }) => (
            <NavLink key={to} to={to} end={end} className={view.navigationLinkClassName}>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className={styles.controls()}>
          <div className={styles.actions()}>
            {view.user.data && (
              <Button
                className={styles.actionButton()}
                disabled={!view.access.canMutate}
                variant="outline"
                size="sm"
                onClick={view.handleCreate}
              >
                <Plus aria-hidden="true" size={15} /> {view.addJobLabel}
              </Button>
            )}
            {!view.user.isPending && !view.readAccountId && (
              <Button asChild className={styles.actionButton()} variant="outline" size="sm">
                <Link to="/login">{view.loginLabel}</Link>
              </Button>
            )}
            <fieldset
              ref={view.preferenceControlsRef}
              aria-label={view.preferenceControlsLabel}
              tabIndex={-1}
              className={styles.preferences()}
            >
              {view.readAccountId && (
                <Link
                  to="/settings"
                  aria-label={view.settingsLabel}
                  title={view.settingsLabel}
                  className={styles.settingsLink()}
                >
                  <Settings aria-hidden="true" size={17} strokeWidth={2} />
                  {view.access.isDisconnected && (
                    <span className={styles.settingsNotice()}>
                      <WifiOff aria-hidden="true" size={11} strokeWidth={2} />
                    </span>
                  )}
                </Link>
              )}
              <ThemeSelector showFeedback={false} />
              <LanguageSelector showFeedback={false} />
              <PreferenceFeedback
                compact
                active={view.showPreferenceFeedback}
                returnFocusRef={view.preferenceControlsRef}
              />
            </fieldset>
          </div>
        </div>
      </div>
    </header>
  );
}
