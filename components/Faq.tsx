import type { Faq as FaqItem } from "@/lib/data";

export default function Faq({
  faqs,
  openFaq,
  onToggle,
}: {
  faqs: FaqItem[];
  openFaq: number;
  onToggle: (i: number) => void;
}) {
  return (
    <section
      id="faq"
      style={{
        maxWidth: "760px",
        margin: "0 auto",
        padding: "clamp(40px,7vw,80px) 24px",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <span
          style={{
            fontFamily: "var(--font-mono), monospace",
            fontSize: "11px",
            letterSpacing: "0.2em",
            color: "#4285F4",
            textTransform: "uppercase",
          }}
        >
          FAQ
        </span>
        <h2
          style={{
            margin: "14px 0 0",
            fontSize: "clamp(28px,4.5vw,44px)",
            fontWeight: 600,
            letterSpacing: "-0.03em",
            color: "#FAFAFA",
          }}
        >
          Questions, answered
        </h2>
      </div>

      <div
        style={{
          marginTop: "38px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        {faqs.map((item, i) => {
          const open = openFaq === i;
          return (
            <div
              key={item.q}
              style={{
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "14px",
                background: "#0C0C0C",
                overflow: "hidden",
              }}
            >
              <button
                onClick={() => onToggle(i)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "16px",
                  padding: "20px 22px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#F5F5F5",
                  fontFamily: "inherit",
                  textAlign: "left",
                  fontSize: "16px",
                  fontWeight: 500,
                  lineHeight: 1.4,
                }}
              >
                <span>{item.q}</span>
                <span
                  style={{
                    flexShrink: 0,
                    width: "22px",
                    height: "22px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#4285F4",
                    fontSize: "19px",
                    fontWeight: 400,
                  }}
                >
                  {open ? "−" : "+"}
                </span>
              </button>
              {open && (
                <div
                  style={{
                    padding: "0 22px 22px",
                    color: "#9A9A9A",
                    fontSize: "14.5px",
                    lineHeight: 1.65,
                    maxWidth: "640px",
                  }}
                >
                  {item.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
