import { NavLink, Outlet } from "react-router-dom";
import { LayoutGrid, Users2, Building2, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import ChatFlutuante from "./ChatFlutuante";
import logo from "../assets/logo.png";

const ITENS = [
  { to: "/geral", label: "Geral", icon: LayoutGrid, fim: true },
  { to: "/operacional", label: "Operacional", icon: Users2 },
  { to: "/clientes", label: "Clientes", icon: Building2 },
];

export default function Layout() {
  const { usuario, sair } = useAuth();

  return (
    <div className="flex h-screen bg-terra-canvas">
      <aside className="flex w-60 shrink-0 flex-col border-r border-terra-line bg-white">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <img src={logo} alt="" className="h-6 w-6" />
          <span className="font-display text-[15px] font-medium text-terra-navy">
            Painel Terra
          </span>
        </div>

        <nav className="flex-1 space-y-0.5 px-3">
          {ITENS.map(({ to, label, icon: Icon, fim }) => (
            <NavLink
              key={to}
              to={to}
              end={fim}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? "bg-terra-navy-tint/60 font-medium text-terra-navy"
                    : "text-terra-ink-muted hover:bg-terra-canvas hover:text-terra-ink"
                }`
              }
            >
              <Icon size={17} strokeWidth={1.75} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-terra-line px-3 py-3">
          <div className="flex items-center justify-between px-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-terra-ink">
                {usuario?.nome}
              </p>
            </div>
            <button
              onClick={sair}
              title="Sair"
              className="rounded-md p-1.5 text-terra-ink-muted transition-colors hover:bg-terra-canvas hover:text-terra-brick"
            >
              <LogOut size={16} strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-hidden">
        <Outlet />
      </main>

      <ChatFlutuante />
    </div>
  );
}