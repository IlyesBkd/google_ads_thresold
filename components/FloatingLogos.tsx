"use client";

const LOGOS = [
  { top: "8%", left: "5%", size: 32, opacity: 0.06, delay: "0s", duration: "6s" },
  { top: "15%", left: "85%", size: 40, opacity: 0.05, delay: "1s", duration: "7s" },
  { top: "35%", left: "92%", size: 28, opacity: 0.04, delay: "2s", duration: "8s" },
  { top: "55%", left: "3%", size: 36, opacity: 0.05, delay: "0.5s", duration: "7s" },
  { top: "70%", left: "88%", size: 24, opacity: 0.06, delay: "3s", duration: "6s" },
  { top: "85%", left: "8%", size: 30, opacity: 0.04, delay: "1.5s", duration: "8s" },
  { top: "45%", left: "10%", size: 22, opacity: 0.03, delay: "2.5s", duration: "9s" },
  { top: "25%", left: "75%", size: 26, opacity: 0.04, delay: "3.5s", duration: "7s" },
  { top: "60%", left: "78%", size: 34, opacity: 0.05, delay: "0.8s", duration: "6s" },
  { top: "92%", left: "70%", size: 20, opacity: 0.03, delay: "2s", duration: "8s" },
];

export default function FloatingLogos() {
  return (
    <>
      <style>{`
        @keyframes floatY {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }
      `}</style>
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
          overflow: "hidden",
        }}
      >
        {LOGOS.map((logo, i) => (
          <img
            key={i}
            src="/logo.png"
            alt=""
            width={logo.size}
            height={logo.size}
            style={{
              position: "absolute",
              top: logo.top,
              left: logo.left,
              width: `${logo.size}px`,
              height: `${logo.size}px`,
              opacity: logo.opacity,
              animation: `floatY ${logo.duration} ease-in-out ${logo.delay} infinite`,
            }}
          />
        ))}
      </div>
    </>
  );
}
