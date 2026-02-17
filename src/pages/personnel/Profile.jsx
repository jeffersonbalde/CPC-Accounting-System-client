// Personnel Profile – matches AuroraWaterworksPayflow StaffProfile; Personnel Access from sidebar_access
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";

// Same structure as Sidebar.jsx personnelMenuItems – used to show access based on user.sidebar_access
const PERSONNEL_ACCESS_SECTIONS = [
  { heading: "Core", items: [{ accessKey: "dashboard", icon: "fas fa-compass", label: "Dashboard" }] },
  {
    heading: "Transactions",
    items: [
      { accessKey: "journal_entries", icon: "fas fa-file-invoice", label: "Journal Entries" },
      { accessKey: "cash_bank", icon: "fas fa-university", label: "Cash & Bank" },
    ],
  },
  {
    heading: "Receivables & Payables",
    items: [
      { accessKey: "clients_ar", icon: "fas fa-user", label: "Clients / AR" },
      { accessKey: "suppliers_ap", icon: "fas fa-truck", label: "Suppliers / AP" },
    ],
  },
  {
    heading: "Income & Expenses",
    items: [
      { accessKey: "income", icon: "fas fa-arrow-up", label: "↑ Income / Revenue" },
      { accessKey: "expenses", icon: "fas fa-arrow-down", label: "↓ Expenses" },
    ],
  },
  {
    heading: "Reports",
    items: [{ accessKey: "reports", icon: "fas fa-chart-line", label: "Financial Reports" }],
  },
];

