import { roleLabel } from "../utils/format";
import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  ArrowUpRight,
  ClipboardCheck,
  Heart,
  LayoutDashboard,
  LogOut,
  Menu,
  PawPrint,
  Settings2,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "../context/auth";
import { Brand, Feedback } from "./UI";
import { errorMessage } from "../api/axios";
export default function Layout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const location = useLocation();
  const links = [
    ["/app", LayoutDashboard, "Overview"],
    ["/app/pets", PawPrint, user.role === "client" ? "My pets" : "Pet records"],
    ...(user.role !== "client" ? [["/app/owners", Users, "Pet owners"]] : []),
    ...(user.role !== "staff"
      ? [["/app/corrections", ClipboardCheck, "Correction requests"]]
      : []),
    ...(user.role === "administrator"
      ? [
          ["/app/users", ShieldCheck, "Accounts & approvals"],
          ["/app/activity", Settings2, "Activity log"],
        ]
      : []),
    ["/app/profile", Users, "My profile"],
  ];
  return (
    <div className="app-layout">
      <aside className={"sidebar" + (open ? " open" : "")}>
        <div className="sidebar-brand">
          <Brand />
          <button
            className="icon-btn mobile-only"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
          >
            <X />
          </button>
        </div>
        <div className="workspace-label">YOUR WORKSPACE</div>
        <nav aria-label="Main navigation">
          {links.map(([to, Icon, label]) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/app"}
              onClick={() => setOpen(false)}
            >
              <Icon size={19} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-note">
          <Heart size={23} />
          <h4>A little care, every day.</h4>
          <p>Every record is part of a happier, healthier pet story.</p>
        </div>
        <div className="sidebar-user">
          <span className="user-avatar">{user.name[0]}</span>
          <div>
            <strong>{user.name}</strong>
            <small>{roleLabel(user.role)}</small>
          </div>
          <button
            className="icon-btn"
            aria-label="Sign out"
            onClick={async () => {
              try {
                await logout();
              } catch (e) {
                setError(errorMessage(e));
              }
            }}
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>
      {open && <div className="nav-backdrop" onClick={() => setOpen(false)} />}
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-btn mobile-only"
              aria-label="Open navigation"
              onClick={() => setOpen(true)}
            >
              <Menu />
            </button>
            <span>Workspace</span>
            <span>/</span>
            <strong>
              {links.find(([path]) => path === location.pathname)?.[2] ||
                "Pet details"}
            </strong>
          </div>
          <div className="topbar-right">
            <span className="live-dot" />
            {roleLabel(user.role)}
            <a href="/" aria-label="Visit PetFave landing page">
              <ArrowUpRight size={18} />
            </a>
          </div>
        </header>
        <main className="main-content">
          <Feedback error={error} />
          <Outlet />
        </main>
        <footer className="app-footer">
          <span>PetFave · Thoughtful care, all in one place.</span>
          <span>Pet Management System</span>
        </footer>
      </div>
    </div>
  );
}
