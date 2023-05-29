// Import necessary dependencies
import React, { useState, useEffect } from "react";
import "./States.css"; // Import the CSS file for styling

// Define the States function component
function States() {
  // Define the state variables
  const [states, setStates] = useState([]); // Stores the list of states
  const [devices, setDevices] = useState([]); // Stores the list of devices
  const [sensors, setSensors] = useState([]); // Stores the list of sensors
  // Stores the new state that will be added
  const [newState, setNewState] = useState({
    name: "",
    device_name: "",
    condition: "",
    sensor_name: "",
    parameter: "",
  });

  // Stores sensor attributes
  const [sensorAttributes, setSensorAttributes] = useState([]);
  const [selectedAttribute, setSelectedAttribute] = useState(""); // Stores the selected attribute

  // Fetch the states and devices when the component mounts
  useEffect(() => {
    // Fetch and store states
    fetch("https://cos-40004-dashboard-be-phi.vercel.app/states")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error ${res.status}`);
        }
        return res.json();
      })
      .then((data) => setStates(data))
      .catch((err) => console.error("Error fetching states:", err));

    // Fetch and store devices
    fetch("https://cos-40004-dashboard-be-phi.vercel.app/devices")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error ${res.status}`);
        }
        return res.json();
      })
      .then((data) => setDevices(data))
      .catch((err) => console.error("Error fetching devices:", err));
  }, []);

  // Handle the change in the selected device
  const handleDeviceChange = (e) => {
    const selectedDeviceId = e.target.value;
    setNewState({ ...newState, device_name: selectedDeviceId });

    // Fetch and store the sensors of the selected device
    fetch(
      `https://cos-40004-dashboard-be-phi.vercel.app/boards/${selectedDeviceId}`
    )
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error ${res.status}`);
        }
        return res.json();
      })
      .then((sensorNames) => setSensors(sensorNames))
      .catch((err) => console.error("Error fetching device sensors:", err));
  };

  // Handle the change in the input fields
  const handleInputChange = (e) => {
    setNewState({ ...newState, [e.target.name]: e.target.value });
  };

  // Handle the change in the selected sensor
  const handleSensorChange = (e) => {
    const selectedSensor = e.target.value;
    setNewState({ ...newState, sensor_name: selectedSensor });

    // Set sensor attributes based on the selected sensor
    if (selectedSensor === "BME") {
      setSensorAttributes(["temperature", "humidity", "pressure", "gas"]);
    } else if (selectedSensor === "MPU") {
      setSensorAttributes([
        "Acc-X",
        "Acc-Y",
        "Acc-Z",
        "Gyro-X",
        "Gyro-Y",
        "Gyro-Z",
      ]);
    } else {
      setSensorAttributes([]);
    }
  };

  // Handle the change in the selected attribute
  const handleAttributeChange = (e) => {
    const selectedAttribute = e.target.value;
    setSelectedAttribute(selectedAttribute);
  };

  // Handle the submission of the new state
  const handleSubmit = (e) => {
    e.preventDefault();

    // Find the device name using the device id
    const device = devices.find(
      (device) => device._id === newState.device_name
    );
    const deviceName = device ? device.name : "";

    // Append the attribute to the sensor name
    const sensorName =
      newState.sensor_name + (selectedAttribute ? "-" + selectedAttribute : "");

    // Create a new object with the device name instead of id
    const stateToSubmit = {
      ...newState,
      device_name: deviceName,
      sensor_name: sensorName,
    };

    // POST the new state to the server
    fetch("https://cos-40004-dashboard-be-phi.vercel.app/states", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(stateToSubmit),
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        setStates([...states, data]);
        setNewState({
          name: "",
          device_name: "",
          condition: "",
          sensor_name: "",
          parameter: "",
        });
      })
      .catch((err) => console.error("Error submitting new state:", err));
  };

  // Render the UI of the component
  return (
    <div className="states-page">
      <h1>States</h1>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Device</th>
            <th>Sensor</th>
            <th>Condition</th>
            <th>Parameter</th>
          </tr>
        </thead>
        <tbody>
          {states.map((state) => (
            <tr key={state._id}>
              <td>{state.name}</td>
              <td>{state.device_name}</td>
              <td>{state.sensor_name}</td>
              <td>{state.condition}</td>
              <td>{state.parameter}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <form onSubmit={handleSubmit}>
        <h2>Add State</h2>
        <div>
          <label htmlFor="state-name">Name:</label>
          <input
            type="text"
            id="state-name"
            name="name"
            value={newState.name}
            onChange={handleInputChange}
            required
          />
        </div>
        {newState.name && (
          <div>
            <label htmlFor="device-name">Device:</label>
            <select
              id="device-name"
              name="device_name"
              value={newState.device_name}
              onChange={handleDeviceChange}
              required
            >
              <option value="">Select device</option>
              {devices.map((device) => (
                <option key={device._id} value={device._id}>
                  {device.name}
                </option>
              ))}
            </select>
          </div>
        )}
        {newState.device_name && (
          <div>
            <label htmlFor="sensor-name">Sensor:</label>
            <select
              id="sensor-name"
              name="sensor_name"
              value={newState.sensor_name}
              onChange={handleSensorChange}
              required
            >
              <option value="">Select sensor</option>
              {sensors.map((sensor) => (
                <option key={sensor} value={sensor}>
                  {sensor}
                </option>
              ))}
            </select>
          </div>
        )}
        {newState.sensor_name &&
          (newState.sensor_name === "BME" ||
            newState.sensor_name === "MPU") && (
            <div>
              <label htmlFor="sensor-attribute">Attribute:</label>
              <select
                id="sensor-attribute"
                name="sensor_attribute"
                onChange={handleAttributeChange}
                required
              >
                <option value="">Select attribute</option>
                {sensorAttributes.map((attribute, index) => (
                  <option key={index} value={attribute}>
                    {attribute}
                  </option>
                ))}
              </select>
            </div>
          )}
        {newState.sensor_name && (
          <div>
            <label htmlFor="condition">Condition:</label>
            <select
              id="condition"
              name="condition"
              value={newState.condition}
              onChange={handleInputChange}
              required
            >
              <option value="">Select a condition</option>
              <option value="<">{"<"}</option>
              <option value=">">{">"}</option>
              <option value="<=">{"<="}</option>
              <option value=">=">{">="}</option>
              <option value="=">{"="}</option>
              <option value="idle">{"idle"}</option>
            </select>
          </div>
        )}
        {newState.condition && (
          <div>
            <label htmlFor="parameter">Parameter:</label>
            <input
              type="text"
              id="parameter"
              name="parameter"
              value={newState.parameter}
              onChange={handleInputChange}
              required
            />
          </div>
        )}
        <button type="submit">Add</button>
      </form>
    </div>
  );
}

export { States };
