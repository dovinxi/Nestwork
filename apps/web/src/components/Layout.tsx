import { NavLink, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { ErrorBoundary } from "./ErrorBoundary";

const NAV_ITEMS = [
  { to: "/me", tabLabel: "Me", sidebarLabel: "Me", end: false },
  { to: "/", tabLabel: "Contacts", sidebarLabel: "Contacts", end: true },
  { to: "/web", tabLabel: "Web", sidebarLabel: "Relationship Web", end: false },
  { to: "/circles", tabLabel: "Circles", sidebarLabel: "Circles", end: false },
  { to: "/tags", tabLabel: "Tags", sidebarLabel: "Tags", end: false },
];

const sidebarLinkClasses = ({ isActive }: { isActive: boolean }) =>
  `block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? "bg-nest-200 text-nest-900" : "text-slateblue-600 hover:bg-nest-100 hover:text-nest-800"
  }`;

const tabLinkClasses = ({ isActive }: { isActive: boolean }) =>
  `flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium ${
    isActive ? "text-nest-700" : "text-slateblue-400"
  }`;

export function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();

  return (
    <div className="flex min-h-screen flex-col bg-nest-50 md:flex-row">
      <header className="flex items-center gap-2 border-b border-nest-200 bg-white/80 px-4 py-3 md:hidden">
        <img src="/nest-icon.svg" alt="" className="h-6 w-6" />
        <span className="text-base font-semibold text-nest-900">NestWork</span>
      </header>

      <aside className="hidden w-56 shrink-0 flex-col border-r border-nest-200 bg-white/60 px-4 py-6 md:flex">
        <div className="mb-8 flex items-center gap-2 px-2">
          <img src="/nest-icon.svg" alt="" className="h-7 w-7" />
          <span className="text-lg font-semibold text-nest-900">NestWork</span>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={sidebarLinkClasses}>
              {item.sidebarLabel}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto px-2 text-xs text-slateblue-400">Your data stays on this device.</div>
      </aside>

      <main className="flex-1 overflow-y-auto px-4 py-4 pb-20 md:px-8 md:py-8 md:pb-8">
        <ErrorBoundary key={location.pathname}>{children}</ErrorBoundary>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-nest-200 bg-white md:hidden">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={tabLinkClasses}>
            {item.tabLabel}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
