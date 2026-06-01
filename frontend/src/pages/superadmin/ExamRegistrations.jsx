import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import API from "../../api/api";
import { useAuth } from "../../context/AuthContext";
import PageHeader from "../../components/PageHeader";

function ExamRegistrations() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  const [centers, setCenters] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [selectedRegistration, setSelectedRegistration] = useState(null);

  const defaultFilters = {
    centerId: "",
    year: new Date().getFullYear(),
    status: "",
    search: "",
  };

  const [filters, setFilters] = useState(defaultFilters);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canViewRegistrations = user?.role === "SUPER_ADMIN";

  useEffect(() => {
    if (canViewRegistrations) {
      fetchCenters();
      fetchRegistrations(defaultFilters);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canViewRegistrations]);

  const fetchCenters = async () => {
    try {
      const res = await API.get("/public/centers");
      setCenters(extractArray(res.data));
    } catch (err) {
      console.error("Center fetch failed:", err);
    }
  };

  const fetchRegistrations = async (appliedFilters = filters) => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();

      if (appliedFilters.year) params.append("year", appliedFilters.year);
      if (appliedFilters.status) params.append("status", appliedFilters.status);

      if (isSuperAdmin && appliedFilters.centerId) {
        params.append("centerId", appliedFilters.centerId);
      }

      const res = await API.get(`/exam-registrations?${params.toString()}`);

      setRegistrations(extractArray(res.data));
    } catch (err) {
      console.error("Exam registrations fetch failed:", err);

      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Unable to load exam registrations.",
      );

      setRegistrations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    setFilters((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const applyFilters = () => {
    fetchRegistrations(filters);
  };

  const clearFilters = () => {
    const resetFilters = {
      centerId: "",
      year: new Date().getFullYear(),
      status: "",
      search: "",
    };

    setFilters(resetFilters);
    fetchRegistrations(resetFilters);
  };

  const filteredRegistrations = useMemo(() => {
    const searchText = filters.search.toLowerCase().trim();

    return registrations.filter((registration) => {
      const searchableData = [
        registration?.registrationNumber,
        registration?.fullName,
        registration?.mobileNumber,
        registration?.email,
        getExamCenterName(registration),
        getAdmissionCenterName(registration),
        registration?.status,
        registration?.year,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return !searchText || searchableData.includes(searchText);
    });
  }, [registrations, filters.search]);

  const summary = useMemo(() => {
    const registered = registrations.filter(
      (item) =>
        String(item.status || "REGISTERED").toUpperCase() === "REGISTERED",
    ).length;

    const meritListed = registrations.filter(
      (item) => String(item.status || "").toUpperCase() === "MERIT_LISTED",
    ).length;

    const admitted = registrations.filter(
      (item) => String(item.status || "").toUpperCase() === "ADMITTED",
    ).length;

    const cancelled = registrations.filter(
      (item) => String(item.status || "").toUpperCase() === "CANCELLED",
    ).length;

    return {
      total: registrations.length,
      registered,
      meritListed,
      admitted,
      cancelled,
    };
  }, [registrations]);

  const downloadRegistrationExcel = () => {
    if (!filteredRegistrations || filteredRegistrations.length === 0) {
      alert("No registration records available to download.");
      return;
    }

    const rows = filteredRegistrations.map((registration, index) => ({
      "Sr No": index + 1,
      "Registration Number": registration.registrationNumber || "",
      "Full Name": registration.fullName || "",
      "Mobile Number": registration.mobileNumber || "",
      "Aadhaar Last 4": registration.aadhaarLast4
        ? `XXXX-XXXX-${registration.aadhaarLast4}`
        : "",
      "Date of Birth": formatDate(registration.dob),
      Address: registration.addressLine || "",
      "Preferred Exam Center": getExamCenterName(registration),
      "Preferred Admission Center": getAdmissionCenterName(registration),
      Year: registration.year || filters.year || "",
      Marks: "",
      Rank: "",
      Remarks: "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Exam Registrations");

    XLSX.writeFile(
      workbook,
      `exam_registrations_${filters.year || new Date().getFullYear()}.xlsx`,
    );
  };

  if (!canViewRegistrations) {
    return (
      <div className="access-denied-card">
        <h2>Exam Registrations Locked</h2>
        <p>Only Super Admin can view public exam registration records.</p>
      </div>
    );
  }

  return (
    <div className="page">
      <PageHeader
        title="Exam Registrations"
        subtitle="Review scholarship exam applications before merit-list upload and admission."
      />

      {error && <div className="alert warning">{error}</div>}

      <section className="stats-grid exam-stats-grid">
        <SummaryCard
          label="Total Registrations"
          value={summary.total}
          helper="Applications received"
          loading={loading}
        />

        <SummaryCard
          label="Registered"
          value={summary.registered}
          helper="Awaiting merit process"
          loading={loading}
        />

        <SummaryCard
          label="Merit Listed"
          value={summary.meritListed}
          helper="Selected through result list"
          loading={loading}
        />

        <SummaryCard
          label="Admitted"
          value={summary.admitted}
          helper="Converted into students"
          loading={loading}
        />

        <SummaryCard
          label="Cancelled"
          value={summary.cancelled}
          helper="Inactive applications"
          loading={loading}
        />
      </section>

      <section className="panel-card">
        <div className="panel-header">
          <div>
            <p className="eyebrow-text">Filters</p>
            <h2>Search Registration Records</h2>
            <p>
              Filter applications by candidate details, center, exam year or
              registration status.
            </p>
          </div>

          <button
            className="secondary-btn"
            onClick={() => fetchRegistrations(filters)}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div className="filter-bar exam-filter-bar">
          <div className="filter-group large-filter">
            <label>Search Candidate</label>
            <input
              type="text"
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              placeholder="Search by name, registration no, mobile or center"
            />
          </div>

          {isSuperAdmin && (
            <div className="filter-group">
              <label>Center</label>
              <select
                name="centerId"
                value={filters.centerId}
                onChange={handleFilterChange}
              >
                <option value="">All Centers</option>
                {centers.map((center) => (
                  <option key={getCenterId(center)} value={getCenterId(center)}>
                    {getCenterNameFromCenter(center)}
                    {getCenterCode(center) ? ` (${getCenterCode(center)})` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="filter-group">
            <label>Exam Year</label>
            <input
              type="number"
              name="year"
              value={filters.year}
              onChange={handleFilterChange}
              placeholder="Exam year"
            />
          </div>

          <div className="filter-group">
            <label>Status</label>
            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
            >
              <option value="">All Status</option>
              <option value="REGISTERED">Registered</option>
              <option value="MERIT_LISTED">Merit Listed</option>
              <option value="ADMITTED">Admitted</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <button
            className="primary-btn filter-action-btn"
            type="button"
            onClick={applyFilters}
            disabled={loading}
          >
            Apply
          </button>

          <button
            className="secondary-btn filter-clear-btn"
            type="button"
            onClick={clearFilters}
            disabled={loading}
          >
            Clear
          </button>
        </div>
      </section>

      <section className="table-card">
        <div className="table-header">
          <div>
            <h3>Registration Records</h3>
            <p>
              Showing <strong>{filteredRegistrations.length}</strong> of{" "}
              <strong>{registrations.length}</strong> registrations
            </p>
          </div>

          {isSuperAdmin && (
            <button
              type="button"
              className="secondary-btn"
              onClick={downloadRegistrationExcel}
              disabled={loading || filteredRegistrations.length === 0}
            >
              Download Excel Template
            </button>
          )}
        </div>

        {loading ? (
          <EmptyState
            title="Loading registrations..."
            message="Please wait while exam registrations are fetched."
          />
        ) : filteredRegistrations.length === 0 ? (
          <EmptyState
            title="No exam registrations found"
            message="Public scholarship exam registrations will appear here after candidates submit the exam form."
          />
        ) : (
          <div className="responsive-table">
            <table>
              <thead>
                <tr>
                  <th>Registration No</th>
                  <th>Candidate</th>
                  <th>Mobile</th>
                  <th>Exam Center</th>
                  <th>Admission Center</th>
                  <th>Aadhaar</th>
                  <th>DOB</th>
                  <th>Year</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredRegistrations.map((registration) => (
                  <tr
                    key={
                      registration._id ||
                      registration.id ||
                      registration.registrationNumber
                    }
                  >
                    <td>
                      <span className="table-role-badge">
                        {registration.registrationNumber || "Pending"}
                      </span>
                    </td>

                    <td>
                      <div className="student-cell">
                        <strong>
                          {registration.fullName || "Unnamed Candidate"}
                        </strong>
                        <span>{registration.email || "No email added"}</span>
                      </div>
                    </td>

                    <td>{registration.mobileNumber || "-"}</td>

                    <td>{getExamCenterName(registration)}</td>

                    <td>{getAdmissionCenterName(registration)}</td>

                    <td>
                      {registration.aadhaarLast4
                        ? `XXXX-XXXX-${registration.aadhaarLast4}`
                        : "-"}
                    </td>

                    <td>{formatDate(registration.dob)}</td>

                    <td>{registration.year || "-"}</td>

                    <td>
                      <span
                        className={`status-badge ${getStatusClass(
                          registration.status,
                        )}`}
                      >
                        {formatLabel(registration.status || "REGISTERED")}
                      </span>
                    </td>

                    <td>
                      <button
                        className="table-action-btn"
                        type="button"
                        onClick={() => setSelectedRegistration(registration)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedRegistration && (
        <div
          className="modal-backdrop"
          onClick={() => setSelectedRegistration(null)}
        >
          <div className="student-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>{selectedRegistration.fullName || "Unnamed Candidate"}</h2>
                <p>
                  {selectedRegistration.registrationNumber ||
                    "Registration number pending"}
                </p>
              </div>

              <button
                className="modal-close-btn"
                type="button"
                onClick={() => setSelectedRegistration(null)}
              >
                ×
              </button>
            </div>

            <div className="student-detail-grid">
              <DetailItem
                label="Registration No"
                value={selectedRegistration.registrationNumber || "N/A"}
              />

              <DetailItem
                label="Status"
                value={formatLabel(selectedRegistration.status || "REGISTERED")}
              />

              <DetailItem
                label="Candidate Name"
                value={selectedRegistration.fullName || "N/A"}
              />

              <DetailItem
                label="Mobile Number"
                value={selectedRegistration.mobileNumber || "N/A"}
              />

              <DetailItem
                label="Aadhaar"
                value={
                  selectedRegistration.aadhaarLast4
                    ? `XXXX-XXXX-${selectedRegistration.aadhaarLast4}`
                    : "N/A"
                }
              />

              <DetailItem
                label="Date of Birth"
                value={formatDate(selectedRegistration.dob)}
              />

              <DetailItem
                label="Address"
                value={selectedRegistration.addressLine || "N/A"}
              />

              <DetailItem
                label="Preferred Exam Center"
                value={getExamCenterName(selectedRegistration)}
              />

              <DetailItem
                label="Preferred Admission Center"
                value={getAdmissionCenterName(selectedRegistration)}
              />

              <DetailItem
                label="Exam Year"
                value={selectedRegistration.year || "N/A"}
              />

              <DetailItem
                label="Submitted On"
                value={formatDate(
                  selectedRegistration.createdAt ||
                    selectedRegistration.registrationDate,
                )}
              />
            </div>
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

function DetailItem({ label, value }) {
  return (
    <div className="detail-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function extractArray(payload) {
  const data = payload?.data || payload;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.registrations)) return data.registrations;
  if (Array.isArray(data?.centers)) return data.centers;

  return [];
}

function getExamCenterName(registration) {
  return (
    registration?.preferredExamCenter?.centerName ||
    registration?.preferredCenter?.centerName ||
    registration?.center?.centerName ||
    registration?.centerName ||
    "-"
  );
}

function getAdmissionCenterName(registration) {
  return (
    registration?.preferredAdmissionCenter?.centerName ||
    registration?.admissionCenter?.centerName ||
    "-"
  );
}

function getCenterNameFromCenter(center) {
  return center?.centerName || center?.name || "Unnamed Center";
}

function getCenterCode(center) {
  return center?.centerCode || center?.code || "";
}

function getCenterId(center) {
  return center?._id || center?.id;
}

function formatLabel(value) {
  return String(value || "N/A")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getStatusClass(status) {
  const value = String(status || "").toUpperCase();

  if (value === "ADMITTED") return "success";
  if (value === "MERIT_LISTED") return "info";
  if (value === "REGISTERED") return "warning";
  if (value === "CANCELLED") return "danger";

  return "neutral";
}

function formatDate(value) {
  if (!value) return "N/A";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default ExamRegistrations;
