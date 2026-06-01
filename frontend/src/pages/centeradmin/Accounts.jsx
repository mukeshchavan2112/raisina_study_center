import { useEffect, useMemo, useState } from "react";
import API from "../../api/api";
import PaymentQrCard from "../../components/PaymentQrCard";

const feeCategories = [
  { value: "ADMISSION_FEE", label: "Admission Fee" },
  { value: "STUDENT_FEES", label: "Student Fees" },
  { value: "HOSTEL_FEE", label: "Hostel Fee" },
  { value: "MESS_FEE", label: "Mess Fee" },
  { value: "LIBRARY_FEE", label: "Library Fee" },
  { value: "OTHER_FEE", label: "Other Fee" },
];

const depositCategories = [
  { value: "EXTERNAL_DONATION", label: "External Donation" },
  { value: "OFFICER", label: "Officer" },
  { value: "SOBTI", label: "Sobti" },
  { value: "ALUMNI", label: "Alumni" },
  { value: "AMERICA", label: "America" },
  { value: "GRANT", label: "Grant" },
  { value: "OTHER", label: "Other" },
];

const expenseCategories = [
  { value: "NEWSPAPER", label: "Newspaper" },
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "RAISINA", label: "Raisina" },
  { value: "RENT", label: "Rent" },
  { value: "LIGHT_BILL", label: "Light Bill" },
  { value: "OFFICE_BOY", label: "Office Boy Etc" },
  { value: "UTILITIES", label: "Utilities" },
  { value: "SALARIES", label: "Salaries" },
  { value: "MESS_SUPPLIES", label: "Mess Supplies" },
  { value: "OTHER", label: "Other" },
];

const paymentModes = [
  { value: "CASH", label: "Cash" },
  { value: "UPI", label: "UPI" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "OTHER", label: "Other" },
];

