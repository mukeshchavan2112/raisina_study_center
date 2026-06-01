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

function Library() {
  const [activeTab, setActiveTab] = useState("overview");

  const [students, setStudents] = useState([]);
  const [books, setBooks] = useState([]);
  const [issues, setIssues] = useState([]);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [bookForm, setBookForm] = useState({
    title: "",
    author: "",
    isbn: "",
    totalCopies: "",
  });

  const [issueForm, setIssueForm] = useState({
    studentId: "",
    bookId: "",
    dueDate: "",
  });

  const [selectedStudyStudentId, setSelectedStudyStudentId] = useState("");

  const [studyForm, setStudyForm] = useState({
    startDate: "",
    endDate: "",
    seatNo: "",
    status: "ACTIVE",
    remarks: "",
  });

  const [renewStudent, setRenewStudent] = useState(null);
  const [renewForm, setRenewForm] = useState({
    startDate: "",
    endDate: "",
  });

  const [savingRenewal, setSavingRenewal] = useState(false);

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "study-space", label: "Study Space" },
    { key: "books", label: "Books" },
    { key: "issue-return", label: "Issue / Return" },
  ];

  const getData = (res) => {
    return res?.data?.data ?? res?.data ?? [];
  };

  const toArray = (value) => {
    if (Array.isArray(value)) return value;
    if (Array.isArray(value?.students)) return value.students;
    if (Array.isArray(value?.books)) return value.books;
    if (Array.isArray(value?.issues)) return value.issues;
    return [];
  };

  const formatDate = (date) => {
    if (!date) return "N/A";

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) return "N/A";

    return parsed.toLocaleDateString("en-IN");
  };

  const toInputDate = (date) => {
    if (!date) return "";

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) return "";

    return parsed.toISOString().split("T")[0];
  };

  const getNextDayInputDate = (date) => {
    if (!date) return "";

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) return "";

    parsed.setDate(parsed.getDate() + 1);

    return parsed.toISOString().split("T")[0];
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

  const getStudyStatus = (student) => {
    const profile = student?.libraryProfile || {};

    if (profile.status === "ACTIVE" && isExpired(profile.endDate)) {
      return "EXPIRED";
    }

    return profile.status || "ACTIVE";
  };

  const resetAlerts = () => {
    setMessage("");
    setError("");
  };

  const fetchLibraryData = async () => {
    try {
      setLoading(true);
      setError("");

      const [studentsRes, booksRes, issuesRes] = await Promise.all([
        API.get("/library/students"),
        API.get("/library/books"),
        API.get("/library/issues"),
      ]);

      setStudents(toArray(getData(studentsRes)));
      setBooks(toArray(getData(booksRes)));
      setIssues(toArray(getData(issuesRes)));
    } catch (err) {
      console.error("Library fetch error:", err);
      setError(err?.response?.data?.message || "Failed to load library data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLibraryData();
  }, []);

  const assignedStudyStudents = useMemo(() => {
    return students.filter(
      (student) => student.libraryProfile?.isAssigned === true
    );
  }, [students]);

  const expiredStudyStudents = useMemo(() => {
    return assignedStudyStudents.filter((student) =>
      isExpired(student.libraryProfile?.endDate)
    );
  }, [assignedStudyStudents]);

  const stats = useMemo(() => {
    const totalCopies = books.reduce(
      (sum, book) => sum + Number(book.totalCopies || 0),
      0
    );

    const availableBooks = books.reduce(
      (sum, book) => sum + Number(book.availableCopies || 0),
      0
    );

    const issuedBooks = issues.filter(
      (issue) => issue.status === "ISSUED"
    ).length;

    const overdueBooks = issues.filter(
      (issue) => issue.status === "OVERDUE"
    ).length;

    const returnedBooks = issues.filter(
      (issue) => issue.status === "RETURNED"
    ).length;

    const activeStudyStudents = assignedStudyStudents.filter(
      (student) => getStudyStatus(student) === "ACTIVE"
    ).length;

    return {
      eligibleStudents: students.length,
      studySpaceStudents: assignedStudyStudents.length,
      activeStudyStudents,
      expiredStudyStudents: expiredStudyStudents.length,
      bookTitles: books.length,
      totalCopies,
      availableBooks,
      issuedBooks,
      overdueBooks,
      returnedBooks,
    };
  }, [students, assignedStudyStudents, expiredStudyStudents, books, issues]);

  const recentIssues = issues.slice(0, 5);

  const handleBookChange = (e) => {
    setBookForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleIssueChange = (e) => {
    setIssueForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleStudyFormChange = (e) => {
    setStudyForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleStudyStudentSelect = (e) => {
    const studentId = e.target.value;
    setSelectedStudyStudentId(studentId);

    const student = students.find((item) => item._id === studentId);
    const profile = student?.libraryProfile || {};

    setStudyForm({
      startDate: toInputDate(profile.startDate || profile.joiningDate),
      endDate: toInputDate(profile.endDate),
      seatNo: profile.seatNo || "",
      status: profile.status || "ACTIVE",
      remarks: profile.remarks || "",
    });
  };

  const resetStudyForm = () => {
    setSelectedStudyStudentId("");
    setStudyForm({
      startDate: "",
      endDate: "",
      seatNo: "",
      status: "ACTIVE",
      remarks: "",
    });
  };

  const handleAddBook = async (e) => {
    e.preventDefault();
    resetAlerts();

    try {
      await API.post("/library/books", {
        title: bookForm.title,
        author: bookForm.author,
        isbn: bookForm.isbn || null,
        totalCopies: Number(bookForm.totalCopies),
      });

      setMessage("Book added successfully");

      setBookForm({
        title: "",
        author: "",
        isbn: "",
        totalCopies: "",
      });

      fetchLibraryData();
    } catch (err) {
      console.error("Add book error:", err);
      setError(err?.response?.data?.message || "Failed to add book");
    }
  };

  const handleUpdateStudySpace = async (e) => {
    e.preventDefault();
    resetAlerts();

    if (!selectedStudyStudentId) {
      setError("Please select a student");
      return;
    }

    if (!studyForm.startDate || !studyForm.endDate) {
      setError("Please select from date and end date");
      return;
    }

    try {
      await API.put(`/library/students/${selectedStudyStudentId}/study-space`, {
        joiningDate: studyForm.startDate,
        startDate: studyForm.startDate,
        endDate: studyForm.endDate,
        seatNo: studyForm.seatNo,
        status: studyForm.status,
        remarks: studyForm.remarks,
        libraryAccess: true,
      });

      setMessage("Study space student added/updated successfully");

      resetStudyForm();
      fetchLibraryData();
    } catch (err) {
      console.error("Study space update error:", err);
      setError(
        err?.response?.data?.message || "Failed to update study space details"
      );
    }
  };

  const handleIssueBook = async (e) => {
    e.preventDefault();
    resetAlerts();

    try {
      await API.post("/library/issue", {
        studentId: issueForm.studentId,
        bookId: issueForm.bookId,
        dueDate: issueForm.dueDate,
      });

      setMessage("Book issued successfully");

      setIssueForm({
        studentId: "",
        bookId: "",
        dueDate: "",
      });

      fetchLibraryData();
    } catch (err) {
      console.error("Issue book error:", err);
      setError(err?.response?.data?.message || "Failed to issue book");
    }
  };

  const handleReturnBook = async (issueId) => {
    resetAlerts();

    try {
      const res = await API.put(`/library/return/${issueId}`);
      const data = getData(res);

      setMessage(
        data?.fine > 0
          ? `Book returned successfully. Fine: ₹${data.fine}`
          : "Book returned successfully"
      );

      fetchLibraryData();
    } catch (err) {
      console.error("Return book error:", err);
      setError(err?.response?.data?.message || "Failed to return book");
    }
  };

  const handleDeleteBook = async (bookId) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this book?"
    );

    if (!confirmDelete) return;

    resetAlerts();

    try {
      await API.delete(`/library/books/${bookId}`);
      setMessage("Book deleted successfully");
      fetchLibraryData();
    } catch (err) {
      console.error("Delete book error:", err);
      setError(err?.response?.data?.message || "Failed to delete book");
    }
  };

  const handleMarkOverdue = async () => {
    resetAlerts();

    try {
      await API.post("/library/mark-overdue");
      setMessage("Overdue records updated");
      fetchLibraryData();
    } catch (err) {
      console.error("Mark overdue error:", err);
      setError(err?.response?.data?.message || "Failed to mark overdue books");
    }
  };

  const openRenewModal = (student) => {
    const profile = student.libraryProfile || {};

    setRenewStudent(student);
    setRenewForm({
      startDate: profile.endDate
        ? getNextDayInputDate(profile.endDate)
        : toInputDate(profile.startDate || profile.joiningDate),
      endDate: "",
    });
  };

  const closeRenewModal = () => {
    setRenewStudent(null);
    setRenewForm({
      startDate: "",
      endDate: "",
    });
  };

  const handleRenewChange = (e) => {
    setRenewForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleRenewSubmit = async (e) => {
    e.preventDefault();
    resetAlerts();

    if (!renewStudent) return;

    if (!renewForm.startDate || !renewForm.endDate) {
      setError("Please select renewal from date and end date");
      return;
    }

    try {
      setSavingRenewal(true);

      await API.put(`/library/students/${renewStudent._id}/renew`, {
        startDate: renewForm.startDate,
        endDate: renewForm.endDate,
      });

      setMessage("Study space membership renewed successfully");
      closeRenewModal();
      fetchLibraryData();
    } catch (err) {
      console.error("Renew study space error:", err);
      setError(
        err?.response?.data?.message || "Failed to renew study space membership"
      );
    } finally {
      setSavingRenewal(false);
    }
  };

  return (
    <div className="module-page">
      <section className="page-header-card">
        <span className="page-tag">LIBRARY MODULE</span>
        <h2>Study Center Management</h2>
        <p>
          Manage study space memberships, book stock, issue records and return
          records in a cleaner tab-based view.
        </p>
      </section>

      {message && <div className="success-message">{message}</div>}
      {error && <div className="error-message">{error}</div>}

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
        <div className="loading-card">Loading library data...</div>
      ) : (
        <>
          {activeTab === "overview" && (
            <section className="dashboard-grid">
              <div className="panel-card">
                <div className="panel-header">
                  <div>
                    <h2>Study Space Overview</h2>
                    <p>Students using the study center facility</p>
                  </div>
                </div>

                <div className="action-list">
                  <SummaryRow
                    title="Eligible Students"
                    description="Students who selected library facility"
                    value={stats.eligibleStudents}
                  />

                  <SummaryRow
                    title="Study Space Students"
                    description="Students assigned from study space form"
                    value={stats.studySpaceStudents}
                  />

                  <SummaryRow
                    title="Active Students"
                    description="Currently active study space students"
                    value={stats.activeStudyStudents}
                  />

                  <SummaryRow
                    title="Expired Memberships"
                    description="Students whose end date has passed"
                    value={stats.expiredStudyStudents}
                  />
                </div>
              </div>

              <div className="panel-card">
                <div className="panel-header">
                  <div>
                    <h2>Books Overview</h2>
                    <p>Book inventory and availability</p>
                  </div>
                </div>

                <div className="action-list">
                  <SummaryRow
                    title="Book Titles"
                    description="Different books added"
                    value={stats.bookTitles}
                  />

                  <SummaryRow
                    title="Total Copies"
                    description="Total stock across all books"
                    value={stats.totalCopies}
                  />

                  <SummaryRow
                    title="Available Copies"
                    description="Copies currently available"
                    value={stats.availableBooks}
                  />
                </div>
              </div>

              <div className="panel-card">
                <div className="panel-header">
                  <div>
                    <h2>Issue Status</h2>
                    <p>Current book issue and return status</p>
                  </div>
                </div>

                <div className="action-list">
                  <SummaryRow
                    title="Issued Books"
                    description="Books currently with students"
                    value={stats.issuedBooks}
                  />

                  <SummaryRow
                    title="Returned Books"
                    description="Completed return records"
                    value={stats.returnedBooks}
                  />

                  <SummaryRow
                    title="Overdue Books"
                    description="Books not returned on time"
                    value={stats.overdueBooks}
                  />
                </div>
              </div>

              <div className="panel-card">
                <div className="panel-header">
                  <div>
                    <h2>Quick Actions</h2>
                    <p>Jump to common library tasks</p>
                  </div>
                </div>

                <div className="action-list">
                  <button
                    className="secondary-btn"
                    type="button"
                    onClick={() => setActiveTab("study-space")}
                  >
                    Add Study Space Student
                  </button>

                  <button
                    className="secondary-btn"
                    type="button"
                    onClick={() => setActiveTab("books")}
                  >
                    Add / View Books
                  </button>

                  <button
                    className="secondary-btn"
                    type="button"
                    onClick={() => setActiveTab("issue-return")}
                  >
                    Issue / Return Book
                  </button>
                </div>
              </div>

              <div className="panel-card wide-card">
                <div className="panel-header">
                  <div>
                    <h2>Recent Issue Records</h2>
                    <p>Latest book issue and return activity</p>
                  </div>
                </div>

                {recentIssues.length === 0 ? (
                  <div className="empty-state">No issue records found.</div>
                ) : (
                  <div className="action-list">
                    {recentIssues.map((issue) => (
                      <div className="action-item" key={issue._id}>
                        <div>
                          <h4>{issue.book?.title || "Book"}</h4>
                          <p>
                            {issue.student?.studentName || "Student"} • Due:{" "}
                            {formatDate(issue.dueDate)}
                          </p>
                        </div>

                        <strong>{issue.status}</strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          {activeTab === "study-space" && (
            <>
              <section className="users-grid">
                <div className="form-card">
                  <div className="form-card-header">
                    <h3>Student Allocatation</h3>
                    <p>
                      Select a library-eligible student and assign seat with
                      membership validity dates.
                    </p>
                  </div>

                  <form onSubmit={handleUpdateStudySpace}>
                    <div className="form-group">
                      <label>Student</label>
                      <select
                        value={selectedStudyStudentId}
                        onChange={handleStudyStudentSelect}
                        required
                      >
                        <option value="">Select student</option>
                        {students.map((student) => (
                          <option key={student._id} value={student._id}>
                            {student.studentName} - {student.rscNumber}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Seat No / Table No</label>
                      <input
                        name="seatNo"
                        value={studyForm.seatNo}
                        onChange={handleStudyFormChange}
                        placeholder="Example: A-12"
                        required
                      />
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>From Date</label>
                        <input
                          type="date"
                          name="startDate"
                          value={studyForm.startDate}
                          onChange={handleStudyFormChange}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label>End Date</label>
                        <input
                          type="date"
                          name="endDate"
                          value={studyForm.endDate}
                          onChange={handleStudyFormChange}
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Status</label>
                      <select
                        name="status"
                        value={studyForm.status}
                        onChange={handleStudyFormChange}
                      >
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Inactive</option>
                        <option value="COMPLETED">Completed</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Remarks</label>
                      <textarea
                        name="remarks"
                        value={studyForm.remarks}
                        onChange={handleStudyFormChange}
                        placeholder="Optional remarks"
                        rows="3"
                      />
                    </div>

                    <button className="primary-btn" type="submit">
                      Save Study Space Student
                    </button>
                  </form>
                </div>
              </section>

              <StudySpaceTable
                students={assignedStudyStudents}
                formatDate={formatDate}
                getStudyStatus={getStudyStatus}
                openRenewModal={openRenewModal}
                refresh={fetchLibraryData}
              />
            </>
          )}

          {activeTab === "books" && (
            <>
              <section className="users-grid">
                <div className="form-card">
                  <div className="form-card-header">
                    <h3>Add Book</h3>
                    <p>Add books available in the library.</p>
                  </div>

                  <form onSubmit={handleAddBook}>
                    <div className="form-group">
                      <label>Book Title</label>
                      <input
                        name="title"
                        value={bookForm.title}
                        onChange={handleBookChange}
                        placeholder="Enter book title"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Author</label>
                      <input
                        name="author"
                        value={bookForm.author}
                        onChange={handleBookChange}
                        placeholder="Enter author name"
                        required
                      />
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>ISBN</label>
                        <input
                          name="isbn"
                          value={bookForm.isbn}
                          onChange={handleBookChange}
                          placeholder="Optional"
                        />
                      </div>

                      <div className="form-group">
                        <label>Total Copies</label>
                        <input
                          type="number"
                          min="1"
                          name="totalCopies"
                          value={bookForm.totalCopies}
                          onChange={handleBookChange}
                          placeholder="0"
                          required
                        />
                      </div>
                    </div>

                    <button className="primary-btn" type="submit">
                      Add Book
                    </button>
                  </form>
                </div>
              </section>

              <BooksTable books={books} handleDeleteBook={handleDeleteBook} />
            </>
          )}

          {activeTab === "issue-return" && (
            <>
              <section className="users-grid">
                <div className="form-card">
                  <div className="form-card-header">
                    <h3>Issue Book</h3>
                    <p>Issue books to students with library access.</p>
                  </div>

                  <form onSubmit={handleIssueBook}>
                    <div className="form-group">
                      <label>Student</label>
                      <select
                        name="studentId"
                        value={issueForm.studentId}
                        onChange={handleIssueChange}
                        required
                      >
                        <option value="">Select student</option>
                        {students.map((student) => (
                          <option key={student._id} value={student._id}>
                            {student.studentName} - {student.rscNumber}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Book</label>
                      <select
                        name="bookId"
                        value={issueForm.bookId}
                        onChange={handleIssueChange}
                        required
                      >
                        <option value="">Select book</option>
                        {books
                          .filter((book) => Number(book.availableCopies) > 0)
                          .map((book) => (
                            <option key={book._id} value={book._id}>
                              {book.title} ({book.availableCopies} available)
                            </option>
                          ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Due Date</label>
                      <input
                        type="date"
                        name="dueDate"
                        value={issueForm.dueDate}
                        onChange={handleIssueChange}
                        required
                      />
                    </div>

                    <button className="primary-btn" type="submit">
                      Issue Book
                    </button>
                  </form>
                </div>
              </section>

              <IssueReturnTable
                issues={issues}
                formatDate={formatDate}
                handleReturnBook={handleReturnBook}
                handleMarkOverdue={handleMarkOverdue}
              />
            </>
          )}
        </>
      )}

      {renewStudent && (
        <div style={modalOverlayStyle}>
          <div style={modalCardStyle}>
            <div className="form-card-header">
              <h3>Renew Study Space Membership</h3>
              <p>
                Update validity dates for{" "}
                <strong>{renewStudent.studentName || "student"}</strong>.
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

function StudySpaceTable({
  students,
  formatDate,
  getStudyStatus,
  openRenewModal,
  refresh,
}) {
  return (
    <section className="table-card">
      <div className="table-header">
        <div>
          <h3>Study Space Students</h3>
          <p>
            Students appear here only after saving the study space details form.
          </p>
        </div>

        <button className="secondary-btn" onClick={refresh}>
          Refresh
        </button>
      </div>

      {students.length === 0 ? (
        <div className="empty-state">
          <h4>No study space students added yet</h4>
          <p>Select a student from the form above and save study details.</p>
        </div>
      ) : (
        <div className="responsive-table">
          <table>
            <thead>
              <tr>
                <th>RSC No</th>
                <th>Student Name</th>
                <th>Mobile</th>
                <th>Seat No</th>
                <th>From Date</th>
                <th>End Date</th>
                <th>Status</th>
                <th>Remarks</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {students.map((student) => (
                <tr key={student._id}>
                  <td>{student.rscNumber}</td>
                  <td>{student.studentName}</td>
                  <td>{student.mobileNumber || "N/A"}</td>
                  <td>{student.libraryProfile?.seatNo || "N/A"}</td>
                  <td>
                    {formatDate(
                      student.libraryProfile?.startDate ||
                        student.libraryProfile?.joiningDate
                    )}
                  </td>
                  <td>{formatDate(student.libraryProfile?.endDate)}</td>
                  <td>
                    <span className="table-role-badge">
                      {getStudyStatus(student)}
                    </span>
                  </td>
                  <td>{student.libraryProfile?.remarks || "N/A"}</td>
                  <td>
                    <button
                      className="table-action-btn"
                      type="button"
                      onClick={() => openRenewModal(student)}
                    >
                      Renew
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

function BooksTable({ books, handleDeleteBook }) {
  return (
    <section className="table-card">
      <div className="table-header">
        <div>
          <h3>Books</h3>
          <p>Book stock available in the library.</p>
        </div>
      </div>

      {books.length === 0 ? (
        <div className="empty-state">
          <h4>No books found</h4>
          <p>Add books using the form above.</p>
        </div>
      ) : (
        <div className="responsive-table">
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Author</th>
                <th>ISBN</th>
                <th>Total Copies</th>
                <th>Available</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {books.map((book) => (
                <tr key={book._id}>
                  <td>{book.title}</td>
                  <td>{book.author}</td>
                  <td>{book.isbn || "N/A"}</td>
                  <td>{book.totalCopies}</td>
                  <td>{book.availableCopies}</td>
                  <td>
                    <button
                      className="danger-btn"
                      onClick={() => handleDeleteBook(book._id)}
                    >
                      Delete
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

function IssueReturnTable({
  issues,
  formatDate,
  handleReturnBook,
  handleMarkOverdue,
}) {
  return (
    <section className="table-card">
      <div className="table-header">
        <div>
          <h3>Issue / Return Records</h3>
          <p>Track issued, returned and overdue books.</p>
        </div>

        <button className="secondary-btn" onClick={handleMarkOverdue}>
          Mark Overdue
        </button>
      </div>

      {issues.length === 0 ? (
        <div className="empty-state">
          <h4>No issue records found</h4>
          <p>Issued books will appear here.</p>
        </div>
      ) : (
        <div className="responsive-table">
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>RSC No</th>
                <th>Book</th>
                <th>Issue Date</th>
                <th>Due Date</th>
                <th>Return Date</th>
                <th>Fine</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {issues.map((issue) => (
                <tr key={issue._id}>
                  <td>{issue.student?.studentName || "N/A"}</td>
                  <td>{issue.student?.rscNumber || "N/A"}</td>
                  <td>{issue.book?.title || "N/A"}</td>
                  <td>{formatDate(issue.issueDate)}</td>
                  <td>{formatDate(issue.dueDate)}</td>
                  <td>{formatDate(issue.returnDate)}</td>
                  <td>₹{issue.fine || 0}</td>
                  <td>
                    <span className="table-role-badge">{issue.status}</span>
                  </td>
                  <td>
                    {issue.status === "ISSUED" || issue.status === "OVERDUE" ? (
                      <button
                        className="primary-btn"
                        onClick={() => handleReturnBook(issue._id)}
                      >
                        Return
                      </button>
                    ) : (
                      "Completed"
                    )}
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

export default Library;