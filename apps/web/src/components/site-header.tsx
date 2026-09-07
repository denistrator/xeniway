import { useDispatch } from "react-redux";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuthMutations, useCurrentUser } from "../lib/queries";
import { cn } from "../lib/utils";
import { closeDrawer, openCreateDrawer } from "../store";
import { ThemeSelector } from "./theme-selector";
import { Button } from "./ui/button";

function navigationLinkClassName({ isActive }: { isActive: boolean }) {
  return cn(
    "rounded-lg px-3 py-2 text-sm transition-colors",
    isActive ? "bg-accent-soft font-semibold text-accent" : "text-muted hover:text-ink",
  );
}

const navigationLinks = [
  { to: "/", label: "Applications", end: true },
  { to: "/blacklist", label: "Blacklist", end: false },
  { to: "/archive", label: "Archive", end: false },
] as const;

export function SiteHeader() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useCurrentUser();
  const { logout } = useAuthMutations();

  async function handleLogout() {
    await logout.mutateAsync();
    dispatch(closeDrawer());
    navigate("/login");
  }

  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-6 py-4">
        <Link to="/" className="font-display mr-auto text-xl font-bold tracking-tight text-ink">
          Job Tracker
        </Link>
        {user.data && (
          <>
            <nav className="flex items-center gap-1" aria-label="Main navigation">
              {navigationLinks.map(({ to, label, end }) => (
                <NavLink key={to} to={to} end={end} className={navigationLinkClassName}>
                  {label}
                </NavLink>
              ))}
            </nav>
            <span className="hidden text-sm text-muted sm:block">{user.data.email}</span>
            <Button variant="outline" size="sm" onClick={() => dispatch(openCreateDrawer())}>
              + Add job
            </Button>
          </>
        )}
        <ThemeSelector />
        {user.data && (
          <Button variant="ghost" size="sm" onClick={handleLogout} disabled={logout.isPending}>
            {logout.isPending ? "Signing out…" : "Logout"}
          </Button>
        )}
      </div>
    </header>
  );
}
