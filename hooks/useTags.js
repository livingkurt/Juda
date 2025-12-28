"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthFetch } from "./useAuthFetch.js";
import { useAuth } from "@/hooks/useAuth";

export function useTags() {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const authFetch = useAuthFetch();
  const { isAuthenticated } = useAuth();

  // Fetch all tags
  const fetchTags = useCallback(async () => {
    if (!isAuthenticated) {
      setTags([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await authFetch("/api/tags");
      if (!response.ok) throw new Error("Failed to fetch tags");
      const data = await response.json();
      setTags(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error("Error fetching tags:", err);
    } finally {
      setLoading(false);
    }
  }, [authFetch, isAuthenticated]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  // Create a new tag
  const createTag = useCallback(
    async (name, color = "#6366f1") => {
      try {
        const response = await authFetch("/api/tags", {
          method: "POST",
          body: JSON.stringify({ name, color }),
        });
        if (!response.ok) throw new Error("Failed to create tag");
        const newTag = await response.json();
        setTags(prev => [...prev, newTag].sort((a, b) => a.name.localeCompare(b.name)));
        return newTag;
      } catch (err) {
        console.error("Error creating tag:", err);
        throw err;
      }
    },
    [authFetch]
  );

  // Update a tag
  const updateTag = useCallback(
    async (id, updates) => {
      try {
        const response = await authFetch("/api/tags", {
          method: "PUT",
          body: JSON.stringify({ id, ...updates }),
        });
        if (!response.ok) throw new Error("Failed to update tag");
        const updatedTag = await response.json();
        setTags(prev => prev.map(t => (t.id === id ? updatedTag : t)).sort((a, b) => a.name.localeCompare(b.name)));
        return updatedTag;
      } catch (err) {
        console.error("Error updating tag:", err);
        throw err;
      }
    },
    [authFetch]
  );

  // Delete a tag
  const deleteTag = useCallback(
    async id => {
      try {
        const response = await authFetch(`/api/tags?id=${id}`, {
          method: "DELETE",
        });
        if (!response.ok) throw new Error("Failed to delete tag");
        setTags(prev => prev.filter(t => t.id !== id));
      } catch (err) {
        console.error("Error deleting tag:", err);
        throw err;
      }
    },
    [authFetch]
  );

  // Assign tag to task
  const assignTagToTask = useCallback(
    async (taskId, tagId) => {
      try {
        const response = await authFetch("/api/task-tags", {
          method: "POST",
          body: JSON.stringify({ taskId, tagId }),
        });
        if (!response.ok) throw new Error("Failed to assign tag");
        return await response.json();
      } catch (err) {
        console.error("Error assigning tag:", err);
        throw err;
      }
    },
    [authFetch]
  );

  // Remove tag from task
  const removeTagFromTask = useCallback(
    async (taskId, tagId) => {
      try {
        const response = await authFetch(`/api/task-tags?taskId=${taskId}&tagId=${tagId}`, {
          method: "DELETE",
        });
        if (!response.ok) throw new Error("Failed to remove tag");
      } catch (err) {
        console.error("Error removing tag:", err);
        throw err;
      }
    },
    [authFetch]
  );

  return {
    tags,
    loading,
    error,
    fetchTags,
    createTag,
    updateTag,
    deleteTag,
    assignTagToTask,
    removeTagFromTask,
  };
}
