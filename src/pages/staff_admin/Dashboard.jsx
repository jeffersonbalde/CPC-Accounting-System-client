import React from "react";
import Layout from "../../layout/Layout";
import { useAuth } from "../../contexts/AuthContext";
import Preloader from "../../components/Preloader";

const PersonnelDashboard = () => {
  const { user, loading } = useAuth();

  // Show preloader while user data is loading
  if (loading || !user) {
    return <Preloader />;
  }

  return (
    <Layout>
      <div>
        <h1 style={{ color: "#171D5B", marginBottom: "20px" }}>
          Personnel Dashboard
        </h1>
        <div className="row">
          <div className="col-12">
            <div
              className="p-4 rounded shadow-sm"
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid #e9ecef",
              }}
            >
              <h3 style={{ color: "#171D5B" }}>Welcome, {user?.name || "Personnel"}!</h3>
              <p style={{ color: "#6c757d" }}>
                You are logged in as <strong>{user?.role || "personnel"}</strong>
              </p>
              <p style={{ color: "#6c757d" }}>
                Username: <strong>{user?.username || "N/A"}</strong>
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default PersonnelDashboard;

