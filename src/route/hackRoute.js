const express = require("express");
const router = express.Router();
const Hack = require("../models/hack");
const User = require("../models/user");
const parseMongooseError = require("../utils/parseMongooseError");
const auth = require("../middleware/auth");

router.post("/createhack", auth, async (req, res) => {
  try {
    const hack = new Hack({
      ...req.body,
      userId: req.user.id,
      username: req.user.username,
      email: req.user.email,
    });
    await hack.save();
    await User.findByIdAndUpdate(req.user.id, { $inc: { ecoPoints: 10 } });
    res.status(201).json({ message: "Hack posted", hack });
  } catch (err) {
    res.status(400).json({ error: err });
  }
});

router.get("/type/:type", async (req, res) => {
  try {
    const isTrending = req.params.type === "trending" ? true : false;
    const hacks = await Hack.find({ trending: isTrending });

    res.status(200).send(hacks);
  } catch (e) {
    res.status(500).send();
  }
});

// GET /hacks/:id
router.get("/slug/:slug/view", async (req, res) => {
  try {
    const hack = await Hack.findOne({ slug: req.params.slug });

    if (!hack) return res.status(404).send({ message: "Hack not found" });
    res.status(200).json(hack);
  } catch (e) {
    res.status(500).json({ message: "Error fetching hack", error: e.message });
  }
});

router.post("/slug/:slug/like", auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const hack = await Hack.findOne({ slug: req.params.slug });
    if (!hack) return res.status(404).json({ message: "Hack not found" });

    const alreadyLiked = hack.likedBy.includes(userId);

    if (alreadyLiked) {
      // Unlike
      hack.likes -= 1;
      hack.likedBy.pull(userId);
    } else {
      // Like
      hack.likes += 1;
      hack.likedBy.push(userId);

      // Remove dislike if present
      if (hack.dislikedBy.includes(userId)) {
        hack.dislikes -= 1;
        hack.dislikedBy.pull(userId);
      }
    }

    await hack.save();

    res.json({
      likes: hack.likes,
      dislikes: hack.dislikes,
      likedBy: hack.likedBy,
      dislikedBy: hack.dislikedBy,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error toggling like", error: err.message });
  }
});

router.post("/slug/:slug/dislike", auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const hack = await Hack.findOne({ slug: req.params.slug });
    if (!hack) return res.status(404).json({ message: "Hack not found" });

    const alreadyLiked = hack.dislikedBy.includes(userId);

    if (alreadyLiked) {
      // Unlike
      hack.dislikes -= 1;
      hack.dislikedBy.pull(userId);
    } else {
      // Like
      hack.dislikes += 1;
      hack.dislikedBy.push(userId);

      // Remove dislike if present
      if (hack.likedBy.includes(userId)) {
        hack.likes -= 1;
        hack.likedBy.pull(userId);
      }
    }

    await hack.save();

    res.json({
      likes: hack.likes,
      dislikes: hack.dislikes,
      likedBy: hack.likedBy,
      dislikedBy: hack.dislikedBy,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error toggling like", error: err.message });
  }
});

router.patch("/update/:slug", auth, async (req, res) => {
  try {
    const hack = await Hack.findOne({ slug: req.params.slug });

    if (!hack) throw new Error("Hack not found");

    if (hack.userId.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .send({ error: "Not authorized to update this hack" });
    }

    const inputFields = [
      "title",
      "image",
      "description",
      "steps",
      "tutorialLink",
    ];
    const updateFields = Object.keys(req.body);

    const validFields = updateFields.every((field) =>
      inputFields.includes(field)
    );

    if (!validFields) {
      throw new Error("Invalid fields in update request");
    }

    updateFields.forEach((field) => {
      hack[field] = req.body[field];
    });

    await hack.save();

    res.status(200).send({ message: "Hack updated", hack });
  } catch (e) {
    res.status(400).send({ error: e.message });
  }
});

router.delete("/delete/:slug", auth, async (req, res) => {
  try {
    const hack = await Hack.findOneAndDelete({
      slug: req.params.slug,
      userId: req.user.id,
    });

    if (!hack) return res.status(404).json({ message: "Hack not found" });

    res.json({ message: "Hack deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
