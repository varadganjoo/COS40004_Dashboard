import React, { useEffect, useState } from "react";
import "./Dashboard.css";
import Modal from "./Modal";

function Dashboard() {
  const [devices, setDevices] = useState([]);
  const [states, setStates] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    fetch("https://cos-40004-dashboard-be-phi.vercel.app/devices")
      .then((response) => response.json())
      .then((data) => setDevices(data));

    fetch("https://cos-40004-dashboard-be-phi.vercel.app/states")
      .then((response) => response.json())
      .then((data) => setStates(data));
  }, []);

  const handleDeviceClick = (device) => {
    setSelectedDevice(device);
  };

  const handleModalClose = () => {
    setSelectedDevice(null);
  };

  const filteredDevices = devices.filter((device) =>
    device.name.startsWith(filter)
  );

  return (
    <div className="dashboard">
      <select onChange={(e) => setFilter(e.target.value)}>
        <option value="">Select Scenario</option>
        <option value="CAR_">CAR</option>
        <option value="OFFICE_">OFFICE</option>
        <option value="FACTORY_">FACTORY</option>
      </select>

      {filteredDevices.map((device) => (
        <div
          className="device-box"
          onClick={() => handleDeviceClick(device)}
          key={device._id}
        >
          <h3>{device.name}</h3>
          <h4>{device._id}</h4>
        </div>
      ))}
      {selectedDevice && (
        <Modal
          device={selectedDevice}
          states={states}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
}

export { Dashboard };
