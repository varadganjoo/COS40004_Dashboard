import React, { useEffect, useState } from "react";
import "./Query.css";

function AverageComponent({ device_id, sensor_name }) {
  const [timePeriod, setTimePeriod] = useState("");
  const [average, setAverage] = useState("");

  const handleInputChange = (event) => {
    setTimePeriod(event.target.value);
  };

  const handleAverageCalculation = () => {
    fetch(
      `/boards/device/${device_id}/sensor/${sensor_name}?timePeriod=${timePeriod}`
    )
      .then((response) => {
        console.log(response);
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
  };

  return (
    <div>
      <input
        type="number"
        placeholder="Enter time in seconds"
        value={timePeriod}
        onChange={handleInputChange}
      />
      <button onClick={handleAverageCalculation}>Calculate Average</button>
      {average && <p>Average: {average}</p>}
    </div>
  );
}

function Query() {
  const [devices, setDevices] = useState([]);
  const [states, setStates] = useState([]);
  const [boards, setBoards] = useState([]);
  const [sensorHistories, setSensorHistories] = useState({});
  const [selectedDevice, setSelectedDevice] = useState("");
  const [selectedState, setSelectedState] = useState({});
  const [averageCalculationSensor, setAverageCalculationSensor] =
    useState(null);
  const [scenario, setScenario] = useState("ALL");

  useEffect(() => {
    fetch("/devices")
      .then((response) => response.json())
      .then((data) => {
        if (data) {
          setDevices(data);
          if (scenario !== "ALL") {
            const relevantDevices = data.filter((device) =>
              device?.name.startsWith(scenario + "_")
            );
            setSelectedDevice(relevantDevices[0]?._id);
          } else {
            setSelectedDevice("");
          }
        }
      });

    fetch("/states")
      .then((response) => response.json())
      .then((data) => {
        if (data) {
          setStates(data);
        }
      });

    fetch("/boards")
      .then((response) => response.json())
      .then((data) => {
        if (data) {
          setBoards(data);
          let newSensorHistories = {};
          for (let board of data) {
            for (let sensor of board?.sensors) {
              let sensorName = sensor?.name.toLowerCase();
              if (!newSensorHistories[sensorName]) {
                newSensorHistories[sensorName] = [];
              }
              newSensorHistories[sensorName].push({
                value: sensor?.value,
                timestamp: new Date(),
              });
            }
          }
          setSensorHistories(newSensorHistories);
        }
      });
  }, [scenario]);

  const handleDeviceSelect = (event) => {
    const selectedValue = event.target.value;
    setSelectedDevice(selectedValue);
  };

  const handleStateSelect = (device, event) => {
    setSelectedState({
      ...selectedState,
      [device]: event.target.value,
    });
  };

  const handleAverageCalculationClick = (sensor_name) => {
    setAverageCalculationSensor(sensor_name);
  };

  const checkIdleState = (sensorName, sensorValue, parameter) => {
    const history = sensorHistories[sensorName];
    if (!history) {
      return false;
    }
    const currentTime = new Date();
    const relevantHistory = history.filter(
      (entry) => (currentTime - entry.timestamp) / 1000 <= parameter
    );
    if (relevantHistory.length === 0) {
      return false;
    }
    const min = Math.min(...relevantHistory.map((entry) => entry.value));
    const max = Math.max(...relevantHistory.map((entry) => entry.value));
    return max - min <= sensorValue * 0.01;
  };

  const checkStateForIndividualSensor = (
    sensorName,
    sensorValue,
    deviceName
  ) => {
    const matchingStates = states.filter((state) => {
      return (
        state.device_name.toLowerCase() === deviceName.toLowerCase() &&
        state.sensor_name.toLowerCase() === sensorName.toLowerCase()
      );
    });

    let result = "Default";

    for (let state of matchingStates) {
      switch (state.condition) {
        case "<":
          if (sensorValue < state.parameter) result = state.name;
          break;
        case ">":
          if (sensorValue > state.parameter) result = state.name;
          break;
        case "<=":
          if (sensorValue <= state.parameter) result = state.name;
          break;
        case ">=":
          if (sensorValue >= state.parameter) result = state.name;
          break;
        case "==":
          if (sensorValue === state.parameter) result = state.name;
          break;
        case "!=":
          if (sensorValue !== state.parameter) result = state.name;
          break;
        case "idle":
          if (checkIdleState(sensorName, sensorValue, state.parameter)) {
            result = state.name;
          }
          break;
        default:
          break;
      }
    }

    return result;
  };

  const deviceBoards =
    selectedDevice !== ""
      ? boards.filter((board) => board.device_id === selectedDevice)
      : boards;
  deviceBoards.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  const recentBoard = deviceBoards[0];

  const device = devices.find((device) => device._id === selectedDevice);

  let deviceName;
  if (device) {
    deviceName = device.name;
  } else {
    console.error(`No device found with id ${selectedDevice}`);
    deviceName = "";
  }

  const displaySensors = (sensor, index) => {
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
          sensorName,
          val,
          deviceName
        );
        if (
          selectedState[selectedDevice] &&
          selectedState[selectedDevice] !== state
        )
          return null;
        return (
          <div key={`${sensorName}-${index}`} className="sensorData">
            <p>Sensor Name: {sensorName}</p>
            <p>Sensor Value: {val}</p>
            <p>Sensor State: {state}</p>
            <button onClick={() => handleAverageCalculationClick(sensorName)}>
              Find Average
            </button>
            {averageCalculationSensor === sensorName && (
              <AverageComponent
                device_id={selectedDevice}
                sensor_name={sensorName}
              />
            )}
          </div>
        );
      });
    } else {
      const sensorName = sensor.name.toLowerCase();
      const sensorState = checkStateForIndividualSensor(
        sensorName,
        sensor.value,
        deviceName
      );

      if (
        selectedState[selectedDevice] &&
        selectedState[selectedDevice] !== sensorState
      )
        return null;

      return (
        <div key={`${sensor.name}-${index}`} className="sensorData">
          <p>Sensor Name: {sensorName}</p>
          <p>Sensor Value: {sensor.value}</p>
          <p>Sensor State: {sensorState}</p>
          <button onClick={() => handleAverageCalculationClick(sensorName)}>
            Find Average
          </button>
          {averageCalculationSensor === sensorName && (
            <AverageComponent
              device_id={selectedDevice}
              sensor_name={sensorName}
            />
          )}
        </div>
      );
    }
  };

  console.log(states);

  return (
    <div className="Query">
      <select onChange={(event) => setScenario(event.target.value)}>
        <option value="ALL">ALL</option>
        <option value="CAR">CAR</option>
        <option value="FACTORY">FACTORY</option>
        <option value="OFFICE">OFFICE</option>
      </select>
      {scenario !== "ALL" && (
        <>
          <select onChange={handleDeviceSelect}>
            <option value="">ALL</option>
            {devices
              .filter(
                (device) =>
                  scenario === "ALL" || device.name.includes(`${scenario}_`)
              )
              .map((device) => (
                <option key={device._id} value={device._id}>
                  {device.name}
                </option>
              ))}
          </select>
          <select
            onChange={(event) => handleStateSelect(selectedDevice, event)}
            value={selectedState[selectedDevice]}
          >
            <option value="" default>
              Select a state
            </option>
            {states
              .filter((state) => state.device_name === deviceName)
              .map((state, index) => (
                <option key={index} value={state.name}>
                  {state.name}
                </option>
              ))}
          </select>
        </>
      )}
      {deviceName && <h2>Device: {deviceName}</h2>}{" "}
      {recentBoard && recentBoard.sensors.map(displaySensors)}
    </div>
  );
}

export { Query };
