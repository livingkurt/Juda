"use client";

import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useToast } from "@/hooks/useToast";
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
  setAutoCollapsedSections,
  setManuallyExpandedSections,
} = {}) {
  const dispatch = useDispatch();
  const { toast } = useToast();

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
    async sectionId => {
      if (sections.length <= 1) {
        toast({
          title: "Cannot delete section",
          description: "You need at least one section",
          status: "warning",
          duration: 3000,
          isClosable: true,
        });
        return;
      }
      await deleteSection(sectionId);
    },
    [sections.length, deleteSection, toast]
  );

  // Toggle section expand
  const handleToggleSectionExpand = useCallback(
    async sectionId => {
      const section = sections.find(s => s.id === sectionId);
      if (!section) return;

      const isCurrentlyCollapsed = section.expanded === false || autoCollapsedSections?.has(section.id) || false;
      const willBeExpanded = !isCurrentlyCollapsed;

      // If user is expanding a section that was auto-collapsed, mark it as manually expanded
      if (willBeExpanded && autoCollapsedSections?.has(section.id)) {
        if (setManuallyExpandedSections) {
          setManuallyExpandedSections(prev => {
            const newSet = new Set(prev);
            newSet.add(sectionId);
            return newSet;
          });
        }
        // Clear auto-collapse state
        if (setAutoCollapsedSections) {
          setAutoCollapsedSections(prev => {
            const newSet = new Set(prev);
            newSet.delete(sectionId);
            return newSet;
          });
        }
      }

      // Update manual expanded state
      await updateSection(sectionId, { expanded: !(section.expanded !== false) });
    },
    [sections, autoCollapsedSections, setAutoCollapsedSections, setManuallyExpandedSections, updateSection]
  );

  return {
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
  };
}
