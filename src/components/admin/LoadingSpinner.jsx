import React from "react";

const LoadingSpinner = ({ text = "Loading..." }) => {
  return (
    <div
      className="d-flex flex-column align-items-center justify-content-center"
      style={{
        minHeight: "500px",
        padding: "3rem",
      }}
    >
      <div
        className="spinner-border"
        role="status"
        style={{
          width: "3rem",
          height: "3rem",
          borderWidth: "0.25rem",
          borderColor: "var(--primary-color)",
          borderRightColor: "transparent",
        }}
      >
        <span className="visually-hidden">Loading...</span>
      </div>
      {text && (
        <p
          className="mt-3 mb-0 small fw-medium"
          style={{ color: "var(--text-muted)" }}
        >
          {text}
        </p>
      )}
    </div>
  );
};

export default LoadingSpinner;

