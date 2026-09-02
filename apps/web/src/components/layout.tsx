import { useDispatch } from "react-redux";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuthMutations, useCurrentUser } from "../lib/queries";
import { cn } from "../lib/utils";
import { closeDrawer, openCreateDrawer } from "../store";
import { ThemeSelector } from "./theme-selector";
import { Button } from "./ui/button";

export function Layout() {
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
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-6 py-4">
          <Link to="/" className="mr-auto text-lg font-bold tracking-tight text-slate-950 dark:text-white">
            Job Tracker
          </Link>
          <nav className="flex items-center gap-1" aria-label="Main navigation">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                cn(
                  "rounded-lg px-3 py-2 text-sm",
                  isActive
                    ? "bg-slate-100 font-semibold dark:bg-slate-800"
                    : "text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white",
                )
              }
            >
              Applications
            </NavLink>
            <NavLink
              to="/archive"
              className={({ isActive }) =>
                cn(
                  "rounded-lg px-3 py-2 text-sm",
                  isActive
                    ? "bg-slate-100 font-semibold dark:bg-slate-800"
                    : "text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white",
                )
              }
            >
              Archive
            </NavLink>
          </nav>
          <span className="hidden text-sm text-slate-500 dark:text-slate-400 sm:block">{user.data?.email}</span>
          <Button variant="outline" size="sm" onClick={() => dispatch(openCreateDrawer())}>
            + Add job
          </Button>
          <ThemeSelector />
          <Button variant="ghost" size="sm" onClick={handleLogout} disabled={logout.isPending}>
            {logout.isPending ? "Signing out…" : "Logout"}
          </Button>
        </div>
      </header>
      <main id="main-content" tabIndex={-1} className="w-full py-8">
        <Outlet />
      </main>
    </div>
  );
}
