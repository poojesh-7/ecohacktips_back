const express = require("express");
const cors = require("cors");
const app = express();
const PORT = 3000;
require("./db/db");

const userRouter = require("./route/userRoute");
const hackRouter = require("./route/hackRoute");
app.use(cors());
app.use(express.json());
app.use(userRouter);
app.use(hackRouter);

app.listen(PORT, () => {
  console.log("Listening on port " + PORT);
});
