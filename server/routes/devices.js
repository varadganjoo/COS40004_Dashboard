const express = require("express");
const router = express.Router();
const Device = require("../models/devices");

// Get all devices
router.get("/", async (req, res) => {
  const devices = await Device.find();
  res.json(devices);
});

router.patch("/:id", async (req, res) => {
  const { name } = req.body;
  try {
    const device = await Device.findByIdAndUpdate(
      req.params.id,
      { name },
      { new: true }
    );
    res.json(device);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.get("/max/:name", async (req, res) => {
  const { name } = req.params;
  try {
    const maxDevice = await Device.find({ name: new RegExp(`^${name}_`) })
      .sort({ name: -1 })
      .limit(1);
    res.json(maxDevice[0]);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
