import { useState, useEffect } from "react";
import "./DeviceManager.css";

const DeviceManager = () => {
  const [devices, setDevices] = useState([]);
  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState("");
  const [device, setDevice] = useState(null);

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

  const handleEdit = (device) => {
    setEditing(true);
    setDevice(device);
    setNewName(device.name);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    console.log(newName);
    fetch(
      `https://cos-40004-dashboard-be-phi.vercel.app/devices/max/${newName}`
    )
      .then((res) => {
        console.log(res, res.status);
        if (!res.ok) {
          // Treat no devices as the same as the first device
          if (res.status === 404) {
            return null;
          }
          throw new Error(`HTTP error ${res.status}`);
        }
        return res.json();
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
            setDevices(
              devices.map((dev) =>
                dev._id === updatedDevice._id ? updatedDevice : dev
              )
            );
          })
          .catch((err) => console.error("Error updating device:", err));
      })
      .catch((err) => console.error("Error fetching max device:", err));
  };

  return (
    <div>
      {devices.map((device) => (
        <div key={device._id} className="unRegDev">
          <h3>{device.name}</h3>
          <h4>{device._id}</h4>
          <button onClick={() => handleEdit(device)}>Edit</button>
        </div>
      ))}

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
