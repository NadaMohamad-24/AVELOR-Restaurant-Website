const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const Reservation = require("./models/Reservation");
const TableLock = require("./models/TableLock");

const app = express();
app.use(cors());
app.use(express.json());

const TABLES = [
  ...Array.from({ length: 4 }, (_, i) => ({ number: i + 1, area: "middle", capacity: 4, shape: "round" })),
  ...Array.from({ length: 4 }, (_, i) => ({ number: i + 5, area: "middle", capacity: 2, shape: "square" })),
  ...Array.from({ length: 4 }, (_, i) => ({ number: i + 9, area: "middle", capacity: 4, shape: "square" })),
  ...Array.from({ length: 2 }, (_, i) => ({ number: i + 13, area: "view", capacity: 2, shape: "square" })),
  ...Array.from({ length: 4 }, (_, i) => ({ number: i + 15, area: "view", capacity: 4, shape: "square" })),
  { number: 19, area: "view", capacity: 6, shape: "rectangular" },
  { number: 20, area: "view", capacity: 8, shape: "rectangular" },
];

const RESERVATION_DURATION = 120;
const OPEN_MINUTES = 9 * 60;
const LAST_START_MINUTES = 22 * 60; // 10 PM, so a 2-hour booking ends by midnight.

function getReservationTimes(date, time) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "") || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time || "")) return null;

  const [hours, minutes] = time.split(":").map(Number);
  const minuteOfDay = hours * 60 + minutes;
  if (minuteOfDay < OPEN_MINUTES || minuteOfDay > LAST_START_MINUTES) return null;

  const startAt = new Date(`${date}T${time}:00+05:30`);
  if (Number.isNaN(startAt.getTime())) return null;

  if (startAt.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }) !== date) return null;
  if (startAt.getTime() <= Date.now()) return null;

  const endAt = new Date(startAt.getTime() + RESERVATION_DURATION * 60 * 1000);
  return { startAt, endAt };
}

async function getTablesWithAvailability(area, guests, startAt, endAt) {
  const reservations = await Reservation.find({
    area,
    status: { $ne: "cancelled" },
    startAt: { $lt: endAt },
    endAt: { $gt: startAt },
    tableNumber: { $ne: null },
  }).select("tableNumber");

  const occupied = new Set(reservations.map((r) => Number(r.tableNumber)));
  return TABLES.filter((table) => table.area === area).map((table) => ({
    ...table,
    available: table.capacity >= guests && !occupied.has(table.number),
  }));
}

app.get("/", (_req, res) => res.send("AVELOR Backend is Running!"));

app.get("/api/tables", async (req, res) => {
  try {
    const { date, time, area, guests } = req.query;
    const guestCount = Number(guests);
    if (!date || !time || !["middle", "view"].includes(area) ||
        !Number.isInteger(guestCount) || guestCount < 1 || guestCount > 8) {
      return res.status(400).json({ success: false, message: "Please provide a valid date, time, area and guest count." });
    }

    const times = getReservationTimes(date, time);
    if (!times) {
      return res.status(400).json({ success: false, message: "Reservations are available from 9:00 AM to 10:00 PM. Please choose a future time." });
    }

    const tables = await getTablesWithAvailability(area, guestCount, times.startAt, times.endAt);
    return res.json({ success: true, count: tables.length, tables });
  } catch (error) {
    console.error("Get Tables Error:", error);
    return res.status(500).json({ success: false, message: "Could not check table availability." });
  }
});

