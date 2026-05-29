import { NavLink, Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";

const BOTTOM_NAV = [
  { to: "/", end: true, icon: "🔍", label: "Tra từ" },
  { to: "/notebooks", icon: "📚", label: "Sổ tay" },
  { to: "/practice", icon: "🎯", label: "Luyện tập" },
  { to: "/settings", icon: "⚙️", label: "Cài đặt" },
];

export default function Layout() {
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Sidebar — desktop only */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto dark:bg-gray-900 dark:text-gray-100">
          <Outlet />
        </main>
      </div>

      {/* Bottom nav — mobile only */}
      <nav className="fixed bottom-0 inset-x-0 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex md:hidden z-30">
        {BOTTOM_NAV.map(({ to, end, icon, label }) => (
          <NavLink
            key={to} to={to} end={end}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-2.5 text-xs font-medium transition ${
                isActive ? "text-indigo-600 dark:text-indigo-400" : "text-gray-400 dark:text-gray-500"
              }`
            }
          >
            <span className="text-xl mb-0.5">{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
