import React from "react";
import AdminDashboard from "../admin/Dashboard";

/**
 * Personnel dashboard: same content as Admin dashboard (KPIs, period, charts, etc.)
 * with a personnel-specific header only (title + "Welcome, [name].").
 */
const PersonnelDashboard = () => <AdminDashboard variant="personnel" />;

export default PersonnelDashboard;
