// Import Mongoose module
const mongoose = require("mongoose");

// Define a schema for a Sensor
// Each sensor will have a name, type, and an array of values
const SensorSchema = new mongoose.Schema({
  name: String, // Name of the sensor
  type: String, // Type of the sensor
  value: [Number], // Array of sensor values
});

// Define a schema for a Board
// Each board will have a timestamp, an array of sensors, and a device id
const BoardSchema = new mongoose.Schema({
  timestamp: Date, // Timestamp when the board data was recorded
  sensors: [SensorSchema], // Array of sensor data
  device_id: String, // The ID of the device that the board belongs to
});

// Export the Mongoose model for a Board using the BoardSchema
// This model can now be used elsewhere in our application for database operations
module.exports = mongoose.model("Board", BoardSchema);
