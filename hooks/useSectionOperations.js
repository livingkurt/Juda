"use client";

import { useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  useGetSectionsQuery,
  useCreateSectionMutation,
  useUpdateSectionMutation,
  useDeleteSectionMutation,
} from "@/lib/store/api/sectionsApi";
import { openSectionDialog, closeSectionDialog, setEditingSection } from "@/lib/store/slices/uiSlice";

/**
 * Section operation handlers
 * Uses Redux directly - no prop drilling needed
 */
export function useSectionOperations({
  // These are passed from parent because they're managed by useSectionExpansion hook
  autoCollapsedSections,
  setManuallyExpandedSections,
  manuallyCollapsedSections,
  setManuallyCollapsedSections,
} = {}) {
  const dispatch = useDispatch();

  // Get manuallyExpandedSections from Redux
  const manuallyExpandedSectionsArray = useSelector(state => state.sectionExpansion.manuallyExpandedSections);
  const manuallyExpandedSections = useMemo(
    () => new Set(manuallyExpandedSectionsArray),
    [manuallyExpandedSectionsArray]
  );

  // Get state from Redux
  const editingSection = useSelector(state => state.ui.editingSection);

  // RTK Query hooks
  const { data: sections = [] } = useGetSectionsQuery();
  const [createSectionMutation] = useCreateSectionMutation();
  const [updateSectionMutation] = useUpdateSectionMutation();
  const [deleteSectionMutation] = useDeleteSectionMutation();

  // Wrapper functions
  const createSection = useCallback(
    async sectionData => {
      return await createSectionMutation(sectionData).unwrap();
    },
    [createSectionMutation]
  );

  const updateSection = useCallback(
    async (id, sectionData) => {
      return await updateSectionMutation({ id, ...sectionData }).unwrap();
    },
    [updateSectionMutation]
  );

  const deleteSection = useCallback(
    async id => {
      return await deleteSectionMutation(id).unwrap();
    },
    [deleteSectionMutation]
  );

  // Edit section
  const handleEditSection = useCallback(
    section => {
      dispatch(setEditingSection(section));
      dispatch(openSectionDialog());
    },
    [dispatch]
  );

  // Add section
  const handleAddSection = useCallback(() => {
    dispatch(setEditingSection(null));
    dispatch(openSectionDialog());
  }, [dispatch]);

  // Save section
  const handleSaveSection = useCallback(
    async sectionData => {
      if (editingSection) {
        await updateSection(editingSection.id, sectionData);
      } else {
        await createSection(sectionData);
      }
      dispatch(setEditingSection(null));
      dispatch(closeSectionDialog());
    },
    [editingSection, updateSection, createSection, dispatch]
  );

  // Delete section
  const handleDeleteSection = useCallback(

        console.warn("Cannot delete section: You need at least one section");
        return;
      }
      await deleteSection(sectionId);
    },
    [sections.length, deleteSection]
  );

  // Toggle section expand (Redux only, no database updates)
  const handleToggleSectionExpand = useCallback(
    sectionId => {
      if (!setManuallyCollapsedSections || !setManuallyExpandedSections) {
        console.warn("Section expansion setters not provided");
        return;
      }

      const isManuallyCollapsed = manuallyCollapsedSections?.has(sectionId) || false;
      const isAutoCollapsed = autoCollapsedSections?.has(sectionId) || false;
      const isManuallyExpanded = manuallyExpandedSections?.has(sectionId) || false;

      // Current collapsed state
      const isCurrentlyCollapsed = isManuallyCollapsed || (isAutoCollapsed && !isManuallyExpanded);

      if (isCurrentlyCollapsed) {
        // Currently collapsed, so expand it
        // Remove from manually collapsed
        setManuallyCollapsedSections(prev => {
          const newSet = new Set(prev);
          newSet.delete(sectionId);
          return newSet;
        });

        // If it's auto-collapsed, mark as manually expanded
        if (isAutoCollapsed) {
          setManuallyExpandedSections(prev => {
            const newSet = new Set(prev);
            newSet.add(sectionId);
            return newSet;
          });
        }
      } else {
        // Currently expanded, so collapse it
        // Add to manually collapsed
        setManuallyCollapsedSections(prev => {
          const newSet = new Set(prev);
          newSet.add(sectionId);
          return newSet;
        });

        // Remove from manually expanded
        setManuallyExpandedSections(prev => {
          const newSet = new Set(prev);
          newSet.delete(sectionId);
          return newSet;
        });
      }
    },
    [
      manuallyCollapsedSections,
      autoCollapsedSections,
      manuallyExpandedSections,
      setManuallyExpandedSections,
      setManuallyCollapsedSections,
    ]
  );

  return useMemo(
    () => ({
      // Data
      sections,
      editingSection,

      // Raw operations
      createSection,
      updateSection,
      deleteSection,

      // Handler functions
      handleEditSection,
      handleAddSection,
      handleSaveSection,
      handleDeleteSection,
      handleToggleSectionExpand,
    }),
    [
      sections,
      editingSection,
      createSection,
      updateSection,
      deleteSection,
      handleEditSection,
      handleAddSection,
      handleSaveSection,
      handleDeleteSection,
      handleToggleSectionExpand,
    ]
  );
}
