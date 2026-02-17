import React from "react";

export default function Preloader({ text = "Loading..." }) {
  return (
    <div
      className="d-flex flex-column align-items-center justify-content-center"
      style={{
        minHeight: "500px",
        padding: "2rem",
        backgroundColor: "var(--background-light, #f5f7fb)",
      }}
    >
      <div
        className="spinner-border"
        role="status"
        style={{
          width: "2.25rem",
          height: "2.25rem",
          borderWidth: "0.2rem",
          borderColor: "var(--primary-color)",
          borderRightColor: "transparent",
        }}
      >
        <span className="visually-hidden">Loading...</span>
      </div>
      {text && (
        <p
          className="mt-2 mb-0 small fw-medium"
          style={{ color: "var(--text-muted)" }}
        >
          {text}
        </p>
      )}
    </div>
  );
}
