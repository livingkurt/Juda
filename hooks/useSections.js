import { useState, useEffect, useCallback } from "react";

export const useSections = () => {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSections = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/sections");
      if (!response.ok) throw new Error("Failed to fetch sections");
      const data = await response.json();
      setSections(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error("Error fetching sections:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSections();
  }, [fetchSections]);

  const createSection = async sectionData => {
    try {
      const response = await fetch("/api/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sectionData),
      });
      if (!response.ok) throw new Error("Failed to create section");
      const newSection = await response.json();
      setSections(prev => [...prev, newSection]);
      return newSection;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const updateSection = async (id, sectionData) => {
    try {
      const response = await fetch("/api/sections", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...sectionData }),
      });
      if (!response.ok) throw new Error("Failed to update section");
      const updatedSection = await response.json();
      setSections(prev => prev.map(s => (s.id === id ? updatedSection : s)));
      return updatedSection;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const deleteSection = async id => {
    try {
      const response = await fetch(`/api/sections?id=${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete section");
      setSections(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const reorderSections = async newSections => {
    // Store previous state for rollback
    const previousSections = [...sections];
    // Optimistically update state immediately
    setSections(newSections.map((s, index) => ({ ...s, order: index })));

    try {
      const response = await fetch("/api/sections/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sections: newSections }),
      });
      if (!response.ok) throw new Error("Failed to reorder sections");
      await fetchSections(); // Refresh sections
    } catch (err) {
      // Rollback on error
      setSections(previousSections);
      setError(err.message);
      throw err;
    }
  };

  return {
    sections,
    loading,
    error,
    createSection,
    updateSection,
    deleteSection,
    reorderSections,
    refetch: fetchSections,
  };
};
