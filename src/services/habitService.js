import { supabase } from "./supabase";

export const habitService = {
  // Get all habits for a user
  async getHabits(userId) {
    const { data, error } = await supabase
      .from("habits")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  },

  // Create a new habit
  async createHabit(userId, habitData) {
    const { data, error } = await supabase
      .from("habits")
      .insert([
        {
          user_id: userId,
          title: habitData.title,
          description: habitData.description,
          reminder_time: habitData.reminder_time,
        },
      ])
      .select();

    if (error) throw error;
    return data[0];
  },

  // Get today's habit entries for a user
  async getTodayHabitEntries(userId) {
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format

    const { data, error } = await supabase
      .from("habit_entries")
      .select(
        `
        *,
        habits!inner (
          id,
          title,
          description,
          reminder_time,
          user_id
        )
      `
      )
      .eq("habits.user_id", userId)
      .eq("date", today);

    if (error) throw error;
    return data;
  },

  // Create or update a habit entry for today
  async updateHabitEntry(habitId, status, notes = "") {
    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("habit_entries")
      .upsert({
        habit_id: habitId,
        date: today,
        status: status,
        completed_at: status === "completed" ? new Date().toISOString() : null,
        notes: notes,
      })
      .select();

    if (error) throw error;
    return data[0];
  },

  // Get the test user (for now)
  async getTestUser() {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", "test@example.com")
      .single();

    if (error) throw error;
    return data;
  },
};
