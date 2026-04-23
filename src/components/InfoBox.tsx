interface InfoBoxProps {
  children: string;
}

export function InfoBox({ children }: InfoBoxProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        backgroundColor: "#e3f2fd",
        padding: "12px 16px",
        borderRadius: "8px",
        fontSize: "0.9rem",
      }}
    >
      <div
        style={{
          width: "24px",
          height: "24px",
          borderRadius: "50%",
          backgroundColor: "#2196f3",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <span style={{ color: "white", fontSize: "14px", fontWeight: "bold" }}>i</span>
      </div>
      <span style={{ opacity: 0.9 }}>{children}</span>
    </div>
  );
}