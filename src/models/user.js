const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Hack = require("./hack");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    minlength: [5, "Username must be at least 5 characters"],
    required: [true, "Username is required"],
    trim: true,
  },
  email: {
    type: String,
    unique: true,
    required: [true, "Email is required"],
    lowercase: true,
    trim: true,
    validate: {
      validator: validator.isEmail,
      message: "Invalid email format",
    },
  },
  password: {
    type: String,
    required: function () {
      return !this.googleId;
    },
    minlength: [7, "Password must be at least 7 characters"],
    validate: {
      validator: function (value) {
        return validator.isStrongPassword(value, {
          minLength: 7,
          minLowercase: 1,
          minUppercase: 1,
          minNumbers: 1,
          minSymbols: 1,
        });
      },
      message:
        "Password must be at least 7 characters long and include 1 uppercase letter, 1 symbol, and 1 number",
    },
  },
  googleId: {
    type: String,
    default: null,
  },
  otp: {
    code: { type: String },
    expiresAt: { type: Date },
  },
  ecoPoints: {
    type: Number,
    default: 0,
  },
  tokens: [],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

userSchema.virtual("postedHacks", {
  ref: "Hack",
  localField: "_id",
  foreignField: "userId",
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  if (this.password) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

userSchema.methods.generateAuth = async function () {
  const user = this;
  const token = jwt.sign(
    {
      _id: user._id.toString(),
    },
    process.env.SECRET_KEY
  );
  user.tokens = [...user.tokens, { token }];
  await user.save();
  return token;
};

userSchema.statics.userLogin = async function (
  email,
  googleId,
  username,
  password
) {
  if (!email) {
    throw {
      type: "validation",
      messages: ["Email is required"],
    };
  }

  const existingUser = await this.findOne({ email });

  if (googleId) {
    if (existingUser) {
      if (!existingUser.googleId) {
        throw {
          type: "conflict",
          messages: [
            {
              field: "email",
              message:
                "Account already exists without Google. Please use password login or link Google from settings.",
            },
          ],
        };
      }
      return existingUser;
    }

    const newUser = new this({
      username: username || email.split("@")[0],
      email,
      googleId,
      isOAuth: true,
    });

    await newUser.save();
    return newUser;
  }

  if (!password) {
    throw {
      type: "validation",
      messages: ["Password is required for email login"],
    };
  }

  if (!existingUser) {
    throw {
      type: "not_found",
      messages: ["No account found with this email"],
    };
  }

  const isMatch = await bcrypt.compare(password, existingUser.password);
  if (!isMatch) {
    throw {
      type: "validation",
      messages: ["Incorrect password"],
    };
  }

  return existingUser;
};

userSchema.pre(
  "deleteOne",
  { document: true, query: false },
  async function (next) {
    const user = this;
    await Hack.updateMany(
      { likedBy: user._id },
      { $pull: { likedBy: user._id }, $inc: { likes: -1 } }
    );
    await Hack.updateMany(
      { dislikedBy: user._id },
      { $pull: { dislikedBy: user._id }, $inc: { dislikes: -1 } }
    );
    await Hack.deleteMany({ userId: user._id });

    next();
  }
);

userSchema.methods.toJSON = function () {
  let user = this;
  let userObject = user.toObject();
  delete userObject.password;
  delete userObject.token;
  return userObject;
};

const User = mongoose.model("User", userSchema);
module.exports = User;
