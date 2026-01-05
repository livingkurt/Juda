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
  Divider,
  Badge,
} from "@mui/material";
import { Search, Add, Folder, Description, Tag } from "@mui/icons-material";
import { NoteEditor } from "./NoteEditor";
import { TagChip } from "./TagChip";
import dayjs from "dayjs";

export const NotesView = ({
  notes = [],
  folders = [],
  smartFolders = [],
  tags = [],
  onCreateNote,
  onDeleteNote,
  onUpdateNote,
  onCreateFolder,
  onConvertToTask,
  sidebarWidth = 280,
  noteListWidth = 300,
  onSidebarResize,
  onNoteListResize,
}) => {
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
        startWidth: sidebarWidth,
      };
    },
    [sidebarWidth]
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
        startWidth: noteListWidth,
      };
    },
    [noteListWidth]
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

        if (resizeType === "sidebar" && onSidebarResize) {
          const newWidth = Math.max(200, Math.min(600, resizeStartRef.current.startWidth + deltaX));
          onSidebarResize(newWidth);
        } else if (resizeType === "noteList" && onNoteListResize) {
          const newWidth = Math.max(250, Math.min(800, resizeStartRef.current.startWidth + deltaX));
          onNoteListResize(newWidth);
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

    // Add both mouse and touch event listeners
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
  }, [isResizing, resizeType, onSidebarResize, onNoteListResize]);

  const selectedNote = useMemo(() => notes.find(n => n.id === selectedNoteId), [notes, selectedNoteId]);

  const filteredNotes = useMemo(() => {
    let result = notes;

    if (selectedFolderId) {
      result = result.filter(n => n.folderId === selectedFolderId);
    }

    if (selectedSmartFolderId) {
      const sf = smartFolders.find(s => s.id === selectedSmartFolderId);
      if (sf?.tagIds?.length) {
        result = result.filter(n => n.tags?.some(t => sf.tagIds.includes(t.id)));
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(n => n.title?.toLowerCase().includes(q) || n.content?.toLowerCase().includes(q));
    }

    return result.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }, [notes, selectedFolderId, selectedSmartFolderId, searchQuery, smartFolders]);

  const stripHtml = html => html?.replace(/<[^>]*>/g, "").trim() || "";

  return (
    <Box sx={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {/* Left Sidebar - Folders */}
      <Paper
        variant="outlined"
        sx={{
          width: `${sidebarWidth}px`,
          minWidth: `${sidebarWidth}px`,
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
          <IconButton size="small" onClick={onCreateFolder}>
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
              <Badge badgeContent={notes.length} color="primary" max={99} />
            </ListItemButton>

            {smartFolders.length > 0 && (
              <>
                <Divider sx={{ my: 1 }} />
                <Typography variant="overline" sx={{ px: 2, color: "text.secondary" }}>
                  Smart Folders
                </Typography>
                {smartFolders.map(sf => (
                  <ListItemButton
                    key={sf.id}
                    selected={selectedSmartFolderId === sf.id}
                    onClick={() => {
                      setSelectedSmartFolderId(sf.id);
                      setSelectedFolderId(null);
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <Tag fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary={sf.name} />
                  </ListItemButton>
                ))}
              </>
            )}

            <Divider sx={{ my: 1 }} />
            <Typography variant="overline" sx={{ px: 2, color: "text.secondary" }}>
              Folders
            </Typography>
            {folders.map(folder => (
              <ListItemButton
                key={folder.id}
                selected={selectedFolderId === folder.id}
                onClick={() => {
                  setSelectedFolderId(folder.id);
                  setSelectedSmartFolderId(null);
                }}
              >
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <Folder fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={folder.name} />
              </ListItemButton>
            ))}
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
          width: `${noteListWidth}px`,
          minWidth: `${noteListWidth}px`,
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
          <Button fullWidth variant="contained" startIcon={<Add fontSize="small" />} onClick={onCreateNote}>
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
            folders={folders}
            allTags={tags}
            onUpdate={onUpdateNote}
            onDelete={onDeleteNote}
            onConvertToTask={onConvertToTask}
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
            <Button variant="contained" startIcon={<Add fontSize="small" />} onClick={onCreateNote} sx={{ mt: 2 }}>
              New Note
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default NotesView;
