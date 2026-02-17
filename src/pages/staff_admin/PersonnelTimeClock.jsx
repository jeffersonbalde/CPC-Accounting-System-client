import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";

const PersonnelTimeClock = () => {
  const { request } = useAuth();
  const [todayLog, setTodayLog] = useState(null);
  const [today, setToday] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchToday = async () => {
    setLoading(true);
    try {
      const data = await request("/personnel/time-logs/today");
      setTodayLog(data.time_log || null);
      setToday(data.today || new Date().toISOString().slice(0, 10));
    } catch (err) {
      console.error(err);
      setTodayLog(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchToday();
  }, []);

  if (loading) {
    return (
      <div className="container-fluid px-4">
        <h1 className="mt-4">Time Logging</h1>
        <p className="text-muted">Loading...</p>
      </div>
    );
  }

  return (
    <div className="container-fluid px-4">
      <h1 className="mt-4">Time Logging</h1>
      <div className="card mb-4">
        <div className="card-header">Today: {today}</div>
        <div className="card-body">
          <p className="small text-muted mb-3">
            Your time in and time out are recorded automatically when you log in
            and log out of the website.
          </p>
          <div className="small">
            {!todayLog && (
              <span className="text-muted">
                No time log for today yet. Your time in will be recorded when
                you log in.
              </span>
            )}
            {todayLog && todayLog.time_in && (
              <>
                <strong>Time in:</strong> {todayLog.time_in}
                {todayLog.time_out ? (
                  <>
                    {" "}
                    &nbsp;|&nbsp; <strong>Time out:</strong> {todayLog.time_out}
                  </>
                ) : (
                  " — Time out will be recorded when you log out."
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonnelTimeClock;
