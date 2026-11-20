
import { useEffect, useState } from 'react';
import './App.css';

// ==========================================
// MENU DATA
// ==========================================

const menuItems = [
  {
    id: 1,
    name: "Golden Burrata",
    category: "Starters",
    description: "Fresh burrata, heirloom tomatoes, basil oil.",
    price: 450,
    image: "https://images.unsplash.com/photo-1608039829572-78524f79c4c7?w=800"
  },
  {
    id: 2,
    name: "Truffle Mushroom Soup",
    category: "Starters",
    description: "Wild mushrooms, cream, aromatic truffle oil.",
    price: 380,
    image: "https://images.unsplash.com/photo-1547592180-85f173990554?w=800"
  },
  {
    id: 3,
    name: "Signature Ribeye",
    category: "Main Courses",
    description: "Premium grilled ribeye, seasonal vegetables.",
    price: 1250,
    image: "https://images.unsplash.com/photo-1544025162-d76694265947?w=800"
  },
  {
    id: 4,
    name: "Creamy Truffle Pasta",
    category: "Main Courses",
    description: "Fresh handmade pasta, parmesan, black truffle.",
    price: 850,
    image: "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=800"
  },
  {
    id: 5,
    name: "Chocolate Fondant",
    category: "Desserts",
    description: "Warm chocolate cake, vanilla cream.",
    price: 420,
    image: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800"
  },
  {
    id: 6,
    name: "Classic Tiramisu",
    category: "Desserts",
    description: "Mascarpone cream, espresso, cocoa.",
    price: 390,
    image: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=800"
  }
];

// ==========================================
// MAIN APP
// ==========================================

