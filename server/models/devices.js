const mongoose = require("mongoose");

const DeviceSchema = new mongoose.Schema({
  _id: String,
  name: String,
});

module.exports = mongoose.model("Device", DeviceSchema);
