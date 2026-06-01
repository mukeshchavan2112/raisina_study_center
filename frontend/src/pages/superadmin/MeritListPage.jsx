import { useEffect, useMemo, useState } from "react";
import API from "../../api/api";
import PageHeader from "../../components/PageHeader";

function MeritListPage() {
  const [centers, setCenters] = useState([]);
  const [lists, setLists] = useState([]);
  const [selectedList, setSelectedList] = useState(null);

  const [form, setForm] = useState({
    centerId: "",
    year: new Date().getFullYear(),
    scholarshipCutoffRank: "",
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchCenters();
    fetchMeritLists();
  }, []);

  const fetchCenters = async () => {
    try {
      const res = await API.get("/public/centers");
      setCenters(extractArray(res.data));
    } catch (err) {
      console.error("Centers fetch failed:", err);
      setError("Unable to fetch centers.");
    }
  };

  const fetchMeritLists = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await API.get("/admission/merit-list");
      setLists(extractArray(res.data));
    } catch (err) {
      console.error("Merit list fetch failed:", err);

      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Unable to fetch merit lists.",
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchMeritListById = async (id) => {
    setError("");

    try {
      const res = await API.get(`/admission/merit-list/${id}`);
      const data = res.data?.data || res.data;
      setSelectedList(data);
    } catch (err) {
      console.error("Merit list detail fetch failed:", err);

      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Unable to fetch merit list details.",
      );
    }
  };

  const handleFormChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));

    setMessage("");
    setError("");
  };

  const clearUploadForm = () => {
    setForm({
      centerId: "",
      year: new Date().getFullYear(),
      scholarshipCutoffRank: "",
    });

    setSelectedFile(null);
    setFileInputKey((prev) => prev + 1);
    setMessage("");
    setError("");
  };

  const handleUpload = async (e) => {
    e.preventDefault();

    setError("");
    setMessage("");
    setUploading(true);

    try {
      if (!form.centerId) {
        throw new Error("Please select a center.");
      }

      if (!form.year) {
        throw new Error("Please enter exam year.");
      }

      if (!selectedFile) {
        throw new Error("Please select a CSV or Excel file.");
      }

      const payload = new FormData();

      payload.append("centerId", form.centerId);
      payload.append("year", Number(form.year));
      payload.append(
        "scholarshipCutoffRank",
        form.scholarshipCutoffRank === ""
          ? ""
          : Number(form.scholarshipCutoffRank),
      );
      payload.append("file", selectedFile);

      const res = await API.post("/admission/merit-list", payload);

      setMessage(res.data?.message || "Merit list uploaded successfully.");

      await fetchMeritLists();

      const uploadedListId = res.data?.data?.meritList?._id;

      if (uploadedListId) {
        await fetchMeritListById(uploadedListId);
      }

      setSelectedFile(null);
      setFileInputKey((prev) => prev + 1);
    } catch (err) {
      console.error("Merit list upload failed:", err);

      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Merit list upload failed.",
      );
    } finally {
      setUploading(false);
    }
  };

  const filteredLists = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    if (!search) return lists;

    return lists.filter((list) => {
      const searchableText = [
        getMeritListCenterName(list),
        getMeritListCenterCode(list),
        list?.year,
        list?.scholarshipCutoffRank,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(search);
    });
  }, [lists, searchTerm]);

  const pageSummary = useMemo(() => {
    const totalEntries = lists.reduce(
      (sum, list) => sum + (list.entries?.length || list.totalEntries || 0),
      0,
    );

    const listsWithCutoff = lists.filter(
      (list) => list.scholarshipCutoffRank,
    ).length;

    const centersCovered = new Set(
      lists.map((list) => getMeritListCenterId(list)).filter(Boolean),
    ).size;

    return {
      totalLists: lists.length,
      centersCovered,
      totalEntries,
      listsWithCutoff,
    };
  }, [lists]);

  const selectedSummary = useMemo(() => {
    const entries = selectedList?.entries || [];

    const linked = entries.filter((entry) => entry.registrationId).length;
    const unlinked = entries.length - linked;
    const admitted = entries.filter(
      (entry) => entry.admissionStatus === "ADMITTED",
    ).length;

    return {
      total: entries.length,
      linked,
      unlinked,
      admitted,
    };
  }, [selectedList]);

  return (
    <div className="page">
      <PageHeader
        title="Merit List"
        subtitle="Upload center-wise scholarship exam results and track selected students."
      />

      {(message || error) && (
        <section>
          {message && <div className="alert success">{message}</div>}
          {error && <div className="alert warning">{error}</div>}
        </section>
      )}

      <section className="stats-grid">
        <SummaryCard
          label="Merit Lists"
          value={pageSummary.totalLists}
          helper="Uploaded center-wise lists"
          loading={loading}
        />

        <SummaryCard
          label="Centers Covered"
          value={pageSummary.centersCovered}
          helper="Centers with uploaded result lists"
          loading={loading}
        />

        <SummaryCard
          label="Total Entries"
          value={pageSummary.totalEntries}
          helper="Students found in uploaded lists"
          loading={loading}
        />

        <SummaryCard
          label="Cutoff Set"
          value={pageSummary.listsWithCutoff}
          helper="Lists with scholarship cutoff rank"
          loading={loading}
        />
      </section>

      <section className="two-column">
        <div className="panel-card">
          <div className="panel-header">
            <div>
              <p className="eyebrow-text">Upload</p>
              <h2>Upload Merit List</h2>
              <p>
                Upload CSV, XLSX or XLS file for a selected center and exam
                year.
              </p>
            </div>
          </div>

          <form onSubmit={handleUpload} className="form-stack">
            <div className="form-group">
              <label>Center</label>
              <select
                name="centerId"
                value={form.centerId}
                onChange={handleFormChange}
                required
              >
                <option value="">Select center</option>

                {centers.map((center) => (
                  <option key={getCenterId(center)} value={getCenterId(center)}>
                    {getCenterName(center)}
                    {getCenterCode(center) ? ` (${getCenterCode(center)})` : ""}
                    {center.city ? ` - ${center.city}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Exam Year</label>
                <input
                  type="number"
                  name="year"
                  value={form.year}
                  onChange={handleFormChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Scholarship Cutoff Rank</label>
                <input
                  type="number"
                  name="scholarshipCutoffRank"
                  value={form.scholarshipCutoffRank}
                  onChange={handleFormChange}
                  placeholder="Example: 50"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Merit List File</label>
              <input
                key={fileInputKey}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                required
              />

              <p className="muted">
                Supported formats: CSV, XLSX, XLS. Download the registration
                Excel from Exam Registrations, fill only Marks and Rank, then
                upload the same file here.
              </p>

              {selectedFile && (
                <div className="selected-preview">
                  <span>Selected File</span>
                  <strong>{selectedFile.name}</strong>
                  <p>{formatFileSize(selectedFile.size)}</p>
                </div>
              )}
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="secondary-btn"
                onClick={clearUploadForm}
                disabled={uploading}
              >
                Clear
              </button>

              <button
                type="submit"
                className="primary-btn"
                disabled={uploading}
              >
                {uploading ? "Uploading..." : "Upload Merit List"}
              </button>
            </div>
          </form>
        </div>

        <div className="panel-card">
          <div className="panel-header">
            <div>
              <p className="eyebrow-text">Records</p>
              <h2>Uploaded Merit Lists</h2>
              <p>View already uploaded center-wise result lists.</p>
            </div>

            <button
              className="secondary-btn"
              type="button"
              onClick={fetchMeritLists}
              disabled={loading}
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          <div className="form-group">
            <input
              type="text"
              className="table-search"
              placeholder="Search by center or year..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {loading ? (
            <EmptyState
              title="Loading merit lists..."
              message="Please wait while uploaded merit lists are fetched."
            />
          ) : lists.length === 0 ? (
            <EmptyState
              title="No merit lists uploaded"
              message="Uploaded center-wise merit lists will appear here."
            />
          ) : filteredLists.length === 0 ? (
            <EmptyState
              title="No matching merit list found"
              message="Try searching with another center name or year."
            />
          ) : (
            <div className="list-stack">
              {filteredLists.map((list) => (
                <button
                  key={
                    list._id || `${getMeritListCenterName(list)}-${list.year}`
                  }
                  type="button"
                  className={`list-item ${
                    selectedList?._id === list._id ? "active" : ""
                  }`}
                  onClick={() =>
                    list._id
                      ? fetchMeritListById(list._id)
                      : setSelectedList(list)
                  }
                >
                  <div>
                    <strong>
                      {getMeritListCenterName(list)} - {list.year}
                    </strong>

                    <p>
                      Cutoff: {list.scholarshipCutoffRank || "Not set"} •
                      Entries: {list.entries?.length || list.totalEntries || 0}
                    </p>
                  </div>

                  <span>View</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {selectedList && (
        <section className="panel-card">
          <div className="panel-header">
            <div>
              <p className="eyebrow-text">Details</p>
              <h2>Merit List Details</h2>
              <p>
                {getMeritListCenterName(selectedList)} • {selectedList.year} •
                Cutoff: {selectedList.scholarshipCutoffRank || "Not set"}
              </p>
            </div>

            <button
              type="button"
              className="secondary-btn"
              onClick={() => setSelectedList(null)}
            >
              Close Details
            </button>
          </div>

          <section className="stats-grid compact-stats">
            <SummaryCard
              label="Total Entries"
              value={selectedSummary.total}
              helper="Students in uploaded list"
            />

            <SummaryCard
              label="Linked"
              value={selectedSummary.linked}
              helper="Matched with exam registrations"
            />

            <SummaryCard
              label="Unlinked"
              value={selectedSummary.unlinked}
              helper="No matching registration found"
            />

            <SummaryCard
              label="Admitted"
              value={selectedSummary.admitted}
              helper="Converted to students"
            />
          </section>

          {selectedList.entries?.length === 0 ? (
            <EmptyState
              title="No entries found"
              message="This merit list does not contain any student entries."
            />
          ) : (
            <div className="responsive-table">
              <table>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Name</th>
                    <th>Mobile</th>
                    <th>Score</th>
                    <th>Registration</th>
                    <th>Link Status</th>
                    <th>Admission Status</th>
                    <th>Student Type</th>
                  </tr>
                </thead>

                <tbody>
                  {selectedList.entries?.map((entry) => (
                    <tr
                      key={`${entry.rank}-${entry.mobileNumber || entry.name}`}
                    >
                      <td>
                        <span className="table-role-badge">
                          {entry.rank || "-"}
                        </span>
                      </td>

                      <td>
                        <div className="student-cell">
                          <strong>{entry.name || "Unnamed Student"}</strong>
                          <span>
                            {entry.registrationNumber ||
                              entry.registrationId?.registrationNumber ||
                              "Registration not added"}
                          </span>
                        </div>
                      </td>

                      <td>{entry.mobileNumber || "-"}</td>
                      <td>{entry.score ?? "-"}</td>

                      <td>
                        {entry.registrationId?.registrationNumber ||
                          entry.registrationNumber ||
                          "-"}
                      </td>

                      <td>
                        <span
                          className={`status-badge ${
                            entry.registrationId ? "success" : "warning"
                          }`}
                        >
                          {entry.registrationId ? "Linked" : "Unlinked"}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`status-badge ${
                            entry.admissionStatus === "ADMITTED"
                              ? "success"
                              : "warning"
                          }`}
                        >
                          {formatLabel(entry.admissionStatus || "PENDING")}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`status-badge ${
                            getStudentType(
                              entry.rank,
                              selectedList.scholarshipCutoffRank,
                            ) === "SCHOLARSHIP"
                              ? "info"
                              : "neutral"
                          }`}
                        >
                          {formatLabel(
                            getStudentType(
                              entry.rank,
                              selectedList.scholarshipCutoffRank,
                            ),
                          )}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
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

function extractArray(payload) {
  const data = payload?.data || payload;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.meritLists)) return data.meritLists;
  if (Array.isArray(data?.lists)) return data.lists;
  if (Array.isArray(data?.centers)) return data.centers;

  return [];
}

function getCenterId(center) {
  return center?._id || center?.id;
}

function getCenterName(center) {
  return center?.centerName || center?.name || "Unnamed Center";
}

function getCenterCode(center) {
  return center?.centerCode || center?.code || "";
}

function getMeritListCenterId(list) {
  return list?.center?._id || list?.center || list?.centerId || "";
}

function getMeritListCenterName(list) {
  return (
    list?.center?.centerName ||
    list?.centerName ||
    list?.center?.name ||
    "Center"
  );
}

function getMeritListCenterCode(list) {
  return list?.center?.centerCode || list?.centerCode || "";
}

function getStudentType(rank, cutoff) {
  if (!cutoff) return "CUTOFF_NOT_SET";

  return Number(rank) <= Number(cutoff) ? "SCHOLARSHIP" : "NON_SCHOLARSHIP";
}

function formatLabel(value) {
  return String(value || "N/A")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatFileSize(bytes) {
  if (!bytes) return "File size not available";

  const kb = bytes / 1024;

  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }

  return `${(kb / 1024).toFixed(1)} MB`;
}

export default MeritListPage;
