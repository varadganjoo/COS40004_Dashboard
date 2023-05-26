import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Header } from "./Header";
import { States } from "./States";
import { Dashboard } from "./Dashboard";
import { DeviceManager } from "./DeviceManager";
import { Query } from "./Query";

function App() {
  return (
    <Router>
      <Header />
      <Routes>
        <Route path="/states" element={<States />} />
        <Route path="/deviceManager" element={<DeviceManager />} />
        <Route path="/query" element={<Query />} />
        <Route path="/" element={<Dashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