app.post("/api/reservations", async (req, res) => {
  let lockedTableNumber = null;
  try {
    const { name, phone, date, time, guests, notes, area, tableNumber } = req.body;
    const guestCount = Number(guests);
    const chosenNumber = Number(tableNumber);

    if (!name || !phone || !date || !time || !guests || !area || !tableNumber) {
      return res.status(400).json({ success: false, message: "Please complete all required fields and choose a table." });
    }
    if (String(name).trim().length < 2 || String(name).trim().length > 80) {
      return res.status(400).json({ success: false, message: "Please enter a valid name." });
    }
    const digits = String(phone).replace(/\D/g, "");
    if (!/^\+?[0-9\s()-]+$/.test(String(phone)) || digits.length < 7 || digits.length > 15) {
      return res.status(400).json({ success: false, message: "Please enter a valid phone number." });
    }
    if (!Number.isInteger(guestCount) || guestCount < 1 || guestCount > 8) {
      return res.status(400).json({ success: false, message: "Guests must be between 1 and 8." });
    }
    if (!["middle", "view"].includes(area)) {
      return res.status(400).json({ success: false, message: "Please select a valid restaurant area." });
    }

    const times = getReservationTimes(date, time);
    if (!times) {
      return res.status(400).json({ success: false, message: "Reservations are available from 9:00 AM to 10:00 PM. Please choose a future time." });
    }

    const table = TABLES.find((item) => item.number === chosenNumber && item.area === area);
    if (!table || table.capacity < guestCount) {
      return res.status(400).json({ success: false, message: "The selected table cannot accommodate your party." });
    }

    // Acquire a short atomic lock for this table to prevent simultaneous double-booking.
    const lock = await TableLock.findOneAndUpdate(
      { _id: chosenNumber, lockedUntil: { $lte: new Date() } },
      { $set: { lockedUntil: new Date(Date.now() + 15000) } },
      { new: true }
    );
    if (!lock) {
      return res.status(409).json({ success: false, message: "This table is being booked right now. Please choose another table or try again." });
    }
    lockedTableNumber = chosenNumber;

    const conflict = await Reservation.findOne({
      tableNumber: chosenNumber,
      status: { $ne: "cancelled" },
      startAt: { $lt: times.endAt },
      endAt: { $gt: times.startAt },
    });

    if (conflict) {
      return res.status(409).json({ success: false, message: "Sorry, this table has just been booked. Please choose another table or time." });
    }

    const reservation = new Reservation({
      name: String(name).trim(),
      phone: String(phone).trim(),
      date,
      time,
      guests: guestCount,
      notes: String(notes || "").trim(),
      area,
      tableNumber: table.number,
      tableCapacity: table.capacity,
      tableShape: table.shape,
      durationMinutes: RESERVATION_DURATION,
      startAt: times.startAt,
      endAt: times.endAt,
    });

    const savedReservation = await reservation.save();
    return res.status(201).json({
      success: true,
      message: "Your reservation has been created successfully!",
      reservation: savedReservation,
      assignedTable: table,
    });
  } catch (error) {
    console.error("Reservation Error:", error);
    return res.status(500).json({ success: false, message: "Could not save reservation." });
  } finally {
    if (lockedTableNumber !== null) {
      await TableLock.updateOne({ _id: lockedTableNumber }, { $set: { lockedUntil: new Date(0) } }).catch(console.error);
    }
  }
});

// Admin: get reservations
app.get("/api/reservations", async (_req, res) => {
  try {
    const reservations = await Reservation.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: reservations.length, reservations });
  } catch (error) {
    console.error("Fetch Error:", error.message);
    res.status(500).json({ success: false, message: "Could not fetch reservations." });
  }
});

// Admin: update reservation status
app.patch("/api/reservations/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ success: false, message: "Invalid reservation ID." });
    if (!["pending", "confirmed", "cancelled"].includes(status)) return res.status(400).json({ success: false, message: "Invalid reservation status." });

    const reservation = await Reservation.findById(id);
    if (!reservation) return res.status(404).json({ success: false, message: "Reservation not found." });

    if (reservation.status === "cancelled" && status !== "cancelled" && reservation.tableNumber) {
      const conflict = await Reservation.findOne({
        _id: { $ne: reservation._id },
        tableNumber: reservation.tableNumber,
        status: { $ne: "cancelled" },
        startAt: { $lt: reservation.endAt },
        endAt: { $gt: reservation.startAt },
      });
      if (conflict) return res.status(409).json({ success: false, message: "This table has already been booked for that time." });
    }

    reservation.status = status;
    await reservation.save();
    res.status(200).json({ success: true, message: "Reservation status updated!", reservation });
  } catch (error) {
    console.error("Update Error:", error.message);
    res.status(500).json({ success: false, message: "Could not update reservation." });
  }
});

// Admin: delete reservation
app.delete("/api/reservations/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ success: false, message: "Invalid reservation ID." });
    const reservation = await Reservation.findByIdAndDelete(id);
    if (!reservation) return res.status(404).json({ success: false, message: "Reservation not found." });
    res.status(200).json({ success: true, message: "Reservation deleted successfully!" });
  } catch (error) {
    console.error("Delete Error:", error.message);
    res.status(500).json({ success: false, message: "Could not delete reservation." });
  }
});

const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("MongoDB Connected Successfully!");
    await TableLock.bulkWrite(
      Array.from({ length: 20 }, (_, i) => ({
        updateOne: {
          filter: { _id: i + 1 },
          update: { $setOnInsert: { lockedUntil: new Date(0) } },
          upsert: true,
        },
      }))
    );
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((error) => console.error("MongoDB Connection Error:", error.message));
