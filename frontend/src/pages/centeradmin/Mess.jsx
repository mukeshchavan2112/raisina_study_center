import { useEffect, useMemo, useState } from "react";
import API from "../../api/api";

const modalOverlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(15, 23, 42, 0.55)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999,
  padding: "20px",
};

const modalCardStyle = {
  width: "100%",
  maxWidth: "620px",
  background: "#ffffff",
  borderRadius: "22px",
  padding: "24px",
  boxShadow: "0 24px 80px rgba(15, 23, 42, 0.35)",
  border: "1px solid #e5e7eb",
};

function Mess() {
  const [activeTab, setActiveTab] = useState("overview");

  const [messes, setMesses] = useState([]);
  const [messStudents, setMessStudents] = useState([]);
  const [enrollments, setEnrollments] = useState([]);

  const [selectedMessId, setSelectedMessId] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");

  const [enrollmentForm, setEnrollmentForm] = useState({
    planType: "MONTHLY",
    startDate: "",
    endDate: "",
  });

  const [messForm, setMessForm] = useState({
    messName: "",
    address: "",
    capacity: "",
    status: "ACTIVE",
  });

  const [editingMessId, setEditingMessId] = useState(null);

  const [renewRecord, setRenewRecord] = useState(null);
  const [renewForm, setRenewForm] = useState({
    startDate: "",
    endDate: "",
  });

  const [loading, setLoading] = useState(true);
  const [savingMess, setSavingMess] = useState(false);
  const [savingEnrollment, setSavingEnrollment] = useState(false);
  const [savingRenewal, setSavingRenewal] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "messes", label: "Mess Management" },
    { key: "enrollment", label: "Student Enrollment" },
    { key: "students", label: "Mess Students" },
  ];

  useEffect(() => {
    fetchMessData();
  }, []);

  const getArray = (responseData) => {
    if (Array.isArray(responseData)) return responseData;
    if (Array.isArray(responseData?.data)) return responseData.data;
    return [];
  };

  const getId = (value) => {
    if (!value) return "";
    if (typeof value === "string") return value;
    return value._id || "";
  };

  const formatDate = (date) => {
    if (!date) return "-";

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) return "-";

    return parsed.toLocaleDateString("en-IN");
  };

  const toInputDate = (date) => {
    if (!date) return "";

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) return "";

    return parsed.toISOString().slice(0, 10);
  };

  const getNextDayInputDate = (date) => {
    if (!date) return "";

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) return "";

    parsed.setDate(parsed.getDate() + 1);

    return parsed.toISOString().slice(0, 10);
  };

  const isExpired = (endDate) => {
    if (!endDate) return false;

    const end = new Date(endDate);
    if (Number.isNaN(end.getTime())) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    return end < today;
  };

  const getDisplayStatus = (record) => {
    if (record.status === "ACTIVE" && isExpired(record.endDate)) {
      return "EXPIRED";
    }

    return record.status || "-";
  };

  const fetchMessData = async () => {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      const [messesRes, studentsRes, enrollmentsRes] = await Promise.all([
        API.get("/messes"),
        API.get("/messes/eligible-students"),
        API.get("/messes/enrollments"),
      ]);

      setMesses(getArray(messesRes.data));
      setMessStudents(getArray(studentsRes.data));
      setEnrollments(getArray(enrollmentsRes.data));
    } catch (err) {
      console.error("Mess data fetch error:", err);
      setError(
        err.response?.data?.message ||
          "Unable to load mess data. Please check backend connection.",
      );
    } finally {
      setLoading(false);
    }
  };

  const activeEnrollments = useMemo(() => {
    return enrollments.filter((record) => record.status === "ACTIVE");
  }, [enrollments]);

  const enrolledStudentIds = useMemo(() => {
    return activeEnrollments.map((record) => String(getId(record.student)));
  }, [activeEnrollments]);

  const unassignedStudents = useMemo(() => {
    return messStudents.filter((student) => {
      const studentId = String(student._id);
      return !enrolledStudentIds.includes(studentId) && !student.mess;
    });
  }, [messStudents, enrolledStudentIds]);

  const selectedMess = useMemo(() => {
    return messes.find((mess) => String(mess._id) === String(selectedMessId));
  }, [messes, selectedMessId]);

  const selectedStudent = useMemo(() => {
    return messStudents.find(
      (student) => String(student._id) === String(selectedStudentId),
    );
  }, [messStudents, selectedStudentId]);

  const totalCapacity = useMemo(() => {
    return messes.reduce((sum, mess) => sum + Number(mess.capacity || 0), 0);
  }, [messes]);

  const occupiedSeats = activeEnrollments.length;
  const availableSeats = Math.max(totalCapacity - occupiedSeats, 0);

  const expiredEnrollments = useMemo(() => {
    return activeEnrollments.filter((record) => isExpired(record.endDate));
  }, [activeEnrollments]);

  const selectedMessOccupied = useMemo(() => {
    if (!selectedMessId) return 0;

    return activeEnrollments.filter(
      (record) => String(getId(record.mess)) === String(selectedMessId),
    ).length;
  }, [activeEnrollments, selectedMessId]);

  const selectedMessAvailable = selectedMess
    ? Math.max(Number(selectedMess.capacity || 0) - selectedMessOccupied, 0)
    : 0;

  const recentEnrollments = activeEnrollments.slice(0, 5);

  const handleMessSelect = (e) => {
    setSelectedMessId(e.target.value);
  };

  const handleEnrollmentChange = (e) => {
    setEnrollmentForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleMessChange = (e) => {
    setMessForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleRenewChange = (e) => {
    setRenewForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const resetEnrollmentForm = () => {
    setSelectedMessId("");
    setSelectedStudentId("");
    setEnrollmentForm({
      planType: "MONTHLY",
      startDate: "",
      endDate: "",
    });
  };

  const resetMessForm = () => {
    setEditingMessId(null);
    setMessForm({
      messName: "",
      address: "",
      capacity: "",
      status: "ACTIVE",
    });
  };

  const handleEditMess = (mess) => {
    setEditingMessId(mess._id);

    setMessForm({
      messName: mess.messName || "",
      address: mess.address || "",
      capacity: mess.capacity || "",
      status: mess.status || "ACTIVE",
    });
  };

  const handleCreateMess = async (e) => {
    e.preventDefault();

    try {
      setSavingMess(true);
      setError("");
      setMessage("");

      await API.post("/messes", {
        messName: messForm.messName,
        address: messForm.address,
        capacity: messForm.capacity,
      });

      setMessage("Mess created successfully.");
      resetMessForm();
      fetchMessData();
    } catch (err) {
      console.error("Create mess error:", err);
      setError(err.response?.data?.message || "Unable to create mess.");
    } finally {
      setSavingMess(false);
    }
  };

  const handleUpdateMess = async (e) => {
    e.preventDefault();

    if (!editingMessId) return;

    try {
      setSavingMess(true);
      setError("");
      setMessage("");

      await API.put(`/messes/${editingMessId}`, {
        messName: messForm.messName,
        address: messForm.address,
        capacity: messForm.capacity,
        status: messForm.status,
      });

      setMessage("Mess details updated successfully.");
      resetMessForm();
      fetchMessData();
    } catch (err) {
      console.error("Update mess error:", err);
      setError(err.response?.data?.message || "Unable to update mess.");
    } finally {
      setSavingMess(false);
    }
  };

  const handleEnrollStudent = async (e) => {
    e.preventDefault();

    if (!selectedMessId) {
      setError("Please select a mess.");
      return;
    }

    if (!selectedStudentId) {
      setError("Please select a student.");
      return;
    }

    if (!enrollmentForm.startDate || !enrollmentForm.endDate) {
      setError("Please select from date and end date.");
      return;
    }

    try {
      setSavingEnrollment(true);
      setError("");
      setMessage("");

      await API.post(`/messes/${selectedMessId}/enroll`, {
        studentId: selectedStudentId,
        planType: enrollmentForm.planType,
        startDate: enrollmentForm.startDate,
        endDate: enrollmentForm.endDate,
      });

      setMessage("Student enrolled in mess successfully.");
      resetEnrollmentForm();
      fetchMessData();
    } catch (err) {
      console.error("Mess enroll error:", err);
      setError(
        err.response?.data?.message || "Unable to enroll student in mess.",
      );
    } finally {
      setSavingEnrollment(false);
    }
  };

  const handleUnenroll = async (record) => {
    try {
      setError("");
      setMessage("");

      const messId = getId(record.mess);
      const studentId = getId(record.student);

      await API.post(`/messes/${messId}/unenroll`, {
        studentId,
        remarks: "Stopped from mess page",
      });

      setMessage("Student removed from mess.");
      fetchMessData();
    } catch (err) {
      console.error("Mess unenroll error:", err);
      setError(
        err.response?.data?.message || "Unable to remove student from mess.",
      );
    }
  };

  const openRenewModal = (record) => {
    setRenewRecord(record);

    setRenewForm({
      startDate: record.endDate
        ? getNextDayInputDate(record.endDate)
        : toInputDate(record.startDate),
      endDate: "",
    });
  };

  const closeRenewModal = () => {
    setRenewRecord(null);
    setRenewForm({
      startDate: "",
      endDate: "",
    });
  };

  const handleRenewSubmit = async (e) => {
    e.preventDefault();

    if (!renewRecord) return;

    if (!renewForm.startDate || !renewForm.endDate) {
      setError("Please select renewal from date and end date.");
      return;
    }

    try {
      setSavingRenewal(true);
      setError("");
      setMessage("");

      await API.post(`/messes/enrollments/${renewRecord._id}/renew`, {
        startDate: renewForm.startDate,
        endDate: renewForm.endDate,
      });

      setMessage("Mess membership renewed successfully.");
      closeRenewModal();
      fetchMessData();
    } catch (err) {
      console.error("Mess renewal error:", err);
      setError(
        err.response?.data?.message || "Unable to renew mess membership.",
      );
    } finally {
      setSavingRenewal(false);
    }
  };

  return (
    <div className="module-page">
      <section className="page-header-card">
        <span className="page-tag">MESS MODULE</span>
        <h2>Mess Management</h2>
        <p>
          Create mess records, enroll eligible students, manage validity dates,
          and renew mess memberships.
        </p>
      </section>

      {error && <div className="error-message">{error}</div>}
      {message && <div className="success-message">{message}</div>}

      <div
        className="dashboard-tabs"
        style={{
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
          margin: "20px 0",
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={activeTab === tab.key ? "primary-btn" : "secondary-btn"}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-card">Loading mess data...</div>
      ) : (
        <>
          {activeTab === "overview" && (
            <section className="dashboard-grid">
              <div className="panel-card">
                <div className="panel-header">
                  <div>
                    <h2>Mess Overview</h2>
                    <p>Current mess capacity status</p>
                  </div>
                </div>

                <div className="action-list">
                  <SummaryRow
                    title="Total Messes"
                    description="Mess records created"
                    value={messes.length}
                  />

                  <SummaryRow
                    title="Total Capacity"
                    description="Total available mess seats"
                    value={totalCapacity}
                  />

                  <SummaryRow
                    title="Occupied Seats"
                    description="Currently enrolled students"
                    value={occupiedSeats}
                  />

                  <SummaryRow
                    title="Available Seats"
                    description="Remaining mess capacity"
                    value={availableSeats}
                  />
                </div>
              </div>

              <div className="panel-card">
                <div className="panel-header">
                  <div>
                    <h2>Student Requests</h2>
                    <p>Mess facility selection and enrollment</p>
                  </div>
                </div>

                <div className="action-list">
                  <SummaryRow
                    title="Mess Facility Students"
                    description="Students who selected mess facility"
                    value={messStudents.length}
                  />

                  <SummaryRow
                    title="Active Enrollments"
                    description="Students currently enrolled in mess"
                    value={activeEnrollments.length}
                  />

                  <SummaryRow
                    title="Pending Enrollment"
                    description="Eligible students not yet enrolled"
                    value={unassignedStudents.length}
                  />

                  <SummaryRow
                    title="Expired Memberships"
                    description="Active records whose end date has passed"
                    value={expiredEnrollments.length}
                  />
                </div>
              </div>

              <div className="panel-card">
                <div className="panel-header">
                  <div>
                    <h2>Quick Actions</h2>
                    <p>Jump to common mess tasks</p>
                  </div>
                </div>

                <div className="action-list">
                  <button
                    className="secondary-btn"
                    type="button"
                    onClick={() => setActiveTab("messes")}
                  >
                    Create / View Messes
                  </button>

                  <button
                    className="secondary-btn"
                    type="button"
                    onClick={() => setActiveTab("enrollment")}
                  >
                    Enroll Student
                  </button>

                  <button
                    className="secondary-btn"
                    type="button"
                    onClick={() => setActiveTab("students")}
                  >
                    View Mess Students
                  </button>
                </div>
              </div>

              <div className="panel-card wide-card">
                <div className="panel-header">
                  <div>
                    <h2>Recent Mess Enrollments</h2>
                    <p>Latest active mess enrollments</p>
                  </div>
                </div>

                {recentEnrollments.length === 0 ? (
                  <div className="empty-state">
                    No active mess enrollments yet.
                  </div>
                ) : (
                  <div className="action-list">
                    {recentEnrollments.map((record) => (
                      <div className="action-item" key={record._id}>
                        <div>
                          <h4>{record.student?.studentName || "Student"}</h4>
                          <p>
                            {record.mess?.messName || "Mess"} •{" "}
                            {record.planType || "Plan"}
                          </p>
                          <p>
                            Valid: {formatDate(record.startDate)} to{" "}
                            {formatDate(record.endDate)}
                          </p>
                        </div>

                        <strong>{getDisplayStatus(record)}</strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          {activeTab === "messes" && (
            <>
              <section className="users-grid">
                <div className="form-card">
                  <div className="form-card-header">
                    <h3>Create Mess</h3>
                    <p>Add a mess facility for this center.</p>
                  </div>

                  <form onSubmit={handleCreateMess}>
                    <div className="form-group">
                      <label>Mess Name</label>
                      <input
                        name="messName"
                        value={messForm.messName}
                        onChange={handleMessChange}
                        placeholder="Example: Main Mess"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Address</label>
                      <input
                        name="address"
                        value={messForm.address}
                        onChange={handleMessChange}
                        placeholder="Mess address"
                      />
                    </div>

                    <div className="form-group">
                      <label>Capacity</label>
                      <input
                        type="number"
                        name="capacity"
                        value={messForm.capacity}
                        onChange={handleMessChange}
                        placeholder="Enter total mess capacity"
                        min="1"
                        required
                      />
                    </div>

                    <button className="primary-btn" disabled={savingMess}>
                      {savingMess ? "Creating..." : "Create Mess"}
                    </button>
                  </form>
                </div>
              </section>

              <MessTable messes={messes} onEdit={handleEditMess} />
            </>
          )}

          {activeTab === "enrollment" && (
            <>
              <section className="users-grid">
                <div className="form-card">
                  <div className="form-card-header">
                    <h3>Enroll Student in Mess</h3>
                    <p>Select mess, student, plan and membership validity.</p>
                  </div>

                  <form onSubmit={handleEnrollStudent}>
                    <div className="form-group">
                      <label>Mess</label>
                      <select
                        value={selectedMessId}
                        onChange={handleMessSelect}
                        required
                      >
                        <option value="">Select mess</option>

                        {messes.map((mess) => (
                          <option key={mess._id} value={mess._id}>
                            {mess.messName}
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedMess && (
                      <div className="info-card">
                        <p>
                          <strong>Capacity:</strong>{" "}
                          {selectedMess.capacity || 0}
                        </p>
                        <p>
                          <strong>Occupied:</strong> {selectedMessOccupied}
                        </p>
                        <p>
                          <strong>Available:</strong> {selectedMessAvailable}
                        </p>
                      </div>
                    )}

                    <div className="form-group">
                      <label>Student</label>
                      <select
                        value={selectedStudentId}
                        onChange={(e) => setSelectedStudentId(e.target.value)}
                        required
                      >
                        <option value="">Select mess student</option>

                        {unassignedStudents.map((student) => (
                          <option key={student._id} value={student._id}>
                            {student.studentName}{" "}
                            {student.rscNumber ? `(${student.rscNumber})` : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedStudent && (
                      <div className="info-card">
                        <p>
                          <strong>Student:</strong>{" "}
                          {selectedStudent.studentName}
                        </p>
                        <p>
                          <strong>RSC No:</strong>{" "}
                          {selectedStudent.rscNumber || "-"}
                        </p>
                        <p>
                          <strong>Type:</strong>{" "}
                          {selectedStudent.studentType || "-"}
                        </p>
                      </div>
                    )}

                    <div className="form-group">
                      <label>Plan Type</label>
                      <select
                        name="planType"
                        value={enrollmentForm.planType}
                        onChange={handleEnrollmentChange}
                      >
                        <option value="MONTHLY">Monthly</option>
                        <option value="QUARTERLY">Quarterly</option>
                        <option value="YEARLY">Yearly</option>
                      </select>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>From Date</label>
                        <input
                          type="date"
                          name="startDate"
                          value={enrollmentForm.startDate}
                          onChange={handleEnrollmentChange}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label>End Date</label>
                        <input
                          type="date"
                          name="endDate"
                          value={enrollmentForm.endDate}
                          onChange={handleEnrollmentChange}
                          required
                        />
                      </div>
                    </div>

                    <button
                      className="primary-btn"
                      disabled={savingEnrollment || messes.length === 0}
                    >
                      {savingEnrollment ? "Enrolling..." : "Enroll Student"}
                    </button>
                  </form>
                </div>
              </section>

              <PendingStudentsTable students={unassignedStudents} />
            </>
          )}

          {activeTab === "students" && (
            <EnrollmentTable
              messes={messes}
              messStudents={messStudents}
              enrollments={enrollments}
              loading={loading}
              formatDate={formatDate}
              getDisplayStatus={getDisplayStatus}
              handleUnenroll={handleUnenroll}
              openRenewModal={openRenewModal}
              refresh={fetchMessData}
            />
          )}
        </>
      )}

      {editingMessId && (
        <div style={modalOverlayStyle}>
          <div style={modalCardStyle}>
            <div className="form-card-header">
              <h3>Edit Mess Details</h3>
              <p>Update mess name, address, capacity and status.</p>
            </div>

            <form onSubmit={handleUpdateMess}>
              <div className="form-group">
                <label>Mess Name</label>
                <input
                  name="messName"
                  value={messForm.messName}
                  onChange={handleMessChange}
                  placeholder="Example: Main Mess"
                  required
                />
              </div>

              <div className="form-group">
                <label>Address</label>
                <input
                  name="address"
                  value={messForm.address}
                  onChange={handleMessChange}
                  placeholder="Mess address"
                />
              </div>

              <div className="form-group">
                <label>Capacity</label>
                <input
                  type="number"
                  name="capacity"
                  value={messForm.capacity}
                  onChange={handleMessChange}
                  placeholder="Enter total mess capacity"
                  min="1"
                  required
                />
              </div>

              <div className="form-group">
                <label>Status</label>
                <select
                  name="status"
                  value={messForm.status}
                  onChange={handleMessChange}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  justifyContent: "flex-end",
                  flexWrap: "wrap",
                  marginTop: "18px",
                }}
              >
                <button
                  className="secondary-btn"
                  type="button"
                  onClick={resetMessForm}
                >
                  Cancel
                </button>

                <button className="primary-btn" disabled={savingMess}>
                  {savingMess ? "Updating..." : "Update Mess"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {renewRecord && (
        <div style={modalOverlayStyle}>
          <div style={modalCardStyle}>
            <div className="form-card-header">
              <h3>Renew Mess Membership</h3>
              <p>
                Update validity dates for{" "}
                <strong>{renewRecord.student?.studentName || "student"}</strong>
                .
              </p>
            </div>

            <form onSubmit={handleRenewSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>New From Date</label>
                  <input
                    type="date"
                    name="startDate"
                    value={renewForm.startDate}
                    onChange={handleRenewChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>New End Date</label>
                  <input
                    type="date"
                    name="endDate"
                    value={renewForm.endDate}
                    onChange={handleRenewChange}
                    required
                  />
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  justifyContent: "flex-end",
                  flexWrap: "wrap",
                }}
              >
                <button
                  className="secondary-btn"
                  type="button"
                  onClick={closeRenewModal}
                >
                  Cancel
                </button>

                <button className="primary-btn" disabled={savingRenewal}>
                  {savingRenewal ? "Renewing..." : "Renew Membership"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryRow({ title, description, value }) {
  return (
    <div className="action-item">
      <div>
        <h4>{title}</h4>
        <p>{description}</p>
      </div>
      <strong>{value}</strong>
    </div>
  );
}

function MessTable({ messes, onEdit }) {
  return (
    <section className="table-card">
      <div className="table-header">
        <div>
          <h3>Mess Records</h3>
          <p>Created mess records for this center.</p>
        </div>
      </div>

      {messes.length === 0 ? (
        <div className="empty-state">
          <h4>No mess created yet</h4>
          <p>Create a mess using the form above.</p>
        </div>
      ) : (
        <div className="responsive-table">
          <table>
            <thead>
              <tr>
                <th>Mess Name</th>
                <th>Address</th>
                <th>Capacity</th>
                <th>Occupancy</th>
                <th>Available</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {messes.map((mess) => (
                <tr key={mess._id}>
                  <td>{mess.messName}</td>
                  <td>{mess.address || "-"}</td>
                  <td>{mess.capacity || 0}</td>
                  <td>{mess.occupancy || 0}</td>
                  <td>{mess.availableSeats ?? "-"}</td>
                  <td>
                    <span className="table-role-badge">
                      {mess.status || "ACTIVE"}
                    </span>
                  </td>
                  <td>
                    <button
                      className="table-action-btn"
                      type="button"
                      onClick={() => onEdit(mess)}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function PendingStudentsTable({ students }) {
  return (
    <section className="table-card">
      <div className="table-header">
        <div>
          <h3>Pending Mess Enrollment</h3>
          <p>Students who selected mess facility but are not enrolled yet.</p>
        </div>
      </div>

      {students.length === 0 ? (
        <div className="empty-state">
          <h4>No pending mess students</h4>
          <p>
            All eligible students are already enrolled or no one requested mess.
          </p>
        </div>
      ) : (
        <div className="responsive-table">
          <table>
            <thead>
              <tr>
                <th>RSC No</th>
                <th>Student Name</th>
                <th>Mobile</th>
                <th>Student Type</th>
              </tr>
            </thead>

            <tbody>
              {students.map((student) => (
                <tr key={student._id}>
                  <td>{student.rscNumber || "-"}</td>
                  <td>{student.studentName}</td>
                  <td>{student.mobileNumber || "-"}</td>
                  <td>{student.studentType || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function EnrollmentTable({
  messes,
  messStudents,
  enrollments,
  loading,
  formatDate,
  getDisplayStatus,
  handleUnenroll,
  openRenewModal,
  refresh,
}) {
  return (
    <section className="table-card">
      <div className="table-header">
        <div>
          <h3>Mess Enrollment Records</h3>
          <p>Active and stopped mess enrollments with validity dates.</p>
        </div>

        <button className="secondary-btn" onClick={refresh}>
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="empty-state">
          <h4>Loading mess data...</h4>
          <p>Please wait while records are fetched.</p>
        </div>
      ) : messes.length === 0 ? (
        <div className="empty-state">
          <h4>No mess created yet</h4>
          <p>Create one mess first, then enroll students.</p>
        </div>
      ) : messStudents.length === 0 ? (
        <div className="empty-state">
          <h4>No mess students found</h4>
          <p>Admit a student with mess facility selected to show them here.</p>
        </div>
      ) : enrollments.length === 0 ? (
        <div className="empty-state">
          <h4>No mess enrollment yet</h4>
          <p>Use the enrollment form to enroll a student.</p>
        </div>
      ) : (
        <div className="responsive-table">
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>RSC No</th>
                <th>Mess</th>
                <th>Plan</th>
                <th>From Date</th>
                <th>End Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {enrollments.map((record) => {
                const displayStatus = getDisplayStatus(record);

                return (
                  <tr key={record._id}>
                    <td>{record.student?.studentName || "-"}</td>
                    <td>{record.student?.rscNumber || "-"}</td>
                    <td>{record.mess?.messName || "-"}</td>
                    <td>{record.planType || "-"}</td>
                    <td>{formatDate(record.startDate)}</td>
                    <td>{formatDate(record.endDate)}</td>
                    <td>
                      <span className="table-role-badge">{displayStatus}</span>
                    </td>
                    <td>
                      <div
                        style={{
                          display: "flex",
                          gap: "8px",
                          flexWrap: "wrap",
                        }}
                      >
                        <button
                          className="table-action-btn"
                          type="button"
                          onClick={() => openRenewModal(record)}
                        >
                          Renew
                        </button>

                        {record.status === "ACTIVE" ? (
                          <button
                            className="secondary-btn"
                            type="button"
                            onClick={() => handleUnenroll(record)}
                          >
                            Stop
                          </button>
                        ) : (
                          <span>-</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default Mess;
