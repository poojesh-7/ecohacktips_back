const jwt = require("jsonwebtoken");
const User = require("../models/user");
const auth = async (req, res, next) => {
  try {
    const header = req.header("Authorization");
    const token = header.replace("Bearer ", "");
    if (!token) {
      throw new Error("please authenticate");
    }
    const idObj = jwt.decode(token, process.env.SECRET_KEY);
    const user = await User.findOne({
      _id: idObj._id,
      "tokens.token": token,
    });
    if (!user) {
      throw new Error("user doesnt exist");
    }
    req.user = user;
    req.token = token;
    next();
  } catch (e) {
    res.status(401).send({ error: "please authenticate" });
  }
};

module.exports = auth;
