"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthFetch } from "./useAuthFetch.js";
import { useAuth } from "@/hooks/useAuth";

export const useSections = () => {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const authFetch = useAuthFetch();
  const { isAuthenticated } = useAuth();

  const fetchSections = useCallback(async () => {
    if (!isAuthenticated) {
      setSections([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await authFetch("/api/sections");
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
  }, [authFetch, isAuthenticated]);

  useEffect(() => {
    fetchSections();
  }, [fetchSections]);

  const createSection = async sectionData => {
    try {
      const response = await authFetch("/api/sections", {
        method: "POST",
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
    const previousSections = [...sections];

    // Optimistic update
    setSections(prev => prev.map(s => (s.id === id ? { ...s, ...sectionData } : s)));

    try {
      const response = await authFetch("/api/sections", {
        method: "PUT",
        body: JSON.stringify({ id, ...sectionData }),
      });
      if (!response.ok) throw new Error("Failed to update section");
      const updatedSection = await response.json();
      setSections(prev => prev.map(s => (s.id === id ? updatedSection : s)));
      return updatedSection;
    } catch (err) {
      setSections(previousSections);
      setError(err.message);
      throw err;
    }
  };

  const deleteSection = async id => {
    const previousSections = [...sections];

    // Optimistic delete
    setSections(prev => prev.filter(s => s.id !== id));

    try {
      const response = await authFetch(`/api/sections?id=${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete section");
    } catch (err) {
      setSections(previousSections);
      setError(err.message);
      throw err;
    }
  };

  const reorderSections = async newSections => {
    const previousSections = [...sections];

    // Optimistic update with new order
    setSections(newSections.map((s, index) => ({ ...s, order: index })));

    try {
      const response = await authFetch("/api/sections/reorder", {
        method: "PUT",
        body: JSON.stringify({ sections: newSections }),
      });
      if (!response.ok) throw new Error("Failed to reorder sections");
      await fetchSections();
    } catch (err) {
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
