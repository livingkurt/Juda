import pool from "../config/database.js";

const createTestUser = async () => {
  try {
    const result = await pool.query(
      "INSERT INTO users (name, email) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING RETURNING *",
      ["Test User", "test@example.com"]
    );

    if (result.rows.length > 0) {
      console.log("Test user created:", result.rows[0]);
    } else {
      console.log("Test user already exists");
      // Get the existing user
      const existingUser = await pool.query(
        "SELECT * FROM users WHERE email = $1",
        ["test@example.com"]
      );
      console.log("Existing user:", existingUser.rows[0]);
    }

    process.exit(0);
  } catch (error) {
    console.error("Error creating test user:", error);
    process.exit(1);
  }
};

createTestUser();
