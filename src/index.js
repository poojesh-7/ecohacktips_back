const express = require("express");
const cors = require("cors");
const app = express();
const PORT = 3000;
require("./db/db");

const userRouter = require("./route/userRoute");
const hackRouter = require("./route/hackRoute");

app.use(
  cors({
    origin: "https://ecohacks-zeta.vercel.app", // ✅ Only allow this origin
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(express.json());
app.use("/api/users", userRouter);
app.use("/api/hacks", hackRouter);

app.listen(PORT, () => {
  console.log("Listening on port " + PORT);
});
