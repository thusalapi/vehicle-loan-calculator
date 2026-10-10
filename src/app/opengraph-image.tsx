import { ImageResponse } from "next/og";

export const alt = "Vehicle Loan Calculator — monthly installments, interest and repayment schedules in LKR";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Link-preview card, rendered at build time. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#ffffff",
          padding: "72px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "#2a78d6",
            }}
          />
          <div style={{ fontSize: 30, color: "#52514e" }}>
            Vehicle Loan Calculator
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              fontSize: 68,
              lineHeight: 1.1,
              color: "#0b0b0b",
              fontWeight: 600,
              maxWidth: 940,
            }}
          >
            Work out what a vehicle really costs to finance
          </div>
          <div style={{ fontSize: 30, color: "#52514e", maxWidth: 900 }}>
            Monthly installments, total interest and a full repayment schedule
            in LKR.
          </div>
        </div>

        <div style={{ display: "flex", gap: 40, fontSize: 24, color: "#52514e" }}>
          <div style={{ display: "flex" }}>Reducing balance &amp; flat interest</div>
          <div style={{ display: "flex" }}>Scenario comparison</div>
          <div style={{ display: "flex" }}>CSV &amp; PDF export</div>
        </div>
      </div>
    ),
    size,
  );
}
