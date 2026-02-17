import React from "react";

const LoadingSpinner = ({ text = "Loading..." }) => {
  return (
    <div
      className="d-flex flex-column align-items-center justify-content-center"
      style={{
        minHeight: "500px",
        padding: "2rem",
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
};

export default LoadingSpinner;

