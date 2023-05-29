import { useState, useEffect } from "react";
import "./DeviceManager.css";

const DeviceManager = () => {
  // Define state variables
  const [devices, setDevices] = useState([]); // Holds the list of devices
  const [editing, setEditing] = useState(false); // Boolean state for editing mode
  const [newName, setNewName] = useState(""); // Holds the new name for the device
  const [device, setDevice] = useState(null); // Holds the current device for editing

  // On component mount, fetch devices data from the server
  useEffect(() => {
    fetch("https://cos-40004-dashboard-be-phi.vercel.app/devices")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        const defaultDevices = data.filter((device) =>
          device.name.startsWith("default")
        );
        // Add numbers to device names
        defaultDevices.forEach((device, index) => {
          device.name = `default_${index + 1}`;
        });
        setDevices(defaultDevices);
      })
      .catch((err) => console.error("Error fetching devices:", err));
  }, []);

  // Function to handle Edit click, sets the editing mode, current device, and new name
  const handleEdit = (device) => {
    setEditing(true);
    setDevice(device);
    setNewName(device.name);
  };

  // Function to handle Submit, fetches the max device with the new name and patches the current device with a new name
  const handleSubmit = (e) => {
    e.preventDefault();

    fetch(
      `https://cos-40004-dashboard-be-phi.vercel.app/devices/max/${newName}`
    )
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error ${res.status}`);
        }
        return res.json();
      })
      .catch((err) => {
        console.error("Error fetching max device:", err);
        // Treat it as no max device found.
        return null;
      })
      .then((maxDevice) => {
        const maxNumber = maxDevice
          ? parseInt(maxDevice.name.split("_")[1])
          : 0;
        const nextName = `${newName}_${maxNumber + 1}`;

        fetch(
          `https://cos-40004-dashboard-be-phi.vercel.app/devices/${device._id}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ name: nextName }),
          }
        )
          .then((res) => {
            if (!res.ok) {
              throw new Error(`HTTP error ${res.status}`);
            }
            return res.json();
          })
          .then((updatedDevice) => {
            setEditing(false);
            setDevice(updatedDevice);
            // Update the devices list with the updated device
            setDevices(
              devices.map((dev) =>
                dev._id === updatedDevice._id ? updatedDevice : dev
              )
            );
          })
          .catch((err) => console.error("Error updating device:", err));
      });
  };

  // Render the component
  return (
    <div>
      {devices.map((device) => (
        <div key={device._id} className="unRegDev">
          <h3>{device.name}</h3>
          <h4>{device._id}</h4>
          <button onClick={() => handleEdit(device)}>Edit</button>
        </div>
      ))}

      {/* Display form for editing device name when editing mode is on */}
      {editing && (
        <form className="DevForm" onSubmit={handleSubmit}>
          <h3>New Name:</h3>
          <select value={newName} onChange={(e) => setNewName(e.target.value)}>
            <option value="">Select One</option>
            <option value="CAR">CAR</option>
            <option value="OFFICE">OFFICE</option>
            <option value="FACTORY">FACTORY</option>
          </select>
          <button type="submit">Submit</button>
        </form>
      )}
    </div>
  );
};

export { DeviceManager };
