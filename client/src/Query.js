import React, { useEffect, useState, useRef } from "react";
import "./Query.css";
import io from "socket.io-client";

// This component calculates the average sensor reading or GPS distance travelled
// within a specified time period, and displays it.
function AverageComponent({ device_id, sensor_name }) {
  // Initialise state variables
  const [timePeriod, setTimePeriod] = useState("");
  const [average, setAverage] = useState("");
  const [distanceTravelled, setDistanceTravelled] = useState("");

  // Function to handle changes in the timePeriod input field
  const handleInputChange = (event) => {
    setTimePeriod(event.target.value);
  };

  // Function to calculate the average sensor reading or GPS distance travelled
  const handleAverageCalculation = () => {
    // Perform a different calculation depending on the sensor name
    if (sensor_name === "gps") {
      // Fetch the GPS distance travelled from the server
      fetch(
        `https://cos-40004-dashboard-be-phi.vercel.app/boards/device/${device_id}/sensor/${sensor_name}/distance?timePeriod=${timePeriod}`
      )
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        })
        .then((data) => {
          setDistanceTravelled(data.distance);
        })
        .catch((error) => {
          console.log("There was an error!", error);
        });
    } else {
      // Fetch the average sensor reading from the server
      fetch(
        `https://cos-40004-dashboard-be-phi.vercel.app/boards/device/${device_id}/sensor/${sensor_name}?timePeriod=${timePeriod}`
      )
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        })
        .then((data) => {
          setAverage(data.average);
        })
        .catch((error) => {
          console.log("There was an error!", error);
        });
    }
  };

  // Render the component
  return (
    <div>
      <input
        type="number"
        placeholder="Enter time in seconds"
        value={timePeriod}
        onChange={handleInputChange}
      />
      <button onClick={handleAverageCalculation}>
        Calculate {sensor_name === "gps" ? "Distance" : "Average"}
      </button>
      {sensor_name === "gps"
        ? distanceTravelled && <p>Distance Travelled: {distanceTravelled} km</p>
        : average && <p>Average: {average}</p>}
    </div>
  );
}

