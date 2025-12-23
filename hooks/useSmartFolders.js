import { useState, useCallback, useEffect } from "react";
import { useAuthFetch } from "./useAuthFetch.js";

export const useSmartFolders = () => {
  const [smartFolders, setSmartFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const authFetch = useAuthFetch();

  const fetchSmartFolders = useCallback(async () => {
    try {
      setLoading(true);
      const response = await authFetch("/api/smart-folders");
      if (!response.ok) throw new Error("Failed to fetch smart folders");
      const data = await response.json();
      setSmartFolders(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error("Error fetching smart folders:", err);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    fetchSmartFolders();
  }, [fetchSmartFolders]);

  const createSmartFolder = async folderData => {
    try {
      const response = await authFetch("/api/smart-folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(folderData),
      });
      if (!response.ok) throw new Error("Failed to create smart folder");
      const newFolder = await response.json();
      setSmartFolders(prev => [...prev, newFolder]);
      return newFolder;
    } catch (err) {
      console.error("Error creating smart folder:", err);
      throw err;
    }
  };

  const updateSmartFolder = async (id, folderData) => {
    try {
      const response = await authFetch("/api/smart-folders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...folderData }),
      });
      if (!response.ok) throw new Error("Failed to update smart folder");
      const updatedFolder = await response.json();
      setSmartFolders(prev => prev.map(f => (f.id === id ? updatedFolder : f)));
      return updatedFolder;
    } catch (err) {
      console.error("Error updating smart folder:", err);
      throw err;
    }
  };

  const deleteSmartFolder = async id => {
    try {
      const response = await authFetch(`/api/smart-folders?id=${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete smart folder");
      setSmartFolders(prev => prev.filter(f => f.id !== id));
    } catch (err) {
      console.error("Error deleting smart folder:", err);
      throw err;
    }
  };

  // Helper to filter notes by smart folder criteria
  const filterNotesBySmartFolder = useCallback((notes, smartFolder) => {
    if (!smartFolder?.filters?.tags?.length) return notes;

    const { tags, operator } = smartFolder.filters;

    return notes.filter(note => {
      // Get tag names from the note's tags array (which contains tag objects)
      const noteTags = (note.tags || []).map(tag => (typeof tag === "string" ? tag : tag.name));

      switch (operator) {
        case "all":
          return tags.every(tag => noteTags.includes(tag));
        case "none":
          return tags.every(tag => !noteTags.includes(tag));
        case "any":
        default:
          return tags.some(tag => noteTags.includes(tag));
      }
    });
  }, []);

  return {
    smartFolders,
    loading,
    error,
    fetchSmartFolders,
    createSmartFolder,
    updateSmartFolder,
    deleteSmartFolder,
    filterNotesBySmartFolder,
  };
};
