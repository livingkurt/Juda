"use client";

import { Box, Typography, Button } from "@mui/material";
import { Add } from "@mui/icons-material";
import { DragDropContext } from "@hello-pangea/dnd";
import { Section } from "@/components/Section";
import { createDroppableId, createDraggableId } from "@/lib/dragHelpers";
import { useTaskOperations } from "@/hooks/useTaskOperations";
import { useSectionOperations } from "@/hooks/useSectionOperations";

export const GoalsTab = () => {
  const taskOps = useTaskOperations();
  const sectionOps = useSectionOperations();

  const handleCreateGoal = () => {
    taskOps.handleEditTask({ title: "", completionType: "goals" });
  };

  const handleCreateSection = () => {
    sectionOps.handleAddSection();
  };

  const handleDragEnd = () => {};

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <Box
        sx={{
          p: 3,
          borderBottom: "1px solid",
          borderColor: "divider",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          🏆 Goals
        </Typography>
        <Button variant="contained" startIcon={<Add />} onClick={handleCreateGoal}>
          New Goal
        </Button>
      </Box>

      <Box sx={{ flex: 1, overflow: "auto", p: 3 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Create a section filtered to task type &quot;goals&quot; to control where goals appear.
        </Typography>
        <Button variant="outlined" size="small" onClick={handleCreateSection} sx={{ mb: 3 }}>
          New Goals Section
        </Button>
        <DragDropContext onDragEnd={handleDragEnd}>
          <Section
            createDroppableId={createDroppableId}
            createDraggableId={createDraggableId}
            sectionFilter={section =>
              Array.isArray(section.filterCompletionTypes) && section.filterCompletionTypes.includes("goals")
            }
          />
        </DragDropContext>
      </Box>
    </Box>
  );
};
