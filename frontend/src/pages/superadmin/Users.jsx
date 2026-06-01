import { useEffect, useMemo, useState } from "react";
import API from "../../api/api";
import { useAuth } from "../../context/AuthContext";
import PageHeader from "../../components/PageHeader";

function Users() {
  const { user } = useAuth();

  const [centers, setCenters] = useState([]);
  const [centerAdmins, setCenterAdmins] = useState([]);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    centerId: "",
    aadharNumber: "",
  });

  const [loading, setLoading] = useState(false);
  const [centersLoading, setCentersLoading] = useState(false);
  const [adminsLoading, setAdminsLoading] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [lastCreatedUser, setLastCreatedUser] = useState(null);

  const [adminSearch, setAdminSearch] = useState("");
  const [selectedAdminForReset, setSelectedAdminForReset] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [resettingPassword, setResettingPassword] = useState(false);

  const loggedInRole = user?.role;
  const isSuperAdmin = loggedInRole === "SUPER_ADMIN";

  useEffect(() => {
    if (isSuperAdmin) {
      fetchCenters();
      fetchCenterAdmins();
    }
  }, [isSuperAdmin]);

  const fetchCenters = async () => {
    setCentersLoading(true);
    setError("");

    try {
      const response = await API.get("/centers");

      const centersData =
        response?.data?.data?.centers ||
        response?.data?.centers ||
        response?.data?.data ||
        response?.data ||
        [];

      setCenters(Array.isArray(centersData) ? centersData : []);
    } catch (err) {
      console.error("Fetch centers failed:", err);

      const errorMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Unable to load centers.";

      setError(errorMessage);
    } finally {
      setCentersLoading(false);
    }
  };

  const fetchCenterAdmins = async () => {
    setAdminsLoading(true);
    setError("");

    try {
      const response = await API.get("/auth/center-admins");
      setCenterAdmins(extractCenterAdmins(response.data));
    } catch (err) {
      console.error("Fetch center admins failed:", err);

      const errorMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Unable to load center admins.";

      setError(errorMessage);
    } finally {
      setAdminsLoading(false);
    }
  };

  const selectedCenter = useMemo(() => {
    return centers.find((center) => getCenterId(center) === formData.centerId);
  }, [centers, formData.centerId]);

  const activeCenters = useMemo(() => {
    return centers.filter((center) => {
      const status = String(center?.status || "ACTIVE").toUpperCase();
      return status === "ACTIVE";
    }).length;
  }, [centers]);

  const filteredCenterAdmins = useMemo(() => {
    const search = adminSearch.trim().toLowerCase();

    if (!search) return centerAdmins;

    return centerAdmins.filter((admin) => {
      const searchableText = [
        getAdminName(admin),
        admin?.email,
        getAdminCenterName(admin),
        getAdminCenterCode(admin),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(search);
    });
  }, [centerAdmins, adminSearch]);

  if (!isSuperAdmin) {
    return (
      <div className="access-denied-card">
        <h2>Access Denied</h2>
        <p>You do not have permission to access this page.</p>
      </div>
    );
  }

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));

    setMessage("");
    setError("");
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      password: "",
      centerId: "",
      aadharNumber: "",
    });
  };

  const openResetPasswordModal = (admin) => {
    setSelectedAdminForReset(admin);
    setNewPassword("");
    setMessage("");
    setError("");
  };

  const closeResetPasswordModal = () => {
    setSelectedAdminForReset(null);
    setNewPassword("");
    setResettingPassword(false);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (!selectedAdminForReset) return;

    if (!newPassword || newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }

    setResettingPassword(true);
    setMessage("");
    setError("");

    try {
      await API.patch(
        `/auth/center-admins/${getUserId(selectedAdminForReset)}/reset-password`,
        {
          newPassword,
        },
      );

      setMessage(
        `Password reset successfully for ${getAdminName(
          selectedAdminForReset,
        )}.`,
      );

      closeResetPasswordModal();
      await fetchCenterAdmins();
    } catch (err) {
      console.error("Reset password failed:", err);

      const errorMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Failed to reset password.";

      setError(errorMessage);
    } finally {
      setResettingPassword(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setMessage("");
    setError("");
    setLastCreatedUser(null);

    const selectedCenterForSubmit = centers.find(
      (center) => getCenterId(center) === formData.centerId,
    );

    const cleanAadharNumber = formData.aadharNumber.replace(/\D/g, "");

    if (!/^\d{12}$/.test(cleanAadharNumber)) {
      setLoading(false);
      setError("Aadhaar number must be exactly 12 digits.");
      return;
    }

    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        role: "CENTER_ADMIN",
        centerId: formData.centerId,
        center: formData.centerId,
        aadharNumber: cleanAadharNumber,
      };

      const response = await API.post("/auth/register", payload);

      const backendUser =
        response?.data?.data?.user ||
        response?.data?.user ||
        response?.data?.data ||
        {};

      setLastCreatedUser({
        name: backendUser.name || formData.name,
        email: backendUser.email || formData.email,
        centerName: selectedCenterForSubmit
          ? getCenterName(selectedCenterForSubmit)
          : "Assigned",
        centerCode: selectedCenterForSubmit
          ? getCenterCode(selectedCenterForSubmit)
          : "",
      });

      setMessage("Center admin created successfully.");
      resetForm();
      await fetchCenterAdmins();
    } catch (err) {
      console.error("Create user failed:", err);

      const errorMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Failed to create center admin.";

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="users-page">
      <PageHeader
        title="Center Admins"
        subtitle="Create center admin accounts, assign centers and reset passwords when required."
      />

      <section className="stats-grid">
        <SummaryCard
          label="Available Centers"
          value={centers.length}
          helper="Centers available for assignment"
          loading={centersLoading}
        />

        <SummaryCard
          label="Active Centers"
          value={activeCenters}
          helper="Centers currently active"
          loading={centersLoading}
        />

        <SummaryCard
          label="Center Admins"
          value={centerAdmins.length}
          helper="Admin accounts created"
          loading={adminsLoading}
        />

        <SummaryCard
          label="Selected Center"
          value={
            selectedCenter ? getCenterCode(selectedCenter) || "Selected" : "-"
          }
          helper={
            selectedCenter
              ? getCenterName(selectedCenter)
              : "Choose a center while creating admin"
          }
          loading={centersLoading}
        />
      </section>

      {(message || error) && (
        <section>
          {message && <div className="success-box">{message}</div>}
          {error && <div className="error-box">{error}</div>}
        </section>
      )}

      {lastCreatedUser && (
        <section className="panel-card">
          <div className="panel-header">
            <div>
              <h2>Last Created Center Admin</h2>
              <p>Use these details for demo verification or login testing.</p>
            </div>

            <span className="status-badge success">Created</span>
          </div>

          <div className="created-user-summary">
            <strong>{lastCreatedUser.name}</strong>
            <span>{lastCreatedUser.email}</span>
            <span>
              {lastCreatedUser.centerName}
              {lastCreatedUser.centerCode
                ? ` (${lastCreatedUser.centerCode})`
                : ""}
            </span>
          </div>
        </section>
      )}

      <section className="form-card user-form-card">
        <div className="form-card-header">
          <p className="eyebrow-text">Admin Setup</p>
          <h3>Create Center Admin</h3>
          <p>
            The center admin will manage admissions, students, facilities and
            center-level operations for the assigned center.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="form-stack">
          <div className="form-row">
            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                name="name"
                placeholder="Enter full name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                name="email"
                placeholder="Enter email address"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                name="password"
                placeholder="Minimum 8 characters"
                value={formData.password}
                onChange={handleChange}
                minLength="8"
                required
              />
            </div>

            <div className="form-group">
              <label>Assign Center</label>
              <select
                name="centerId"
                value={formData.centerId}
                onChange={handleChange}
                required
              >
                <option value="">
                  {centersLoading ? "Loading centers..." : "Select center"}
                </option>

                {centers.map((center) => (
                  <option key={getCenterId(center)} value={getCenterId(center)}>
                    {getCenterName(center)}
                    {getCenterCode(center) ? ` (${getCenterCode(center)})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Aadhaar Number</label>
              <input
                type="text"
                name="aadharNumber"
                placeholder="Enter 12 digit Aadhaar number"
                value={formData.aadharNumber}
                onChange={handleChange}
                maxLength="12"
                inputMode="numeric"
                pattern="\d{12}"
                required
              />
              <small>
                Aadhaar will be stored securely and will not be shown fully in
                the system.
              </small>
            </div>
          </div>

          {selectedCenter && (
            <div className="selected-preview">
              <span>Selected Center</span>
              <strong>
                {getCenterName(selectedCenter)}
                {getCenterCode(selectedCenter)
                  ? ` (${getCenterCode(selectedCenter)})`
                  : ""}
              </strong>
              <p>{getCenterLocation(selectedCenter)}</p>
            </div>
          )}

          {centers.length === 0 && !centersLoading && (
            <p className="small-warning">
              No centers found. Create a center first, then create a center
              admin.
            </p>
          )}

          <div className="form-actions">
            <button
              type="button"
              className="secondary-btn"
              onClick={resetForm}
              disabled={loading}
            >
              Clear
            </button>

            <button
              type="submit"
              className="primary-btn user-submit-btn"
              disabled={loading || centersLoading || centers.length === 0}
            >
              {loading ? "Creating..." : "Create Center Admin"}
            </button>
          </div>
        </form>
      </section>

      <section className="table-card">
        <div className="table-header">
          <div>
            <h3>Existing Center Admins</h3>
            <p>
              Showing {filteredCenterAdmins.length} of {centerAdmins.length}{" "}
              center admin{centerAdmins.length === 1 ? "" : "s"}
            </p>
          </div>

          <div className="navbar-actions">
            <input
              className="table-search"
              type="text"
              placeholder="Search admin..."
              value={adminSearch}
              onChange={(e) => setAdminSearch(e.target.value)}
            />

            <button
              type="button"
              className="secondary-btn"
              onClick={fetchCenterAdmins}
              disabled={adminsLoading}
            >
              {adminsLoading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        {adminsLoading ? (
          <EmptyState
            title="Loading center admins..."
            message="Please wait while center admin accounts are fetched."
          />
        ) : centerAdmins.length === 0 ? (
          <EmptyState
            title="No center admins found"
            message="Create a center admin using the form above."
          />
        ) : filteredCenterAdmins.length === 0 ? (
          <EmptyState
            title="No matching center admin found"
            message="Try searching by name, email or center."
          />
        ) : (
          <div className="responsive-table">
            <table>
              <thead>
                <tr>
                  <th>Admin</th>
                  <th>Email</th>
                  <th>Assigned Center</th>
                  <th>Role</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredCenterAdmins.map((admin) => (
                  <tr key={getUserId(admin)}>
                    <td>
                      <div className="student-cell">
                        <strong>{getAdminName(admin)}</strong>
                        <span>{getAdminCenterCode(admin) || "No code"}</span>
                      </div>
                    </td>

                    <td>{admin?.email || "-"}</td>

                    <td>{getAdminCenterName(admin)}</td>

                    <td>
                      <span className="table-role-badge">CENTER_ADMIN</span>
                    </td>

                    <td>
                      <button
                        type="button"
                        className="table-action-btn"
                        onClick={() => openResetPasswordModal(admin)}
                      >
                        Reset Password
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedAdminForReset && (
        <div className="modal-backdrop" onClick={closeResetPasswordModal}>
          <div className="student-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Reset Password</h2>
                <p>
                  {getAdminName(selectedAdminForReset)} ·{" "}
                  {selectedAdminForReset.email}
                </p>
              </div>

              <button
                type="button"
                className="modal-close-btn"
                onClick={closeResetPasswordModal}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="form-stack">
              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  placeholder="Minimum 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength="8"
                  required
                />
              </div>

              <div className="selected-preview">
                <span>Assigned Center</span>
                <strong>{getAdminCenterName(selectedAdminForReset)}</strong>
                <p>
                  The center admin can login using the new password after reset.
                </p>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={closeResetPasswordModal}
                  disabled={resettingPassword}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-btn"
                  disabled={resettingPassword}
                >
                  {resettingPassword ? "Resetting..." : "Reset Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, helper, loading }) {
  return (
    <div className="stat-card">
      <p>{label}</p>
      <h2>{loading ? "..." : value}</h2>
      <span>{helper}</span>
    </div>
  );
}

function EmptyState({ title, message }) {
  return (
    <div className="empty-state">
      <h4>{title}</h4>
      <p>{message}</p>
    </div>
  );
}

function extractCenterAdmins(payload) {
  const data = payload?.data || payload;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.users)) return data.users;
  if (Array.isArray(data?.centerAdmins)) return data.centerAdmins;

  return [];
}

function getUserId(admin) {
  return admin?._id || admin?.id;
}

function getAdminName(admin) {
  return (
    admin?.name ||
    `${admin?.firstName || ""} ${admin?.lastName || ""}`.trim() ||
    "Unnamed Admin"
  );
}

function getAdminCenterName(admin) {
  return (
    admin?.center?.centerName ||
    admin?.centerName ||
    admin?.center?.name ||
    "Not assigned"
  );
}

function getAdminCenterCode(admin) {
  return admin?.center?.centerCode || admin?.centerCode || "";
}

function getCenterName(center) {
  return (
    center?.centerName || center?.name || center?.title || "Unnamed Center"
  );
}

function getCenterCode(center) {
  return center?.centerCode || center?.code || "";
}

function getCenterId(center) {
  return center?._id || center?.id;
}

function getCenterLocation(center) {
  const city = center?.city || "";
  const state = center?.state || "";

  if (city && state) return `${city}, ${state}`;
  if (city) return city;
  if (state) return state;

  return center?.address || "Location not added";
}

export default Users;
