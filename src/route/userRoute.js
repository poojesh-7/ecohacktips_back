const router = require("express").Router();
const User = require("../models/user");
const parseMongooseError = require("../utils/parseMongooseError");
const auth = require("../middleware/auth");

const { OAuth2Client } = require("google-auth-library");
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        type: "validation",
        messages: ["Username, email, and password are required"],
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        type: "duplicate",
        messages: [{ field: "email", message: "Email already in use" }],
      });
    }

    const user = new User({ username, email, password });
    const token = await user.generateAuth();
    await user.save();

    res.status(201).json({ user, token });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(400).json(parseMongooseError(error));
  }
});

router.post("/oauth", async (req, res) => {
  try {
    const { email, password, googleId } = req.body;

    let user;

    if (googleId) {
      // ✅ Handle Google login
      const ticket = await client.verifyIdToken({
        idToken: googleId,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      const emailFromGoogle = payload.email;
      const usernameFromGoogle = payload.name;

      user = await User.userLogin(
        emailFromGoogle,
        googleId,
        usernameFromGoogle
      );
    } else {
      // ✅ Handle email-password login
      if (!email || !password) {
        return res.status(400).json({
          type: "validation",
          messages: ["Email and password are required"],
        });
      }

      user = await User.userLogin(email, null, null, password);
    }

    const token = await user.generateAuth();
    res.status(201).json({ user, token });
  } catch (error) {
    console.error("OAuth login error:", error);
    res.status(400).json(
      error.type
        ? error // structured app error
        : { type: "server", messages: ["Something went wrong"] } // fallback
    );
  }
});

router.get("/profile", auth, async (req, res) => {
  try {
    await req.user.populate("postedHacks");
    res.status(200).json({ user: req.user, postedHacks: req.user.postedHacks });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

router.patch("/updateuser", auth, async (req, res) => {
  try {
    const inputFields = ["username", "email", "password"];
    const updateFields = Object.keys(req.body);
    const validFields = updateFields.every((field) =>
      inputFields.includes(field)
    );
    if (!validFields) {
      throw new Error("invalid fields");
    }
    updateFields.forEach((field) => {
      req.user[field] = req.body[field];
    });
    await req.user.save();
    res.status(200).send(req.user);
  } catch (e) {
    res.status(400).send({ error: e.message });
  }
});

router.post("/logout", auth, async function (req, res) {
  try {
    let tokens = [...req.user.tokens];
    let token = tokens.findIndex((token) => token.token === req.token);

    tokens.splice(token, 1);
    req.user.tokens = tokens;
    await req.user.save();
    res.status(200).send();
  } catch (e) {
    res.status(401).send({ error: e.message });
  }
});

router.delete("/deleteuser", auth, async (req, res) => {
  try {
    await req.user.deleteOne();
    res.status(200).send();
  } catch (e) {
    res.status(400).send();
  }
});

module.exports = router;
