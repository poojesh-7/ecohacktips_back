const mongoose = require("mongoose");
const validator = require("validator");
const slugify = require("slugify");

const hackSchema = new mongoose.Schema({
  title: {
    type: String,
    trim: true,
    required: [true, "Title is required"],
    validate: {
      validator: (v) => v.trim().split(/\s+/).length >= 4,
      message: "Title must be at least 4 words",
    },
  },
  image: {
    type: String,
    trim: true,
    required: [true, "Image URL is required"],
    validate: {
      validator: validator.isURL,
      message: "Invalid image URL",
    },
  },
  description: {
    type: String,
    trim: true,
    required: [true, "Description is required"],
    minlength: [500, "Description must be at least 500 characters"],
  },
  steps: {
    type: [String],
    validate: {
      validator: function (steps) {
        return (
          steps.length >= 3 &&
          steps.every((step) => step.trim().split(/\s+/).length >= 5)
        );
      },
      message: "There must be at least 3 steps, each with at least 5 words",
    },
  },
  likes: {
    type: Number,
    default: 0,
  },
  likedBy: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  dislikes: { type: Number, default: 0 },
  dislikedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  trending: {
    type: Boolean,
    default: false,
  },
  tutorialLink: {
    type: String,
    trim: true,
    validate: {
      validator: (v) => !v || validator.isURL(v),
      message: "Tutorial link must be a valid URL",
    },
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  postedOn: {
    type: Date,
    default: Date.now,
  },
  slug: {
    type: String,
    required: true,
  },
});

hackSchema.pre("validate", async function (next) {
  // Only generate slug if title changed or not set yet
  if (!this.isModified("title")) return next();

  const Hack = mongoose.model("Hack");

  // Get the user's username
  const user = await mongoose.model("User").findById(this.userId);
  if (!user) return next(new Error("User not found"));

  const slug = slugify(`${this.title}-${user.username}`, {
    lower: true,
    strict: true,
  });

  // Check if another hack with same slug exists for this user
  const existing = await Hack.findOne({
    slug,
    userId: this.userId,
    _id: { $ne: this._id }, // ignore if updating same doc
  });

  if (existing) {
    throw {
      type: "duplicate",
      messages: [
        "hack title already exist, same content can result in reduction of ecoPoints",
      ],
    };
  }

  this.slug = slug;
  next();
});

hackSchema.index({ slug: 1, userId: 1 }, { unique: true });

const Hack = mongoose.model("Hack", hackSchema);
module.exports = Hack;
