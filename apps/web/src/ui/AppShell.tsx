import { NavLink, Outlet } from "react-router-dom";
import { BriefcaseBusiness, Building2, CalendarClock, Home, Users } from "lucide-react";

const navItems = [
  { to: "/", label: "Home", icon: Home },
  { to: "/companies", label: "Companies", icon: Building2 },
  { to: "/applications", label: "Applications", icon: BriefcaseBusiness },
  { to: "/contacts", label: "Contacts", icon: Users },
  { to: "/interviews", label: "Interviews", icon: CalendarClock }
];

export function AppShell() {
  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#f7f4ef,#edf1ed)] text-ink">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-line bg-paper/90 p-4 lg:block">
        <p className="font-display text-2xl">Interview OS</p>
        <p className="mt-1 text-xs uppercase tracking-widest text-steel">Interviews</p>
        <nav className="mt-8 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2 text-sm ${isActive ? "bg-ink text-white" : "hover:bg-white"}`
              }
            >
              <item.icon size={17} />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="mb-5 flex items-center justify-between border-b border-line pb-4 lg:hidden">
            <p className="font-display text-xl">Interview OS</p>
            <select className="max-w-44" onChange={(event) => (window.location.href = event.target.value)}>
              {navItems.map((item) => (
                <option key={item.to} value={item.to}>{item.label}</option>
              ))}
            </select>
          </div>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
