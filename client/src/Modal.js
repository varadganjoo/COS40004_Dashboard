import React, { useEffect, useState } from "react";
import io from "socket.io-client";
import "./Modal.css";

function Modal({ device, states, onClose }) {
  const [boards, setBoards] = useState([]);
  const [sensorHistories, setSensorHistories] = useState({});

  useEffect(() => {
    // Establish a WebSocket connection with the server
    const socket = io("https://cos-40004-dashboard-be-phi.vercel.app");

    // When a new board data is received, update the state
    socket.on("board", (board) => {
      if (board.device_id === device._id) {
        setBoards((boards) => [board, ...boards]);

        // Save sensor histories
        let newSensorHistories = { ...sensorHistories };
        for (let sensor of board.sensors) {
          let sensorName = sensor.name.toLowerCase();
          if (!newSensorHistories[sensorName]) {
            newSensorHistories[sensorName] = [];
          }
          newSensorHistories[sensorName].push({
            value: sensor.value,
            timestamp: new Date(),
          });
        }
        setSensorHistories(newSensorHistories);
      }
    });

    // Fetch initial board data
    fetch("https://cos-40004-dashboard-be-phi.vercel.app/boards")
      .then((response) => response.json())
      .then((data) => setBoards(data));

    // Disconnect the socket when the component unmounts
    return () => {
      socket.disconnect();
    };
  }, [device._id]);

  const checkIdleState = (sensorName, sensorValue, parameter) => {
    const history = sensorHistories[sensorName];
    if (!history || history.length < 2) {
      return false;
    }

    let isIdle = true;

    if (sensorName === "gps" && Array.isArray(sensorValue)) {
      for (let valueIndex = 0; valueIndex < sensorValue.length; valueIndex++) {
        let previousValue = history[0].value[valueIndex];
        let previousTimestamp = history[0].timestamp;

        for (let i = 1; i < history.length; i++) {
          let currentValue = history[i].value[valueIndex];
          let currentTimestamp = history[i].timestamp;
          let percentageChange =
            (Math.abs(currentValue - previousValue) / previousValue) * 100;

          if (
            percentageChange > 1 ||
            currentTimestamp - previousTimestamp > parameter * 1000
          ) {
            isIdle = false;
            break;
          }

          previousValue = currentValue;
          previousTimestamp = currentTimestamp;
        }
        if (!isIdle) break;
      }
    } else {
      let previousValue = history[0].value;
      let previousTimestamp = history[0].timestamp;

      for (let i = 1; i < history.length; i++) {
        let currentValue = history[i].value;
        let currentTimestamp = history[i].timestamp;
        let percentageChange =
          (Math.abs(currentValue - previousValue) / previousValue) * 100;

        if (
          percentageChange > 1 ||
          currentTimestamp - previousTimestamp > parameter * 1000
        ) {
          isIdle = false;
          break;
        }

        previousValue = currentValue;
        previousTimestamp = currentTimestamp;
      }
    }

    return isIdle;
  };

  const checkStateForIndividualSensor = (sensorName, sensorValue) => {
    const matchingStates = states.filter((state) => {
      return (
        state.device_name.toLowerCase() === device.name.toLowerCase() &&
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
        case "=":
          if (sensorValue === state.parameter) result = state.name;
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

  // Get the most recent board data for this device
  const deviceBoards = boards.filter((board) => board.device_id === device._id);
  deviceBoards.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  const recentBoard = deviceBoards[0];

  return (
    <div className="modal">
      <div className="modal-content">
        <span className="close-button" onClick={onClose}>
          &times;
        </span>
        <h2>{device.Name}</h2>
        {recentBoard && (
          <table>
            <thead>
              <tr>
                <th>Sensor Name</th>
                <th>Value</th>
                <th>State</th>
              </tr>
            </thead>
            <tbody>
              {recentBoard.sensors.map((sensor, sensorIndex) => {
                if (
                  (sensor.name === "BME" || sensor.name === "MPU") &&
                  sensor.type === "i2c" &&
                  Array.isArray(sensor.value)
                ) {
                  const sensorProperties =
                    sensor.name === "BME"
                      ? ["Temperature", "Humidity", "Pressure", "Gas"]
                      : [
                          "Acc-X",
                          "Acc-Y",
                          "Acc-Z",
                          "Gyro-X",
                          "Gyro-Y",
                          "Gyro-Z",
                        ];
                  return sensor.value.map((val, index) => {
                    const sensorName =
                      `${sensor.name}-${sensorProperties[index]}`.toLowerCase();
                    const state = checkStateForIndividualSensor(
                      sensorName,
                      val
                    );
                    return (
                      <tr key={`${sensor.name}-${index}`}>
                        <td>{sensorName}</td>
                        <td>
                          {sensorName === "gps" ? `${val[0]}, ${val[1]}` : val}
                        </td>
                        <td>{state}</td>
                      </tr>
                    );
                  });
                } else {
                  const state = checkStateForIndividualSensor(
                    sensor.name,
                    sensor.value
                  );
                  return (
                    <tr key={`${sensor.name}-${sensorIndex}`}>
                      <td>{sensor.name}</td>
                      <td>
                        {sensor.name === "gps"
                          ? `${sensor.value[0]}, ${sensor.value[1]}`
                          : sensor.value}
                      </td>
                      <td>{state}</td>
                    </tr>
                  );
                }
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default Modal;
