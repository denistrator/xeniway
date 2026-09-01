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
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-6 py-4">
          <Link to="/" className="mr-auto text-lg font-bold tracking-tight text-slate-950">
            Job Tracker
          </Link>
          <nav className="flex items-center gap-1" aria-label="Main navigation">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                cn(
                  "rounded-lg px-3 py-2 text-sm",
                  isActive ? "bg-slate-100 font-semibold" : "text-slate-500 hover:text-slate-950",
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
                  isActive ? "bg-slate-100 font-semibold" : "text-slate-500 hover:text-slate-950",
                )
              }
            >
              Archive
            </NavLink>
          </nav>
          <span className="hidden text-sm text-slate-500 sm:block">{user.data?.email}</span>
          <Button variant="outline" size="sm" onClick={() => dispatch(openCreateDrawer())}>
            + Add job
          </Button>
          <ThemeSelector />
          <Button variant="ghost" size="sm" onClick={handleLogout} disabled={logout.isPending}>
            {logout.isPending ? "Signing out…" : "Logout"}
          </Button>
        </div>
      </header>
      <main className="w-full py-8">
        <Outlet />
      </main>
    </div>
  );
}
