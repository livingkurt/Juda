import { useCallback } from "react";

export function useSectionOperations({
  sections,
  createSection,
  updateSection,
  deleteSection,
  editingSection,
  setEditingSection,
  openSectionDialog,
  closeSectionDialog,
  autoCollapsedSections,
  setAutoCollapsedSections,
  setManuallyExpandedSections,
  toast,
}) {
  // Edit section
  const handleEditSection = useCallback(
    section => {
      setEditingSection(section);
      openSectionDialog();
    },
    [setEditingSection, openSectionDialog]
  );

  // Add section
  const handleAddSection = useCallback(() => {
    setEditingSection(null);
    openSectionDialog();
  }, [setEditingSection, openSectionDialog]);

  // Save section
  const handleSaveSection = useCallback(
    async sectionData => {
      if (editingSection) {
        await updateSection(editingSection.id, sectionData);
      } else {
        await createSection(sectionData);
      }
      setEditingSection(null);
      closeSectionDialog();
    },
    [editingSection, updateSection, createSection, setEditingSection, closeSectionDialog]
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

      const isCurrentlyCollapsed = section.expanded === false || autoCollapsedSections.has(section.id);
      const willBeExpanded = !isCurrentlyCollapsed;

      // If user is expanding a section that was auto-collapsed, mark it as manually expanded
      if (willBeExpanded && autoCollapsedSections.has(section.id)) {
        setManuallyExpandedSections(prev => {
          const newSet = new Set(prev);
          newSet.add(sectionId);
          return newSet;
        });
        // Clear auto-collapse state
        setAutoCollapsedSections(prev => {
          const newSet = new Set(prev);
          newSet.delete(sectionId);
          return newSet;
        });
      }

      // Update manual expanded state
      await updateSection(sectionId, { expanded: !(section.expanded !== false) });
    },
    [sections, autoCollapsedSections, setAutoCollapsedSections, setManuallyExpandedSections, updateSection]
  );

  return {
    handleEditSection,
    handleAddSection,
    handleSaveSection,
    handleDeleteSection,
    handleToggleSectionExpand,
  };
}
