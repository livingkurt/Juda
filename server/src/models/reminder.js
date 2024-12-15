const mongoose = require("mongoose");

const reminderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    start_time: {
      type: String,
      required: true,
    },
    relative_to_wake: {
      type: Boolean,
      default: false,
    },
    minutes_after_wake: {
      type: Number,
      min: 0,
      validate: {
        validator: function (v) {
          return !this.relative_to_wake || (Number.isInteger(v) && v >= 0);
        },
        message: "minutes_after_wake is required when relative_to_wake is true",
      },
    },
    repeat_pattern: {
      type: {
        type: String,
        enum: ["daily", "weekly", "monthly", "yearly"],
      },
      interval: {
        type: Number,
        min: 1,
      },
    },
    completion_status: {
      type: Boolean,
      default: false,
    },
    completion_time: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Add index for efficient queries
reminderSchema.index({ user: 1, start_time: 1 });

const Reminder = mongoose.model("Reminder", reminderSchema);

module.exports = Reminder;
