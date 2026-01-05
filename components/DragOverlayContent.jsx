"use client";

import { useMemo } from "react";
import { Box, Typography } from "@mui/material";
import { useGetSectionsQuery } from "@/lib/store/api/sectionsApi";

export function DragOverlayContent({ dragState }) {
  const { data: sections = [] } = useGetSectionsQuery();

  const sectionsById = useMemo(() => {
    const map = new Map();
    sections.forEach(section => {
      map.set(section.id, section);
    });
    return map;
  }, [sections]);

  if (dragState.activeTask) {
    return (
      <Box
        sx={{
          px: 4,
          py: 2,
          borderRadius: "lg",
          bgcolor: "background.paper",
          border: "2px solid",
          borderColor: "primary.main",
          boxShadow: "0 10px 25px -5px rgba(59, 130, 246, 0.4)",
          width: "180px",
          height: "40px",
          opacity: 0.9,
          transform: "rotate(2deg)",
        }}
      >
        <Typography
          variant="body2"
          sx={{
            fontWeight: 600,
            color: "text.primary",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {dragState.activeTask.title}
        </Typography>
      </Box>
    );
  }

  if (dragState.activeId?.startsWith("section-")) {
    const sectionId = dragState.activeId.replace("section-", "");
    return (
      <Box
        sx={{
          px: 4,
          py: 3,
          borderRadius: "lg",
          bgcolor: "background.paper",
          border: "2px solid",
          borderColor: "primary.main",
          boxShadow: "0 10px 25px -5px rgba(59, 130, 246, 0.4)",
          opacity: 0.9,
        }}
      >
        <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary" }}>
          {sectionsById.get(sectionId)?.name || "Section"}
        </Typography>
      </Box>
    );
  }

  return null;
}
