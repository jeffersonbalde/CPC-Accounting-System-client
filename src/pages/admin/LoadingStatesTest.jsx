import React, { useState } from "react";

const LoadingStatesTest = () => {
  const [selectedOption, setSelectedOption] = useState(null);

  // Option 1: Bouncing Dots
  const BouncingDots = () => (
    <div className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: "200px" }}>
      <div className="d-flex align-items-center gap-2">
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            style={{
              width: "12px",
              height: "12px",
              backgroundColor: "var(--primary-color)",
              borderRadius: "50%",
              animation: `bounce 1.4s ease-in-out infinite`,
              animationDelay: `${index * 0.2}s`,
            }}
          />
        ))}
      </div>
    </div>
  );

  // Option 2: Wave/Ripple Effect
  const WaveRipple = () => (
    <div className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: "200px" }}>
      <div className="position-relative" style={{ width: "60px", height: "60px" }}>
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className="position-absolute top-50 start-50"
            style={{
              width: "60px",
              height: "60px",
              border: "2px solid var(--primary-color)",
              borderRadius: "50%",
              opacity: 0.8 - index * 0.25,
              transform: "translate(-50%, -50%) scale(0.3 + index * 0.35)",
              animation: `ripple 1.5s ease-out infinite`,
              animationDelay: `${index * 0.5}s`,
            }}
          />
        ))}
      </div>
    </div>
  );

  // Option 3: Gradient Spinner
  const GradientSpinner = () => (
    <div className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: "200px" }}>
      <div
        style={{
          width: "60px",
          height: "60px",
          borderRadius: "50%",
          border: "4px solid",
          borderColor: "rgba(0, 0, 0, 0.1)",
          borderTopColor: "var(--primary-color)",
          borderRightColor: "var(--primary-color)",
          borderBottomColor: "transparent",
          borderLeftColor: "transparent",
          background: `conic-gradient(from 0deg, 
            var(--primary-color) 0deg, 
            var(--primary-color) 90deg, 
            transparent 90deg, 
            transparent 360deg)`,
          WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 4px), black calc(100% - 4px))",
          mask: "radial-gradient(farthest-side, transparent calc(100% - 4px), black calc(100% - 4px))",
          animation: "spin 0.8s linear infinite",
        }}
      />
    </div>
  );

  // Option 4: Dual Rotating Rings
  const DualRings = () => (
    <div className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: "200px" }}>
      <div className="position-relative" style={{ width: "64px", height: "64px" }}>
        <div
          className="position-absolute top-0 start-0 w-100 h-100"
          style={{
            border: "3px solid transparent",
            borderTopColor: "var(--primary-color)",
            borderRightColor: "var(--primary-color)",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <div
          className="position-absolute"
          style={{
            top: "8px",
            left: "8px",
            width: "48px",
            height: "48px",
            border: "3px solid transparent",
            borderBottomColor: "var(--primary-color)",
            borderLeftColor: "var(--primary-color)",
            borderRadius: "50%",
            animation: "spinReverse 1s linear infinite",
          }}
        />
        <div
          className="position-absolute"
          style={{
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "12px",
            height: "12px",
            backgroundColor: "var(--primary-color)",
            borderRadius: "50%",
            animation: "pulse 1.2s ease-in-out infinite",
          }}
        />
      </div>
    </div>
  );

  // Option 5: Bars Loader
  const BarsLoader = () => (
    <div className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: "200px" }}>
      <div className="d-flex align-items-end gap-2" style={{ height: "40px" }}>
        {[0, 1, 2, 3, 4].map((index) => (
          <div
            key={index}
            style={{
              width: "6px",
              height: "40px",
              backgroundColor: "var(--primary-color)",
              borderRadius: "3px",
              animation: `bars 1.2s ease-in-out infinite`,
              animationDelay: `${index * 0.1}s`,
            }}
          />
        ))}
      </div>
    </div>
  );

  // Option 6: Minimalist Spinner
  const MinimalistSpinner = () => (
    <div className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: "200px" }}>
      <div
        style={{
          width: "40px",
          height: "40px",
          border: "3px solid rgba(0, 0, 0, 0.1)",
          borderTopColor: "var(--primary-color)",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }}
      />
    </div>
  );

  // Option 7: Orbiting Dots
  const OrbitingDots = () => (
    <div className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: "200px" }}>
      <div className="position-relative" style={{ width: "60px", height: "60px" }}>
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className="position-absolute"
            style={{
              width: "8px",
              height: "8px",
              backgroundColor: "var(--primary-color)",
              borderRadius: "50%",
              top: "50%",
              left: "50%",
              transform: `translate(-50%, -50%) rotate(${index * 90}deg) translateY(-24px)`,
              animation: `orbit 1.5s linear infinite`,
              animationDelay: `${index * 0.15}s`,
            }}
          />
        ))}
      </div>
    </div>
  );

  // Option 8: Pulsing Circles
  const PulsingCircles = () => (
    <div className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: "200px" }}>
      <div className="position-relative" style={{ width: "60px", height: "60px" }}>
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className="position-absolute top-50 start-50"
            style={{
              width: `${20 + index * 15}px`,
              height: `${20 + index * 15}px`,
              border: "2px solid var(--primary-color)",
              borderRadius: "50%",
              transform: "translate(-50%, -50%)",
              opacity: 0.6 - index * 0.2,
              animation: `pulseCircle 1.5s ease-in-out infinite`,
              animationDelay: `${index * 0.3}s`,
            }}
          />
        ))}
      </div>
    </div>
  );

  const loadingOptions = [
    { id: 1, name: "Bouncing Dots", component: BouncingDots, description: "Three dots bouncing in sequence - Simple and widely recognized" },
    { id: 2, name: "Wave/Ripple", component: WaveRipple, description: "Expanding concentric circles - Smooth and modern" },
    { id: 3, name: "Gradient Spinner", component: GradientSpinner, description: "Rotating spinner with gradient - Eye-catching and professional" },
    { id: 4, name: "Dual Rotating Rings", component: DualRings, description: "Two rings rotating in opposite directions with pulsing dot - Dynamic effect" },
    { id: 5, name: "Bars Loader", component: BarsLoader, description: "Vertical bars animating up and down - Dynamic and energetic" },
    { id: 6, name: "Minimalist Spinner", component: MinimalistSpinner, description: "Thin ring with trailing gap - Clean and minimal" },
    { id: 7, name: "Orbiting Dots", component: OrbitingDots, description: "Dots orbiting around center - Unique and engaging" },
    { id: 8, name: "Pulsing Circles", component: PulsingCircles, description: "Multiple circles pulsing in sequence - Elegant and smooth" },
  ];

  return (
    <div className="container-fluid px-3 py-4 fadeIn">
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes spinReverse {
          0% { transform: rotate(360deg); }
          100% { transform: rotate(0deg); }
        }
        
        @keyframes pulse {
          0%, 100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.8;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.3);
            opacity: 1;
          }
        }
        
        @keyframes bounce {
          0%, 80%, 100% {
            transform: translateY(0) scale(1);
            opacity: 0.7;
          }
          40% {
            transform: translateY(-20px) scale(1.1);
            opacity: 1;
          }
        }
        
        @keyframes ripple {
          0% {
            transform: translate(-50%, -50%) scale(0.3);
            opacity: 0.8;
          }
          100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0;
          }
        }
        
        @keyframes bars {
          0%, 100% {
            transform: scaleY(0.3);
            opacity: 0.7;
          }
          50% {
            transform: scaleY(1);
            opacity: 1;
          }
        }
        
        @keyframes orbit {
          0% {
            transform: translate(-50%, -50%) rotate(0deg) translateY(-24px) rotate(0deg);
          }
          100% {
            transform: translate(-50%, -50%) rotate(360deg) translateY(-24px) rotate(-360deg);
          }
        }
        
        @keyframes pulseCircle {
          0%, 100% {
            transform: translate(-50%, -50%) scale(0.8);
            opacity: 0.6;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.2);
            opacity: 0.3;
          }
        }
      `}</style>

      <div className="mb-4">
        <h1 className="h4 mb-2 fw-bold" style={{ color: "var(--text-primary)" }}>
          <i className="fas fa-spinner me-2"></i>
          Loading States Test
        </h1>
        <p className="text-muted mb-0">
          Test and preview different loading state animations. Click on any option to see it in full screen.
        </p>
      </div>

      <div className="row g-4">
        {loadingOptions.map((option) => {
          const Component = option.component;
          return (
            <div key={option.id} className="col-md-6 col-lg-4">
              <div
                className="card h-100 shadow-sm"
                style={{
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  border: selectedOption === option.id ? "2px solid var(--primary-color)" : "1px solid #dee2e6",
                }}
                onClick={() => setSelectedOption(selectedOption === option.id ? null : option.id)}
                onMouseEnter={(e) => {
                  if (selectedOption !== option.id) {
                    e.currentTarget.style.transform = "translateY(-4px)";
                    e.currentTarget.style.boxShadow = "0 8px 16px rgba(0,0,0,0.1)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedOption !== option.id) {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
                  }
                }}
              >
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <h5 className="card-title mb-0 fw-semibold" style={{ color: "var(--text-primary)" }}>
                      {option.name}
                    </h5>
                    {selectedOption === option.id && (
                      <span className="badge bg-primary">Selected</span>
                    )}
                  </div>
                  <div
                    className="border rounded mb-3"
                    style={{
                      backgroundColor: "#f8f9fa",
                      minHeight: "200px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Component />
                  </div>
                  <p className="card-text small text-muted mb-0">{option.description}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedOption && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            zIndex: 9999,
            backdropFilter: "blur(4px)",
          }}
          onClick={() => setSelectedOption(null)}
        >
          <div
            className="bg-white rounded p-5 shadow-lg"
            style={{ maxWidth: "90%", maxHeight: "90%" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h3 className="mb-0 fw-bold" style={{ color: "var(--text-primary)" }}>
                {loadingOptions.find((opt) => opt.id === selectedOption)?.name}
              </h3>
              <button
                className="btn btn-sm btn-outline-secondary"
                onClick={() => setSelectedOption(null)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div style={{ minHeight: "400px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {React.createElement(loadingOptions.find((opt) => opt.id === selectedOption)?.component)}
            </div>
            <p className="text-muted text-center mt-3 mb-0">
              {loadingOptions.find((opt) => opt.id === selectedOption)?.description}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoadingStatesTest;

