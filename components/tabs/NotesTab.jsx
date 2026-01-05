"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  Box,
  Stack,
  Typography,
  Paper,
  Button,
  IconButton,
  TextField,
  InputAdornment,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Badge,
  CircularProgress,
} from "@mui/material";
import { Search, Add, Description } from "@mui/icons-material";
import { NoteEditor } from "@/components/NoteEditor";
import { TagChip } from "@/components/TagChip";
import dayjs from "dayjs";
import { useDispatch, useSelector } from "react-redux";
import { setNotesSidebarWidth, setNotesListWidth } from "@/lib/store/slices/uiSlice";
import {
  useGetTasksQuery,
  useCreateTaskMutation,
  useDeleteTaskMutation,
  useUpdateTaskMutation,
} from "@/lib/store/api/tasksApi";
import { useGetSectionsQuery } from "@/lib/store/api/sectionsApi";

export function NotesTab({ isLoading: tabLoading }) {
  const dispatch = useDispatch();

  // Get data from Redux
  const { data: tasks = [] } = useGetTasksQuery();
  const { data: sections = [] } = useGetSectionsQuery();
  const notesSidebarWidth = useSelector(state => state.ui.notesSidebarWidth || 280);
  const notesListWidth = useSelector(state => state.ui.notesListWidth || 300);

  // Mutations
  const [createTask] = useCreateTaskMutation();
  const [updateTask] = useUpdateTaskMutation();
  const [deleteTask] = useDeleteTaskMutation();

  // Filter note tasks
  const noteTasks = useMemo(() => tasks.filter(t => t.completionType === "note"), [tasks]);

  // Local state
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const [selectedSmartFolderId, setSelectedSmartFolderId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isResizing, setIsResizing] = useState(false);
  const [resizeType, setResizeType] = useState(null);

  const resizeStartRef = useRef(null);
  const rafRef = useRef(null);

  // Helper to get X coordinate from mouse or touch event
  const getClientX = e => {
    if (e.touches && e.touches.length > 0) {
      return e.touches[0].clientX;
    }
    return e.clientX;
  };

  // Start sidebar resize
  const handleSidebarResizeStart = useCallback(
    e => {
      e.preventDefault();
      setIsResizing(true);
      setResizeType("sidebar");
      const clientX = getClientX(e);
      resizeStartRef.current = {
        startX: clientX,
        startWidth: notesSidebarWidth,
      };
    },
    [notesSidebarWidth]
  );

  // Start note list resize
  const handleNoteListResizeStart = useCallback(
    e => {
      e.preventDefault();
      setIsResizing(true);
      setResizeType("noteList");
      const clientX = getClientX(e);
      resizeStartRef.current = {
        startX: clientX,
        startWidth: notesListWidth,
      };
    },
    [notesListWidth]
  );

  // Handle mouse move and touch move during resize
  useEffect(() => {
    if (!isResizing || !resizeType) return;

    const handleMove = e => {
      if (!resizeStartRef.current) return;

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }

      rafRef.current = requestAnimationFrame(() => {
        if (!resizeStartRef.current) return;
        const clientX = getClientX(e);
        const deltaX = clientX - resizeStartRef.current.startX;

        if (resizeType === "sidebar") {
          const newWidth = Math.max(200, Math.min(600, resizeStartRef.current.startWidth + deltaX));
          dispatch(setNotesSidebarWidth(newWidth));
        } else if (resizeType === "noteList") {
          const newWidth = Math.max(250, Math.min(800, resizeStartRef.current.startWidth + deltaX));
          dispatch(setNotesListWidth(newWidth));
        }
      });
    };

    const handleEnd = () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }

      setIsResizing(false);
      setResizeType(null);
      resizeStartRef.current = null;
      rafRef.current = null;
    };

    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleEnd);
    document.addEventListener("touchmove", handleMove, { passive: false });
    document.addEventListener("touchend", handleEnd);
    document.addEventListener("touchcancel", handleEnd);

    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleEnd);
      document.removeEventListener("touchmove", handleMove);
      document.removeEventListener("touchend", handleEnd);
      document.removeEventListener("touchcancel", handleEnd);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [isResizing, resizeType, dispatch]);

  const selectedNote = useMemo(() => noteTasks.find(n => n.id === selectedNoteId), [noteTasks, selectedNoteId]);

  const filteredNotes = useMemo(() => {
    let result = noteTasks;

    if (selectedFolderId) {
      result = result.filter(n => n.folderId === selectedFolderId);
    }

    if (selectedSmartFolderId) {
      // Smart folder logic would go here
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(n => n.title?.toLowerCase().includes(q) || n.content?.toLowerCase().includes(q));
    }

    return result.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }, [noteTasks, selectedFolderId, selectedSmartFolderId, searchQuery]);

  const stripHtml = html => html?.replace(/<[^>]*>/g, "").trim() || "";

  const handleCreateNote = async () => {
    await createTask({
      title: "Untitled Note",
      sectionId: sections[0]?.id,
      completionType: "note",
      content: "",
    }).unwrap();
  };

  const handleDeleteNote = async taskId => {
    await deleteTask(taskId).unwrap();
    if (selectedNoteId === taskId) {
      setSelectedNoteId(null);
    }
  };

  const handleUpdateNote = async (taskId, updates) => {
    await updateTask({ id: taskId, ...updates }).unwrap();
  };

  if (tabLoading) {
    return (
      <Box sx={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress size="xl" />
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {/* Left Sidebar - Folders */}
      <Paper
        variant="outlined"
        sx={{
          width: `${notesSidebarWidth}px`,
          minWidth: `${notesSidebarWidth}px`,
          display: "flex",
          flexDirection: "column",
          borderRadius: 0,
          borderTop: 0,
          borderBottom: 0,
          borderLeft: 0,
          position: "relative",
          transition: isResizing && resizeType === "sidebar" ? "none" : "width 0.3s",
          willChange: isResizing && resizeType === "sidebar" ? "width" : "auto",
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ p: 1.5, borderBottom: 1, borderColor: "divider" }}
        >
          <Typography variant="subtitle2" fontWeight={600}>
            Folders
          </Typography>
          <IconButton size="small" onClick={() => {}}>
            <Add fontSize="small" />
          </IconButton>
        </Stack>

        <Box sx={{ flex: 1, overflow: "auto" }}>
          <List dense disablePadding>
            <ListItemButton
              selected={!selectedFolderId && !selectedSmartFolderId}
              onClick={() => {
                setSelectedFolderId(null);
                setSelectedSmartFolderId(null);
              }}
            >
              <ListItemIcon sx={{ minWidth: 32 }}>
                <Description fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="All Notes" />
              <Badge badgeContent={noteTasks.length} color="primary" max={99} />
            </ListItemButton>
          </List>
        </Box>

        {/* Resize handle between sidebar and notes list */}
        <Box
          onMouseDown={handleSidebarResizeStart}
          onTouchStart={handleSidebarResizeStart}
          sx={{
            position: "absolute",
            right: 0,
            top: 0,
            bottom: 0,
            width: { md: "12px", lg: "4px" },
            cursor: "col-resize",
            bgcolor: isResizing && resizeType === "sidebar" ? "primary.light" : "transparent",
            transition: "background-color 0.2s",
            zIndex: 10,
            userSelect: "none",
            touchAction: "none",
            display: { xs: "none", md: "block" },
            "&:hover": {
              bgcolor: "primary.main",
            },
          }}
        />
      </Paper>

      {/* Middle - Notes List */}
      <Paper
        variant="outlined"
        sx={{
          width: `${notesListWidth}px`,
          minWidth: `${notesListWidth}px`,
          display: "flex",
          flexDirection: "column",
          borderRadius: 0,
          borderTop: 0,
          borderBottom: 0,
          position: "relative",
          transition: isResizing && resizeType === "noteList" ? "none" : "width 0.3s",
          willChange: isResizing && resizeType === "noteList" ? "width" : "auto",
        }}
      >
        <Stack sx={{ p: 1.5, borderBottom: 1, borderColor: "divider" }} spacing={1}>
          <TextField
            size="small"
            fullWidth
            placeholder="Search notes..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          <Button fullWidth variant="contained" startIcon={<Add fontSize="small" />} onClick={handleCreateNote}>
            New Note
          </Button>
        </Stack>

        <Box sx={{ flex: 1, overflow: "auto" }}>
          <List disablePadding>
            {filteredNotes.map(note => (
              <ListItemButton
                key={note.id}
                selected={selectedNoteId === note.id}
                onClick={() => setSelectedNoteId(note.id)}
                sx={{
                  flexDirection: "column",
                  alignItems: "flex-start",
                  py: 1.5,
                  px: 2,
                  borderBottom: 1,
                  borderColor: "divider",
                }}
              >
                <Typography variant="subtitle2" fontWeight={600} noWrap sx={{ width: "100%" }}>
                  {note.title || "Untitled"}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap sx={{ width: "100%" }}>
                  {stripHtml(note.content) || "No content"}
                </Typography>
                <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
                  <Typography variant="caption" color="text.disabled">
                    {dayjs(note.updatedAt).format("MMM D")}
                  </Typography>
                  {note.tags?.slice(0, 2).map(tag => (
                    <TagChip key={tag.id} tag={tag} size="small" sx={{ height: 16, fontSize: "0.6rem" }} />
                  ))}
                </Stack>
              </ListItemButton>
            ))}
          </List>
        </Box>

        {/* Resize handle between notes list and editor */}
        <Box
          onMouseDown={handleNoteListResizeStart}
          onTouchStart={handleNoteListResizeStart}
          sx={{
            position: "absolute",
            right: 0,
            top: 0,
            bottom: 0,
            width: { md: "12px", lg: "4px" },
            cursor: "col-resize",
            bgcolor: isResizing && resizeType === "noteList" ? "primary.light" : "transparent",
            transition: "background-color 0.2s",
            zIndex: 10,
            userSelect: "none",
            touchAction: "none",
            display: { xs: "none", md: "block" },
            "&:hover": {
              bgcolor: "primary.main",
            },
          }}
        />
      </Paper>

      {/* Right - Editor */}
      <Box sx={{ flex: 1, overflow: "hidden", height: "100%" }}>
        {selectedNote ? (
          <NoteEditor
            note={selectedNote}
            folders={[]}
            onUpdate={handleUpdateNote}
            onDelete={handleDeleteNote}
            onConvertToTask={() => {}}
          />
        ) : (
          <Box
            sx={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Description fontSize="large" sx={{ opacity: 0.3 }} />
            <Typography color="text.secondary" sx={{ mt: 2 }}>
              Select a note
            </Typography>
            <Button variant="contained" startIcon={<Add fontSize="small" />} onClick={handleCreateNote} sx={{ mt: 2 }}>
              New Note
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  );
}
