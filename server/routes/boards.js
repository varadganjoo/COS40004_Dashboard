const express = require("express");
const router = express.Router();
const Board = require("../models/boards");
const geolib = require("geolib");

// Get all boards
router.get("/", async (req, res) => {
  const query = {};
  const { device_id, state, start_date, end_date } = req.query;

  if (device_id) query.device_id = device_id;

  if (start_date || end_date) {
    query.timestamp = {};
    if (start_date) query.timestamp.$gte = new Date(start_date);
    if (end_date) query.timestamp.$lte = new Date(end_date);
  }

  let boards = await Board.find(query);

  if (state) {
    boards = boards.filter((board) => {
      return board.sensors.some((sensor) => sensor.state === state);
    });
  }

  res.json(boards);
});

router.get("/:device_id", async (req, res) => {
  const deviceID = req.params.device_id;

  try {
    const latestDeviceEntry = await Board.findOne({ device_id: deviceID }).sort(
      { timestamp: -1 }
    );

    if (latestDeviceEntry) {
      res.json(latestDeviceEntry.sensors.map((sensor) => sensor.name));
    } else {
      res.json([]);
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get full board data for a specific device
router.get("/device/:device_id", async (req, res) => {
  const deviceID = req.params.device_id;

  try {
    const latestDeviceEntry = await Board.findOne({ device_id: deviceID }).sort(
      { timestamp: -1 }
    );

    if (latestDeviceEntry) {
      res.json(latestDeviceEntry);
    } else {
      res.json({});
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// New endpoint
// Get sensor data over a certain period of time
router.get("/device/:device_id/sensor/:sensor_name", async (req, res) => {
  const { device_id, sensor_name } = req.params;
  const { timePeriod } = req.query; // expects the time period in seconds
  let s_name = sensor_name;
  let index = 0;

  // console.log(sensor_name);

  const timePeriodInMilliseconds = timePeriod * 1000;

  const now = new Date();
  now.setHours(now.getHours());
  const startTime = new Date(now.getTime() - timePeriodInMilliseconds);

  // console.log(sensor_name);

  if (sensor_name.includes("mpu")) {
    s_name = "mpu";
    // console.log(true);
  } else if (sensor_name.includes("bme")) {
    s_name = "bme";
    // console.log(false);
  }

  if (s_name === "bme" || s_name === "mpu") {
    if (sensor_name.includes("acc-y") || sensor_name.includes("humidity")) {
      index = 1;
    } else if (
      sensor_name.includes("acc-z") ||
      sensor_name.includes("pressure")
    ) {
      index = 2;
    } else if (sensor_name.includes("gyro-x") || sensor_name.includes("gas")) {
      index = 3;
    } else if (sensor_name.includes("gyro-y")) {
      index = 4;
    } else if (sensor_name.includes("gyro-z")) {
      index = 5;
    }
  }

  try {
    const boards = await Board.find({
      device_id,
      timestamp: { $gte: startTime, $lte: now },
    });

    let sensorData = boards
      .map((board) =>
        board.sensors.find(
          (sensor) => sensor.name.toLowerCase() === s_name.toLowerCase()
        )
      )
      .filter((sensor) => sensor !== undefined && sensor.value.length > index)
      .map((sensor) => sensor.value[index]);

    const totalValues = sensorData.length;

    const totalSum = sensorData.reduce((total, current) => total + current, 0);

    const average = totalSum / totalValues;

    res.json({ average });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get(
  "/device/:device_id/sensor/:sensor_name/distance",
  async (req, res) => {
    const { device_id, sensor_name } = req.params;
    const { timePeriod } = req.query;

    if (sensor_name !== "gps") {
      res
        .status(400)
        .json({ message: "This endpoint only supports GPS sensors." });
      return;
    }

    const timePeriodInMilliseconds = timePeriod * 1000;
    const now = new Date();
    now.setHours(now.getHours());
    const startTime = new Date(now.getTime() - timePeriodInMilliseconds);

    try {
      const boards = await Board.find({
        device_id,
        timestamp: { $gte: startTime, $lte: now },
      });

      let sensorData = boards
        .map((board) =>
          board.sensors.find(
            (sensor) => sensor.name.toLowerCase() === sensor_name.toLowerCase()
          )
        )
        .filter((sensor) => sensor !== undefined && sensor.value.length > 1)
        .map((sensor) => ({
          latitude: sensor.value[0],
          longitude: sensor.value[1],
        }));

      let distanceTravelled = 0;
      for (let i = 1; i < sensorData.length; i++) {
        const start = sensorData[i - 1];
        const end = sensorData[i];
        distanceTravelled += geolib.getDistance(start, end);
      }

      // Convert distance from meters to kilometers
      distanceTravelled /= 1000;

      res.json({ distance: distanceTravelled });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

module.exports = router;

module.exports = router;
