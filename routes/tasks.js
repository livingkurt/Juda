import express from "express";
import {
  getTasks,
  createTask,
  completeTask,
} from "../controllers/taskController.js";

const router = express.Router();

router.get("/user/:userId", getTasks);
router.post("/user/:userId", createTask);
router.post("/:taskId/complete", completeTask);

export default router;
