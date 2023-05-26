const mongoose = require("mongoose");

const SensorSchema = new mongoose.Schema({
  name: String,
  type: String,
  value: [Number],
});

const BoardSchema = new mongoose.Schema({
  timestamp: Date,
  sensors: [SensorSchema],
  device_id: String,
});

module.exports = mongoose.model("Board", BoardSchema);
