import React, { useEffect, useState } from "react";
import "./Dashboard.css";
import Modal from "./Modal";

function Dashboard() {
  // Define state variables
  const [devices, setDevices] = useState([]); // Holds the list of devices
  const [states, setStates] = useState([]); // Holds the list of states
  const [selectedDevice, setSelectedDevice] = useState(null); // Holds the currently selected device
  const [filter, setFilter] = useState(""); // Holds the current filter

  // On component mount, fetch devices and states data from the server
  useEffect(() => {
    fetch("https://cos-40004-dashboard-be-phi.vercel.app/devices")
      .then((response) => response.json())
      .then((data) => setDevices(data)); // Set fetched devices data to the devices state

    fetch("https://cos-40004-dashboard-be-phi.vercel.app/states")
      .then((response) => response.json())
      .then((data) => setStates(data)); // Set fetched states data to the states state
  }, []);

  // Handle when a device is clicked, by setting the selected device
  const handleDeviceClick = (device) => {
    setSelectedDevice(device);
  };

  // Handle closing the modal, by resetting the selected device to null
  const handleModalClose = () => {
    setSelectedDevice(null);
  };

  // Filter devices based on the current filter
  const filteredDevices = devices.filter((device) =>
    device.name.startsWith(filter)
  );

  // Render the component
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
      {/* Display modal if a device is selected */}
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
