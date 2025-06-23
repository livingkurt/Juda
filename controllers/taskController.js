import pool from "../config/database.js";

export const getTasks = async (req, res) => {
  try {
    console.log("getTasks called with userId:", req.params.userId);
    const { userId } = req.params;
    const result = await pool.query(
      "SELECT * FROM tasks WHERE user_id = $1 AND is_active = true ORDER BY created_at DESC",
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error("getTasks error:", error);
    res.status(500).json({ error: error.message });
  }
};

export const createTask = async (req, res) => {
  try {
    console.log("createTask called with userId:", req.params.userId);
    console.log("createTask body:", req.body);
    const { userId } = req.params;
    const { title, description, reminder_time } = req.body;

    const result = await pool.query(
      "INSERT INTO tasks (user_id, title, description, reminder_time) VALUES ($1, $2, $3, $4) RETURNING *",
      [userId, title, description, reminder_time]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("createTask error:", error);
    res.status(500).json({ error: error.message });
  }
};

export const completeTask = async (req, res) => {
  try {
    console.log("completeTask called with taskId:", req.params.taskId);
    const { taskId } = req.params;
    const { status, notes } = req.body;

    const result = await pool.query(
      "INSERT INTO task_completions (task_id, status, notes) VALUES ($1, $2, $3) RETURNING *",
      [taskId, status || "completed", notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("completeTask error:", error);
    res.status(500).json({ error: error.message });
  }
};
