import BarsMark from "./BarsMark";

const trustItems = ["Threshold unlocked", "Instant delivery", "€400 promo eligible"];

export default function Hero() {
  return (
    <section id="top" style={{ position: "relative", overflow: "hidden" }}>
      {/* ambient blue glow */}
      <div
        style={{
          position: "absolute",
          top: "-130px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "720px",
          height: "500px",
          maxWidth: "120vw",
          background:
            "radial-gradient(ellipse at center, rgba(66,133,244,0.16), transparent 65%)",
          filter: "blur(20px)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          maxWidth: "920px",
          margin: "0 auto",
          padding: "clamp(26px,4vw,46px) 24px clamp(6px,1.5vw,12px)",
          textAlign: "center",
          position: "relative",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "11px",
            padding: "7px 15px 7px 11px",
            background: "#0E0E0E",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "999px",
            fontSize: "12.5px",
            color: "#B5B5B5",
          }}
        >
          <BarsMark variant="badge" />
          <span>Running on Google Ads</span>
          <span style={{ display: "inline-flex", gap: "4px", marginLeft: "2px" }}>
            {["#4285F4", "#EA4335", "#FBBC04", "#34A853"].map((c) => (
              <span
                key={c}
                style={{
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  background: c,
                }}
              />
            ))}
          </span>
        </div>

        <h1
          style={{
            margin: "16px 0 0",
            fontSize: "clamp(30px,4.6vw,54px)",
            lineHeight: 1.04,
            letterSpacing: "-0.035em",
            fontWeight: 600,
            color: "#FAFAFA",
          }}
        >
          Google Ads threshold
          <br />
          accounts from{" "}
          <span style={{ borderBottom: "3px solid #4285F4", paddingBottom: "3px" }}>
            $50.
          </span>
        </h1>

        <p
          style={{
            margin: "14px auto 0",
            maxWidth: "540px",
            fontSize: "clamp(14px,1.8vw,16px)",
            lineHeight: 1.6,
            color: "#9A9A9A",
            fontWeight: 400,
          }}
        >
          Ready-to-use Google Ads accounts with the billing threshold already unlocked.
          Run ads now, pay later. Bonus: all accounts are eligible for Google's €400 free credit promo.
          Delivered instantly. Crypto accepted.
        </p>

        <div
          style={{
            marginTop: "22px",
            display: "flex",
            gap: "14px 28px",
            justifyContent: "center",
            flexWrap: "wrap",
            color: "#7E7E7E",
            fontSize: "13px",
          }}
        >
          {trustItems.map((t) => (
            <span
              key={t}
              style={{ display: "flex", alignItems: "center", gap: "8px" }}
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: "#4285F4",
                }}
              />
              {t}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