// The Query function is a React component that handles the display and
// interactions for devices, boards, sensor history, and states.
// It also provides options for filtering data based on scenario, device, and state.
async function Query() {
  const [devices, setDevices] = useState([]);
  const [boards, setBoards] = useState([]);
  const [states, setStates] = useState([]);
  const [selectedScenario, setSelectedScenario] = useState("ALL");
  const [selectedDevice, setSelectedDevice] = useState("ALL");
  const [selectedState, setSelectedState] = useState("ALL");
  const [deviceCount, setDeviceCount] = useState(0);
  const countedDevicesRef = useRef(new Set());

  useEffect(() => {
    const fetchData = async () => {
      try {
        const responseDevices = await fetch(
          "https://cos-40004-dashboard-be-phi.vercel.app/devices"
        );
        const dataDevices = await responseDevices.json();
        setDevices(dataDevices);

        const responseBoards = await fetch(
          "https://cos-40004-dashboard-be-phi.vercel.app/boards"
        );
        const dataBoards = await responseBoards.json();
        setBoards(dataBoards);

        const responseStates = await fetch(
          "https://cos-40004-dashboard-be-phi.vercel.app/states"
        );
        const dataStates = await responseStates.json();
        setStates(dataStates);
      } catch (error) {
        console.error("Error:", error);
      }
    };

    fetchData();
  }, []);

  const handleScenarioChange = (event) => {
    setSelectedScenario(event.target.value);
    setSelectedDevice("ALL");
    setSelectedState("ALL");
  };

  const handleDeviceChange = (event) => {
    setSelectedDevice(event.target.value);
    setSelectedState("ALL");
  };

  const handleStateChange = (event) => {
    setSelectedState(event.target.value);
    setDeviceCount(0);
  };

  const scenarioDevices = devices.filter((device) => {
    if (selectedScenario === "ALL") return true;
    return device.name.startsWith(selectedScenario + "_");
  });

  // This function checks if a sensor has been idle based on its historical data
  const checkIdleState = async (deviceName, sensorName, parameter) => {
    try {
      // Convert parameter to milliseconds
      const paramMillis = parameter * 1000;

      // Get the current date
      const currentDate = new Date();

      // Calculate the previous date
      const previousDate = new Date(currentDate.getTime() - paramMillis);

      // Fetch current sensor data
      const currentSensorDataResponse = await fetch(
        `https://cos-40004-dashboard-be-phi.vercel.app/${deviceName}/sensors/${sensorName}`
      );
      const currentSensorData = await currentSensorDataResponse.json();

      // Fetch sensor data from x seconds ago
      const previousSensorDataResponse = await fetch(
        `https://cos-40004-dashboard-be-phi.vercel.app/${deviceName}/sensors/${sensorName}/history?start=${previousDate.toISOString()}&end=${currentDate.toISOString()}`
      );
      const previousSensorData = await previousSensorDataResponse.json();

      // If there's no previous data or current data, return false
      if (!previousSensorData.length || !currentSensorData) return false;

      // Calculate the difference
      const difference = Math.abs(
        currentSensorData - previousSensorData[0].value
      );

      // Calculate the margin (5% of the current value)
      const margin = 0.05 * currentSensorData;

      // Check if the difference is within the margin
      if (difference <= margin) {
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error(error);
      return false;
    }
  };

  // This function checks the state for each sensor and updates the device count for the selected state
  const checkStateForIndividualSensor = async (
    deviceName,
    sensorName,
    sensorValue
  ) => {
    const matchingStates = states.filter((state) => {
      return (
        state.device_name.toLowerCase() === deviceName.toLowerCase() &&
        state.sensor_name.toLowerCase() === sensorName.toLowerCase()
      );
    });

    let result = "Default";

    for (let state of matchingStates) {
      let parameter;
      if (state.parameter) {
        parameter = parseFloat(state.parameter);
      }
      switch (state.condition) {
        case "<":
          if (sensorValue < parameter) result = state.name;
          break;
        case ">":
          if (sensorValue > parameter) result = state.name;
          break;
        case "<=":
          if (sensorValue <= parameter) result = state.name;
          break;
        case ">=":
          if (sensorValue >= parameter) result = state.name;
          break;
        case "=":
          if (sensorValue === parameter) result = state.name;
          break;
        case "idle":
          if (await checkIdleState(deviceName, sensorName, parameter)) {
            result = state.name;
          }
          break;
        default:
          break;
      }
    }

    if (result === selectedState) {
      // countedDevicesRef is a React ref object holding an array of device names
      if (!countedDevicesRef.current.includes(deviceName)) {
        countedDevicesRef.current.push(deviceName);
        setDeviceCount((prevCount) => prevCount + 1);
      }
    }

    return result;
  };

  // This function generates the JSX for displaying sensor data
  const displaySensors = (sensor, index, board) => {
    const deviceName = devices.find(
      (device) => device._id === board.device_id
    )?.name;

    if (
      (sensor.name === "BME" || sensor.name === "MPU") &&
      sensor.type === "i2c" &&
      Array.isArray(sensor.value)
    ) {
      const sensorProperties =
        sensor.name === "BME"
          ? ["Temperature", "Humidity", "Pressure", "Gas"]
          : ["Acc-X", "Acc-Y", "Acc-Z", "Gyro-X", "Gyro-Y", "Gyro-Z"];

      return sensor.value.map((val, index) => {
        const sensorName =
          `${sensor.name}-${sensorProperties[index]}`.toLowerCase();
        const state = checkStateForIndividualSensor(
          deviceName,
          sensorName,
          val
        );
        // Before returning, check if the selected state matches the sensor's state
        if (selectedState !== "ALL" && state !== selectedState) {
          return null;
        }
        return (
          <div key={`${sensor.name}-${index}`}>
            <span>Sensor Name: {sensorName}</span>
            <span>
              Sensor Value:{" "}
              {sensorName === "gps" ? `${val[0]}, ${val[1]}` : val}
            </span>

            <span>Sensor State: {state}</span>
            <AverageComponent
              device_id={board.device_id}
              sensor_name={sensorName}
            />
          </div>
        );
      });
    } else {
      const state = checkStateForIndividualSensor(
        deviceName,
        sensor.name,
        sensor.value
      );
      // Before returning, check if the selected state matches the sensor's state
      if (selectedState !== "ALL" && state !== selectedState) {
        return null;
      }
      return (
        <div key={index}>
          <span>Sensor Name: {sensor.name}</span>
          <span>
            Sensor Value:{" "}
            {sensor.name === "gps"
              ? `${sensor.value[0]}, ${sensor.value[1]}`
              : sensor.value}
          </span>

          <span>Sensor State: {state}</span>
          <AverageComponent
            device_id={board.device_id}
            sensor_name={sensor.name.toLowerCase()}
          />
        </div>
      );
    }
  };

  // The component returns JSX that includes dropdown menus for selecting a scenario, device, and state,
  // and a list of devices and their sensor data.
  return (
    <div className="Query">
      <h1>Query</h1>
      <select value={selectedScenario} onChange={handleScenarioChange}>
        <option value="ALL">ALL</option>
        <option value="CAR">CAR</option>
        <option value="OFFICE">OFFICE</option>
        <option value="FACTORY">FACTORY</option>
      </select>

      {selectedScenario !== "ALL" && (
        <>
          <select value={selectedDevice} onChange={handleDeviceChange}>
            <option value="ALL">ALL</option>
            {scenarioDevices.map((device) => (
              <option key={device._id} value={device.name}>
                {device.name}
              </option>
            ))}
          </select>

          <select value={selectedState} onChange={handleStateChange}>
            <option value="ALL">ALL</option>
            {states
              .filter((state) => {
                if (selectedDevice !== "ALL")
                  return state.device_name === selectedDevice;
                return state.device_name.startsWith(selectedScenario + "_");
              })
              .map((state) => state.name)
              .filter((value, index, self) => self.indexOf(value) === index)
              .map((stateName, index) => (
                <option key={index} value={stateName}>
                  {stateName}
                </option>
              ))}
          </select>

          <div>
            <span>
              Number of devices in the state '{selectedState}': {deviceCount}{" "}
              {/* Now use deviceCount instead of deviceCountRef.current */}
            </span>
          </div>
        </>
      )}

      {scenarioDevices
        .filter((device) => {
          if (selectedDevice === "ALL") return true;
          return device.name === selectedDevice;
        })
        .map((device) => {
          const deviceBoards = boards.filter(
            (board) => board.device_id === device._id
          );
          deviceBoards.sort(
            (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
          );
          const recentBoard = deviceBoards[0];

          return (
            <div key={device._id}>
              <h2>{device.name}</h2>
              {recentBoard &&
                recentBoard.sensors.map((sensor, index) =>
                  displaySensors(sensor, index, recentBoard)
                )}
            </div>
          );
        })}
    </div>
  );
}

export { Query };
