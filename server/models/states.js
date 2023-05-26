const mongoose = require("mongoose");

const StateSchema = new mongoose.Schema({
  name: String,
  condition: String,
  device_name: String,
  sensor_name: String,
  parameter: Number,
});

module.exports = mongoose.model("State", StateSchema);
