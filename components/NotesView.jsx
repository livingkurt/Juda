"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Box, Flex, Stack, Group, Text, Title, ActionIcon, Button, TextInput, Badge, Divider } from "@mantine/core";
import {
  Plus,
  Folder,
  FolderPlus,
  Zap,
  Search,
  ChevronRight,
  ChevronDown,
  FileText,
  PanelLeftClose,
  PanelLeft,
  ArrowLeft,
} from "lucide-react";
import { useGetFoldersQuery, useCreateFolderMutation } from "@/lib/store/api/foldersApi.js";
import { useGetSmartFoldersQuery, useCreateSmartFolderMutation } from "@/lib/store/api/smartFoldersApi.js";
import { useAuth } from "@/hooks/useAuth";
import { useSemanticColors } from "@/hooks/useSemanticColors";
import { NoteEditor } from "./NoteEditor";
import { promptUser } from "@/lib/prompt";

export const NotesView = ({
  notes, // Tasks with completionType === "note"
  onCreateNote,
  onDeleteNote,
  onUpdateNote,
  sidebarOpen = true,
  sidebarWidth = 280,
  onSidebarToggle,
  onSidebarResize,
  noteListOpen = true,
  noteListWidth = 300,
  onNoteListToggle,
  onNoteListResize,
}) => {
  const { isAuthenticated } = useAuth();
  const { data: folders = [] } = useGetFoldersQuery(undefined, {
    skip: !isAuthenticated,
  });
  const [createFolderMutation] = useCreateFolderMutation();
  const { data: smartFolders = [] } = useGetSmartFoldersQuery(undefined, {
    skip: !isAuthenticated,
  });
  const [createSmartFolderMutation] = useCreateSmartFolderMutation();

  // Wrapper functions to match old API
  const createFolder = async folderData => {
    return await createFolderMutation(folderData).unwrap();
  };

  const createSmartFolder = async folderData => {
    return await createSmartFolderMutation(folderData).unwrap();
  };

  // Smart folder filtering function (moved from hook)
  const filterNotesBySmartFolder = useCallback((notes, smartFolder) => {
    if (!smartFolder || !smartFolder.filters) return notes;

    return notes.filter(note => {
      // Apply each filter
      const filters = smartFolder.filters;

      // Title filter
      if (filters.title && !note.title.toLowerCase().includes(filters.title.toLowerCase())) {
        return false;
      }

      // Folder filter
      if (filters.folderId && note.folderId !== filters.folderId) {
        return false;
      }

      // Date range filter
      if (filters.dateFrom) {
        const noteDate = new Date(note.createdAt);
        const fromDate = new Date(filters.dateFrom);
        if (noteDate < fromDate) return false;
      }

      if (filters.dateTo) {
        const noteDate = new Date(note.createdAt);
        const toDate = new Date(filters.dateTo);
        if (noteDate > toDate) return false;
      }

      return true;
    });
  }, []);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState(null); // null = "All Notes"
  const [selectedSmartFolderId, setSelectedSmartFolderId] = useState(null);
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [isSidebarResizing, setIsSidebarResizing] = useState(false);
  const [isNoteListResizing, setIsNoteListResizing] = useState(false);
  const sidebarResizeStartRef = useRef(null);
  const noteListResizeStartRef = useRef(null);

  // Mobile navigation state: "folders" | "notes" | "editor"
  const [mobileView, setMobileView] = useState("folders");
  // Initialize mobile state immediately if in browser, otherwise false for SSR
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth < 768;
    }
    return false;
  });

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Handle sidebar resize start
  const handleSidebarResizeStart = e => {
    e.preventDefault();
    setIsSidebarResizing(true);
    sidebarResizeStartRef.current = {
      startX: e.clientX,
      startWidth: sidebarWidth,
    };
  };

  // Handle sidebar resize
  useEffect(() => {
    if (!isSidebarResizing) return;

    const handleMouseMove = e => {
      if (!sidebarResizeStartRef.current || !onSidebarResize) return;
      const deltaX = e.clientX - sidebarResizeStartRef.current.startX;
      const newWidth = Math.max(200, Math.min(600, sidebarResizeStartRef.current.startWidth + deltaX));
      onSidebarResize(newWidth);
    };

    const handleMouseUp = () => {
      setIsSidebarResizing(false);
      sidebarResizeStartRef.current = null;
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isSidebarResizing, sidebarWidth, onSidebarResize]);

  // Handle note list resize start
  const handleNoteListResizeStart = e => {
    e.preventDefault();
    setIsNoteListResizing(true);
    noteListResizeStartRef.current = {
      startX: e.clientX,
      startWidth: noteListWidth,
    };
  };

  // Handle note list resize
  useEffect(() => {
    if (!isNoteListResizing) return;

    const handleMouseMove = e => {
      if (!noteListResizeStartRef.current || !onNoteListResize) return;
      const deltaX = e.clientX - noteListResizeStartRef.current.startX;
      const newWidth = Math.max(250, Math.min(600, noteListResizeStartRef.current.startWidth + deltaX));
      onNoteListResize(newWidth);
    };

    const handleMouseUp = () => {
      setIsNoteListResizing(false);
      noteListResizeStartRef.current = null;
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isNoteListResizing, noteListWidth, onNoteListResize]);

  // Get all unique tags from notes
  const allTags = useMemo(() => {
    const tagSet = new Set();
    notes.forEach(note => {
      const noteTags = note.tags || [];
      noteTags.forEach(tag => {
        const tagName = typeof tag === "string" ? tag : tag.name;
        tagSet.add(tagName);
      });
    });
    return Array.from(tagSet).sort();
  }, [notes]);

  // Filter notes based on selection
  const filteredNotes = useMemo(() => {
    let result = notes;

    // Filter by smart folder
    if (selectedSmartFolderId) {
      const smartFolder = smartFolders.find(sf => sf.id === selectedSmartFolderId);
      if (smartFolder) {
        result = filterNotesBySmartFolder(result, smartFolder);
      }
    }
    // Filter by regular folder
    else if (selectedFolderId) {
      result = result.filter(note => note.folderId === selectedFolderId);
    }
    // "All Notes" - no folder filter

    // Filter by search term
    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(note => {
        const titleMatch = note.title.toLowerCase().includes(lower);
        const contentMatch = (note.content || "").toLowerCase().includes(lower);
        const tagMatch = (note.tags || []).some(tag => {
          const tagName = typeof tag === "string" ? tag : tag.name;
          return tagName.toLowerCase().includes(lower);
        });
        return titleMatch || contentMatch || tagMatch;
      });
    }

    return result.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }, [notes, selectedFolderId, selectedSmartFolderId, smartFolders, filterNotesBySmartFolder, searchTerm]);

  const selectedNote = notes.find(n => n.id === selectedNoteId);

  const { mode, selection } = useSemanticColors();
  const bgColor = mode.bg.surface;
  const sidebarBg = mode.bg.canvas;
  const borderColor = mode.border.default;
  const mutedText = mode.text.secondary;
  const hoverBg = mode.bg.surfaceHover;
  const selectedBg = selection.bg;

  const toggleFolderExpand = folderId => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  // Build folder tree
  const folderTree = useMemo(() => {
    const rootFolders = folders.filter(f => !f.parentId);
    const getChildren = parentId => folders.filter(f => f.parentId === parentId);

    const buildTree = folder => ({
      ...folder,
      children: getChildren(folder.id).map(buildTree),
    });

    return rootFolders.map(buildTree);
  }, [folders]);

  const renderFolder = (folder, depth = 0) => {
    const hasChildren = folder.children && folder.children.length > 0;
    const isExpanded = expandedFolders.has(folder.id);
    const isSelected = selectedFolderId === folder.id && !selectedSmartFolderId;
    const noteCount = notes.filter(n => n.folderId === folder.id).length;

    return (
      <Box key={folder.id}>
        <Flex
          align="center"
          style={{
            paddingLeft: 8 + depth * 16,
            paddingRight: 8,
            paddingTop: 6,
            paddingBottom: 6,
            cursor: "pointer",
            background: isSelected ? selectedBg : "transparent",
            borderRadius: "var(--mantine-radius-md)",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = isSelected ? selectedBg : hoverBg;
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = isSelected ? selectedBg : "transparent";
          }}
          onClick={() => {
            setSelectedFolderId(folder.id);
            setSelectedSmartFolderId(null);
            if (isMobile) setMobileView("notes");
          }}
        >
          {hasChildren ? (
            <ActionIcon
              size="xs"
              variant="subtle"
              onClick={e => {
                e.stopPropagation();
                toggleFolderExpand(folder.id);
              }}
              aria-label="Toggle folder"
            >
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </ActionIcon>
          ) : (
            <Box style={{ width: 24 }} />
          )}
          <Folder size={16} style={{ color: folder.color, marginRight: 8 }} />
          <Text style={{ flex: 1, fontSize: "var(--mantine-font-size-sm)", fontWeight: isSelected ? 500 : 400 }}>
            {folder.name}
          </Text>
          {noteCount > 0 && (
            <Badge size="sm" color="gray" style={{ fontSize: "var(--mantine-font-size-xs)" }}>
              {noteCount}
            </Badge>
          )}
        </Flex>
        {hasChildren && isExpanded && <Box>{folder.children.map(child => renderFolder(child, depth + 1))}</Box>}
      </Box>
    );
  };

  // Mobile layout - show one panel at a time
  if (isMobile) {
    return (
      <Flex style={{ height: "100%", overflow: "hidden", flexDirection: "column" }}>
        {/* Mobile: Folders View */}
        {mobileView === "folders" && (
          <Box style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* Header */}
            <Flex
              style={{
                padding: 12,
                alignItems: "center",
                justifyContent: "space-between",
                borderBottomWidth: "1px",
                borderBottomColor: borderColor,
                borderBottomStyle: "solid",
                background: sidebarBg,
              }}
            >
              <Title size="sm">Notes</Title>
              <Group gap={4}>
                <ActionIcon
                  size="sm"
                  variant="subtle"
                  onClick={() => {
                    const name = promptUser("Folder name:");
                    if (name?.trim()) createFolder({ name: name.trim() });
                  }}
                  aria-label="New Folder"
                >
                  <FolderPlus size={16} />
                </ActionIcon>
                <ActionIcon size="sm" variant="subtle" color="blue" onClick={onCreateNote} aria-label="New Note">
                  <Plus size={16} />
                </ActionIcon>
              </Group>
            </Flex>

            {/* Folder List */}
            <Box style={{ flex: 1, overflowY: "auto", padding: 8, background: bgColor }}>
              {/* All Notes */}
              <Flex
                align="center"
                style={{
                  paddingLeft: 8,
                  paddingRight: 8,
                  paddingTop: 6,
                  paddingBottom: 6,
                  cursor: "pointer",
                  background: !selectedFolderId && !selectedSmartFolderId ? selectedBg : "transparent",
                  borderRadius: "var(--mantine-radius-md)",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor =
                    !selectedFolderId && !selectedSmartFolderId ? selectedBg : hoverBg;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor =
                    !selectedFolderId && !selectedSmartFolderId ? selectedBg : "transparent";
                }}
                onClick={() => {
                  setSelectedFolderId(null);
                  setSelectedSmartFolderId(null);
                  setMobileView("notes");
                }}
              >
                <Box style={{ width: 24 }} />
                <FileText size={16} style={{ marginRight: 8, color: mutedText }} />
                <Text
                  style={{
                    flex: 1,
                    fontSize: "var(--mantine-font-size-sm)",
                    fontWeight: !selectedFolderId && !selectedSmartFolderId ? 500 : 400,
                  }}
                >
                  All Notes
                </Text>
                <ChevronRight size={16} style={{ color: mutedText }} />
              </Flex>

              <Divider style={{ marginTop: 8, marginBottom: 8 }} />

              {/* Smart Folders */}
              <Text size="xs" fw={700} c="gray.6" style={{ paddingLeft: 8, paddingRight: 8, marginBottom: 4 }}>
                SMART FOLDERS
              </Text>
              {smartFolders.map(sf => {
                const isSelected = selectedSmartFolderId === sf.id;
                return (
                  <Flex
                    key={sf.id}
                    align="center"
                    style={{
                      paddingLeft: 8,
                      paddingRight: 8,
                      paddingTop: 6,
                      paddingBottom: 6,
                      cursor: "pointer",
                      background: isSelected ? selectedBg : "transparent",
                      borderRadius: "var(--mantine-radius-md)",
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.backgroundColor = isSelected ? selectedBg : hoverBg;
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.backgroundColor = isSelected ? selectedBg : "transparent";
                    }}
                    onClick={() => {
                      setSelectedSmartFolderId(sf.id);
                      setSelectedFolderId(null);
                      setMobileView("notes");
                    }}
                  >
                    <Box style={{ width: 24 }} />
                    <Zap size={16} style={{ color: sf.color, marginRight: 8 }} />
                    <Text
                      style={{ flex: 1, fontSize: "var(--mantine-font-size-sm)", fontWeight: isSelected ? 500 : 400 }}
                    >
                      {sf.name}
                    </Text>
                    <ChevronRight size={16} style={{ color: mutedText }} />
                  </Flex>
                );
              })}

              <Divider style={{ marginTop: 8, marginBottom: 8 }} />

              {/* Regular Folders */}
              <Text size="xs" fw={700} c="gray.6" style={{ paddingLeft: 8, paddingRight: 8, marginBottom: 4 }}>
                FOLDERS
              </Text>
              {folderTree.map(folder => renderFolder(folder))}
            </Box>
          </Box>
        )}

        {/* Mobile: Notes List View */}
        {mobileView === "notes" && (
          <Box style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* Header with back button */}
            <Flex
              style={{
                padding: 12,
                alignItems: "center",
                gap: 8,
                borderBottomWidth: "1px",
                borderBottomColor: borderColor,
                borderBottomStyle: "solid",
                background: sidebarBg,
              }}
            >
              <ActionIcon size="sm" variant="subtle" onClick={() => setMobileView("folders")} aria-label="Back">
                <ArrowLeft size={20} />
              </ActionIcon>
              <Title size="sm" style={{ flex: 1 }}>
                {selectedSmartFolderId
                  ? smartFolders.find(sf => sf.id === selectedSmartFolderId)?.name
                  : selectedFolderId
                    ? folders.find(f => f.id === selectedFolderId)?.name
                    : "All Notes"}
              </Title>
              <ActionIcon size="sm" variant="subtle" color="blue" onClick={onCreateNote} aria-label="New Note">
                <Plus size={20} />
              </ActionIcon>
            </Flex>

            {/* Search */}
            <Box
              style={{
                padding: 12,
                borderBottomWidth: "1px",
                borderBottomColor: borderColor,
                borderBottomStyle: "solid",
              }}
            >
              <Group gap={8}>
                <Search size={16} style={{ color: mutedText }} />
                <TextInput
                  placeholder="Search notes..."
                  size="sm"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  styles={{
                    input: {
                      backgroundColor: "transparent",
                      borderColor: borderColor,
                      "&:focus": {
                        backgroundColor: "transparent",
                        borderColor: mode.border.focus,
                        boxShadow: `0 0 0 1px ${mode.border.focus}`,
                      },
                      "&:focusVisible": {
                        backgroundColor: "transparent",
                      },
                    },
                  }}
                />
              </Group>
            </Box>

            {/* Note List */}
            <Stack flex={1} style={{ overflowY: "auto", gap: 0, align: "stretch", background: bgColor }}>
              {filteredNotes.map(note => (
                <Box
                  key={note.id}
                  style={{
                    padding: 12,
                    cursor: "pointer",
                    background: selectedNoteId === note.id ? selectedBg : "transparent",
                    borderBottomWidth: "1px",
                    borderBottomColor: borderColor,
                    borderBottomStyle: "solid",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.backgroundColor = selectedNoteId === note.id ? selectedBg : hoverBg;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = selectedNoteId === note.id ? selectedBg : "transparent";
                  }}
                  onClick={() => {
                    setSelectedNoteId(note.id);
                    setMobileView("editor");
                  }}
                >
                  <Text fw={500} size="sm" style={{ lineClamp: 1, overflow: "hidden", textOverflow: "ellipsis" }}>
                    {note.title || "Untitled"}
                  </Text>
                  <Text size="xs" c="gray.6" style={{ lineClamp: 2, overflow: "hidden", marginTop: 4 }}>
                    {(note.content || "").replace(/<[^>]*>/g, "").slice(0, 100) || "No content"}
                  </Text>
                  <Text size="xs" c="gray.6" style={{ marginTop: 4 }}>
                    {new Date(note.updatedAt).toLocaleDateString()}
                  </Text>
                </Box>
              ))}
              {filteredNotes.length === 0 && (
                <Box style={{ padding: 16, textAlign: "center" }}>
                  <Text c="gray.6">No notes found</Text>
                </Box>
              )}
            </Stack>
          </Box>
        )}

        {/* Mobile: Editor View */}
        {mobileView === "editor" && selectedNote && (
          <Box style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* Header with back button */}
            <Flex
              style={{
                padding: 8,
                alignItems: "center",
                gap: 8,
                borderBottomWidth: "1px",
                borderBottomColor: borderColor,
                borderBottomStyle: "solid",
                background: sidebarBg,
              }}
            >
              <ActionIcon size="sm" variant="subtle" onClick={() => setMobileView("notes")} aria-label="Back">
                <ArrowLeft size={20} />
              </ActionIcon>
            </Flex>

            {/* Editor */}
            <Box style={{ flex: 1, overflow: "hidden" }}>
              <NoteEditor
                note={selectedNote}
                folders={folders}
                allTags={allTags}
                onUpdate={onUpdateNote}
                onDelete={onDeleteNote}
                onConvertToTask={note => {
                  onUpdateNote(note.id, { completionType: "checkbox" });
                }}
              />
            </Box>
          </Box>
        )}
      </Flex>
    );
  }

  // Desktop layout - show all panels side by side
  return (
    <Flex style={{ height: "100%", overflow: "hidden" }}>
      {/* Sidebar - Folders */}
      <Box
        style={{
          width: sidebarOpen ? `${sidebarWidth}px` : "0",
          height: "100%",
          background: sidebarBg,
          borderRightWidth: sidebarOpen ? "1px" : "0",
          borderRightColor: borderColor,
          borderRightStyle: "solid",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          position: "relative",
          overflow: "hidden",
          transition: isSidebarResizing ? "none" : "width 0.3s ease-in-out, border-width 0.3s ease-in-out",
        }}
      >
        {/* Sidebar Header */}
        <Flex
          style={{
            padding: 12,
            alignItems: "center",
            justifyContent: "space-between",
            borderBottomWidth: "1px",
            borderBottomColor: borderColor,
            borderBottomStyle: "solid",
          }}
        >
          <Title size="sm">Notes</Title>
          <Group gap={4}>
            <ActionIcon
              size="sm"
              variant="subtle"
              onClick={() => {
                const name = promptUser("Folder name:");
                if (name?.trim()) createFolder({ name: name.trim() });
              }}
              aria-label="New Folder"
            >
              <FolderPlus size={16} />
            </ActionIcon>
            <ActionIcon size="sm" variant="subtle" color="blue" onClick={onCreateNote} aria-label="New Note">
              <Plus size={16} />
            </ActionIcon>
          </Group>
        </Flex>

        {/* Folder List */}
        <Box style={{ flex: 1, overflowY: "auto", padding: 8 }}>
          {/* All Notes */}
          <Flex
            align="center"
            style={{
              paddingLeft: 8,
              paddingRight: 8,
              paddingTop: 6,
              paddingBottom: 6,
              cursor: "pointer",
              background: !selectedFolderId && !selectedSmartFolderId ? selectedBg : "transparent",
              borderRadius: "var(--mantine-radius-md)",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor =
                !selectedFolderId && !selectedSmartFolderId ? selectedBg : hoverBg;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor =
                !selectedFolderId && !selectedSmartFolderId ? selectedBg : "transparent";
            }}
            onClick={() => {
              setSelectedFolderId(null);
              setSelectedSmartFolderId(null);
              if (isMobile) setMobileView("notes");
            }}
          >
            <Box style={{ width: 24 }} />
            <FileText size={16} style={{ marginRight: 8, color: mutedText }} />
            <Text
              style={{
                flex: 1,
                fontSize: "var(--mantine-font-size-sm)",
                fontWeight: !selectedFolderId && !selectedSmartFolderId ? 500 : 400,
              }}
            >
              All Notes
            </Text>
            <Badge size="sm" color="gray" style={{ fontSize: "var(--mantine-font-size-xs)" }}>
              {notes.length}
            </Badge>
          </Flex>

          <Divider style={{ marginTop: 8, marginBottom: 8 }} />

          {/* Smart Folders */}
          <Text size="xs" fw={700} c="gray.6" style={{ paddingLeft: 8, paddingRight: 8, marginBottom: 4 }}>
            SMART FOLDERS
          </Text>
          {smartFolders.map(sf => {
            const isSelected = selectedSmartFolderId === sf.id;
            const matchCount = filterNotesBySmartFolder(notes, sf).length;

            return (
              <Flex
                key={sf.id}
                align="center"
                style={{
                  paddingLeft: 8,
                  paddingRight: 8,
                  paddingTop: 6,
                  paddingBottom: 6,
                  cursor: "pointer",
                  background: isSelected ? selectedBg : "transparent",
                  borderRadius: "var(--mantine-radius-md)",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = isSelected
                    ? "var(--mantine-color-blue-0)"
                    : "var(--mantine-color-gray-1)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = isSelected ? selectedBg : "transparent";
                }}
                onClick={() => {
                  setSelectedSmartFolderId(sf.id);
                  setSelectedFolderId(null);
                  if (isMobile) setMobileView("notes");
                }}
              >
                <Box style={{ width: 24 }} />
                <Zap size={16} style={{ color: sf.color, marginRight: 8 }} />
                <Text style={{ flex: 1, fontSize: "var(--mantine-font-size-sm)", fontWeight: isSelected ? 500 : 400 }}>
                  {sf.name}
                </Text>
                <Badge size="sm" color="purple" style={{ fontSize: "var(--mantine-font-size-xs)" }}>
                  {matchCount}
                </Badge>
              </Flex>
            );
          })}
          <Button
            size="xs"
            variant="subtle"
            style={{ marginLeft: 24, marginTop: 4 }}
            onClick={() => {
              const name = promptUser("Smart folder name:");
              if (name?.trim()) {
                const tagsInput = promptUser("Tags (comma-separated):");
                const tags =
                  tagsInput
                    ?.split(",")
                    .map(t => t.trim())
                    .filter(Boolean) || [];
                createSmartFolder({ name: name.trim(), filters: { tags, operator: "any" } });
              }
            }}
            leftSection={<Plus size={12} />}
          >
            New Smart Folder
          </Button>

          <Divider style={{ marginTop: 8, marginBottom: 8 }} />

          {/* Regular Folders */}
          <Text size="xs" fw={700} c="gray.6" style={{ paddingLeft: 8, paddingRight: 8, marginBottom: 4 }}>
            FOLDERS
          </Text>
          {folderTree.map(folder => renderFolder(folder))}
        </Box>

        {/* Resize Handle */}
        {sidebarOpen && (
          <Box
            style={{
              position: "absolute",
              right: 0,
              top: 0,
              bottom: 0,
              width: "4px",
              cursor: "col-resize",
              background: isSidebarResizing ? mode.border.focus : "transparent",
              transition: "background-color 0.2s",
              zIndex: 10,
              userSelect: "none",
            }}
            onMouseEnter={e => {
              if (!isSidebarResizing) {
                e.currentTarget.style.backgroundColor = mode.interactive.primary;
              }
            }}
            onMouseLeave={e => {
              if (!isSidebarResizing) {
                e.currentTarget.style.backgroundColor = "transparent";
              }
            }}
            onMouseDown={handleSidebarResizeStart}
          />
        )}
      </Box>

      {/* Note List */}
      <Box
        style={{
          width: noteListOpen ? `${noteListWidth}px` : "0",
          height: "100%",
          borderRightWidth: noteListOpen ? "1px" : "0",
          borderRightColor: borderColor,
          borderRightStyle: "solid",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          position: "relative",
          overflow: "hidden",
          transition: isNoteListResizing ? "none" : "width 0.3s ease-in-out, border-width 0.3s ease-in-out",
        }}
      >
        {/* Search */}
        <Box
          style={{
            padding: 12,
            borderBottomWidth: "1px",
            borderBottomColor: borderColor,
            borderBottomStyle: "solid",
          }}
        >
          <Group gap={8}>
            {onSidebarToggle && (
              <ActionIcon
                size="sm"
                variant="subtle"
                onClick={onSidebarToggle}
                aria-label={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
              >
                {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeft size={16} />}
              </ActionIcon>
            )}
            <Search size={16} style={{ color: mutedText }} />
            <TextInput
              placeholder="Search notes..."
              size="sm"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              styles={{
                input: {
                  backgroundColor: "transparent",
                  borderColor: borderColor,
                  "&:focus": {
                    backgroundColor: "transparent",
                    borderColor: mode.border.focus,
                    boxShadow: `0 0 0 1px ${mode.border.focus}`,
                  },
                  "&:focusVisible": {
                    backgroundColor: "transparent",
                  },
                },
              }}
            />
          </Group>
        </Box>

        {/* Note List */}
        <Stack flex={1} style={{ overflowY: "auto", gap: 0, align: "stretch" }}>
          {filteredNotes.map(note => (
            <Box
              key={note.id}
              style={{
                padding: 12,
                cursor: "pointer",
                background: selectedNoteId === note.id ? selectedBg : "transparent",
                borderBottomWidth: "1px",
                borderBottomColor: borderColor,
                borderBottomStyle: "solid",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = selectedNoteId === note.id ? selectedBg : hoverBg;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = selectedNoteId === note.id ? selectedBg : "transparent";
              }}
              onClick={() => {
                setSelectedNoteId(note.id);
                if (isMobile) setMobileView("editor");
              }}
            >
              <Text fw={500} size="sm" style={{ lineClamp: 1, overflow: "hidden", textOverflow: "ellipsis" }}>
                {note.title || "Untitled"}
              </Text>
              <Text size="xs" c="gray.6" style={{ lineClamp: 2, overflow: "hidden", marginTop: 4 }}>
                {/* Strip HTML for preview */}
                {(note.content || "").replace(/<[^>]*>/g, "").slice(0, 100) || "No content"}
              </Text>
              <Group gap={4} style={{ marginTop: 8 }} wrap="wrap">
                {(note.tags || []).slice(0, 3).map(tag => {
                  const tagName = typeof tag === "string" ? tag : tag.name;
                  return (
                    <Badge key={tagName} size="sm" color="blue" style={{ fontSize: "var(--mantine-font-size-xs)" }}>
                      {tagName}
                    </Badge>
                  );
                })}
                {(note.tags || []).length > 3 && (
                  <Badge size="sm" color="gray" style={{ fontSize: "var(--mantine-font-size-xs)" }}>
                    +{note.tags.length - 3}
                  </Badge>
                )}
              </Group>
              <Text size="xs" c="gray.6" style={{ marginTop: 4 }}>
                {new Date(note.updatedAt).toLocaleDateString()}
              </Text>
            </Box>
          ))}
          {filteredNotes.length === 0 && (
            <Box style={{ padding: 16, textAlign: "center" }}>
              <Text c="gray.6">No notes found</Text>
            </Box>
          )}
        </Stack>

        {/* Resize Handle for Note List */}
        {noteListOpen && (
          <Box
            style={{
              position: "absolute",
              right: 0,
              top: 0,
              bottom: 0,
              width: "4px",
              cursor: "col-resize",
              background: isNoteListResizing ? mode.border.focus : "transparent",
              transition: "background-color 0.2s",
              zIndex: 10,
              userSelect: "none",
            }}
            onMouseEnter={e => {
              if (!isNoteListResizing) {
                e.currentTarget.style.backgroundColor = mode.interactive.primary;
              }
            }}
            onMouseLeave={e => {
              if (!isNoteListResizing) {
                e.currentTarget.style.backgroundColor = "transparent";
              }
            }}
            onMouseDown={handleNoteListResizeStart}
          />
        )}
      </Box>

      {/* Note Editor */}
      <Box
        style={{
          flex: 1,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: bgColor,
        }}
      >
        {/* Toggle button for note list */}
        {onNoteListToggle && (
          <Box
            style={{
              padding: 8,
              borderBottomWidth: "1px",
              borderBottomColor: borderColor,
              borderBottomStyle: "solid",
            }}
          >
            <ActionIcon
              size="sm"
              variant="subtle"
              onClick={onNoteListToggle}
              aria-label={noteListOpen ? "Hide note list" : "Show note list"}
            >
              {noteListOpen ? <PanelLeftClose size={16} /> : <PanelLeft size={16} />}
            </ActionIcon>
          </Box>
        )}
        {selectedNote ? (
          <NoteEditor
            note={selectedNote}
            folders={folders}
            allTags={allTags}
            onUpdate={onUpdateNote}
            onDelete={onDeleteNote}
            onConvertToTask={note => {
              // Convert note to checkbox task
              onUpdateNote(note.id, { completionType: "checkbox" });
            }}
          />
        ) : (
          <Flex style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <Stack gap={16} style={{ color: mutedText }}>
              <FileText size={48} />
              <Text>Select a note or create a new one</Text>
              <Button color="blue" leftSection={<Plus size={16} />} onClick={onCreateNote}>
                New Note
              </Button>
            </Stack>
          </Flex>
        )}
      </Box>
    </Flex>
  );
};