const Profile = () => {
  const { user, request } = useAuth();
  const [profileDetail, setProfileDetail] = useState(null);
  const [profilePhotoLoading, setProfilePhotoLoading] = useState(true);
  const profileResolvedRef = useRef(false);
  const lastUserIdRef = useRef(null);

  // Same fetching as admin: GET /admin/personnel/{id} returns same shape as admin "View Details" (personnel can only fetch own id)
  // Skeleton only while fetching; once profile (and thus avatar) is resolved, never show skeleton again for this user
  useEffect(() => {
    if (!user?.id || user?.role !== "personnel") {
      setProfilePhotoLoading(false);
      lastUserIdRef.current = null;
      profileResolvedRef.current = false;
      return;
    }
    if (lastUserIdRef.current !== user.id) {
      lastUserIdRef.current = user.id;
      profileResolvedRef.current = false;
    }
    if (profileResolvedRef.current) {
      setProfilePhotoLoading(false);
      return;
    }
    const fetchFullProfile = async () => {
      try {
        const res = await request(`/admin/personnel/${user.id}`);
        if (res?.personnel) {
          setProfileDetail(res.personnel);
          profileResolvedRef.current = true;
          setProfilePhotoLoading(false);
          return;
        }
      } catch (_) {}
      try {
        const res = await request("/profile");
        if (res?.personnel) {
          setProfileDetail(res.personnel);
          profileResolvedRef.current = true;
          setProfilePhotoLoading(false);
          return;
        }
      } catch (_) {}
      try {
        const res = await request("/user");
        if (res?.user) setProfileDetail(res.user);
      } catch (_) {}
      profileResolvedRef.current = true;
      setProfilePhotoLoading(false);
    };
    fetchFullProfile();
  }, [user?.id, user?.role, request]);

  // personnel = full record (same shape as admin PersonnelDetailsModal receives)
  const personnel = profileDetail || user;
  const displayUser = useMemo(() => ({ ...user, ...profileDetail }), [user, profileDetail]);

  const getFullName = useCallback(() => {
    const u = displayUser || user;
    if (!u) return "";
    if (u.first_name && u.last_name) return `${u.first_name} ${u.last_name}`.trim();
    return u.name || "";
  }, [displayUser, user]);

  // Exact same as PersonnelDetailsModal.jsx getPersonnelAvatarUrl – do not change
  const getPersonnelAvatarUrl = useCallback((entity) => {
    if (!entity) return null;
    if (entity.avatar_path) {
      const baseUrl = import.meta.env.VITE_LARAVEL_API;
      let cleanFilename = entity.avatar_path;
      if (entity.avatar_path.includes("avatars/")) {
        cleanFilename = entity.avatar_path.replace("avatars/", "");
      }
      if (entity.avatar_path.includes("personnel-avatars/")) {
        cleanFilename = entity.avatar_path.replace("personnel-avatars/", "");
      }
      cleanFilename = cleanFilename.split("/").pop();
      return `${baseUrl}/personnel-avatar/${cleanFilename}`;
    }
    return null;
  }, []);

  const getInitialsForAvatar = useCallback((firstName, lastName) => {
    const first = firstName ? firstName.charAt(0) : "";
    const last = lastName ? lastName.charAt(0) : "";
    return (first + last).toUpperCase() || "P";
  }, []);

  // Skeleton for profile photo while fetching from DB
  const AvatarSkeleton = () => (
    <div
      className="rounded-circle"
      style={{
        width: "80px",
        height: "80px",
        backgroundColor: "var(--border-color, #e1e6ef)",
        animation: "profile-avatar-skeleton-pulse 1.2s ease-in-out infinite",
      }}
      aria-hidden="true"
    />
  );

  // Same avatar block as PersonnelDetailsModal – wrapper + img or initials (exact structure)
  const PersonnelAvatar = React.memo(function PersonnelAvatarInner() {
    const [imageError, setImageError] = useState(false);
    const avatarUrl = personnel?.avatar_path ? getPersonnelAvatarUrl(personnel) : null;
    React.useEffect(() => {
      setImageError(false);
    }, [personnel?.avatar_path]);
    if (!personnel?.avatar_path || !avatarUrl || imageError) {
      return (
        <div
          className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold"
          style={{
            width: "80px",
            height: "80px",
            backgroundColor: "#0E254B",
            fontSize: "24px",
          }}
        >
          {getInitialsForAvatar(personnel?.first_name, personnel?.last_name)}
        </div>
      );
    }
    return (
      <div
        className="rounded-circle overflow-hidden border"
        style={{
          width: "80px",
          height: "80px",
          borderColor: "#e1e6ef",
          backgroundColor: "#f4f6fb",
        }}
      >
        <img
          src={avatarUrl}
          alt={`${personnel?.first_name || "Personnel"}'s avatar`}
          className="rounded-circle border"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
          onError={() => setImageError(true)}
        />
      </div>
    );
  });

  const formatDate = useCallback((dateString) => {
    if (dateString == null || dateString === "") return "—";
    try {
      const d = new Date(dateString);
      if (Number.isNaN(d.getTime())) return "—";
      return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "—";
    }
  }, []);

  const getRoleDisplay = useCallback((role) => {
    if (role === "admin") return "System Administrator";
    if (role === "personnel" || role === "staff") return "Personnel";
    return role || "User";
  }, []);

  const contactValue = useMemo(() => {
    const u = displayUser || user;
    const v = u?.phone || u?.contact_number || u?.mobile || u?.phone_number;
    return v != null && String(v).trim() !== "" ? String(v).trim() : "—";
  }, [displayUser, user]);

  const infoItems = useMemo(() => {
    const fullName = getFullName();
    const u = displayUser || user;
    const str = (v) => (v != null && v !== "" ? String(v).trim() : "—");
    return [
      { icon: "fa-user", label: "Full Name", value: str(fullName) },
      { icon: "fa-at", label: "Username", value: str(u?.username) },
      { icon: "fa-envelope", label: "Email", value: str(u?.email) },
      { icon: "fa-phone", label: "Contact Number", value: contactValue },
      { icon: "fa-calendar-alt", label: "Account Created", value: formatDate(u?.created_at) },
      { icon: "fa-calendar-alt", label: "Last Updated", value: formatDate(u?.updated_at) },
    ];
  }, [displayUser, user, getFullName, formatDate, contactValue]);

  // Personnel Access: show only modules assigned by admin (sidebar_access).
  const allowedAccessSections = useMemo(() => {
    const resolved = displayUser || user;
    const access = Array.isArray(resolved?.sidebar_access) ? resolved.sidebar_access : [];
    if (access.length === 0) return [];
    return PERSONNEL_ACCESS_SECTIONS.map((section) => ({
      ...section,
      items: section.items.filter((item) => access.includes(item.accessKey)),
    })).filter((section) => section.items.length > 0);
  }, [displayUser?.sidebar_access, user?.sidebar_access]);

  if (!user) {
    return (
      <div className="container-fluid px-4 py-3">
        <div className="d-flex align-items-center justify-content-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  const fullName = getFullName();
  const u = displayUser || user;

  return (
    <div className="container-fluid px-4 py-3 fadeIn personnel-profile-page">
      <style>{`
        @keyframes profile-avatar-skeleton-pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        .personnel-profile-page .profile-header-card {
          background: linear-gradient(180deg, #f8fafc 0%, #fff 100%);
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06);
        }
        .personnel-profile-page .profile-info-field {
          transition: background-color 0.2s ease, border-color 0.2s ease;
        }
        .personnel-profile-page .profile-info-field:hover {
          background-color: #fafbfc !important;
          border-color: #cbd5e1 !important;
        }
      `}</style>

      {/* Header – professional / corporate government style */}
      <div className="profile-header-card px-4 py-4 mb-4">
        <div className="d-flex flex-column align-items-center text-center">
          <div className="position-relative mb-3">
            {profilePhotoLoading ? <AvatarSkeleton /> : <PersonnelAvatar />}
          </div>
          <h1
            className="h4 mb-2 fw-bold"
            style={{ color: "#0f172a", fontSize: "1.375rem", letterSpacing: "-0.01em" }}
          >
            Personnel Profile
          </h1>
          <p className="mb-1" style={{ color: "#334155", fontSize: "1rem", fontWeight: 500 }}>
            {fullName || u?.username || "—"}
          </p>
          <p className="mb-2" style={{ color: "#64748b", fontSize: "0.9375rem" }}>
            {u?.username ? `@${u.username}` : "Personnel"}
          </p>
          <p className="mb-0 small" style={{ color: "#64748b", fontSize: "0.8125rem" }}>
            {getRoleDisplay(u?.role)} | Member since {formatDate(u?.created_at)}
          </p>
        </div>
      </div>

      {/* Row: Personnel Information (left) + Personnel Access (right) */}
      <div className="row g-3">
        {/* Personnel Information – card with labeled fields (icon + label above value per field) */}
        <div className="col-12 col-lg-6">
          <div
            className="h-100 rounded-3 overflow-hidden"
            style={{
              backgroundColor: "#fff",
              border: "1px solid #e2e8f0",
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            }}
          >
            <div
              className="py-3 px-4 border-bottom"
              style={{
                backgroundColor: "#f8fafc",
                borderColor: "#e2e8f0",
                borderLeft: "4px solid #1e3a5f",
              }}
            >
              <h6
                className="mb-0 fw-bold text-start"
                style={{ color: "#1e3a5f", fontSize: "0.9375rem", letterSpacing: "0.02em" }}
              >
                Personnel Information
              </h6>
            </div>
            <div className="p-4">
              <div className="d-flex flex-column gap-3">
                {infoItems.map((item, index) => (
                  <div
                    key={index}
                    className="profile-info-field d-flex align-items-start gap-3 p-3 rounded-3"
                    style={{
                      backgroundColor: "#f8fafc",
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    <div
                      className="d-flex align-items-center justify-content-center rounded-2 flex-shrink-0"
                      style={{
                        width: "36px",
                        height: "36px",
                        backgroundColor: "#e2e8f0",
                        color: "#475569",
                      }}
                    >
                      <i className={`fas ${item.icon}`} style={{ fontSize: "0.875rem" }} aria-hidden />
                    </div>
                    <div className="flex-grow-1 min-w-0">
                      <div className="small mb-1" style={{ color: "#64748b", fontWeight: 500 }}>
                        {item.label}
                      </div>
                      <div className="fw-semibold" style={{ color: "#334155", fontSize: "0.9375rem" }}>
                        {item.value ?? "—"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Personnel Access – corporate / government-style panel (assigned by admin) */}
        <div className="col-12 col-lg-6">
          <div
            className="h-100 rounded-3 overflow-hidden"
            style={{
              backgroundColor: "#fff",
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              border: "1px solid #e2e8f0",
            }}
          >
            <div
              className="py-3 px-4 border-bottom"
              style={{
                backgroundColor: "#f8fafc",
                borderColor: "#e2e8f0",
                borderLeft: "4px solid #1e3a5f",
              }}
            >
              <h6
                className="mb-0 fw-bold text-start"
                style={{ color: "#1e3a5f", fontSize: "0.9375rem", letterSpacing: "0.02em" }}
              >
                Personnel Access
              </h6>
            </div>
            <div className="p-4 pt-3">
              <div
                className="rounded-3 p-4"
                style={{
                  backgroundColor: "#f1f5f9",
                  border: "1px solid #cbd5e1",
                }}
              >
                <p
                  className="mb-3 fw-bold small text-start"
                  style={{ color: "#334155" }}
                >
                  Sidebar access (assigned by admin):
                </p>
                {allowedAccessSections.length === 0 ? (
                  <p className="mb-0 small" style={{ color: "#64748b" }}>
                    No modules assigned.
                  </p>
                ) : (
                  <div className="d-flex flex-column gap-3">
                    {allowedAccessSections.map((section, si) => (
                      <div key={si}>
                        <p
                          className="mb-2 fw-bold small text-start"
                          style={{ color: "#334155", fontSize: "0.8125rem" }}
                        >
                          {section.heading}:
                        </p>
                        <ul className="mb-0 list-unstyled d-flex flex-column gap-2">
                          {section.items.map((item, ii) => (
                            <li
                              key={ii}
                              className="d-flex align-items-center gap-2 text-start"
                              style={{ color: "#334155", fontSize: "0.875rem" }}
                            >
                              <i
                                className={`fas ${item.icon}`}
                                style={{
                                  width: "1rem",
                                  minWidth: "1rem",
                                  color: "#475569",
                                  fontSize: "0.875rem",
                                }}
                                aria-hidden
                              />
                              <span>{item.label}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {u?.remarks && (
                <div className="mt-3">
                  <small className="d-block mb-1" style={{ color: "#64748b" }}>
                    Admin Notes:
                  </small>
                  <div
                    className="p-3 rounded-3 small"
                    style={{
                      backgroundColor: "#f8fafc",
                      color: "#334155",
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    {u.remarks}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
