import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import API from "../../api/api";
import PageHeader from "../../components/PageHeader";

function Dashboard() {
  const [dashboard, setDashboard] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    fetchDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await API.get(`/dashboard?year=${year}`);
      const data = res.data?.data || res.data || {};
      setDashboard(data);
    } catch (err) {
      console.error("Dashboard error:", err);
      setDashboard({});
      setError("Unable to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  const pipeline = [
    {
      label: "Registered",
      value: dashboard.examRegistrations || 0,
    },
    {
      label: "Merit Listed",
      value: dashboard.meritListed || 0,
    },
    {
      label: "Admitted",
      value: dashboard.admissionsCompleted || 0,
    },
  ];

  const pendingActions = Array.isArray(dashboard.pendingActions)
    ? dashboard.pendingActions
    : [];

  const recentActivity = Array.isArray(dashboard.recentActivity)
    ? dashboard.recentActivity
    : [];

  const admissionFacilityReport =
    dashboard.reports?.admissionFacilityReport || [];

  const monthlyDepositSheet = dashboard.reports?.monthlyDepositSheet || null;
  const monthlyExpenditureSheet =
    dashboard.reports?.monthlyExpenditureSheet || null;

  const facilityRows = useMemo(() => {
    const facilities = dashboard.facilities || {};

    return [
      {
        name: "Hostel",
        requested: facilities.hostelRequested || 0,
        allocated: facilities.hostelAllocated || 0,
      },
      {
        name: "Mess",
        requested: facilities.messRequested || 0,
        allocated: facilities.messAllocated || 0,
      },
      {
        name: "Study Space",
        requested: facilities.libraryRequested || 0,
        allocated: facilities.libraryAssigned || 0,
      },
    ].map((item) => ({
      ...item,
      pending: Math.max(Number(item.requested) - Number(item.allocated), 0),
    }));
  }, [dashboard]);

  const reportPreviewRows = admissionFacilityReport.slice(0, 8);

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "facilities", label: "Facility Analytics" },
    { key: "accounts", label: "Accounts Analytics" },
    { key: "reports", label: "Reports / Downloads" },
  ];

  const downloadExcel = (rows, sheetName, fileName) => {
    if (!rows || rows.length === 0) {
      alert("No data available to download.");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, fileName);
  };

  const downloadAdmissionFacilityReport = () => {
    const rows = admissionFacilityReport.map((item) => ({
      "RSC No": item.rscNumber,
      "Student Name": item.studentName,
      "Mobile No": item.mobileNumber,
      "Admission Date": formatDate(item.admissionDate),
      "Receipt No": item.receiptNumber || "N/A",
      "Receipt Amount": item.receiptAmount || 0,
      "Student Type": item.studentType,
      Center: item.centerName || "N/A",
      "Hostel Requested": item.hostelRequested ? "Yes" : "No",
      "Mess Requested": item.messRequested ? "Yes" : "No",
      "Library Requested": item.libraryRequested ? "Yes" : "No",
      "Hostel Allocated": item.hostelAllocated ? "Yes" : "No",
      "Hostel Name": item.hostelName || "N/A",
      "Mess Allocated": item.messAllocated ? "Yes" : "No",
      "Mess Name": item.messName || "N/A",
      "Study Space Assigned": item.studySpaceAssigned ? "Yes" : "No",
      "Library Status": item.libraryStatus || "INACTIVE",
    }));

    downloadExcel(
      rows,
      "Admission Facility Report",
      `admission_facility_report_${year}.xlsx`,
    );
  };

  const downloadDepositSheet = () => {
    const rows =
      monthlyDepositSheet?.rows?.map((row) => ({
        Month: row.month,
        Officer: row.officer,
        Sobti: row.sobti,
        Alumni: row.alumni,
        "Student Fees": row.studentFees,
        America: row.america,
        Other: row.other,
        Total: row.total,
      })) || [];

    if (monthlyDepositSheet?.totals) {
      rows.push({
        Month: "Total",
        Officer: monthlyDepositSheet.totals.officer,
        Sobti: monthlyDepositSheet.totals.sobti,
        Alumni: monthlyDepositSheet.totals.alumni,
        "Student Fees": monthlyDepositSheet.totals.studentFees,
        America: monthlyDepositSheet.totals.america,
        Other: monthlyDepositSheet.totals.other,
        Total: monthlyDepositSheet.totals.total,
      });
    }

    downloadExcel(rows, "Deposit Sheet", `deposit_sheet_${year}.xlsx`);
  };

  const downloadExpenditureSheet = () => {
    const rows =
      monthlyExpenditureSheet?.rows?.map((row) => ({
        Month: row.month,
        Newspaper: row.newspaper,
        Maintenance: row.maintenance,
        Raisina: row.raisina,
        Rent: row.rent,
        "Light Bill": row.lightBill,
        "Office Boy Etc": row.officeBoy,
        Other: row.other,
        Total: row.total,
      })) || [];

    if (monthlyExpenditureSheet?.totals) {
      rows.push({
        Month: "Total",
        Newspaper: monthlyExpenditureSheet.totals.newspaper,
        Maintenance: monthlyExpenditureSheet.totals.maintenance,
        Raisina: monthlyExpenditureSheet.totals.raisina,
        Rent: monthlyExpenditureSheet.totals.rent,
        "Light Bill": monthlyExpenditureSheet.totals.lightBill,
        "Office Boy Etc": monthlyExpenditureSheet.totals.officeBoy,
        Other: monthlyExpenditureSheet.totals.other,
        Total: monthlyExpenditureSheet.totals.total,
      });
    }

    downloadExcel(rows, "Expenditure Sheet", `expenditure_sheet_${year}.xlsx`);
  };

  const downloadAccountsSummary = () => {
    const rows = [
      {
        Year: year,
        "Total Income": dashboard.accountsSummary?.totalIncome || 0,
        "Total Expenses": dashboard.accountsSummary?.totalExpenses || 0,
        "Net Balance": dashboard.accountsSummary?.netBalance || 0,
        "Hostel Requested": dashboard.facilities?.hostelRequested || 0,
        "Hostel Allocated": dashboard.facilities?.hostelAllocated || 0,
        "Mess Requested": dashboard.facilities?.messRequested || 0,
        "Mess Allocated": dashboard.facilities?.messAllocated || 0,
        "Library Requested": dashboard.facilities?.libraryRequested || 0,
        "Study Space Assigned": dashboard.facilities?.libraryAssigned || 0,
      },
    ];

    downloadExcel(rows, "Accounts Summary", `accounts_summary_${year}.xlsx`);
  };

  return (
    <div className="page">
      <PageHeader
        title="Center Dashboard"
        subtitle="Manage admissions, facilities, accounts and reports for your center."
      />

      {error && <div className="alert warning">{error}</div>}

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
        <div className="loading-card">Loading dashboard...</div>
      ) : (
        <>
          {activeTab === "overview" && (
            <>
              <section className="dashboard-grid">
                <div className="panel-card">
                  <div className="panel-header">
                    <div>
                      <h2>Students Overview</h2>
                      <p>Current admission strength</p>
                    </div>
                  </div>

                  <div className="action-list">
                    <div className="action-item">
                      <div>
                        <h4>Total Students</h4>
                        <p>All active student records</p>
                      </div>
                      <strong>{dashboard.totalStudents || 0}</strong>
                    </div>

                    <div className="action-item">
                      <div>
                        <h4>Scholarship Students</h4>
                        <p>Admitted through merit list</p>
                      </div>
                      <strong>{dashboard.students?.scholarship || 0}</strong>
                    </div>

                    <div className="action-item">
                      <div>
                        <h4>Non-Scholarship Students</h4>
                        <p>Regular paid students</p>
                      </div>
                      <strong>{dashboard.students?.nonScholarship || 0}</strong>
                    </div>
                  </div>
                </div>

                <div className="panel-card">
                  <div className="panel-header">
                    <div>
                      <h2>Accounts Snapshot</h2>
                      <p>Financial status till now</p>
                    </div>
                  </div>

                  <div className="action-list">
                    <div className="action-item">
                      <div>
                        <h4>Total Income</h4>
                        <p>Fee + deposits + donations</p>
                      </div>
                      <strong>
                        {formatCurrency(dashboard.accountsSummary?.totalIncome)}
                      </strong>
                    </div>

                    <div className="action-item">
                      <div>
                        <h4>Total Expenses</h4>
                        <p>All expenditure records</p>
                      </div>
                      <strong>
                        {formatCurrency(
                          dashboard.accountsSummary?.totalExpenses,
                        )}
                      </strong>
                    </div>

                    <div className="action-item">
                      <div>
                        <h4>Net Balance</h4>
                        <p>Income minus expenses</p>
                      </div>
                      <strong>
                        {formatCurrency(dashboard.accountsSummary?.netBalance)}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="panel-card wide-card">
                  <div className="panel-header">
                    <div>
                      <h2>Admission Pipeline</h2>
                      <p>Scholarship exam to confirmed admission flow</p>
                    </div>
                  </div>

                  <div className="pipeline">
                    {pipeline.map((step) => (
                      <div className="pipeline-step" key={step.label}>
                        <div className="pipeline-number">{step.value}</div>
                        <span>{step.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="panel-card">
                  <div className="panel-header">
                    <div>
                      <h2>Pending Actions</h2>
                      <p>Tasks that need attention</p>
                    </div>
                  </div>

                  <div className="action-list">
                    {pendingActions.length === 0 ? (
                      <div className="empty-state">No pending actions yet.</div>
                    ) : (
                      pendingActions.map((action, index) => (
                        <div className="action-item" key={index}>
                          <div>
                            <h4>{action.title}</h4>
                            <p>
                              {action.description || "Requires admin review"}
                            </p>
                          </div>

                          <strong>{formatActionCount(action)}</strong>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="panel-card">
                  <div className="panel-header">
                    <div>
                      <h2>Recent Activity</h2>
                      <p>Latest ERP updates</p>
                    </div>
                  </div>

                  <div className="activity-list">
                    {recentActivity.length === 0 ? (
                      <div className="empty-state">
                        No recent activity yet. New payments will appear here.
                      </div>
                    ) : (
                      recentActivity.map((activity, index) => (
                        <div className="activity-item" key={index}>
                          <span className="activity-dot"></span>
                          <p>
                            {typeof activity === "string"
                              ? activity
                              : activity.message || activity.title}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </section>
            </>
          )}

          {activeTab === "facilities" && (
            <section className="dashboard-grid">
              <div className="panel-card wide-card">
                <div className="panel-header">
                  <div>
                    <h2>Facility Analytics</h2>
                    <p>Requested vs allocated facility status</p>
                  </div>
                </div>

                <div className="responsive-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Facility</th>
                        <th>Requested</th>
                        <th>Allocated / Assigned</th>
                        <th>Pending</th>
                      </tr>
                    </thead>

                    <tbody>
                      {facilityRows.map((row) => (
                        <tr key={row.name}>
                          <td>{row.name}</td>
                          <td>{row.requested}</td>
                          <td>{row.allocated}</td>
                          <td>
                            <span className="table-role-badge">
                              {row.pending}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="panel-card wide-card">
                <div className="panel-header">
                  <div>
                    <h2>Facility Report Preview</h2>
                    <p>
                      Latest students with requested and allocated facilities
                    </p>
                  </div>
                </div>

                {reportPreviewRows.length === 0 ? (
                  <div className="empty-state">No student records found.</div>
                ) : (
                  <div className="responsive-table">
                    <table>
                      <thead>
                        <tr>
                          <th>RSC No</th>
                          <th>Student</th>
                          <th>Hostel</th>
                          <th>Mess</th>
                          <th>Study Space</th>
                          <th>Receipt</th>
                        </tr>
                      </thead>

                      <tbody>
                        {reportPreviewRows.map((item) => (
                          <tr key={item.rscNumber}>
                            <td>{item.rscNumber}</td>
                            <td>{item.studentName}</td>
                            <td>
                              {item.hostelAllocated
                                ? "Allocated"
                                : item.hostelRequested
                                  ? "Pending"
                                  : "No"}
                            </td>
                            <td>
                              {item.messAllocated
                                ? "Allocated"
                                : item.messRequested
                                  ? "Pending"
                                  : "No"}
                            </td>
                            <td>
                              {item.studySpaceAssigned
                                ? "Assigned"
                                : item.libraryRequested
                                  ? "Pending"
                                  : "No"}
                            </td>
                            <td>{item.receiptNumber || "N/A"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          )}

          {activeTab === "accounts" && (
            <section className="dashboard-grid">
              <div className="panel-card wide-card">
                <div className="panel-header">
                  <div>
                    <h2>Accounts Analytics</h2>
                    <p>Income, expenses and balance summary</p>
                  </div>
                </div>

                <div className="action-list">
                  <div className="action-item">
                    <div>
                      <h4>Total Income</h4>
                      <p>All credit transactions</p>
                    </div>
                    <strong>
                      {formatCurrency(dashboard.accountsSummary?.totalIncome)}
                    </strong>
                  </div>

                  <div className="action-item">
                    <div>
                      <h4>Total Expenses</h4>
                      <p>All debit transactions</p>
                    </div>
                    <strong>
                      {formatCurrency(dashboard.accountsSummary?.totalExpenses)}
                    </strong>
                  </div>

                  <div className="action-item">
                    <div>
                      <h4>Net Balance</h4>
                      <p>Remaining balance</p>
                    </div>
                    <strong>
                      {formatCurrency(dashboard.accountsSummary?.netBalance)}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="panel-card wide-card">
                <div className="panel-header">
                  <div>
                    <h2>Deposit Sheet Preview</h2>
                    <p>Monthwise income summary for {year}</p>
                  </div>
                </div>

                <ReportTable
                  rows={monthlyDepositSheet?.rows || []}
                  columns={[
                    ["month", "Month"],
                    ["studentFees", "Student Fees"],
                    ["officer", "Officer"],
                    ["alumni", "Alumni"],
                    ["america", "America"],
                    ["total", "Total"],
                  ]}
                />
              </div>

              <div className="panel-card wide-card">
                <div className="panel-header">
                  <div>
                    <h2>Expenditure Sheet Preview</h2>
                    <p>Monthwise expense summary for {year}</p>
                  </div>
                </div>

                <ReportTable
                  rows={monthlyExpenditureSheet?.rows || []}
                  columns={[
                    ["month", "Month"],
                    ["newspaper", "Newspaper"],
                    ["maintenance", "Maintenance"],
                    ["rent", "Rent"],
                    ["lightBill", "Light Bill"],
                    ["officeBoy", "Office Boy"],
                    ["total", "Total"],
                  ]}
                />
              </div>
            </section>
          )}

          {activeTab === "reports" && (
            <section className="dashboard-grid">
              <div className="panel-card wide-card">
                <div className="panel-header">
                  <div>
                    <h2>Report Settings</h2>
                    <p>Select the year before downloading reports.</p>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Report Year</label>
                    <input
                      type="number"
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                      placeholder="2026"
                    />
                  </div>

                  <div className="form-group">
                    <label>&nbsp;</label>
                    <button
                      className="secondary-btn"
                      type="button"
                      onClick={fetchDashboard}
                    >
                      Refresh Reports
                    </button>
                  </div>
                </div>
              </div>

              <div className="panel-card wide-card">
                <div className="panel-header">
                  <div>
                    <h2>Reports / Downloads</h2>
                    <p>Export important ERP reports in Excel format</p>
                  </div>
                </div>

                <div className="action-list">
                  <DownloadRow
                    title="Admission / Hostel / Mess Report"
                    description="Student-wise facility request, allocation and receipt data"
                    onClick={downloadAdmissionFacilityReport}
                  />

                  <DownloadRow
                    title="Accounts Summary"
                    description="Income, expenses, balance and facility summary"
                    onClick={downloadAccountsSummary}
                  />

                  <DownloadRow
                    title="Monthwise Deposit Sheet"
                    description="Officer, Sobti, Alumni, Student Fees, America and total"
                    onClick={downloadDepositSheet}
                  />

                  <DownloadRow
                    title="Monthwise Expenditure Sheet"
                    description="Newspaper, maintenance, rent, light bill and total"
                    onClick={downloadExpenditureSheet}
                  />
                </div>
              </div>

              <div className="panel-card wide-card">
                <div className="panel-header">
                  <div>
                    <h2>Admission Facility Report Preview</h2>
                    <p>Preview of latest records before Excel download</p>
                  </div>
                </div>

                {reportPreviewRows.length === 0 ? (
                  <div className="empty-state">No report data available.</div>
                ) : (
                  <div className="responsive-table">
                    <table>
                      <thead>
                        <tr>
                          <th>RSC No</th>
                          <th>Student</th>
                          <th>Mobile</th>
                          <th>Student Type</th>
                          <th>Hostel</th>
                          <th>Mess</th>
                          <th>Study Space</th>
                        </tr>
                      </thead>

                      <tbody>
                        {reportPreviewRows.map((item) => (
                          <tr key={item.rscNumber}>
                            <td>{item.rscNumber}</td>
                            <td>{item.studentName}</td>
                            <td>{item.mobileNumber || "N/A"}</td>
                            <td>{item.studentType}</td>
                            <td>
                              {item.hostelAllocated
                                ? "Allocated"
                                : item.hostelRequested
                                  ? "Pending"
                                  : "No"}
                            </td>
                            <td>
                              {item.messAllocated
                                ? "Allocated"
                                : item.messRequested
                                  ? "Pending"
                                  : "No"}
                            </td>
                            <td>
                              {item.studySpaceAssigned
                                ? "Assigned"
                                : item.libraryRequested
                                  ? "Pending"
                                  : "No"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function ReportTable({ rows, columns }) {
  if (!rows || rows.length === 0) {
    return <div className="empty-state">No report data available.</div>;
  }

  return (
    <div className="responsive-table">
      <table>
        <thead>
          <tr>
            {columns.map(([, label]) => (
              <th key={label}>{label}</th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((row) => (
            <tr key={row.month}>
              {columns.map(([key, label]) => (
                <td key={label}>
                  {key === "month" ? row[key] : formatCurrency(row[key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DownloadRow({ title, description, onClick }) {
  return (
    <div className="action-item">
      <div>
        <h4>{title}</h4>
        <p>{description}</p>
      </div>

      <button className="secondary-btn" type="button" onClick={onClick}>
        Download Excel
      </button>
    </div>
  );
}

function formatCurrency(value) {
  const amount = Number(value || 0);

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date) {
  if (!date) return "N/A";

  return new Date(date).toLocaleDateString("en-IN");
}

function formatActionCount(action) {
  const value = action.count || 0;

  if (
    action.type === "currency" ||
    action.format === "currency" ||
    action.title?.toLowerCase().includes("fee") ||
    action.title?.toLowerCase().includes("dues")
  ) {
    return formatCurrency(value);
  }

  return value;
}

export default Dashboard;