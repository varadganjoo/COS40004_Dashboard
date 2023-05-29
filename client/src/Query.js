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
function Query() {
  // Create state variables using useState for storing the fetched data and selected options.
  // useRef is used for storing mutable values that might change over the lifecycle of the component.
  const [devices, setDevices] = useState([]);
  const [boards, setBoards] = useState([]);
  const [sensorHistories, setSensorHistories] = useState({});
  const [states, setStates] = useState([]);
  const [selectedScenario, setSelectedScenario] = useState("ALL");
  const [selectedDevice, setSelectedDevice] = useState("ALL");
  const [selectedState, setSelectedState] = useState("ALL");
  const deviceCountRef = useRef(0);
  const countedDevicesRef = useRef(new Set());
  const [deviceCount, setDeviceCount] = useState(0);

  // The useEffect hook is used to fetch the initial data and set up a WebSocket connection
  // for live updates once the component is mounted.
  useEffect(() => {
    const fetchData = async () => {
      try {
        const deviceResponse = await fetch(
          "https://cos-40004-dashboard-be-phi.vercel.app/devices"
        );
        const boardResponse = await fetch(
          "https://cos-40004-dashboard-be-phi.vercel.app/boards"
        );
        const stateResponse = await fetch(
          "https://cos-40004-dashboard-be-phi.vercel.app/states"
        );

        const deviceData = await deviceResponse.json();
        const boardData = await boardResponse.json();
        const stateData = await stateResponse.json();

        setDevices(deviceData);
        setBoards(boardData);
        setStates(stateData);

        const newSensorHistories = { ...sensorHistories };
        for (const device of deviceData) {
          for (const sensor of device.sensors) {
            const response = await fetch(
              `https://cos-40004-dashboard-be-phi.vercel.app/${device._id}/sensors/${sensor.name}/history`
            );
            const data = await response.json();
            newSensorHistories[sensor.name.toLowerCase()] = data.map(
              (item) => ({
                value: item.value,
                timestamp: new Date(item.timestamp),
              })
            );
          }
        }
        setSensorHistories(newSensorHistories);
      } catch (error) {
        console.error("Failed to fetch data", error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 1000); // Poll every 5 seconds.

    // Cleanup function to stop the interval when the component is unmounted.
    return () => clearInterval(interval);
  }, []);

  // These functions handle changes in the selected scenario, device, and state
  const handleScenarioChange = (event) => {
    setSelectedScenario(event.target.value);
    setSelectedDevice("ALL"); // reset the device selection when scenario changes
    setSelectedState("ALL");
  };

  const handleDeviceChange = (event) => {
    setSelectedDevice(event.target.value);
    setSelectedState("ALL");
  };

  const handleStateChange = (event) => {
    setSelectedState(event.target.value);
    setDeviceCount(0); // Reset the count when a new state is selected
    countedDevicesRef.current = []; // Also reset the array of counted devices
  };

  // This function filters devices based on the selected scenario
  const scenarioDevices = devices.filter((device) => {
    if (selectedScenario === "ALL") return true;
    return device.name.startsWith(selectedScenario + "_");
  });

  const checkIdleState = async (
    deviceName,
    sensorName,
    sensorValue,
    parameter
  ) => {
    try {
      // Fetch the historical data from your API
      const response = await fetch(
        `https://cos-40004-dashboard-be-phi.vercel.app/${deviceName}/sensors/${sensorName}/history`
      );
      const history = await response.json();

      if (!history || history.length < 2) {
        return false;
      }

      let isIdle = true;

      let oldestValueWithinTimeframe = history[0].value;
      let oldestTimestampWithinTimeframe = new Date(history[0].timestamp);

      for (let i = 1; i < history.length; i++) {
        let currentValue = history[i].value;
        let currentTimestamp = new Date(history[i].timestamp);
        let percentageChange =
          (Math.abs(currentValue - oldestValueWithinTimeframe) /
            oldestValueWithinTimeframe) *
          100;

        // Discard readings that are older than `parameter` seconds from the current reading
        while (
          currentTimestamp - oldestTimestampWithinTimeframe >
          parameter * 1000
        ) {
          oldestTimestampWithinTimeframe = new Date(history[i].timestamp);
          oldestValueWithinTimeframe = history[i].value;
        }

        if (percentageChange > 5) {
          // Change the value here to your desired threshold (5% was mentioned)
          isIdle = false;
          break;
        }
      }

      return isIdle;
    } catch (error) {
      console.error(error);
      return false;
    }
  };

  // This function checks the state for each sensor and updates the device count for the selected state
  const checkStateForIndividualSensor = (
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
    let isDeviceCounted = false; // New variable to track if a device has already been counted for the selected state

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
          if (checkIdleState(sensorName, sensorValue, parameter)) {
            result = state.name;
          }
          break;
        default:
          break;
      }
    }

    if (
      result === selectedState &&
      !countedDevicesRef.current.includes(deviceName)
    ) {
      countedDevicesRef.current.push(deviceName);
      setDeviceCount((prevCount) => prevCount + 1); // Increment the device count
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
