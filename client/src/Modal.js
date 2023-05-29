import React, { useEffect, useState } from "react";
import "./Modal.css";

function Modal({ device, states, onClose }) {
  const [boards, setBoards] = useState([]);
  const [sensorHistories, setSensorHistories] = useState({});

  const fetchSensorHistory = async (deviceId, sensorName) => {
    const response = await fetch(
      `https://cos-40004-dashboard-be-phi.vercel.app/boards/${deviceId}/sensors/${sensorName}/history`
    );
    const data = await response.json();
    return data;
  };

  useEffect(() => {
    // Fetch initial board data
    fetch("https://cos-40004-dashboard-be-phi.vercel.app/boards")
      .then((response) => response.json())
      .then((data) => setBoards(data));

    // Fetch initial sensor histories
    const fetchInitialSensorHistories = async () => {
      const newSensorHistories = { ...sensorHistories };
      for (let sensor of device.sensors) {
        let sensorName = sensor.name.toLowerCase();
        if (!newSensorHistories[sensorName]) {
          const history = await fetchSensorHistory(device._id, sensorName);
          newSensorHistories[sensorName] = history;
        }
      }
      setSensorHistories(newSensorHistories);
    };

    fetchInitialSensorHistories();
  }, [device._id]);

  const checkIdleState = async (deviceName, sensorName, parameter) => {
    const now = new Date();
    const then = new Date(now.getTime() - parameter * 1000); // x seconds ago

    // Convert to ISO format and remove the 'Z' at the end to fit with MongoDB's date format
    const nowISO = now.toISOString().slice(0, -1);
    const thenISO = then.toISOString().slice(0, -1);

    try {
      const currentDataResponse = await fetch(
        `https://cos-40004-dashboard-be-phi.vercel.app/${deviceName}/sensors/${sensorName}/history?timestamp=${nowISO}`
      );
      const pastDataResponse = await fetch(
        `https://cos-40004-dashboard-be-phi.vercel.app/${deviceName}/sensors/${sensorName}/history?timestamp=${thenISO}`
      );

      const currentData = await currentDataResponse.json();
      const pastData = await pastDataResponse.json();

      if (
        currentData.length > 0 &&
        pastData.length > 0 &&
        Math.abs(
          (currentData[0].value - pastData[0].value) / pastData[0].value
        ) <= 0.05
      ) {
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.log(error);
      return false;
    }
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
          console.log(sensorValue, sensorName, state.parameter);
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
