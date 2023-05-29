const express = require("express");
const mongoose = require("mongoose");
const socketio = require("socket.io");
const cors = require("cors");
const Board = require("./models/boards");
const Device = require("./models/devices");
const State = require("./models/states");

const app = express();

// Connect to MongoDB
mongoose.connect(
  "mongodb+srv://topics:xsMhT89vyecwmC9T@cos40004-cluster.athhnll.mongodb.net/IoT_Project_db?retryWrites=true&w=majority",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
);

// Middleware for parsing JSON and urlencoded form data
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// CORS middleware
app.use(cors());

// Routes
app.use("/boards", require("./routes/boards"));
app.use("/devices", require("./routes/devices"));
app.use("/states", require("./routes/states"));

// Set up server to listen on port 3000
// const server = app.listen(3001, () => console.log("Server running..."));

// Set up Socket.IO
const io = require('socket.io')(server, {
  cors: {
    origin: "https://cos-40004-dashboard-be-phi.vercel.app",
    methods: ["GET", "POST"]
  }
});

io.on("connection", (socket) => {
  console.log("New connection: " + socket.id);

  Board.watch().on("change", (change) => {
    io.emit("board", change.fullDocument);
  });
});
