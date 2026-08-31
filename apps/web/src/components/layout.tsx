import { Link, NavLink, Outlet } from "react-router-dom";
import { cn } from "../lib/utils";

export function Layout() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="text-sm font-bold tracking-tight text-slate-950">
            Job Tracker
          </Link>
          <nav className="flex items-center gap-1" aria-label="Main navigation">
            <NavLink
              to="/"
              end
              className={({ isActive }) => cn("rounded-lg px-3 py-2 text-sm", isActive ? "bg-slate-100 font-semibold text-slate-950" : "text-slate-500 hover:text-slate-950")}
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/about"
              className={({ isActive }) => cn("rounded-lg px-3 py-2 text-sm", isActive ? "bg-slate-100 font-semibold text-slate-950" : "text-slate-500 hover:text-slate-950")}
            >
              About
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">
        <Outlet />
      </main>
    </div>
  );
}
