import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import branding from "../../config/branding";

function getDashboardPath(role) {
  if (role === "SUPER_ADMIN") return "/super-admin/dashboard";
  if (role === "CENTER_ADMIN") return "/center-admin/dashboard";
  return "/login";
}

function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated, authLoading, user } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "Admin Login | Study Center ERP";
  }, []);

  if (!authLoading && isAuthenticated) {
    if (user?.forcePasswordChange) {
      return <Navigate to="/change-password" replace />;
    }

    return <Navigate to={getDashboardPath(user?.role)} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const loggedInUser = await login(email.trim(), password);
      navigate(getDashboardPath(loggedInUser?.role), { replace: true });

      if (!authLoading && isAuthenticated) {
        return <Navigate to={getDashboardPath(user?.role)} replace />;
      }
    } catch (err) {
      console.error("Login failed:", err);

      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Login failed. Please check your email and password.";

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-left">
        <div className="login-brand">
          <div className="login-logo">
            <img
              src={branding.primaryLogo}
              alt="Raisina Study Center"
              className="login-logo-img"
            />
          </div>

          <h1>Raisina Study Center</h1>

          <p>
            A centralized system for managing centers, admissions, students,
            facilities, fees and reports with role-based access.
          </p>
        </div>
      </div>

      <div className="login-right">
        <form className="login-card" onSubmit={handleSubmit}>
          <div className="login-card-header">
            <h2>Admin Login</h2>
            <p>Login to continue to your ERP dashboard.</p>
          </div>

          {error && <div className="error-box">{error}</div>}

          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              placeholder="Enter admin email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          <button className="primary-btn login-submit-btn" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>

          <div className="login-footer-link">
            <Link to="/">Back to Exam Registration</Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Login;