function App() {

  // MENU FILTER
  const [activeCategory, setActiveCategory] = useState("All");

  const categories = [
    "All",
    "Starters",
    "Main Courses",
    "Desserts"
  ];

  const filteredItems =
    activeCategory === "All"
      ? menuItems
      : menuItems.filter(
          (item) => item.category === activeCategory
        );

  // ==========================================
  // RESERVATION DATA
  // ==========================================

  const [reservationData, setReservationData] = useState({
    name: "",
    phone: "",
    date: "",
    time: "",
    guests: "2",
    area: "",
    tableNumber: "",
    notes: ""
  });

  const [reservationSuccess, setReservationSuccess] = useState(false);
  const [reservationError, setReservationError] = useState("");
  const [assignedTable, setAssignedTable] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableTables, setAvailableTables] = useState([]);
  const [tablesLoading, setTablesLoading] = useState(false);
  const [tablesError, setTablesError] = useState("");

  // Refresh table availability whenever date, time, area or guest count changes.
  useEffect(() => {
    const { date, time, area, guests } = reservationData;

    setAvailableTables([]);
    setReservationData((previous) => ({ ...previous, tableNumber: "" }));

    if (!date || !time || !area || !guests) return;

    const controller = new AbortController();
    const params = new URLSearchParams({ date, time, area, guests });

    setTablesLoading(true);
    setTablesError("");

    fetch(`http://localhost:5000/api/tables?${params.toString()}`, {
      signal: controller.signal
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Could not load tables.");
        setAvailableTables(result.tables || []);
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          setTablesError(error.message || "Could not load available tables.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setTablesLoading(false);
      });

    return () => controller.abort();
  }, [reservationData.date, reservationData.time, reservationData.area, reservationData.guests]);

  // HANDLE INPUT CHANGES
  const handleReservationChange = (e) => {
    const { name, value } = e.target;

    setReservationData((previous) => ({
      ...previous,
      [name]: value
    }));

    setReservationError("");
  };

  // ==========================================
  // SUBMIT RESERVATION
  // ==========================================

  const handleReservationSubmit = async (e) => {
    e.preventDefault();

    if (isSubmitting) return;

    setReservationError("");

    if (!reservationData.tableNumber) {
      setReservationError("Please choose an available table before confirming.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(
        "http://localhost:5000/api/reservations",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            ...reservationData,
            tableNumber: Number(reservationData.tableNumber)
          })
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "Reservation failed."
        );
      }

      setAssignedTable(result.assignedTable || null);
      setReservationSuccess(true);

    } catch (error) {
      console.error("Reservation Error:", error);

      setReservationError(
        error.message ||
        "Something went wrong. Please try again."
      );

    } finally {
      setIsSubmitting(false);
    }
  };

  // ==========================================
  // RESET RESERVATION
  // ==========================================

  const resetReservation = () => {
    setReservationData({
      name: "",
      phone: "",
      date: "",
      time: "",
      guests: "2",
      area: "",
      tableNumber: "",
      notes: ""
    });

    setReservationSuccess(false);
    setReservationError("");
    setAssignedTable(null);
    setAvailableTables([]);
    setTablesError("");
    setIsSubmitting(false);
  };

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="website">

      {/* NAVIGATION */}

      <nav className="navbar">

        <a href="#home" className="logo">
          AVELOR<span>.</span>
        </a>

        <div className="nav-links">
          <a href="#home">Home</a>
          <a href="#story">Our Story</a>
          <a href="#menu">Menu</a>
          <a href="#experience">Experience</a>
          <a href="#contact">Contact</a>
        </div>

        <a href="#reservation" className="nav-button">
          Reserve a Table
        </a>

      </nav>

      <main>

        {/* HERO SECTION */}

        <section className="hero" id="home">

          <video className="hero-video" autoPlay muted loop playsInline preload="metadata">
            <source src="/video_1.mp4" type="video/mp4" />
          </video>

          <div className="hero-overlay"></div>

          <div className="hero-content">

            <p className="eyebrow">
              FINE DINING · EST. 2026
            </p>

            <h1>
              Where moments<br />
              become <span>memories.</span>
            </h1>

            <p className="hero-description">
              An intimate expression of flavour, atmosphere and the art of coming together.
            </p>

            <div className="hero-actions">
              <a href="#menu" className="text-button">
                Explore Menu ↗
              </a>
            </div>

          </div>

          <div className="hero-footer">
            <span>AN EXPERIENCE TO REMEMBER</span>
            <span>01 — 03</span>
          </div>

        </section>

        {/* OUR STORY */}

        <section className="story" id="story">

          <div className="story-image">

            <img src="/images/avelor-entrance.png" alt="The AVELOR restaurant entrance with its illuminated gold sign" loading="lazy" />

          </div>

          <div className="story-content">

            <p className="eyebrow">
              THE ART OF DINING
            </p>

            <h2>
              More Than<br />
              Just a <span>Meal.</span>
            </h2>

            <p>
              At AVELOR, every detail tells a story.
              From carefully selected ingredients to
              beautifully crafted dishes, we create
              moments worth remembering.
            </p>

            <a href="#menu" className="text-button">
              Discover Our Story ↗
            </a>

          </div>

        </section>

        {/* MENU SECTION */}

        <section className="menu-section" id="menu">

          <div className="menu-heading">

            <p className="eyebrow">
              A JOURNEY OF FLAVORS
            </p>

            <h2>
              Our <span>Menu</span>
            </h2>

            <p className="menu-intro">
              Carefully crafted dishes, made with passion
              and the finest ingredients.
            </p>

          </div>

          {/* CATEGORY FILTER */}

          <div className="menu-categories">

            {categories.map((category) => (

              <button
                key={category}
                type="button"
                className={
                  activeCategory === category
                    ? "category-btn active"
                    : "category-btn"
                }
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </button>

            ))}

          </div>

          {/* MENU ITEMS */}

          <div className="menu-grid">

            {filteredItems.map((item) => (

              <article className="menu-card" key={item.id}>

                <div className="menu-image">

                  <img
                    src={item.image}
                    alt={item.name}
                    loading="lazy"
                  />

                  <span className="menu-category-label">
                    {item.category}
                  </span>

                </div>

                <div className="menu-card-content">

                  <div className="menu-title-row">

                    <h3>{item.name}</h3>

                    <span className="menu-price">
                      ₹{item.price}
                    </span>

                  </div>

                  <p>{item.description}</p>

                </div>

              </article>

            ))}

          </div>

          <p className="menu-note">
            A little passion in every plate.
          </p>

        </section>


        {/* EXPERIENCE */}
        <section className="experience-section" id="experience">
          <div className="experience-heading">
            <p className="eyebrow">THE SETTING</p>
            <h2>Find your <span>moment.</span></h2>
            <p>Different moods, one unmistakable sense of welcome. Choose the atmosphere that feels like yours.</p>
          </div>
          <div className="experience-grid">
            <article className="experience-card">
              <img src="/images/avelor-view.png" alt="A table beside the AVELOR city-view windows" loading="lazy" />
              <p>01 / THE VIEW</p><h3>Above the City</h3>
              <span>Private dining framed by the glow of the skyline after dark.</span>
            </article>
            <article className="experience-card">
              <img src="/images/avelor-interior.png" alt="The AVELOR main dining room with matching dark tables and golden ring lights" loading="lazy" />
              <p>02 / THE AMBIENCE</p><h3>Candlelit Intimacy</h3>
              <span>Warm candlelight, intimate seating, and the city beyond the glass.</span>
            </article>
            <article className="experience-card">
              <img src="/images/avelor-private.png" alt="The AVELOR private dining room for an intimate gathering" loading="lazy" />
              <p>03 / THE OCCASION</p><h3>Evenings to Remember</h3>
              <span>A refined setting for celebrations above the city lights.</span>
            </article>
          </div>
        </section>

        {/* ======================================
            RESERVATION SECTION
        ====================================== */}

        <section className="reservation" id="reservation">

          <div className="reservation-heading">

            <p className="eyebrow">
              YOUR TABLE AWAITS
            </p>

            <h2>
              Reserve Your <span>Experience.</span>
            </h2>

            <p>
              Join us for an unforgettable dining experience.
            </p>

          </div>

          <div className="reservation-container">

            {reservationSuccess ? (

              /* SUCCESS MESSAGE */

              <div className="success-message">

                <div className="success-icon">✓</div>

                <h3>Reservation Received!</h3>

                <p>
                  Thank you, {reservationData.name}.
                  Your reservation request has been submitted.
                </p>

                <p>
                  Date: {reservationData.date}
                  <br />

                  Time: {reservationData.time}
                  <br />

                  Guests: {reservationData.guests}
                  <br />

                  Area: {
                    reservationData.area === "view"
                      ? "View Side"
                      : "Middle Area"
                  }
                </p>

                <div className="reservation-table-info">

                  <h4>Your Assigned Table</h4>

                  <p>
                    Table Number:{" "}
                    <strong>
                      {assignedTable?.number ?? "Assigned"}
                    </strong>
                  </p>

                  <p>
                    Table Capacity:{" "}
                    <strong>
                      {assignedTable?.capacity ?? "-"} Guests
                    </strong>
                  </p>

                  <p>
                    Table Area:{" "}
                    <strong>
                      {assignedTable?.area === "view"
                        ? "View Side"
                        : assignedTable?.area === "middle"
                          ? "Middle Area"
                          : reservationData.area}
                    </strong>
                  </p>

                  <p>
                    Duration: <strong>2 Hours</strong>
                  </p>

                </div>

                <button
                  type="button"
                  className="primary-button"
                  onClick={resetReservation}
                >
                  Make Another Reservation
                </button>

              </div>

            ) : (

              /* RESERVATION FORM */

              <form
                className="reservation-form"
                onSubmit={handleReservationSubmit}
              >

                {/* FULL NAME */}

                <div className="form-group">

                  <label htmlFor="name">
                    Full Name
                  </label>

                  <input
                    id="name"
                    type="text"
                    name="name"
                    placeholder="Enter your full name"
                    value={reservationData.name}
                    onChange={handleReservationChange}
                    required
                  />

                </div>

                {/* PHONE NUMBER */}

                <div className="form-group">

                  <label htmlFor="phone">
                    Phone Number
                  </label>

                  <input
                    id="phone"
                    type="tel"
                    name="phone"
                    placeholder="Enter your phone number"
                    value={reservationData.phone}
                    onChange={handleReservationChange}
                    required
                  />

                </div>

                {/* DATE AND TIME */}

                <div className="form-row">

                  <div className="form-group">

                    <label htmlFor="date">
                      Reservation Date
                    </label>

                    <input
                      id="date"
                      type="date"
                      name="date"
                      min={new Date().toLocaleDateString("en-CA")}
                      value={reservationData.date}
                      onChange={handleReservationChange}
                      required
                    />

                  </div>

                  <div className="form-group">

                    <label htmlFor="time">
                      Reservation Time
                    </label>

                    <input
                      id="time"
                      type="time"
                      name="time"
                      value={reservationData.time}
                      onChange={handleReservationChange}
                      required
                    />

                  </div>

                </div>

                {/* DINING AREA */}

                <div className="form-group">

                  <label htmlFor="area">
                    Preferred Dining Area
                  </label>

                  <select
                    id="area"
                    name="area"
                    value={reservationData.area}
                    onChange={handleReservationChange}
                    required
                  >

                    <option value="">
                      Choose Your Dining Area
                    </option>

                    <option value="middle">
                      Middle Area — Central Seating
                    </option>

                    <option value="view">
                      View Side — Panoramic City View
                    </option>

                  </select>

                </div>

                {/* NUMBER OF GUESTS */}

                <div className="form-group">

                  <label htmlFor="guests">
                    Number of Guests
                  </label>

                  <select
                    id="guests"
                    name="guests"
                    value={reservationData.guests}
                    onChange={handleReservationChange}
                  >

                    <option value="1">1 Guest</option>
                    <option value="2">2 Guests</option>
                    <option value="3">3 Guests</option>
                    <option value="4">4 Guests</option>
                    <option value="5">5 Guests</option>
                    <option value="6">6 Guests</option>
                    <option value="7">7 Guests</option>
                    <option value="8">8 Guests</option>

                  </select>

                </div>

                {/* AVAILABLE TABLES */}

                {reservationData.date && reservationData.time && reservationData.area && (
                  <div className="form-group table-picker-group">
                    <label>Choose Your Table</label>

                    {tablesLoading && <p className="table-status">Checking available tables...</p>}
                    {tablesError && <p className="table-error" role="alert">{tablesError}</p>}

                    {!tablesLoading && !tablesError && availableTables.length > 0 && (
                      <>
                        <p className="table-hint">Select a table that fits your party. Unavailable tables are disabled.</p>
                        <div className="table-options">
                          {availableTables.map((table) => (
                            <button
                              key={table.number}
                              type="button"
                              className={`table-option ${reservationData.tableNumber === String(table.number) ? "selected" : ""} ${!table.available ? "unavailable" : ""}`}
                              disabled={!table.available}
                              onClick={() => {
                                setReservationData((previous) => ({
                                  ...previous,
                                  tableNumber: String(table.number)
                                }));
                                setReservationError("");
                              }}
                              aria-pressed={reservationData.tableNumber === String(table.number)}
                            >
                              <span className="table-option-number">TABLE {String(table.number).padStart(2, "0")}</span>
                              <strong>{table.capacity} Guests</strong>
                              <small>{table.shape}</small>
                              <em>{table.available ? "Available" : table.capacity < Number(reservationData.guests) ? "Too small" : "Booked"}</em>
                            </button>
                          ))}
                        </div>
                        {!availableTables.some((table) => table.available) && (
                          <p className="table-error">No suitable tables are available for this time. Please change the time or area.</p>
                        )}
                      </>
                    )}

                    {!tablesLoading && !tablesError && availableTables.length === 0 && (
                      <p className="table-status">Choose a date, time, area and number of guests to see tables.</p>
                    )}
                  </div>
                )}

                {/* SPECIAL REQUESTS */}

                <div className="form-group">

                  <label htmlFor="notes">
                    Special Requests
                  </label>

                  <textarea
                    id="notes"
                    name="notes"
                    placeholder="Any special requests? (Optional)"
                    value={reservationData.notes}
                    onChange={handleReservationChange}
                    rows="4"
                  />

                </div>

                {/* ERROR MESSAGE */}

                {reservationError && (

                  <div
                    role="alert"
                    className="reservation-error"
                    style={{
                      color: "#d88b78",
                      background: "rgba(216, 139, 120, 0.10)",
                      border: "1px solid rgba(216, 139, 120, 0.35)",
                      padding: "14px",
                      marginBottom: "18px",
                      fontSize: "14px",
                      lineHeight: "1.6"
                    }}
                  >
                    {reservationError}
                  </div>

                )}

                {/* SUBMIT BUTTON */}

                <button
                  type="submit"
                  className="reservation-submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? "Checking Availability..."
                    : "Confirm Reservation ↗"}
                </button>

              </form>

            )}

          </div>

        </section>

      </main>

      {/* FOOTER */}

      <footer id="contact">

        <a href="#home" className="logo">
          AVELOR<span>.</span>
        </a>

        <p>
          Exceptional Dining. Timeless Moments.
        </p>

        <div className="footer-contact">
          <span>Sector 17, Chandigarh, India</span>
          <a href="tel:+919876543210">+91 98765 43210</a>
          <a href="mailto:reservations@avelor.example">reservations@avelor.example</a>
        </div>

        <span className="footer-copyright">
          © 2026 AVELOR. All rights reserved.
        </span>

      </footer>

    </div>
  );
}

export default App;