function Accounts() {
  const [activeTab, setActiveTab] = useState("overview");

  const [students, setStudents] = useState([]);
  const [studentFees, setStudentFees] = useState([]);
  const [donations, setDonations] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [ledgerSummary, setLedgerSummary] = useState({
    totalCredits: 0,
    totalDebits: 0,
    netBalance: 0,
  });

  const [depositSheet, setDepositSheet] = useState(null);
  const [expenditureSheet, setExpenditureSheet] = useState(null);

  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [feeForm, setFeeForm] = useState({
    studentId: "",
    category: "ADMISSION_FEE",
    amount: "",
    date: "",
    paymentMode: "CASH",
    notes: "",
  });

  const [donationForm, setDonationForm] = useState({
    donorName: "",
    donorAddress: "",
    donorDesignation: "",
    category: "EXTERNAL_DONATION",
    amount: "",
    date: "",
    paymentMode: "CASH",
    notes: "",
  });

  const [expenseForm, setExpenseForm] = useState({
    paidTo: "",
    category: "MAINTENANCE",
    amount: "",
    date: "",
    paymentMode: "CASH",
    notes: "",
    evidence: null,
  });

  const [ledgerMonth, setLedgerMonth] = useState(
    new Date().toISOString().slice(0, 7),
  );

  const [monthlyLedger, setMonthlyLedger] = useState({
    month: new Date().toISOString().slice(0, 7),
    totalDeposits: 0,
    totalExpenses: 0,
    transactions: [],
  });

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "fees", label: "Fee Collection" },
    { key: "deposits", label: "Donations" },
    { key: "expenses", label: "Expenses" },
    { key: "monthlyLedger", label: "Monthly Ledger" },
    { key: "reports", label: "Reports" },
  ];

  const getData = (res) => res?.data?.data ?? res?.data ?? {};

  const toArray = (value, key) => {
    if (Array.isArray(value)) return value;
    if (Array.isArray(value?.[key])) return value[key];
    return [];
  };

  const formatCurrency = (amount) => {
    return `₹ ${Number(amount || 0).toLocaleString("en-IN")}`;
  };

  const formatDate = (date) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-IN");
  };

  const resetAlerts = () => {
    setMessage("");
    setError("");
  };

  const fetchAccountsData = async () => {
    try {
      setLoading(true);
      setError("");

      const [
        studentsRes,
        feesRes,
        donationsRes,
        receiptsRes,
        expensesRes,
        ledgerRes,
        monthlyLedgerRes,
        depositSheetRes,
        expenditureSheetRes,
      ] = await Promise.all([
        API.get("/students?limit=1000"),
        API.get("/accounts/student-fees"),
        API.get("/accounts/donations"),
        API.get("/receipts"),
        API.get("/accounts/expenses"),
        API.get("/accounts/ledger"),
        API.get(`/accounts/monthly-ledger?month=${ledgerMonth}`),
        API.get(`/accounts/reports/deposit-sheet?year=${year}`),
        API.get(`/accounts/reports/expenditure-sheet?year=${year}`),
      ]);

      const studentsData = getData(studentsRes);
      const feesData = getData(feesRes);
      const donationsData = getData(donationsRes);
      const receiptsData = getData(receiptsRes);
      const expensesData = getData(expensesRes);
      const ledgerData = getData(ledgerRes);
      const monthlyLedgerData = getData(monthlyLedgerRes);

      setStudents(toArray(studentsData, "students"));
      setStudentFees(toArray(feesData, "fees"));
      setDonations(toArray(donationsData, "donations"));
      setReceipts(toArray(receiptsData, "receipts"));
      setExpenses(toArray(expensesData, "expenses"));
      setLedger(toArray(ledgerData, "transactions"));
      setLedgerSummary(
        ledgerData?.summary || {
          totalCredits: 0,
          totalDebits: 0,
          netBalance: 0,
        },
      );
      setMonthlyLedger({
        month: monthlyLedgerData?.month || ledgerMonth,
        totalDeposits: monthlyLedgerData?.totalDeposits || 0,
        totalExpenses: monthlyLedgerData?.totalExpenses || 0,
        transactions: toArray(
          monthlyLedgerData?.transactions || [],
          "transactions",
        ),
      });

      setDepositSheet(getData(depositSheetRes));
      setExpenditureSheet(getData(expenditureSheetRes));
    } catch (err) {
      console.error("Accounts fetch error:", err);
      setError(err?.response?.data?.message || "Failed to load accounts data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccountsData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, ledgerMonth]);

  const feeReceiptRows = useMemo(() => {
    return receipts.filter((receipt) => receipt.type === "STUDENT_FEE");
  }, [receipts]);

  const donationReceiptRows = useMemo(() => {
    return receipts.filter((receipt) => receipt.type === "DONATION");
  }, [receipts]);

  const overview = useMemo(() => {
    const latestFees = feeReceiptRows.slice(0, 5);
    const latestDeposits = donationReceiptRows.slice(0, 5);
    const latestExpenses = expenses.slice(0, 5);

    return {
      totalIncome: ledgerSummary.totalCredits || 0,
      totalExpenses: ledgerSummary.totalDebits || 0,
      netBalance: ledgerSummary.netBalance || 0,
      receiptCount: feeReceiptRows.length + donationReceiptRows.length,
      latestFees,
      latestDeposits,
      latestExpenses,
    };
  }, [ledgerSummary, feeReceiptRows, donationReceiptRows, expenses]);

  const monthlyBalance =
    Number(monthlyLedger.totalDeposits || 0) -
    Number(monthlyLedger.totalExpenses || 0);

  const handleFeeChange = (e) => {
    setFeeForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleDonationChange = (e) => {
    setDonationForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleExpenseChange = (e) => {
    const { name, value, files, type } = e.target;

    setExpenseForm((prev) => ({
      ...prev,
      [name]: type === "file" ? files?.[0] || null : value,
    }));
  };

  const handleDownloadReceipt = async (receiptId, receiptNumber) => {
    try {
      resetAlerts();

      if (!receiptId) {
        setError("Receipt ID not found");
        return;
      }

      const response = await API.get(`/receipts/${receiptId}/download`, {
        responseType: "blob",
      });

      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `${receiptNumber || "receipt"}.pdf`;

      document.body.appendChild(link);
      link.click();

      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Receipt download error:", err);
      setError("Failed to download receipt");
    }
  };

  const handleFeeSubmit = async (e) => {
    e.preventDefault();
    resetAlerts();

    try {
      const selectedStudent = students.find(
        (student) => student._id === feeForm.studentId,
      );

      await API.post("/accounts/student-fees", {
        studentId: feeForm.studentId,
        category: feeForm.category,
        amount: Number(feeForm.amount),
        date: feeForm.date || new Date(),
        paymentMode: feeForm.paymentMode,
        notes: feeForm.notes,
      });

      await API.post("/receipts", {
        type: "STUDENT_FEE",
        student: feeForm.studentId,
        studentName:
          selectedStudent?.studentName ||
          selectedStudent?.name ||
          `${selectedStudent?.firstName || ""} ${selectedStudent?.lastName || ""}`.trim(),
        rscNumber: selectedStudent?.rscNumber || "",
        amount: Number(feeForm.amount),
        paymentMode: feeForm.paymentMode,
        purpose: feeForm.category,
        notes: feeForm.notes,
        receiptDate: feeForm.date || new Date(),
      });

      setMessage("Student fee collected and receipt generated");

      setFeeForm({
        studentId: "",
        category: "ADMISSION_FEE",
        amount: "",
        date: "",
        paymentMode: "CASH",
        notes: "",
      });

      fetchAccountsData();
    } catch (err) {
      console.error("Fee submit error:", err);
      setError(err?.response?.data?.message || "Failed to collect student fee");
    }
  };

  const handleDonationSubmit = async (e) => {
    e.preventDefault();
    resetAlerts();

    try {
      await API.post("/accounts/donations", {
        donorName: donationForm.donorName,
        donorDesignation: donationForm.donorDesignation,
        category: donationForm.category,
        amount: Number(donationForm.amount),
        date: donationForm.date || new Date(),
        paymentMode: donationForm.paymentMode,
        notes: donationForm.notes,
      });

      await API.post("/receipts", {
        type: "DONATION",
        donorName: donationForm.donorName,
        donorAddress:
          donationForm.donorAddress || donationForm.donorDesignation,
        amount: Number(donationForm.amount),
        paymentMode: donationForm.paymentMode,
        purpose: donationForm.category,
        notes: donationForm.notes,
        receiptDate: donationForm.date || new Date(),
      });

      setMessage(
        "Donation/deposit recorded and receipt generated successfully",
      );

      setDonationForm({
        donorName: "",
        donorAddress: "",
        donorDesignation: "",
        category: "EXTERNAL_DONATION",
        amount: "",
        date: "",
        paymentMode: "CASH",
        notes: "",
      });

      fetchAccountsData();
    } catch (err) {
      console.error("Donation submit error:", err);
      setError(
        err?.response?.data?.message || "Failed to record donation/deposit",
      );
    }
  };

  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    resetAlerts();

    try {
      const formData = new FormData();

      formData.append("paidTo", expenseForm.paidTo);
      formData.append("category", expenseForm.category);
      formData.append("amount", Number(expenseForm.amount));
      formData.append("date", expenseForm.date || new Date().toISOString());
      formData.append("paymentMode", expenseForm.paymentMode);
      formData.append("notes", expenseForm.notes);

      if (expenseForm.evidence) {
        formData.append("evidence", expenseForm.evidence);
      }

      await API.post("/accounts/expenses", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setMessage("Expense recorded successfully");

      setExpenseForm({
        paidTo: "",
        category: "MAINTENANCE",
        amount: "",
        date: "",
        paymentMode: "CASH",
        notes: "",
        evidence: null,
      });

      e.target.reset();

      fetchAccountsData();
    } catch (err) {
      console.error("Expense submit error:", err);
      setError(err?.response?.data?.message || "Failed to record expense");
    }
  };

  const handleViewEvidence = async (expenseId) => {
    try {
      resetAlerts();

      const response = await API.get(
        `/accounts/transactions/${expenseId}/evidence`,
        {
          responseType: "blob",
        },
      );

      const blobUrl = window.URL.createObjectURL(response.data);
      window.open(blobUrl, "_blank", "noopener,noreferrer");

      setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
      }, 1000 * 60);
    } catch (err) {
      console.error("Evidence view error:", err);
      setError(
        err?.response?.data?.message ||
          "Failed to open evidence. It may not exist.",
      );
    }
  };

  return (
    <div className="module-page">
      <section className="page-header-card">
        <span className="page-tag">ACCOUNTS MODULE</span>
        <h2>Accounts</h2>
        <p>
          Manage fee collection, donations, expenses, monthly ledger and
          reports.
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
        <div className="loading-card">Loading accounts data...</div>
      ) : (
        <>
          {activeTab === "overview" && (
            <section className="dashboard-grid">
              <div className="panel-card">
                <div className="panel-header">
                  <div>
                    <h2>Financial Overview</h2>
                    <p>Current accounts status</p>
                  </div>
                </div>

                <div className="action-list">
                  <SummaryRow
                    title="Total Income"
                    description="Fees + donations + deposits"
                    value={formatCurrency(overview.totalIncome)}
                  />

                  <SummaryRow
                    title="Total Expenses"
                    description="All recorded debit entries"
                    value={formatCurrency(overview.totalExpenses)}
                  />

                  <SummaryRow
                    title="Net Balance"
                    description="Income minus expenses"
                    value={formatCurrency(overview.netBalance)}
                  />

                  <SummaryRow
                    title="Receipts Generated"
                    description="Fee and donation receipts"
                    value={overview.receiptCount}
                  />
                </div>
              </div>

              <div className="panel-card">
                <div className="panel-header">
                  <div>
                    <h2>Quick Actions</h2>
                    <p>Jump to common account tasks</p>
                  </div>
                </div>

                <div className="action-list">
                  <button
                    className="secondary-btn"
                    type="button"
                    onClick={() => setActiveTab("fees")}
                  >
                    Collect Student Fee
                  </button>

                  <button
                    className="secondary-btn"
                    type="button"
                    onClick={() => setActiveTab("deposits")}
                  >
                    Add Donation / Deposit
                  </button>

                  <button
                    className="secondary-btn"
                    type="button"
                    onClick={() => setActiveTab("expenses")}
                  >
                    Add Expense
                  </button>

                  <button
                    className="secondary-btn"
                    type="button"
                    onClick={() => setActiveTab("monthlyLedger")}
                  >
                    View Monthly Ledger
                  </button>
                  <button
                    className="secondary-btn"
                    type="button"
                    onClick={() => setActiveTab("reports")}
                  >
                    View Reports
                  </button>
                </div>
              </div>

              <div className="panel-card wide-card">
                <div className="panel-header">
                  <div>
                    <h2>Recent Fee Receipts</h2>
                    <p>Latest student fee payments</p>
                  </div>
                </div>

                <MiniReceiptList items={overview.latestFees} type="fee" />
              </div>

              <div className="panel-card wide-card">
                <div className="panel-header">
                  <div>
                    <h2>Recent Donation Receipts</h2>
                    <p>Latest donation and deposit entries</p>
                  </div>
                </div>

                <MiniReceiptList
                  items={overview.latestDeposits}
                  type="donation"
                />
              </div>

              <div className="panel-card wide-card">
                <div className="panel-header">
                  <div>
                    <h2>Recent Expenses</h2>
                    <p>Latest expenditure entries</p>
                  </div>
                </div>

                <MiniReceiptList
                  items={overview.latestExpenses}
                  type="expense"
                />
              </div>
            </section>
          )}

          {activeTab === "fees" && (
            <>
              <section
                className="users-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1fr) 360px",
                  gap: "24px",
                  alignItems: "start",
                  width: "100%",
                }}
              >
                <div className="form-card">
                  <div className="form-card-header">
                    <h3>Collect Student Fee</h3>
                    <p>
                      Generate receipt for admission fee or student facility
                      fee.
                    </p>
                  </div>

                  <form onSubmit={handleFeeSubmit}>
                    <div className="form-group">
                      <label>Student</label>
                      <select
                        name="studentId"
                        value={feeForm.studentId}
                        onChange={handleFeeChange}
                        required
                      >
                        <option value="">Select student</option>
                        {students.map((student) => (
                          <option key={student._id} value={student._id}>
                            {student.studentName ||
                              student.name ||
                              `${student.firstName || ""} ${student.lastName || ""}`.trim()}{" "}
                            - {student.rscNumber || "No RSC"}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Fee Type</label>
                        <select
                          name="category"
                          value={feeForm.category}
                          onChange={handleFeeChange}
                        >
                          {feeCategories.map((item) => (
                            <option key={item.value} value={item.value}>
                              {item.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label>Amount</label>
                        <input
                          type="number"
                          min="1"
                          name="amount"
                          value={feeForm.amount}
                          onChange={handleFeeChange}
                          placeholder="₹"
                          required
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Payment Mode</label>
                        <select
                          name="paymentMode"
                          value={feeForm.paymentMode}
                          onChange={handleFeeChange}
                        >
                          {paymentModes.map((item) => (
                            <option key={item.value} value={item.value}>
                              {item.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label>Payment Date</label>
                        <input
                          type="date"
                          name="date"
                          value={feeForm.date}
                          onChange={handleFeeChange}
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Transaction ID / Remarks</label>
                      <input
                        name="notes"
                        value={feeForm.notes}
                        onChange={handleFeeChange}
                        placeholder="Optional notes"
                      />
                    </div>

                    <button className="primary-btn" type="submit">
                      Generate Receipt
                    </button>
                  </form>
                </div>

                <PaymentQrCard title="Fee Payment QR Code" variant="study" />
              </section>

              <ReceiptTable
                title="Fee Receipts"
                description="Admission fee and student fee receipts."
                rows={feeReceiptRows}
                emptyTitle="No fee receipts found"
                type="fees"
                formatCurrency={formatCurrency}
                formatDate={formatDate}
                onDownloadReceipt={handleDownloadReceipt}
              />
            </>
          )}

          {activeTab === "deposits" && (
            <>
              <section
                className="users-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1fr) 360px",
                  gap: "24px",
                  alignItems: "start",
                  width: "100%",
                }}
              >
                <div className="form-card">
                  <div className="form-card-header">
                    <h3>Donation / Deposit</h3>
                    <p>Record donor deposits and other credit entries.</p>
                  </div>

                  <form onSubmit={handleDonationSubmit}>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Donor Name</label>
                        <input
                          name="donorName"
                          value={donationForm.donorName}
                          onChange={handleDonationChange}
                          placeholder="Enter donor name"
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label>Donor Address</label>
                        <input
                          name="donorAddress"
                          value={donationForm.donorAddress}
                          onChange={handleDonationChange}
                          placeholder="Enter donor address"
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Category</label>
                        <select
                          name="category"
                          value={donationForm.category}
                          onChange={handleDonationChange}
                        >
                          {depositCategories.map((item) => (
                            <option key={item.value} value={item.value}>
                              {item.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label>Amount</label>
                        <input
                          type="number"
                          min="1"
                          name="amount"
                          value={donationForm.amount}
                          onChange={handleDonationChange}
                          placeholder="₹"
                          required
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Payment Mode</label>
                        <select
                          name="paymentMode"
                          value={donationForm.paymentMode}
                          onChange={handleDonationChange}
                        >
                          {paymentModes.map((item) => (
                            <option key={item.value} value={item.value}>
                              {item.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label>Date</label>
                        <input
                          type="date"
                          name="date"
                          value={donationForm.date}
                          onChange={handleDonationChange}
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Transaction ID / Remarks</label>
                      <input
                        name="notes"
                        value={donationForm.notes}
                        onChange={handleDonationChange}
                        placeholder="Optional notes"
                      />
                    </div>

                    <button className="primary-btn" type="submit">
                      Save Deposit & Generate Receipt
                    </button>
                  </form>
                </div>

                <PaymentQrCard title="Donation QR Code" variant="foundation" />
              </section>

              <ReceiptTable
                title="Donations / Deposits"
                description="Deposit details by donor category."
                rows={donationReceiptRows}
                emptyTitle="No donation receipts found"
                type="donations"
                formatCurrency={formatCurrency}
                formatDate={formatDate}
                onDownloadReceipt={handleDownloadReceipt}
              />
            </>
          )}

          {activeTab === "expenses" && (
            <>
              <section className="users-grid">
                <div className="form-card">
                  <div className="form-card-header">
                    <h3>Add Expense</h3>
                    <p>Record expenditure for monthly expense sheet.</p>
                  </div>

                  <form onSubmit={handleExpenseSubmit}>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Paid To</label>
                        <input
                          name="paidTo"
                          value={expenseForm.paidTo}
                          onChange={handleExpenseChange}
                          placeholder="Vendor / Person name"
                        />
                      </div>

                      <div className="form-group">
                        <label>Category</label>
                        <select
                          name="category"
                          value={expenseForm.category}
                          onChange={handleExpenseChange}
                        >
                          {expenseCategories.map((item) => (
                            <option key={item.value} value={item.value}>
                              {item.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Amount</label>
                        <input
                          type="number"
                          min="1"
                          name="amount"
                          value={expenseForm.amount}
                          onChange={handleExpenseChange}
                          placeholder="₹"
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label>Payment Mode</label>
                        <select
                          name="paymentMode"
                          value={expenseForm.paymentMode}
                          onChange={handleExpenseChange}
                        >
                          {paymentModes.map((item) => (
                            <option key={item.value} value={item.value}>
                              {item.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Date</label>
                        <input
                          type="date"
                          name="date"
                          value={expenseForm.date}
                          onChange={handleExpenseChange}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label>Remarks</label>
                        <input
                          name="notes"
                          value={expenseForm.notes}
                          onChange={handleExpenseChange}
                          placeholder="Optional notes"
                        />
                      </div>
                      <div className="form-group">
                        <label>Expense Evidence</label>
                        <input
                          type="file"
                          name="evidence"
                          accept="image/*,.pdf"
                          onChange={handleExpenseChange}
                        />
                        <small>
                          Optional: upload bill, receipt, invoice, PDF, or
                          payment screenshot.
                        </small>
                      </div>
                    </div>

                    <button className="primary-btn" type="submit">
                      Save Expense
                    </button>
                  </form>
                </div>
              </section>

              <ExpenseTable
                rows={expenses}
                formatCurrency={formatCurrency}
                formatDate={formatDate}
                onViewEvidence={handleViewEvidence}
              />
            </>
          )}

          {activeTab === "reports" && (
            <>
              <section className="users-grid">
                <div className="form-card">
                  <div className="form-card-header">
                    <h3>Monthly Sheets</h3>
                    <p>Select year to view deposit and expenditure sheets.</p>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Year</label>
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
                        onClick={fetchAccountsData}
                      >
                        Refresh Reports
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              <MonthlySheetTable
                title="Consolidated Monthwise Deposit Sheet"
                description={`Income summary for ${year}.`}
                rows={depositSheet?.rows || []}
                totals={depositSheet?.totals}
                columns={[
                  ["month", "Month"],
                  ["officer", "Officer"],
                  ["sobti", "Sobti"],
                  ["alumni", "Alumni"],
                  ["studentFees", "Student Fees"],
                  ["america", "America"],
                  ["other", "Other"],
                  ["total", "Total"],
                ]}
                formatCurrency={formatCurrency}
              />

              <MonthlySheetTable
                title="Consolidated Monthwise Expenditure Sheet"
                description={`Expense summary for ${year}.`}
                rows={expenditureSheet?.rows || []}
                totals={expenditureSheet?.totals}
                columns={[
                  ["month", "Month"],
                  ["newspaper", "Newspaper"],
                  ["maintenance", "Maintenance"],
                  ["raisina", "Raisina"],
                  ["rent", "Rent"],
                  ["lightBill", "Light Bill"],
                  ["officeBoy", "Office Boy Etc"],
                  ["other", "Other"],
                  ["total", "Total"],
                ]}
                formatCurrency={formatCurrency}
              />
            </>
          )}

          {activeTab === "monthlyLedger" && (
            <>
              <section className="users-grid">
                <div className="form-card">
                  <div className="form-card-header">
                    <h3>Monthly Deposite & Expense Summary</h3>
                    <p>
                      Select a month to see total money received, total money
                      spent, and the remaining balance.
                    </p>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Month</label>
                      <input
                        type="month"
                        value={ledgerMonth}
                        onChange={(e) => setLedgerMonth(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </section>

              <section className="dashboard-grid">
                <div className="panel-card">
                  <SummaryRow
                    title="Total Deposits"
                    description="Student fees, donations, and other income"
                    value={formatCurrency(monthlyLedger.totalDeposits)}
                  />
                </div>

                <div className="panel-card">
                  <SummaryRow
                    title="Total Expenses"
                    description="All expenses recorded in this month"
                    value={formatCurrency(monthlyLedger.totalExpenses)}
                  />
                </div>

                <div className="panel-card">
                  <SummaryRow
                    title="Balance Amount"
                    description="Total deposits minus total expenses"
                    value={formatCurrency(monthlyBalance)}
                  />
                </div>
              </section>

              <LedgerTable
                title="Monthly Transactions"
                description={`Deposits and expenses for ${monthlyLedger.month}`}
                rows={monthlyLedger.transactions || []}
                formatCurrency={formatCurrency}
                formatDate={formatDate}
              />
            </>
          )}
        </>
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

function MiniReceiptList({ items, type }) {
  if (!items || items.length === 0) {
    return <div className="empty-state">No recent records found.</div>;
  }

  return (
    <div className="action-list">
      {items.map((item) => (
        <div className="action-item" key={item._id}>
          <div>
            <h4>
              {type === "expense"
                ? item.category
                : item.receiptNumber || item.category || item.purpose}
            </h4>
            <p>
              {type === "expense"
                ? item.paidTo || item.notes || "Expense recorded"
                : item.studentName ||
                  item.student?.studentName ||
                  item.donorName ||
                  item.notes ||
                  "Receipt generated"}
            </p>
          </div>
          <strong>₹ {Number(item.amount || 0).toLocaleString("en-IN")}</strong>
        </div>
      ))}
    </div>
  );
}

function ReceiptTable({
  title,
  description,
  rows,
  emptyTitle,
  type,
  formatCurrency,
  formatDate,
  onDownloadReceipt,
}) {
  return (
    <section className="table-card">
      <div className="table-header">
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="empty-state">
          <h4>{emptyTitle}</h4>
          <p>Add a record using the form above.</p>
        </div>
      ) : (
        <div className="responsive-table">
          <table>
            <thead>
              <tr>
                <th>Receipt No</th>
                {type === "fees" ? <th>Student</th> : <th>Donor</th>}
                {type === "fees" ? <th>RSC No</th> : <th>Details</th>}
                <th>Category</th>
                <th>Amount</th>
                <th>Mode</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => (
                <tr key={row._id}>
                  <td>
                    <span className="table-role-badge">
                      {row.receiptNumber || "N/A"}
                    </span>
                  </td>

                  {type === "fees" ? (
                    <>
                      <td>
                        {row.studentName ||
                          row.student?.studentName ||
                          row.student?.name ||
                          "N/A"}
                      </td>
                      <td>
                        {row.rscNumber || row.student?.rscNumber || "N/A"}
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{row.donorName || "N/A"}</td>
                      <td>
                        {row.donorAddress ||
                          row.donorDesignation ||
                          row.notes ||
                          "N/A"}
                      </td>
                    </>
                  )}

                  <td>{row.category || row.purpose || "N/A"}</td>
                  <td>{formatCurrency(row.amount)}</td>
                  <td>{row.paymentMode || "N/A"}</td>
                  <td>
                    {formatDate(row.date || row.receiptDate || row.createdAt)}
                  </td>

                  <td>
                    <button
                      type="button"
                      className="table-action-btn"
                      onClick={() =>
                        onDownloadReceipt?.(row._id, row.receiptNumber)
                      }
                    >
                      Download Receipt
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

function ExpenseTable({ rows, formatCurrency, formatDate, onViewEvidence }) {
  return (
    <section className="table-card">
      <div className="table-header">
        <div>
          <h3>Expenses</h3>
          <p>Monthly expenditure entries.</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="empty-state">
          <h4>No expenses found</h4>
          <p>Add an expense using the form above.</p>
        </div>
      ) : (
        <div className="responsive-table">
          <table>
            <thead>
              <tr>
                <th>Paid To</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Mode</th>
                <th>Date</th>
                <th>Remarks</th>
                <th>Evidence</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((expense) => (
                <tr key={expense._id}>
                  <td>{expense.paidTo || "N/A"}</td>
                  <td>{expense.category}</td>
                  <td>{formatCurrency(expense.amount)}</td>
                  <td>{expense.paymentMode}</td>
                  <td>{formatDate(expense.date)}</td>
                  <td>{expense.notes || "N/A"}</td>
                  <td>
                    {expense.evidenceUrl ? (
                      <button
                        type="button"
                        className="table-action-btn"
                        onClick={() => onViewEvidence?.(expense._id)}
                      >
                        View Evidence
                      </button>
                    ) : (
                      "N/A"
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

function MonthlySheetTable({
  title,
  description,
  rows,
  totals,
  columns,
  formatCurrency,
}) {
  return (
    <section className="table-card">
      <div className="table-header">
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="empty-state">
          <h4>No sheet data</h4>
          <p>Data will appear after transactions are added.</p>
        </div>
      ) : (
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

              {totals && (
                <tr>
                  {columns.map(([key, label]) => (
                    <td key={label}>
                      {key === "month" ? (
                        <strong>Total</strong>
                      ) : (
                        <strong>{formatCurrency(totals[key])}</strong>
                      )}
                    </td>
                  ))}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function LedgerTable({
  title = "General Ledger",
  description = "All credit and debit transactions.",
  rows,
  formatCurrency,
  formatDate,
}) {
  return (
    <section className="table-card">
      <div className="table-header">
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="empty-state">
          <h4>No ledger entries found</h4>
          <p>Transactions will appear here after entries are recorded.</p>
        </div>
      ) : (
        <div className="responsive-table">
          <table>
            <thead>
              <tr>
                <th>Receipt No</th>
                <th>Type</th>
                <th>Source</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Details</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((txn) => (
                <tr key={txn._id}>
                  <td>{txn.receiptNumber}</td>
                  <td>
                    <span className="table-role-badge">{txn.type}</span>
                  </td>
                  <td>{txn.source}</td>
                  <td>{txn.category}</td>
                  <td>{formatCurrency(txn.amount)}</td>
                  <td>{formatDate(txn.date)}</td>
                  <td>
                    {txn.student?.studentName ||
                      txn.studentName ||
                      txn.donorName ||
                      txn.paidTo ||
                      txn.notes ||
                      "N/A"}
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

export default Accounts;