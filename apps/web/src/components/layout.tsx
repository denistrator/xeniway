import type { CreateApplicationInput } from "@job-tracker/shared";
import { useDispatch, useSelector } from "react-redux";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useApplicationMutations, useApplications, useAuthMutations, useCurrentUser } from "../lib/queries";
import { cn } from "../lib/utils";
import { closeDrawer, openCreateDrawer, type RootState } from "../store";
import { JobManager } from "./job-manager";
import { ThemeSelector } from "./theme-selector";
import { Button } from "./ui/button";

export function Layout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useCurrentUser();
  const { logout } = useAuthMutations();
  const drawer = useSelector((state: RootState) => state.ui.drawer);
  const applications = useApplications();
  const mutations = useApplicationMutations();
  const selectedJob = applications.data?.find((job) => job.id === drawer.jobId);
  const pending = mutations.create.isPending || mutations.update.isPending;

  async function handleLogout() {
    await logout.mutateAsync();
    dispatch(closeDrawer());
    navigate("/login");
  }

  async function handleSave(input: CreateApplicationInput) {
    if (drawer.mode === "create") await mutations.create.mutateAsync(input);
    else if (drawer.jobId !== null) await mutations.update.mutateAsync({ id: drawer.jobId, input });
    dispatch(closeDrawer());
  }

  async function handleArchive() {
    if (drawer.jobId !== null) {
      await mutations.archive.mutateAsync(drawer.jobId);
      dispatch(closeDrawer());
    }
  }

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-6 py-4">
          <Link to="/" className="font-display mr-auto text-xl font-bold tracking-tight text-ink">
            Job Tracker
          </Link>
          <nav className="flex items-center gap-1" aria-label="Main navigation">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                cn(
                  "rounded-lg px-3 py-2 text-sm transition-colors",
                  isActive ? "bg-accent-soft font-semibold text-accent" : "text-muted hover:text-ink",
                )
              }
            >
              Applications
            </NavLink>
            <NavLink
              to="/archive"
              className={({ isActive }) =>
                cn(
                  "rounded-lg px-3 py-2 text-sm transition-colors",
                  isActive ? "bg-accent-soft font-semibold text-accent" : "text-muted hover:text-ink",
                )
              }
            >
              Archive
            </NavLink>
          </nav>
          <span className="hidden text-sm text-muted sm:block">{user.data?.email}</span>
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
      <JobManager
        job={selectedJob}
        submitting={pending}
        onSave={handleSave}
        onArchive={handleArchive}
        onClose={() => dispatch(closeDrawer())}
      />
      {(mutations.create.error || mutations.update.error || mutations.archive.error) && (
        <p className="mx-auto max-w-7xl px-6 pb-6 text-sm text-rose-600 dark:text-rose-400">
          {(mutations.create.error || mutations.update.error || mutations.archive.error)?.message}
        </p>
      )}
    </div>
  );
}
