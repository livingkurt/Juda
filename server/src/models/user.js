const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    wake_time: {
      type: String,
      default: "08:00",
    },
    timezone: {
      type: String,
      default: "UTC",
    },
    device_tokens: [
      {
        type: String,
      },
    ],
    preferences: {
      type: Object,
      default: {
        notifications: {
          enabled: true,
          notification_time: null,
          notification_types: ["push"],
        },
        theme: "light",
        reminder_defaults: {
          relative_to_wake: false,
          minutes_after_wake: 0,
        },
      },
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model("User", userSchema);

module.exports = User;
