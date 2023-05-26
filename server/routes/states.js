const express = require("express");
const router = express.Router();
const State = require("../models/states");

// Get all states
router.get("/", async (req, res) => {
  try {
    const states = await State.find();
    res.json(states);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create new state
router.post("/", async (req, res) => {
  const state = new State({
    name: req.body.name,
    device_name: req.body.device_name,
    condition: req.body.condition,
    sensor_name: req.body.sensor_name,
    parameter: req.body.parameter,
  });

  try {
    const newState = await state.save();
    res.status(201).json(newState);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
