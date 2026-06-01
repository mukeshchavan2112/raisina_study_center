import branding from "../config/branding";

function PaymentQrCard() {
  return (
    <aside style={styles.card}>
      <div style={styles.header}>Scan to Pay</div>

      <p style={styles.description}>
        Scan this QR code using any UPI app to complete the payment.
      </p>

      <div style={styles.qrBox}>
        <img
          src={branding.paymentQr}
          alt="Payment QR Code"
          style={styles.qrImage}
        />
      </div>
    </aside>
  );
}

const styles = {
  card: {
    width: "360px",
    minWidth: "320px",
    maxWidth: "360px",
    boxSizing: "border-box",
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "22px",
    padding: "22px",
    boxShadow: "0 14px 35px rgba(15, 23, 42, 0.08)",
    alignSelf: "flex-start",
  },

  header: {
    margin: "0 0 8px",
    fontSize: "24px",
    fontWeight: "800",
    color: "#0f172a",
    lineHeight: "1.2",
    textAlign: "center",
  },

  description: {
    margin: "0 auto 20px",
    maxWidth: "280px",
    fontSize: "14px",
    lineHeight: "1.6",
    color: "#64748b",
    textAlign: "center",
  },

  qrBox: {
    width: "100%",
    aspectRatio: "1 / 1",
    padding: "14px",
    borderRadius: "20px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxSizing: "border-box",
  },

  qrImage: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
  },
};

export default PaymentQrCard;
