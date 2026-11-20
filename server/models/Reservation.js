const mongoose = require("mongoose");

const reservationSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
  phone: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: (value) =>
        /^\+?[0-9\s()-]+$/.test(value) &&
        value.replace(/\D/g, "").length >= 7 &&
        value.replace(/\D/g, "").length <= 15,
      message: "Please enter a valid phone number.",
    },
  },
  date: { type: String, required: true },
  time: { type: String, required: true },
  guests: { type: Number, required: true, min: 1, max: 8 },
  notes: { type: String, default: "", maxlength: 500 },
  area: { type: String, enum: ["middle", "view"], required: true },
  tableNumber: { type: Number, min: 1, max: 20, default: null },
  tableCapacity: { type: Number, default: null },
  tableShape: { type: String, enum: ["round", "square", "rectangular"], default: null },
  durationMinutes: { type: Number, default: 120 },
  startAt: { type: Date, default: null },
  endAt: { type: Date, default: null },
  status: { type: String, enum: ["pending", "confirmed", "cancelled"], default: "pending" },
}, { timestamps: true });

module.exports = mongoose.model("Reservation", reservationSchema);
