export default function LiveFeed({
  currentFeed,
  feedIndex,
}: {
  currentFeed: string;
  feedIndex: number;
}) {
  return (
    <div
      style={{
        maxWidth: "1120px",
        margin: "0 auto",
        padding: "clamp(14px,2vw,20px) 24px 0",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "10px",
          maxWidth: "480px",
          margin: "0 auto",
        }}
      >
        <span
          style={{
            position: "relative",
            display: "inline-flex",
            width: "7px",
            height: "7px",
            flexShrink: 0,
          }}
        >
          <span
            className="anim-pulse-dot"
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              background: "#34A853",
            }}
          />
        </span>
        <span
          key={feedIndex}
          className="anim-feed-in"
          style={{
            fontSize: "12.5px",
            color: "#7E7E7E",
            lineHeight: 1.3,
          }}
        >
          {currentFeed}
        </span>
      </div>
    </div>
  );
}
