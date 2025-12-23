import { useState, useCallback, useEffect } from "react";
import { useAuthFetch } from "./useAuthFetch.js";

export const useFolders = () => {
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const authFetch = useAuthFetch();

  const fetchFolders = useCallback(async () => {
    try {
      setLoading(true);
      const response = await authFetch("/api/folders");
      if (!response.ok) throw new Error("Failed to fetch folders");
      const data = await response.json();
      setFolders(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error("Error fetching folders:", err);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  const createFolder = async folderData => {
    try {
      const response = await authFetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(folderData),
      });
      if (!response.ok) throw new Error("Failed to create folder");
      const newFolder = await response.json();
      setFolders(prev => [...prev, newFolder]);
      return newFolder;
    } catch (err) {
      console.error("Error creating folder:", err);
      throw err;
    }
  };

  const updateFolder = async (id, folderData) => {
    try {
      const response = await authFetch("/api/folders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...folderData }),
      });
      if (!response.ok) throw new Error("Failed to update folder");
      const updatedFolder = await response.json();
      setFolders(prev => prev.map(f => (f.id === id ? updatedFolder : f)));
      return updatedFolder;
    } catch (err) {
      console.error("Error updating folder:", err);
      throw err;
    }
  };

  const deleteFolder = async id => {
    try {
      const response = await authFetch(`/api/folders?id=${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete folder");
      setFolders(prev => prev.filter(f => f.id !== id));
    } catch (err) {
      console.error("Error deleting folder:", err);
      throw err;
    }
  };

  return {
    folders,
    loading,
    error,
    fetchFolders,
    createFolder,
    updateFolder,
    deleteFolder,
  };
};
