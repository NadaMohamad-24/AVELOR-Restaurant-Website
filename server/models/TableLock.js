const mongoose = require("mongoose");

const tableLockSchema = new mongoose.Schema({
  _id: { type: Number, required: true },
  lockedUntil: { type: Date, required: true, default: new Date(0) },
}, { versionKey: false, collection: "tablelocks" });

module.exports = mongoose.model("TableLock", tableLockSchema);
