"use client";

import { useState, useMemo } from "react";
import {
  Box,
  Flex,
  VStack,
  HStack,
  Text,
  Heading,
  IconButton,
  Button,
  Input,
  Badge,
  Separator,
} from "@chakra-ui/react";
import {
  Plus,
  Folder,
  FolderPlus,
  Zap,
  Search,
  MoreVertical,
  Edit2,
  Trash2,
  ChevronRight,
  ChevronDown,
  FileText,
  Tag,
} from "lucide-react";
import { useFolders } from "@/hooks/useFolders";
import { useSmartFolders } from "@/hooks/useSmartFolders";
import { NoteEditor } from "./NoteEditor";

export const NotesView = ({
  notes, // Tasks with completionType === "note"
  onCreateNote,
  onEditNote,
  onDeleteNote,
  onUpdateNote,
}) => {
  const { folders, createFolder, updateFolder, deleteFolder } = useFolders();
  const { smartFolders, createSmartFolder, deleteSmartFolder, filterNotesBySmartFolder } = useSmartFolders();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState(null); // null = "All Notes"
  const [selectedSmartFolderId, setSelectedSmartFolderId] = useState(null);
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [expandedFolders, setExpandedFolders] = useState(new Set());

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
          px={2}
          py={1.5}
          pl={2 + depth * 4}
          cursor="pointer"
          bg={{ base: isSelected ? "blue.50" : "transparent", _dark: isSelected ? "blue.900" : "transparent" }}
          _hover={{ bg: { base: isSelected ? "blue.50" : "gray.100", _dark: isSelected ? "blue.900" : "gray.700" } }}
          borderRadius="md"
          onClick={() => {
            setSelectedFolderId(folder.id);
            setSelectedSmartFolderId(null);
          }}
        >
          {hasChildren ? (
            <IconButton
              icon={isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              size="xs"
              variant="ghost"
              onClick={e => {
                e.stopPropagation();
                toggleFolderExpand(folder.id);
              }}
              aria-label="Toggle folder"
            />
          ) : (
            <Box w={6} />
          )}
          <Box as={Folder} size={16} color={folder.color} mr={2} />
          <Text flex={1} fontSize="sm" fontWeight={isSelected ? "medium" : "normal"}>
            {folder.name}
          </Text>
          {noteCount > 0 && (
            <Badge size="sm" colorScheme="gray" fontSize="2xs">
              {noteCount}
            </Badge>
          )}
        </Flex>
        {hasChildren && isExpanded && <Box>{folder.children.map(child => renderFolder(child, depth + 1))}</Box>}
      </Box>
    );
  };

  return (
    <Flex h="100%" overflow="hidden">
      {/* Sidebar - Folders */}
      <Box
        w="250px"
        h="100%"
        bg={{ base: "gray.50", _dark: "gray.900" }}
        borderRightWidth="1px"
        borderColor={{ base: "gray.200", _dark: "gray.600" }}
        display="flex"
        flexDirection="column"
        flexShrink={0}
      >
        {/* Sidebar Header */}
        <Flex
          p={3}
          align="center"
          justify="space-between"
          borderBottomWidth="1px"
          borderColor={{ base: "gray.200", _dark: "gray.600" }}
        >
          <Heading size="sm">Notes</Heading>
          <HStack spacing={1}>
            <IconButton
              icon={<FolderPlus size={16} />}
              size="sm"
              variant="ghost"
              onClick={() => {
                const name = window.prompt("Folder name:");
                if (name?.trim()) createFolder({ name: name.trim() });
              }}
              aria-label="New Folder"
            />
            <IconButton
              icon={<Plus size={16} />}
              size="sm"
              variant="ghost"
              colorScheme="blue"
              onClick={onCreateNote}
              aria-label="New Note"
            />
          </HStack>
        </Flex>

        {/* Folder List */}
        <Box flex={1} overflowY="auto" p={2}>
          {/* All Notes */}
          <Flex
            align="center"
            px={2}
            py={1.5}
            cursor="pointer"
            bg={!selectedFolderId && !selectedSmartFolderId ? "blue.50" : "transparent"}
            _dark={{ bg: !selectedFolderId && !selectedSmartFolderId ? "blue.900" : "transparent" }}
            _hover={{
              bg: !selectedFolderId && !selectedSmartFolderId ? "blue.50" : "gray.100",
              _dark: { bg: !selectedFolderId && !selectedSmartFolderId ? "blue.900" : "gray.700" },
            }}
            borderRadius="md"
            onClick={() => {
              setSelectedFolderId(null);
              setSelectedSmartFolderId(null);
            }}
          >
            <Box w={6} />
            <Box as={FileText} size={16} mr={2} color={{ base: "gray.500", _dark: "gray.400" }} />
            <Text flex={1} fontSize="sm" fontWeight={!selectedFolderId && !selectedSmartFolderId ? "medium" : "normal"}>
              All Notes
            </Text>
            <Badge size="sm" colorScheme="gray" fontSize="2xs">
              {notes.length}
            </Badge>
          </Flex>

          <Separator my={2} />

          {/* Smart Folders */}
          <Text fontSize="xs" fontWeight="bold" color={{ base: "gray.500", _dark: "gray.400" }} px={2} mb={1}>
            SMART FOLDERS
          </Text>
          {smartFolders.map(sf => {
            const isSelected = selectedSmartFolderId === sf.id;
            const matchCount = filterNotesBySmartFolder(notes, sf).length;

            return (
              <Flex
                key={sf.id}
                align="center"
                px={2}
                py={1.5}
                cursor="pointer"
                bg={isSelected ? "blue.50" : "transparent"}
                _dark={{ bg: isSelected ? "blue.900" : "transparent" }}
                _hover={{
                  bg: isSelected ? "blue.50" : "gray.100",
                  _dark: { bg: isSelected ? "blue.900" : "gray.700" },
                }}
                borderRadius="md"
                onClick={() => {
                  setSelectedSmartFolderId(sf.id);
                  setSelectedFolderId(null);
                }}
              >
                <Box w={6} />
                <Box as={Zap} size={16} color={sf.color} mr={2} />
                <Text flex={1} fontSize="sm" fontWeight={isSelected ? "medium" : "normal"}>
                  {sf.name}
                </Text>
                <Badge size="sm" colorScheme="purple" fontSize="2xs">
                  {matchCount}
                </Badge>
              </Flex>
            );
          })}
          <Button
            size="xs"
            variant="ghost"
            leftIcon={<Plus size={12} />}
            ml={6}
            mt={1}
            onClick={() => {
              // Open smart folder creation dialog
              const name = window.prompt("Smart folder name:");
              if (name?.trim()) {
                const tagsInput = window.prompt("Tags (comma-separated):");
                const tags =
                  tagsInput
                    ?.split(",")
                    .map(t => t.trim())
                    .filter(Boolean) || [];
                createSmartFolder({ name: name.trim(), filters: { tags, operator: "any" } });
              }
            }}
          >
            New Smart Folder
          </Button>

          <Separator my={2} />

          {/* Regular Folders */}
          <Text fontSize="xs" fontWeight="bold" color={{ base: "gray.500", _dark: "gray.400" }} px={2} mb={1}>
            FOLDERS
          </Text>
          {folderTree.map(folder => renderFolder(folder))}
        </Box>
      </Box>

      {/* Note List */}
      <Box
        w="300px"
        h="100%"
        borderRightWidth="1px"
        borderColor={{ base: "gray.200", _dark: "gray.600" }}
        display="flex"
        flexDirection="column"
        flexShrink={0}
      >
        {/* Search */}
        <Box p={3} borderBottomWidth="1px" borderColor={{ base: "gray.200", _dark: "gray.600" }}>
          <HStack>
            <Box as={Search} size={16} color={{ base: "gray.500", _dark: "gray.400" }} />
            <Input
              placeholder="Search notes..."
              size="sm"
              variant="unstyled"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </HStack>
        </Box>

        {/* Note List */}
        <VStack flex={1} overflowY="auto" spacing={0} align="stretch">
          {filteredNotes.map(note => (
            <Box
              key={note.id}
              p={3}
              cursor="pointer"
              bg={selectedNoteId === note.id ? "blue.50" : "transparent"}
              _dark={{ bg: selectedNoteId === note.id ? "blue.900" : "transparent" }}
              _hover={{
                bg: selectedNoteId === note.id ? "blue.50" : "gray.100",
                _dark: { bg: selectedNoteId === note.id ? "blue.900" : "gray.700" },
              }}
              borderBottomWidth="1px"
              borderColor={{ base: "gray.200", _dark: "gray.600" }}
              onClick={() => setSelectedNoteId(note.id)}
            >
              <Text fontWeight="medium" fontSize="sm" noOfLines={1}>
                {note.title || "Untitled"}
              </Text>
              <Text fontSize="xs" color={{ base: "gray.500", _dark: "gray.400" }} noOfLines={2} mt={1}>
                {/* Strip HTML for preview */}
                {(note.content || "").replace(/<[^>]*>/g, "").slice(0, 100) || "No content"}
              </Text>
              <HStack mt={2} spacing={1} flexWrap="wrap">
                {(note.tags || []).slice(0, 3).map(tag => {
                  const tagName = typeof tag === "string" ? tag : tag.name;
                  return (
                    <Badge key={tagName} size="sm" colorScheme="blue" fontSize="2xs">
                      {tagName}
                    </Badge>
                  );
                })}
                {(note.tags || []).length > 3 && (
                  <Badge size="sm" colorScheme="gray" fontSize="2xs">
                    +{note.tags.length - 3}
                  </Badge>
                )}
              </HStack>
              <Text fontSize="2xs" color={{ base: "gray.500", _dark: "gray.400" }} mt={1}>
                {new Date(note.updatedAt).toLocaleDateString()}
              </Text>
            </Box>
          ))}
          {filteredNotes.length === 0 && (
            <Box p={4} textAlign="center">
              <Text color={{ base: "gray.500", _dark: "gray.400" }}>No notes found</Text>
            </Box>
          )}
        </VStack>
      </Box>

      {/* Note Editor */}
      <Box flex={1} h="100%" display="flex" flexDirection="column" bg={{ base: "white", _dark: "gray.800" }}>
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
          <Flex flex={1} align="center" justify="center">
            <VStack spacing={4} color={{ base: "gray.500", _dark: "gray.400" }}>
              <FileText size={48} />
              <Text>Select a note or create a new one</Text>
              <Button colorScheme="blue" leftIcon={<Plus size={16} />} onClick={onCreateNote}>
                New Note
              </Button>
            </VStack>
          </Flex>
        )}
      </Box>
    </Flex>
  );
};
