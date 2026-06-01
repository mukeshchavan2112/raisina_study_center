import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const PAGE_META = {
  "/super-admin/dashboard": {
    title: "Super Admin Dashboard",
    subtitle: "Overall ERP summary and control panel",
    tag: "SUPER ADMIN PANEL",
  },
  "/super-admin/centers": {
    title: "Centers",
    subtitle: "Manage study center information",
    tag: "CENTER MANAGEMENT",
  },
  "/super-admin/users": {
    title: "Center Admins",
    subtitle: "Manage admin users and access roles",
    tag: "USER MANAGEMENT",
  },
  "/super-admin/exam-registrations": {
    title: "Exam Registrations",
    subtitle: "Review scholarship exam applications",
    tag: "SCHOLARSHIP EXAM",
  },
  "/super-admin/merit-list": {
    title: "Merit List",
    subtitle: "Upload and manage center-wise merit lists",
    tag: "MERIT LIST",
  },

  "/center-admin/dashboard": {
    title: "Center Dashboard",
    subtitle:
      "Manage admissions, facilities, accounts and reports for your center",
    tag: "CENTER PANEL",
  },
  "/center-admin/admissions": {
    title: "Admissions",
    subtitle: "Create admission records and manage admission flow",
    tag: "ADMISSION MODULE",
  },
  "/center-admin/admit-student": {
    title: "Admit Student",
    subtitle: "Admit scholarship or non-scholarship students",
    tag: "STUDENT ADMISSION",
  },
  "/center-admin/students": {
    title: "Students",
    subtitle: "View and manage student records",
    tag: "STUDENT RECORDS",
  },
  "/center-admin/hostel": {
    title: "Hostel",
    subtitle: "Manage hostel rooms, beds, allocations and renewals",
    tag: "HOSTEL MODULE",
  },
  "/center-admin/mess": {
    title: "Mess",
    subtitle: "Manage mess enrollment, capacity and membership renewals",
    tag: "MESS MODULE",
  },
  "/center-admin/library": {
    title: "Library / Study Space",
    subtitle: "Manage study space memberships, books and issue records",
    tag: "LIBRARY MODULE",
  },
  "/center-admin/accounts": {
    title: "Accounts",
    subtitle: "Manage fee collection, donations, expenses and monthly ledger",
    tag: "ACCOUNTS MODULE",
  },
};

function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const currentPage = PAGE_META[location.pathname] || {
    title: "Raisina Study Center ERP",
    subtitle: "Manage your ERP modules",
    tag: "ERP PANEL",
  };

  const userName = user?.name || "Admin";
  const userRole = formatRole(user?.role);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    setMenuOpen(false);

    if (logout) {
      logout();
    } else {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }

    navigate("/login", { replace: true });
  };

  return (
    <header className="top-navbar modern-navbar">
      <div className="navbar-title-block">
        <h1>{currentPage.title}</h1>
        <p>{currentPage.subtitle}</p>
      </div>

      <div className="navbar-actions modern-navbar-actions">
        <div className="navbar-menu-wrapper" ref={menuRef}>
          <button
            className="hamburger-btn"
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label="Open account menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>

          {menuOpen && (
            <div className="navbar-dropdown">
              <div className="navbar-dropdown-user">
                <strong>{userName}</strong>
                <span>{userRole}</span>
              </div>

              {user && (
                <Link
                  to="/change-password"
                  className="navbar-dropdown-item"
                  onClick={() => setMenuOpen(false)}
                >
                  Change Password
                </Link>
              )}

              <button
                className="navbar-dropdown-item danger"
                type="button"
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function formatRole(role) {
  if (!role) return "Admin";

  return role
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default Navbar;
