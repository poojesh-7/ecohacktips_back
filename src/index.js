const express = require("express");
const cors = require("cors");
const app = express();
const PORT = 3000;
require("./db/db");

const userRouter = require("./route/userRoute");
const hackRouter = require("./route/hackRoute");
const cors = require("cors");

const allowedOrigins = [
  "https://ecohacktips.netlify.app",
  "https://ecohacks-zeta.vercel.app/",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        console.warn(`Blocked by CORS: ${origin}`);
        return callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.options("*", cors());
app.use(express.json());
app.use(userRouter);
app.use(hackRouter);

app.listen(PORT, () => {
  console.log("Listening on port " + PORT);
});
