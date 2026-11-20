
import { useEffect, useState } from "react";
import "./Admin.css";

const API_URL = "http://localhost:5000/api/reservations";

// Display area names
const getAreaName = (area) => {
  if (area === "middle") return "Middle Area";
  if (area === "view") return "View Side";
  return "Not assigned";
};

// Display table shape
const getShapeName = (shape) => {
  if (!shape) return "Not assigned";

  return shape.charAt(0).toUpperCase() + shape.slice(1);
};

function Admin() {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  // ======================================
  // FETCH ALL RESERVATIONS
  // ======================================

  const fetchReservations = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(API_URL);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Failed to load reservations"
        );
      }

      setReservations(data.reservations);

      // Refresh selected reservation if modal is open
      setSelectedReservation((previous) => {
        if (!previous) return null;

        return (
          data.reservations.find(
            (r) => r._id === previous._id
          ) || null
        );
      });

    } catch (err) {
      console.error("Fetch Error:", err);
      setError("Unable to load reservations. Check your backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, []);

  // ======================================
  // UPDATE RESERVATION STATUS
  // ======================================

  const updateStatus = async (id, status) => {
    setUpdatingId(id);

    try {
      const response = await fetch(
        `${API_URL}/${id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Update failed");
      }

      setReservations((previous) =>
        previous.map((reservation) =>
          reservation._id === id
            ? data.reservation
            : reservation
        )
      );

      setSelectedReservation((previous) =>
        previous?._id === id
          ? data.reservation
          : previous
      );

    } catch (err) {
      alert(err.message || "Could not update reservation.");
      fetchReservations();
    } finally {
      setUpdatingId(null);
    }
  };

  // ======================================
  // DELETE RESERVATION
  // ======================================

  const deleteReservation = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to permanently delete this reservation?"
    );

    if (!confirmed) return;

    setUpdatingId(id);

    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Delete failed");
      }

      setReservations((previous) =>
        previous.filter((reservation) => reservation._id !== id)
      );

      setSelectedReservation((previous) =>
        previous?._id === id ? null : previous
      );

    } catch (err) {
      alert(err.message || "Could not delete reservation.");
    } finally {
      setUpdatingId(null);
    }
  };

  // ======================================
  // SEARCH AND FILTER
  // ======================================

  const filteredReservations = reservations.filter((r) => {
    const search = searchTerm.trim().toLowerCase();

    const matchesSearch =
      (r.name || "").toLowerCase().includes(search) ||
      (r.phone || "").toLowerCase().includes(search) ||
      String(r.tableNumber || "").includes(search) ||
      getAreaName(r.area).toLowerCase().includes(search);

    const matchesStatus =
      statusFilter === "all" || r.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // ======================================
  // DASHBOARD STATISTICS
  // ======================================

  const pending = reservations.filter(
    (r) => r.status === "pending"
  ).length;

  const confirmed = reservations.filter(
    (r) => r.status === "confirmed"
  ).length;

  const cancelled = reservations.filter(
    (r) => r.status === "cancelled"
  ).length;

  return (
    <div className="admin-page">

      {/* SIDEBAR */}

      <aside className="admin-sidebar">

        <h2>
          AVELOR<span>.</span>
        </h2>

        <p>ADMIN PANEL</p>

        <nav>
          <a href="#dashboard">Dashboard</a>
          <a href="#reservations">Reservations</a>
          <a href="/">View Website</a>
        </nav>

      </aside>

      {/* MAIN CONTENT */}

      <main className="admin-main">

        {/* HEADER */}

        <header className="admin-header">

          <div>
            <p>MANAGEMENT</p>
            <h1>Dashboard</h1>
          </div>

          <button
            onClick={fetchReservations}
            disabled={loading}
          >
            {loading ? "Loading..." : "Refresh"}
          </button>

        </header>

        {/* STATISTICS */}

        <section className="admin-stats" id="dashboard">

          <div className="stat-card">
            <p>Total Reservations</p>
            <h2>{reservations.length}</h2>
          </div>

          <div className="stat-card">
            <p>Pending</p>
            <h2>{pending}</h2>
          </div>

          <div className="stat-card">
            <p>Confirmed</p>
            <h2>{confirmed}</h2>
          </div>

          <div className="stat-card">
            <p>Cancelled</p>
            <h2>{cancelled}</h2>
          </div>

        </section>

        {/* RESERVATIONS TABLE */}

        <section className="admin-table" id="reservations">

          <div className="reservation-header">

            <h2>Recent Reservations</h2>

            <span>
              {filteredReservations.length} Results
            </span>

          </div>

          {/* SEARCH AND FILTER */}

          <div className="reservation-controls">

            <input
              type="search"
              placeholder="Search name, phone, table or area..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Reservations</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="cancelled">Cancelled</option>
            </select>

          </div>

          {error && (
            <p role="alert" className="admin-error">
              {error}
            </p>
          )}

          {loading ? (

            <p>Loading reservations...</p>

          ) : filteredReservations.length === 0 ? (

            <p>No matching reservations found.</p>

          ) : (

            <div className="table-scroll">

              <table>

                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Phone</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Guests</th>
                    <th>Table</th>
                    <th>Dining Area</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>

                  {filteredReservations.map((r) => (

                    <tr key={r._id}>

                      <td>{r.name}</td>

                      <td>{r.phone}</td>

                      <td>{r.date}</td>

                      <td>{r.time}</td>

                      <td>{r.guests}</td>

                      <td>
                        {r.tableNumber
                          ? `#${r.tableNumber}`
                          : "Not assigned"}
                      </td>

                      <td>
                        {getAreaName(r.area)}
                      </td>

                      <td>
                        <span className={`status ${r.status}`}>
                          {r.status}
                        </span>
                      </td>

                      <td className="reservation-actions">

                        <button
                          className="view-btn"
                          onClick={() => setSelectedReservation(r)}
                        >
                          View Details
                        </button>

                        <select
                          aria-label={`Status for ${r.name}`}
                          value={r.status}
                          disabled={updatingId === r._id}
                          onChange={(e) =>
                            updateStatus(r._id, e.target.value)
                          }
                        >
                          <option value="pending">Pending</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>

                        <button
                          className="delete-btn"
                          disabled={updatingId === r._id}
                          onClick={() => deleteReservation(r._id)}
                        >
                          Delete
                        </button>

                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          )}

        </section>

        {/* RESERVATION DETAILS MODAL */}

        {selectedReservation && (

          <div
            className="modal-overlay"
            onClick={() => setSelectedReservation(null)}
          >

            <div
              className="reservation-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="reservation-details-title"
              onClick={(e) => e.stopPropagation()}
            >

              <button
                type="button"
                className="modal-close"
                aria-label="Close details"
                onClick={() => setSelectedReservation(null)}
              >
                ×
              </button>

              <p className="modal-eyebrow">
                AVELOR MANAGEMENT
              </p>

              <h2 id="reservation-details-title">
                Reservation Details
              </h2>

              <div className="details-list">

                <div>
                  <span>Customer</span>
                  <strong>{selectedReservation.name}</strong>
                </div>

                <div>
                  <span>Phone</span>
                  <strong>{selectedReservation.phone}</strong>
                </div>

                <div>
                  <span>Date</span>
                  <strong>{selectedReservation.date}</strong>
                </div>

                <div>
                  <span>Time</span>
                  <strong>{selectedReservation.time}</strong>
                </div>

                <div>
                  <span>Guests</span>
                  <strong>{selectedReservation.guests}</strong>
                </div>

                <div>
                  <span>Dining Area</span>
                  <strong>
                    {getAreaName(selectedReservation.area)}
                  </strong>
                </div>

                <div>
                  <span>Table Number</span>
                  <strong>
                    {selectedReservation.tableNumber
                      ? `#${selectedReservation.tableNumber}`
                      : "Not assigned"}
                  </strong>
                </div>

                <div>
                  <span>Table Capacity</span>
                  <strong>
                    {selectedReservation.tableCapacity
                      ? `${selectedReservation.tableCapacity} Guests`
                      : "Not available"}
                  </strong>
                </div>

                <div>
                  <span>Table Shape</span>
                  <strong>
                    {getShapeName(selectedReservation.tableShape)}
                  </strong>
                </div>

                <div>
                  <span>Duration</span>
                  <strong>
                    {selectedReservation.durationMinutes || 120} Minutes
                    {" (2 Hours)"}
                  </strong>
                </div>

                <div>
                  <span>Status</span>
                  <strong className={`status ${selectedReservation.status}`}>
                    {selectedReservation.status}
                  </strong>
                </div>

                <div className="details-notes">
                  <span>Special Requests</span>
                  <p>
                    {selectedReservation.notes ||
                      "No special requests."}
                  </p>
                </div>

              </div>

              <button
                className="modal-done"
                onClick={() => setSelectedReservation(null)}
              >
                Close Details
              </button>

            </div>

          </div>

        )}

      </main>

    </div>
  );
}

export default Admin;
