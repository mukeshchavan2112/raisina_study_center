import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import branding from "../config/branding";

function Sidebar() {
  const { user } = useAuth();

  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const isCenterAdmin = user?.role === "CENTER_ADMIN";

  const superAdminLinks = [
    {
      label: "Dashboard",
      path: "/super-admin/dashboard",
      icon: "📊",
    },
    {
      label: "Centers",
      path: "/super-admin/centers",
      icon: "🏫",
    },
    {
      label: "Center Admins",
      path: "/super-admin/users",
      icon: "👥",
    },
    {
      label: "Exam Registrations",
      path: "/super-admin/exam-registrations",
      icon: "🧾",
    },
    {
      label: "Merit List",
      path: "/super-admin/merit-list",
      icon: "🏆",
    },
  ];

  const centerAdminLinks = [
    {
      label: "Dashboard",
      path: "/center-admin/dashboard",
      icon: "📊",
    },
    {
      label: "Admissions",
      path: "/center-admin/admissions",
      icon: "📝",
    },
    {
      label: "Students",
      path: "/center-admin/students",
      icon: "🎓",
    },
    {
      label: "Hostel",
      path: "/center-admin/hostel",
      icon: "🏠",
    },
    {
      label: "Mess",
      path: "/center-admin/mess",
      icon: "🍽️",
    },
    {
      label: "Study Center",
      path: "/center-admin/library",
      icon: "📚",
    },
    {
      label: "Accounts",
      path: "/center-admin/accounts",
      icon: "💰",
    },
  ];

  const sidebarLinks = isSuperAdmin
    ? superAdminLinks
    : isCenterAdmin
    ? centerAdminLinks
    : [];

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-logo-box">
          <img
            src={branding.primaryLogo}
            alt="Raisina Study Center"
            className="sidebar-logo-img"
          />
        </div>

        <div>
          <h2>{branding.organizationName || "Raisina Study Center"}</h2>
          <p>{isSuperAdmin ? "Super Admin Panel" : "Center Admin Panel"}</p>
        </div>
      </div>

      <nav className="sidebar-nav">
        {sidebarLinks.map((link) => (
          <NavLink
            key={link.path}
            to={link.path}
            className={({ isActive }) =>
              isActive ? "sidebar-link active" : "sidebar-link"
            }
          >
            <span className="sidebar-link-icon">{link.icon}</span>
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-footer-brand">
          <img
            src={branding.foundationLogo}
            alt="Raisina Foundation"
            className="sidebar-footer-logo"
          />

          <div>
            <p>Raisina Study Center ERP</p>
            <span>{formatRole(user?.role)}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

function formatRole(role) {
  if (!role) return "Admin";

  return role
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default Sidebar;