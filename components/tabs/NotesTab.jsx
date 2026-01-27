"use client";

import { useState, useMemo, useRef, useEffect, useCallback, memo, useDeferredValue } from "react";
import {
  Box,
  Stack,
  Typography,
  Paper,
  Button,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Badge,
  CircularProgress,
  Tabs,
  Tab,
  Collapse,
  Divider,
  useMediaQuery,
  ToggleButton,
  ToggleButtonGroup,
  Menu,
  MenuItem,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { Add, Description, Folder, Tag, ArrowBack, Edit, Assignment } from "@mui/icons-material";
import { NoteEditor } from "@/components/NoteEditor";
import { TagChip } from "@/components/TagChip";
import { QuickTaskInput } from "@/components/QuickTaskInput";
import { TaskSearchInput } from "@/components/TaskSearchInput";
import { FolderDialog } from "@/components/dialogs/FolderDialog";
import { SmartFolderDialog } from "@/components/dialogs/SmartFolderDialog";
import dayjs from "dayjs";
import { useDispatch, useSelector } from "react-redux";
import {
  setNotesSidebarWidth,
  setNotesListWidth,
  toggleNotesSidebarOpen,
  toggleNotesListOpen,
  setNotesActiveMobileView,
  setSelectedNoteId,
  setSelectedFolderId,
  setSelectedSmartFolderId,
  addNotesSelectedTag,
  removeNotesSelectedTag,
} from "@/lib/store/slices/uiSlice";
import {
  useGetTasksQuery,
  useCreateTaskMutation,
  useDeleteTaskMutation,
  useUpdateTaskMutation,
} from "@/lib/store/api/tasksApi";
import { useGetSectionsQuery } from "@/lib/store/api/sectionsApi";
import { useGetFoldersQuery } from "@/lib/store/api/foldersApi";
import { useGetSmartFoldersQuery } from "@/lib/store/api/smartFoldersApi";
import { useGetTagsQuery, useCreateTagMutation, useUpdateTaskTagsMutation } from "@/lib/store/api/tagsApi";
import { useLoadingTab } from "@/components/MainTabs";
import { useDialogState } from "@/hooks/useDialogState";
import { useTaskOperations } from "@/hooks/useTaskOperations";

// Memoized note list item component to prevent unnecessary re-renders
const NoteListItem = memo(function NoteListItem({ note, isSelected, onSelect, tags, onTagsChange }) {
  const [tagsMenuOpen, setTagsMenuOpen] = useState(false);
  const [tagsMenuAnchor, setTagsMenuAnchor] = useState(null);

  const handleClick = useCallback(() => {
    onSelect(note.id);
  }, [onSelect, note.id]);

  const stripHtml = html => html?.replace(/<[^>]*>/g, "").trim() || "";

  const displayTags = note.tags || [];

  return (
    <>
      <ListItemButton
        selected={isSelected}
        onClick={handleClick}
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
        <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }} alignItems="center">
          <Typography variant="caption" color="text.disabled">
            {dayjs(note.updatedAt).format("MMM D")}
          </Typography>
          {displayTags.slice(0, 2).map(tag => (
            <Box
              key={tag.id}
              onClick={e => {
                e.stopPropagation();
                setTagsMenuAnchor(e.currentTarget);
                setTagsMenuOpen(true);
              }}
              sx={{ cursor: "pointer", display: "inline-flex" }}
            >
              <TagChip tag={tag} size="xs" />
            </Box>
          ))}
        </Stack>
      </ListItemButton>
      {/* Tags menu */}
      <Menu
        anchorEl={tagsMenuAnchor}
        open={tagsMenuOpen}
        onClose={() => {
          setTagsMenuOpen(false);
          setTagsMenuAnchor(null);
        }}
        onClick={e => e.stopPropagation()}
        PaperProps={{ sx: { minWidth: "250px", maxHeight: "350px", overflowY: "auto" } }}
      >
        <Box sx={{ p: 2, minWidth: "250px", maxHeight: "350px", overflowY: "auto" }}>
          {/* Selected tags */}
          {displayTags && displayTags.length > 0 && (
            <>
              <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mb: 1, display: "block" }}>
                Selected Tags
              </Typography>
              <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mb: 2 }}>
                {displayTags.map(tag => (
                  <TagChip
                    key={tag.id}
                    tag={tag}
                    size="xs"
                    onClick={e => {
                      e.stopPropagation();
                      const currentTagIds = displayTags.map(t => t.id);
                      onTagsChange(
                        note.id,
                        currentTagIds.filter(id => id !== tag.id)
                      );
                    }}
                    sx={{ cursor: "pointer" }}
                  />
                ))}
              </Stack>
            </>
          )}

          {/* Available tags */}
          {tags.filter(t => !displayTags.some(dt => dt.id === t.id)).length > 0 && (
            <>
              {displayTags && displayTags.length > 0 && (
                <Box
                  sx={{
                    borderTop: "1px solid",
                    borderColor: "divider",
                    my: 1,
                  }}
                />
              )}
              <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mb: 1, display: "block" }}>
                Available Tags
              </Typography>
              {tags
                .filter(t => !displayTags.some(dt => dt.id === t.id))
                .map(tag => (
                  <MenuItem
                    key={tag.id}
                    onClick={e => {
                      e.stopPropagation();
                      const currentTagIds = displayTags.map(t => t.id);
                      onTagsChange(note.id, [...currentTagIds, tag.id]);
                    }}
                    sx={{
                      "&:hover": {
                        bgcolor: "action.hover",
                      },
                    }}
                  >
                    <TagChip tag={tag} size="xs" />
                  </MenuItem>
                ))}
            </>
          )}

          {/* Show message if all tags are selected */}
          {tags.length > 0 && displayTags.length === tags.length && (
            <Typography variant="body2" sx={{ px: 1, py: 2, color: "text.secondary" }}>
              All tags assigned to this note
            </Typography>
          )}

          {/* Show message if no tags exist */}
          {tags.length === 0 && (
            <Typography variant="body2" sx={{ px: 1, py: 2, color: "text.secondary" }}>
              No tags available. Create tags in the task dialog.
            </Typography>
          )}
        </Box>
      </Menu>
    </>
  );
});

