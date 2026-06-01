import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../../api/api";
import branding from "../../config/branding";

function PublicExamRegistration() {
  const [centers, setCenters] = useState([]);
  const [activeTab, setActiveTab] = useState("registration");

  const [form, setForm] = useState({
    fullName: "",
    mobileNumber: "",
    aadhaarNumber: "",
    dob: "",
    addressLine: "",
    preferredExamCenter: "",
    preferredAdmissionCenter: "",
    year: new Date().getFullYear(),
  });

  const [loading, setLoading] = useState(false);
  const [centersLoading, setCentersLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchCenters();
  }, []);

  const fetchCenters = async () => {
    setCentersLoading(true);
    setError("");

    try {
      const res = await API.get("/public/centers");
      setCenters(extractArray(res.data));
    } catch (err) {
      console.error("Unable to load centers:", err);
      setError("Unable to load centers. Please check if backend is running.");
    } finally {
      setCentersLoading(false);
    }
  };

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));

    setError("");
    setResult(null);
  };

  const resetForm = () => {
    setForm({
      fullName: "",
      mobileNumber: "",
      aadhaarNumber: "",
      dob: "",
      addressLine: "",
      preferredExamCenter: "",
      preferredAdmissionCenter: "",
      year: new Date().getFullYear(),
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const payload = {
        fullName: form.fullName.trim(),
        mobileNumber: form.mobileNumber.trim(),
        aadhaarNumber: form.aadhaarNumber.replace(/\D/g, ""),
        dob: form.dob,
        addressLine: form.addressLine.trim(),

        preferredExamCenter: form.preferredExamCenter,
        preferredAdmissionCenter: form.preferredAdmissionCenter,

        // Temporary backward compatibility for old backend
        preferredCenter: form.preferredExamCenter,

        year: Number(form.year),
      };

      const res = await API.post("/public/exam-register", payload);

      setResult(res.data?.data || res.data);
      resetForm();
    } catch (err) {
      console.error("Registration failed:", err);

      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Registration failed. Please try again.";

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="exam-page">
      <nav className="exam-navbar">
        <div className="exam-brand" style={styles.navBrand}>
          <img
            src={branding.primaryLogo}
            alt="Raisina Study Center"
            style={styles.navBrandLogo}
          />

          <span>Raisina Study Center ERP</span>
        </div>

        <div className="exam-nav-actions">
          <button
            type="button"
            className={`exam-tab-btn ${
              activeTab === "registration" ? "active" : ""
            }`}
            onClick={() => setActiveTab("registration")}
          >
            Exam Registration
          </button>

          <button
            type="button"
            className={`exam-tab-btn ${activeTab === "donation" ? "active" : ""}`}
            onClick={() => setActiveTab("donation")}
          >
            Donation
          </button>

          <Link to="/login" className="exam-login-btn">
            Admin Login
          </Link>
        </div>
      </nav>

      <main className="exam-container">
        {activeTab === "registration" ? (
          <div className="exam-layout">
            <section className="exam-info-card">
              <div className="exam-badge">Scholarship Exam</div>

              <h1>Scholarship Exam Registration</h1>

              <p>
                Register for the offline scholarship exam. After the result, the
                merit list will be used for scholarship-based admission.
              </p>
            </section>

            <section className="exam-form-card">
              <h2>Student Registration</h2>
              <p>Enter student details carefully.</p>

              {error && <div className="alert alert-error">{error}</div>}

              {result && (
                <div className="alert alert-success">
                  <strong>Registration successful!</strong>
                  <br />
                  Registration No:{" "}
                  <strong>{result.registrationNumber || "Generated"}</strong>
                </div>
              )}

              <form className="exam-form" onSubmit={handleSubmit}>
                <div className="exam-form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    name="fullName"
                    placeholder="Enter student full name"
                    value={form.fullName}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="exam-form-row">
                  <div className="exam-form-group">
                    <label>Mobile Number</label>
                    <input
                      type="text"
                      name="mobileNumber"
                      placeholder="Enter mobile number"
                      value={form.mobileNumber}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="exam-form-group">
                    <label>Aadhaar Number</label>
                    <input
                      type="text"
                      name="aadhaarNumber"
                      placeholder="Enter 12 digit Aadhaar number"
                      value={form.aadhaarNumber}
                      onChange={handleChange}
                      inputMode="numeric"
                      maxLength="12"
                      pattern="[0-9]{12}"
                      required
                    />
                  </div>
                </div>

                <div className="exam-form-group">
                  <label>Date of Birth</label>
                  <input
                    type="date"
                    name="dob"
                    value={form.dob}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="exam-form-group">
                  <label>Address</label>
                  <textarea
                    name="addressLine"
                    placeholder="Enter student address"
                    value={form.addressLine}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="exam-form-row">
                  <div className="exam-form-group">
                    <label>Preferred Exam Center</label>
                    <select
                      name="preferredExamCenter"
                      value={form.preferredExamCenter}
                      onChange={handleChange}
                      required
                    >
                      <option value="">
                        {centersLoading
                          ? "Loading centers..."
                          : "Select exam center"}
                      </option>

                      {centers.map((center) => (
                        <option
                          key={getCenterId(center)}
                          value={getCenterId(center)}
                        >
                          {getCenterLabel(center)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="exam-form-group">
                    <label>Preferred Admission Center</label>
                    <select
                      name="preferredAdmissionCenter"
                      value={form.preferredAdmissionCenter}
                      onChange={handleChange}
                      required
                    >
                      <option value="">
                        {centersLoading
                          ? "Loading centers..."
                          : "Select admission center"}
                      </option>

                      {centers.map((center) => (
                        <option
                          key={getCenterId(center)}
                          value={getCenterId(center)}
                        >
                          {getCenterLabel(center)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="exam-form-group">
                  <label>Exam Year</label>
                  <input
                    type="number"
                    name="year"
                    value={form.year}
                    onChange={handleChange}
                    required
                  />
                </div>

                <button
                  className="exam-submit-btn"
                  type="submit"
                  disabled={loading || centersLoading}
                >
                  {loading ? "Submitting..." : "Submit Registration"}
                </button>
              </form>
            </section>
          </div>
        ) : (
          <DonationSection />
        )}
      </main>
      <footer className="public-footer">
        <div className="public-footer-left">
          <img
            src={branding.primaryLogo}
            alt="Raisina Study Center"
            className="public-footer-logo"
          />

          <div>
            <h4>Raisina Study Center</h4>
            <p>
              Scholarship exam registration, admissions and student support.
            </p>
          </div>
        </div>

        <div className="public-footer-right">
          <span>Managed by</span>
          <img
            src={branding.foundationLogo}
            alt="Raisina Foundation"
            className="public-footer-foundation-logo"
          />
        </div>
      </footer>
    </div>
  );
}

function DonationSection() {
  return (
    <div className="exam-layout">
      <section className="exam-info-card">
        <div style={styles.logoWrap}>
          <img
            src={branding.foundationLogo}
            alt="Raisina Foundation"
            style={styles.foundationLogo}
          />
        </div>

        <div className="exam-badge">Public Donation</div>

        <h1>Support Raisina Foundation</h1>

        <p>
          Your contribution helps support scholarship students, educational
          activities, study facilities, and community development initiatives.
        </p>

        <div style={styles.supportedByBox}>
          <span>Managed through</span>

          <img
            src={branding.primaryLogo}
            alt="Raisina Study Center"
            style={styles.studyLogoSmall}
          />
        </div>
      </section>

      <section className="exam-form-card">
        <div style={styles.donationHeader}>
          <img
            src={branding.foundationLogo}
            alt="Raisina Foundation"
            style={styles.donationHeaderLogo}
          />

          <div>
            <h2 style={{ marginBottom: "4px" }}>Scan to Donate</h2>
            <p style={{ margin: 0 }}>
              Use any UPI app to scan the QR code and complete your donation.
            </p>
          </div>
        </div>

        <div style={styles.qrCard}>
          <img
            src={branding.paymentQr}
            alt="Donation Payment QR Code"
            style={styles.qrImage}
          />
        </div>

        <div className="alert alert-success">
          <strong>Donation Payment</strong>
          <br />
          After completing the payment, please share the transaction reference
          with the office for receipt generation.
        </div>

        <p style={styles.noteText}>
          Please verify the receiver name in your UPI app before making payment.
        </p>
      </section>
    </div>
  );
}

const styles = {
  navBrand: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    fontWeight: 800,
  },

  navBrandLogo: {
    width: "52px",
    height: "52px",
    objectFit: "contain",
    borderRadius: "12px",
    background: "#ffffff",
    padding: "5px",
    border: "1px solid rgba(255, 255, 255, 0.7)",
  },

  logoWrap: {
    width: "150px",
    minHeight: "80px",
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-start",
    marginBottom: "18px",
  },

  foundationLogo: {
    width: "140px",
    maxHeight: "80px",
    objectFit: "contain",
  },

  supportedByBox: {
    marginTop: "28px",
    padding: "14px 16px",
    borderRadius: "16px",
    background: "rgba(255, 255, 255, 0.75)",
    border: "1px solid rgba(255, 255, 255, 0.85)",
    display: "inline-flex",
    alignItems: "center",
    gap: "12px",
    fontSize: "0.9rem",
    fontWeight: 600,
  },

  studyLogoSmall: {
    width: "165px",
    maxHeight: "70px",
    objectFit: "contain",
  },

  donationHeader: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    marginBottom: "24px",
  },

  donationHeaderLogo: {
    width: "70px",
    height: "70px",
    objectFit: "contain",
    borderRadius: "14px",
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    padding: "8px",
  },

  qrCard: {
    width: "100%",
    maxWidth: "320px",
    aspectRatio: "1 / 1",
    margin: "24px auto",
    padding: "18px",
    borderRadius: "24px",
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    boxShadow: "0 16px 40px rgba(15, 23, 42, 0.12)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  qrImage: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
  },

  noteText: {
    marginTop: "16px",
    fontSize: "0.95rem",
    opacity: 0.8,
    textAlign: "center",
  },
};

function extractArray(payload) {
  const data = payload?.data || payload;

  if (Array.isArray(data)) return data;
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

function getCenterLabel(center) {
  const name = getCenterName(center);
  const code = getCenterCode(center);
  const city = center?.city;

  return `${name}${code ? ` (${code})` : ""}${city ? ` - ${city}` : ""}`;
}

export default PublicExamRegistration;