export function NotesTab({ isLoading }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const dispatch = useDispatch();

  const { loadingTab } = useLoadingTab();
  const tabLoading = isLoading ?? loadingTab === 3;

  // Dialog states
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [smartFolderDialogOpen, setSmartFolderDialogOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState(null);
  const [editingSmartFolder, setEditingSmartFolder] = useState(null);

  // Local state
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearch = useDeferredValue(searchQuery);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeType, setResizeType] = useState(null);

  const resizeStartRef = useRef(null);
  const rafRef = useRef(null);

  // Redux state
  const notesSidebarOpen = useSelector(state => state.ui.notesSidebarOpen ?? true);
  const notesListOpen = useSelector(state => state.ui.notesListOpen ?? true);
  const notesSidebarWidth = useSelector(state => state.ui.notesSidebarWidth ?? 280);
  const notesListWidth = useSelector(state => state.ui.notesListWidth ?? 300);
  const notesActiveMobileView = useSelector(state => state.ui.notesActiveMobileView ?? "notes");
  const selectedNoteId = useSelector(state => state.ui.selectedNoteId);
  const selectedFolderId = useSelector(state => state.ui.selectedFolderId);
  const selectedSmartFolderId = useSelector(state => state.ui.selectedSmartFolderId);
  const notesSelectedTagIds = useSelector(state => state.ui.notesSelectedTagIds || []);

  // Dialog state
  const dialogState = useDialogState();

  // Task operations
  const taskOps = useTaskOperations();

  // RTK Query
  const { data: tasks = [] } = useGetTasksQuery();
  const { data: sections = [] } = useGetSectionsQuery();
  const { data: folders = [] } = useGetFoldersQuery();
  const { data: smartFolders = [] } = useGetSmartFoldersQuery();
  const { data: tags = [] } = useGetTagsQuery();
  const [createTagMutation] = useCreateTagMutation();
  const [updateTaskTags] = useUpdateTaskTagsMutation();
  const [createTask] = useCreateTaskMutation();
  const [updateTask] = useUpdateTaskMutation();
  const [deleteTask] = useDeleteTaskMutation();

  // Filter note tasks
  const noteTasks = useMemo(() => tasks.filter(t => t.completionType === "note"), [tasks]);

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

  const stripHtml = html => html?.replace(/<[^>]*>/g, "").trim() || "";

  const filteredNotes = useMemo(() => {
    let result = noteTasks;

    if (selectedFolderId) {
      result = result.filter(n => n.folderId === selectedFolderId);
    }

    if (selectedSmartFolderId) {
      const sf = smartFolders.find(s => s.id === selectedSmartFolderId);
      const tagIds = sf?.filters?.tags || [];
      const operator = sf?.filters?.operator || "any";

      if (tagIds.length > 0) {
        result = result.filter(note => {
          const noteTagIds = note.tags?.map(t => t.id) || [];
          if (operator === "any") {
            return tagIds.some(id => noteTagIds.includes(id));
          }
          if (operator === "all") {
            return tagIds.every(id => noteTagIds.includes(id));
          }
          if (operator === "none") {
            return !tagIds.some(id => noteTagIds.includes(id));
          }
          return true;
        });
      }
    }

    if (deferredSearch.trim()) {
      const q = deferredSearch.toLowerCase();
      result = result.filter(
        n => n.title?.toLowerCase().includes(q) || stripHtml(n.content)?.toLowerCase().includes(q)
      );
    }

    // Filter by tags
    if (notesSelectedTagIds.length > 0) {
      result = result.filter(note => note.tags?.some(tag => notesSelectedTagIds.includes(tag.id)));
    }

    return result.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }, [noteTasks, selectedFolderId, selectedSmartFolderId, deferredSearch, smartFolders, notesSelectedTagIds]);

  const handleCreateNote = useCallback(
    async titleOverride => {
      // Allow creating notes without a section (sectionId can be null)
      // Handle both cases: when called with a string (from QuickTaskInput) or without args (from button click)
      const title = typeof titleOverride === "string" && titleOverride.trim() ? titleOverride.trim() : "Untitled Note";
      const result = await createTask({
        title,
        sectionId: sections[0]?.id || null,
        completionType: "note",
        content: "",
        folderId: selectedFolderId || null,
      }).unwrap();
      const createdId = result?.id || null;
      dispatch(setSelectedNoteId(createdId));

      if (createdId && selectedSmartFolderId) {
        const smartFolder = smartFolders.find(folder => folder.id === selectedSmartFolderId);
        const smartTagIds = smartFolder?.filters?.tags || [];
        const operator = smartFolder?.filters?.operator || "any";

        if (smartTagIds.length > 0 && operator !== "none") {
          await updateTaskTags({ taskId: createdId, tagIds: smartTagIds }).unwrap();
        }
      }
      if (isMobile) {
        dispatch(setNotesActiveMobileView("editor"));
      }
    },
    [createTask, sections, selectedFolderId, selectedSmartFolderId, smartFolders, updateTaskTags, isMobile, dispatch]
  );

  const handleSelectNote = useCallback(
    noteId => {
      dispatch(setSelectedNoteId(noteId));
      if (isMobile) {
        dispatch(setNotesActiveMobileView("editor"));
      }
    },
    [dispatch, isMobile]
  );

  const handleBackToNotes = useCallback(() => {
    dispatch(setNotesActiveMobileView("notes"));
  }, [dispatch]);

  const handleMobileTabChange = useCallback(
    (_, newValue) => {
      const views = ["folders", "notes", "editor"];
      dispatch(setNotesActiveMobileView(views[newValue]));
    },
    [dispatch]
  );

  const getMobileTabIndex = useCallback(() => {
    const views = ["folders", "notes", "editor"];
    const index = views.indexOf(notesActiveMobileView);
    return index === -1 ? 1 : index;
  }, [notesActiveMobileView]);

  const handleDeleteNote = async taskId => {
    await deleteTask(taskId).unwrap();
    if (selectedNoteId === taskId) {
      dispatch(setSelectedNoteId(null));
      if (isMobile) {
        dispatch(setNotesActiveMobileView("notes"));
      }
    }
  };

  const handleUpdateNote = async (taskId, updates) => {
    await updateTask({ id: taskId, ...updates }).unwrap();
  };

  const handleCreateTask = useCallback(() => {
    dialogState.openTaskDialog();
  }, [dialogState]);

  if (tabLoading) {
    return (
      <Box sx={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress size={48} />
      </Box>
    );
  }

  if (isMobile) {
    return (
      <>
        <Tabs
          value={getMobileTabIndex()}
          onChange={handleMobileTabChange}
          variant="fullWidth"
          sx={{
            borderBottom: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
            flexShrink: 0,
          }}
        >
          <Tab
            icon={<Folder fontSize="small" />}
            iconPosition="start"
            label="Folders"
            sx={{ fontSize: "0.875rem", minHeight: 48 }}
          />
          <Tab
            icon={<Description fontSize="small" />}
            iconPosition="start"
            label={`Notes (${filteredNotes.length})`}
            sx={{ fontSize: "0.875rem", minHeight: 48 }}
          />
          <Tab
            icon={<Edit fontSize="small" />}
            iconPosition="start"
            label="Editor"
            disabled={!selectedNote}
            sx={{ fontSize: "0.875rem", minHeight: 48 }}
          />
        </Tabs>

        <Box sx={{ flex: 1, overflow: "hidden" }}>
          {notesActiveMobileView === "folders" && (
            <Box sx={{ height: "100%", overflow: "auto" }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 2 }}>
                <Typography variant="h6">Folders</Typography>
                <Stack direction="row" spacing={1}>
                  <IconButton size="small" onClick={() => setFolderDialogOpen(true)}>
                    <Add fontSize="small" />
                  </IconButton>
                </Stack>
              </Stack>

              <List dense>
                <ListItemButton
                  selected={!selectedFolderId && !selectedSmartFolderId}
                  onClick={() => {
                    dispatch(setSelectedFolderId(null));
                    dispatch(setSelectedSmartFolderId(null));
                    dispatch(setNotesActiveMobileView("notes"));
                  }}
                >
                  <ListItemIcon>
                    <Description fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="All Notes" />
                  <Badge badgeContent={noteTasks.length} color="primary" max={99} />
                </ListItemButton>

                <>
                  <Divider sx={{ my: 1 }} />
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 2 }}>
                    <Typography variant="overline">Smart Folders</Typography>
                    <IconButton size="small" onClick={() => setSmartFolderDialogOpen(true)}>
                      <Add fontSize="small" />
                    </IconButton>
                  </Stack>
                  {smartFolders.map(sf => (
                    <ListItemButton
                      key={sf.id}
                      selected={selectedSmartFolderId === sf.id}
                      onClick={() => {
                        dispatch(setSelectedSmartFolderId(sf.id));
                        dispatch(setSelectedFolderId(null));
                        dispatch(setNotesActiveMobileView("notes"));
                      }}
                    >
                      <ListItemIcon>
                        <Tag fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary={sf.name} />
                    </ListItemButton>
                  ))}
                </>

                <Divider sx={{ my: 1 }} />
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 2 }}>
                  <Typography variant="overline">Folders</Typography>
                  <IconButton size="small" onClick={() => setFolderDialogOpen(true)}>
                    <Add fontSize="small" />
                  </IconButton>
                </Stack>
                {folders.map(folder => (
                  <ListItemButton
                    key={folder.id}
                    selected={selectedFolderId === folder.id}
                    onClick={() => {
                      dispatch(setSelectedFolderId(folder.id));
                      dispatch(setSelectedSmartFolderId(null));
                      dispatch(setNotesActiveMobileView("notes"));
                    }}
                  >
                    <ListItemIcon>
                      <Folder fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary={folder.name} />
                  </ListItemButton>
                ))}
              </List>
            </Box>
          )}

          {notesActiveMobileView === "notes" && (
            <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
              <Stack spacing={1} sx={{ p: 2 }}>
                <TaskSearchInput
                  onSearchChange={setSearchQuery}
                  placeholder="Search notes..."
                  tags={tags}
                  selectedTagIds={notesSelectedTagIds}
                  onTagSelect={tagId => dispatch(addNotesSelectedTag(tagId))}
                  onTagDeselect={tagId => dispatch(removeNotesSelectedTag(tagId))}
                  onCreateTag={async (name, color) => {
                    return await createTagMutation({ name, color }).unwrap();
                  }}
                  showPriorityFilter={false}
                  showSort={false}
                  showUntaggedOption={false}
                />
                <QuickTaskInput
                  placeholder="New note title..."
                  onCreate={handleCreateNote}
                  size="small"
                  variant="outlined"
                  fullWidth
                  showUnderlineWhenActive={false}
                />
              </Stack>

              <Box sx={{ flex: 1, overflow: "auto" }}>
                {filteredNotes.map(note => (
                  <NoteListItem
                    key={note.id}
                    note={note}
                    isSelected={selectedNoteId === note.id}
                    onSelect={handleSelectNote}
                    tags={tags}
                    onTagsChange={taskOps.handleTaskTagsChange}
                  />
                ))}
                {filteredNotes.length === 0 && (
                  <Typography color="text.secondary" sx={{ p: 2, textAlign: "center" }}>
                    No notes found
                  </Typography>
                )}
              </Box>
            </Box>
          )}

          {notesActiveMobileView === "editor" && (
            <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
              <Stack direction="row" alignItems="center" sx={{ p: 1, borderBottom: 1, borderColor: "divider" }}>
                <IconButton onClick={handleBackToNotes}>
                  <ArrowBack />
                </IconButton>
                <Typography variant="subtitle2">Back to Notes</Typography>
              </Stack>
              <Box sx={{ flex: 1, overflow: "hidden" }}>
                {selectedNote ? (
                  <NoteEditor
                    note={selectedNote}
                    folders={folders}
                    allTags={tags}
                    onUpdate={handleUpdateNote}
                    onDelete={handleDeleteNote}
                    onConvertToTask={(note, type) => {
                      updateTask({ id: note.id, completionType: type });
                      dispatch(setSelectedNoteId(null));
                      dispatch(setNotesActiveMobileView("notes"));
                    }}
                  />
                ) : (
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
                    <Typography color="text.secondary">Select a note to edit</Typography>
                  </Box>
                )}
              </Box>
            </Box>
          )}
        </Box>

        <FolderDialog
          open={folderDialogOpen}
          onClose={() => {
            setFolderDialogOpen(false);
            setEditingFolder(null);
          }}
          editingFolder={editingFolder}
        />
        <SmartFolderDialog
          open={smartFolderDialogOpen}
          onClose={() => {
            setSmartFolderDialogOpen(false);
            setEditingSmartFolder(null);
          }}
          editingSmartFolder={editingSmartFolder}
        />
      </>
    );
  }

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <ToggleButtonGroup value={notesSidebarOpen ? "folders" : null} exclusive size="small" color="primary">
            <ToggleButton
              value="folders"
              onClick={() => dispatch(toggleNotesSidebarOpen())}
              sx={{
                textTransform: "none",
                minWidth: 100,
                px: 1.5,
              }}
            >
              <Folder fontSize="small" sx={{ mr: 0.5 }} />
              Folders
            </ToggleButton>
          </ToggleButtonGroup>
          <ToggleButtonGroup value={notesListOpen ? "notes" : null} exclusive size="small" color="primary">
            <ToggleButton
              value="notes"
              onClick={() => dispatch(toggleNotesListOpen())}
              sx={{
                textTransform: "none",
                minWidth: 100,
                px: 1.5,
              }}
            >
              <Description fontSize="small" sx={{ mr: 0.5 }} />
              Notes List
            </ToggleButton>
          </ToggleButtonGroup>

          <Box sx={{ flex: 1 }} />

          <Button
            variant="contained"
            size="small"
            startIcon={<Assignment fontSize="small" />}
            onClick={handleCreateTask}
          >
            New Task
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<Add fontSize="small" />}
            onClick={() => handleCreateNote()}
          >
            New Note
          </Button>
        </Stack>
      </Box>

      <Box sx={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <Collapse orientation="horizontal" in={notesSidebarOpen} timeout={300}>
          <Paper
            variant="outlined"
            sx={{
              width: notesSidebarWidth,
              height: "100%",
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
              <Stack direction="row" spacing={0.5}>
                <IconButton size="small" onClick={() => setFolderDialogOpen(true)} title="New Folder">
                  <Add fontSize="small" />
                </IconButton>
              </Stack>
            </Stack>

            <Box sx={{ flex: 1, overflow: "auto" }}>
              <List dense disablePadding>
                <ListItemButton
                  selected={!selectedFolderId && !selectedSmartFolderId}
                  onClick={() => {
                    dispatch(setSelectedFolderId(null));
                    dispatch(setSelectedSmartFolderId(null));
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <Description fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="All Notes" />
                  <Badge badgeContent={noteTasks.length} color="primary" max={99} />
                </ListItemButton>

                <Divider sx={{ my: 1 }} />
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 2 }}>
                  <Typography variant="overline" color="text.secondary">
                    Smart Folders
                  </Typography>
                  <IconButton size="small" onClick={() => setSmartFolderDialogOpen(true)} title="New Smart Folder">
                    <Add fontSize="small" />
                  </IconButton>
                </Stack>
                {smartFolders.map(sf => (
                  <ListItemButton
                    key={sf.id}
                    selected={selectedSmartFolderId === sf.id}
                    onClick={() => {
                      dispatch(setSelectedSmartFolderId(sf.id));
                      dispatch(setSelectedFolderId(null));
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <Tag fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary={sf.name} />
                  </ListItemButton>
                ))}

                <Divider sx={{ my: 1 }} />
                <Typography variant="overline" sx={{ px: 2, color: "text.secondary" }}>
                  Folders
                </Typography>
                {folders.map(folder => (
                  <ListItemButton
                    key={folder.id}
                    selected={selectedFolderId === folder.id}
                    onClick={() => {
                      dispatch(setSelectedFolderId(folder.id));
                      dispatch(setSelectedSmartFolderId(null));
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
        </Collapse>

        <Collapse orientation="horizontal" in={notesListOpen} timeout={300}>
          <Paper
            variant="outlined"
            sx={{
              width: notesListWidth,
              height: "100%",
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
            <Box sx={{ p: 1.5, borderBottom: 1, borderColor: "divider" }}>
              <Box sx={{ mb: 2 }}>
                <TaskSearchInput
                  onSearchChange={setSearchQuery}
                  placeholder="Search notes..."
                  tags={tags}
                  selectedTagIds={notesSelectedTagIds}
                  onTagSelect={tagId => dispatch(addNotesSelectedTag(tagId))}
                  onTagDeselect={tagId => dispatch(removeNotesSelectedTag(tagId))}
                  onCreateTag={async (name, color) => {
                    return await createTagMutation({ name, color }).unwrap();
                  }}
                  showPriorityFilter={false}
                  showSort={false}
                  showUntaggedOption={false}
                />
              </Box>
              <QuickTaskInput
                placeholder="New note title..."
                onCreate={handleCreateNote}
                size="small"
                fullWidth
                showUnderlineWhenActive={false}
              />
            </Box>

            <Box sx={{ flex: 1, overflow: "auto" }}>
              {filteredNotes.map(note => (
                <NoteListItem
                  key={note.id}
                  note={note}
                  isSelected={selectedNoteId === note.id}
                  onSelect={handleSelectNote}
                  tags={tags}
                  onTagsChange={taskOps.handleTaskTagsChange}
                />
              ))}
              <Box sx={{ p: 1.5 }}>
                <QuickTaskInput
                  placeholder="New note title..."
                  onCreate={handleCreateNote}
                  size="small"
                  fullWidth
                  showUnderlineWhenActive={false}
                />
              </Box>
              {filteredNotes.length === 0 && (
                <Typography color="text.secondary" sx={{ p: 2, textAlign: "center" }}>
                  No notes found
                </Typography>
              )}
            </Box>

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
        </Collapse>

        <Box sx={{ flex: 1, overflow: "hidden" }}>
          {selectedNote ? (
            <NoteEditor
              note={selectedNote}
              folders={folders}
              allTags={tags}
              onUpdate={handleUpdateNote}
              onDelete={handleDeleteNote}
              onConvertToTask={(note, type) => {
                updateTask({ id: note.id, completionType: type });
                dispatch(setSelectedNoteId(null));
              }}
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
                Select a note or create a new one
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      <FolderDialog
        open={folderDialogOpen}
        onClose={() => {
          setFolderDialogOpen(false);
          setEditingFolder(null);
        }}
        editingFolder={editingFolder}
      />
      <SmartFolderDialog
        open={smartFolderDialogOpen}
        onClose={() => {
          setSmartFolderDialogOpen(false);
          setEditingSmartFolder(null);
        }}
        editingSmartFolder={editingSmartFolder}
      />
    </Box>
  );
}

export default NotesTab;
