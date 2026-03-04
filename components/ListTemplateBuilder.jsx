"use client";

import { useMemo, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  List,
  ListItem,
  ListItemSecondaryAction,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Add, Close, Delete, DragIndicator, Label } from "@mui/icons-material";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import { TagChip } from "./TagChip";
import { TagSelectorBase } from "./TagSelector";
import { useGetTagsQuery, useCreateTagMutation } from "@/lib/store/api/tagsApi";

const normalizeTitle = value => (value || "").trim().toLowerCase().replace(/\s+/g, " ");
const createLocalId = () => `list-item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function toSubtask(title, idx) {
  return {
    id: createLocalId(),
    title: title.trim(),
    completed: false,
    time: null,
    duration: 30,
    order: idx,
    tagIds: [],
  };
}

function dedupeTitles(items) {
  const seen = new Set();
  return items.filter(item => {
    const normalized = normalizeTitle(item.title);
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

function normalizeMetadata(item) {
  return {
    category: item?.category || null,
    subCategory: item?.subCategory || null,
    tags: Array.isArray(item?.tags) ? item.tags.filter(Boolean) : [],
  };
}

function normalizeCompareValue(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function getDisplayTags(item) {
  const category = normalizeCompareValue(item?.category);
  const subCategory = normalizeCompareValue(item?.subCategory);

  return Array.from(
    new Set(
      (item?.tags || []).filter(tag => {
        const normalized = normalizeCompareValue(tag);
        if (!normalized) return false;
        if (normalized === category) return false;
        if (normalized === subCategory) return false;
        return true;
      })
    )
  );
}

function getBadgeTags(item) {
  const badgeTags = [];
  if (item?.category) {
    badgeTags.push({ id: `category-${item.category}`, name: item.category });
  }
  if (item?.subCategory) {
    badgeTags.push({ id: `subcategory-${item.subCategory}`, name: item.subCategory });
  }
  getDisplayTags(item).forEach(tag => {
    badgeTags.push({ id: `tag-${tag}`, name: tag });
  });
  return badgeTags;
}

function matchFilter(item, { category, subCategory, tag, search }) {
  if (category !== "all" && (item.category || "") !== category) return false;
  if (subCategory !== "all" && (item.subCategory || "") !== subCategory) return false;
  if (tag !== "all" && !getDisplayTags(item).includes(tag)) return false;
  if (search.trim() && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
  return true;
}

function getGroupKey(item, groupBy) {
  if (groupBy === "category") return item.category || "Uncategorized";
  if (groupBy === "subCategory") return item.subCategory || "No subcategory";
  if (groupBy === "tag") return getDisplayTags(item)[0] || "No tags";
  return "All Items";
}

// Small inline tag row — shows taxonomy chips + the real TagSelector trigger
function ItemTagRow({ taxonomyItem, tagIds, allTags, onCreateTag, onTagsChange }) {
  const badgeTags = getBadgeTags(taxonomyItem);
  const selectedTags = allTags.filter(t => (tagIds || []).includes(t.id));

  return (
    <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }} flexWrap="wrap" useFlexGap alignItems="center">
      {/* Taxonomy badges (category / subcategory / airtable tags) */}
      {badgeTags.map(tag => (
        <TagChip key={tag.id} tag={tag} size="xs" sx={{ textTransform: "none", fontWeight: 500 }} />
      ))}

      {/* Real user-defined tag chips with remove */}
      {selectedTags.map(tag => (
        <TagChip
          key={tag.id}
          tag={tag}
          size="xs"
          showClose
          onClose={() => onTagsChange((tagIds || []).filter(id => id !== tag.id))}
        />
      ))}

      {/* TagSelector trigger (label icon button) */}
      <TagSelectorBase
        tags={allTags}
        onCreateTag={onCreateTag}
        selectedTagIds={tagIds || []}
        onSelectionChange={onTagsChange}
        renderTrigger={handleMenuOpen => (
          <Box
            component="span"
            onClick={e => {
              e.stopPropagation();
              handleMenuOpen(e);
            }}
            onMouseDown={e => e.stopPropagation()}
            sx={{ cursor: "pointer", display: "inline-flex", alignItems: "center", color: "text.secondary" }}
          >
            <Label sx={{ fontSize: 14 }} />
          </Box>
        )}
      />
    </Stack>
  );
}

export function ListTemplateBuilder({ open, onClose, onApply, subtasks, listItems, listTemplates, currentTemplateId }) {
  const { data: allTags = [] } = useGetTagsQuery();
  const [createTagMutation] = useCreateTagMutation();

  const handleCreateTag = async (name, color) => createTagMutation({ name, color }).unwrap();

  const [workingSubtasks, setWorkingSubtasks] = useState(() =>
    dedupeTitles(
      (subtasks || []).map((subtask, idx) => ({
        ...subtask,
        id: subtask.id || createLocalId(),
        order: idx,
        tagIds: subtask.tagIds || [],
      }))
    )
  );

  // Tracks items that were cleared but aren't in the canonical library,
  // so they can reappear in the Available pool after being removed.
  const [clearedCustomItems, setClearedCustomItems] = useState([]);

  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [newItemName, setNewItemName] = useState("");
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterSubCategory, setFilterSubCategory] = useState("all");
  const [filterTag, setFilterTag] = useState("all");
  const [groupBy, setGroupBy] = useState("none");

  const templateOptions = useMemo(
    () => (listTemplates || []).filter(template => template.id !== currentTemplateId),
    [listTemplates, currentTemplateId]
  );

  const listItemByNormalized = useMemo(() => {
    const map = new Map();
    (listItems || []).forEach(item => {
      const normalized = normalizeTitle(item.name);
      if (!normalized) return;
      map.set(normalized, {
        category: item.category || null,
        subCategory: item.subCategory || null,
        tags: Array.isArray(item.tags) ? item.tags : [],
      });
    });
    return map;
  }, [listItems]);

  const availableItems = useMemo(() => {
    const selected = new Set(workingSubtasks.map(item => normalizeTitle(item.title)));
    const poolMap = new Map();

    (listItems || []).forEach(item => {
      const normalized = normalizeTitle(item.name);
      if (!normalized || selected.has(normalized) || poolMap.has(normalized)) return;
      poolMap.set(normalized, {
        id: normalized,
        normalizedName: normalized,
        name: item.name.trim(),
        ...normalizeMetadata(item),
      });
    });

    (listTemplates || []).forEach(template => {
      (template.subtasks || []).forEach(subtask => {
        const normalized = normalizeTitle(subtask.title);
        if (!normalized || selected.has(normalized) || poolMap.has(normalized)) return;
        poolMap.set(normalized, {
          id: normalized,
          normalizedName: normalized,
          name: subtask.title.trim(),
          ...(listItemByNormalized.get(normalized) || { category: null, subCategory: null, tags: [] }),
        });
      });
    });

    // Re-add any custom items that were cleared but aren't in the canonical library.
    clearedCustomItems.forEach(name => {
      const normalized = normalizeTitle(name);
      if (!normalized || selected.has(normalized) || poolMap.has(normalized)) return;
      poolMap.set(normalized, {
        id: normalized,
        normalizedName: normalized,
        name: name.trim(),
        category: null,
        subCategory: null,
        tags: [],
      });
    });

    const filtered = Array.from(poolMap.values()).filter(item =>
      matchFilter(item, {
        category: filterCategory,
        subCategory: filterSubCategory,
        tag: filterTag,
        search,
      })
    );

    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [
    workingSubtasks,
    listItems,
    listTemplates,
    listItemByNormalized,
    clearedCustomItems,
    filterCategory,
    filterSubCategory,
    filterTag,
    search,
  ]);

  const categoryOptions = useMemo(
    () =>
      Array.from(new Set((listItems || []).map(item => item.category).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b)
      ),
    [listItems]
  );

  const subCategoryOptions = useMemo(
    () =>
      Array.from(new Set((listItems || []).map(item => item.subCategory).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b)
      ),
    [listItems]
  );

  const tagOptions = useMemo(() => {
    const tagSet = new Set();
    (listItems || []).forEach(item => {
      getDisplayTags(item).forEach(tag => {
        if (tag) tagSet.add(tag);
      });
    });
    return Array.from(tagSet).sort((a, b) => a.localeCompare(b));
  }, [listItems]);

  const availableRows = useMemo(() => {
    const rows = [];
    let lastGroup = null;
    availableItems.forEach((item, index) => {
      const group = getGroupKey(item, groupBy);
      if (groupBy !== "none" && group !== lastGroup) {
        rows.push({ type: "group", id: `group-${group}`, label: group });
        lastGroup = group;
      }
      rows.push({ type: "item", id: `available-${item.id}`, item, draggableIndex: index });
    });
    return rows;
  }, [availableItems, groupBy]);

  const templateItemWithMetadata = useMemo(
    () =>
      workingSubtasks.map(item => {
        const normalized = normalizeTitle(item.title);
        return {
          ...item,
          ...(listItemByNormalized.get(normalized) || { category: null, subCategory: null, tags: [] }),
        };
      }),
    [workingSubtasks, listItemByNormalized]
  );

  const addToTemplate = (title, atIndex = null) => {
    const trimmed = (title || "").trim();
    if (!trimmed) return;
    const normalized = normalizeTitle(trimmed);
    if (workingSubtasks.some(item => normalizeTitle(item.title) === normalized)) return;

    setWorkingSubtasks(prev => {
      const next = [...prev];
      const insertIndex = atIndex === null ? next.length : Math.max(0, Math.min(atIndex, next.length));
      next.splice(insertIndex, 0, toSubtask(trimmed, insertIndex));
      return next.map((item, idx) => ({ ...item, order: idx }));
    });
  };

  const handleAddCustomItem = () => {
    const candidate = (newItemName || "").trim() || (search || "").trim();
    if (!candidate) return;
    addToTemplate(candidate, 0);
    setNewItemName("");
    setSearch("");
  };

  const removeFromTemplate = id => {
    setWorkingSubtasks(prev => {
      const removed = prev.find(item => item.id === id);
      if (removed) {
        const normalized = normalizeTitle(removed.title);
        // If this title isn't in the canonical library, track it so it reappears in Available.
        if (!listItemByNormalized.has(normalized)) {
          setClearedCustomItems(c => (c.includes(removed.title) ? c : [...c, removed.title]));
        }
      }
      return prev.filter(item => item.id !== id).map((item, idx) => ({ ...item, order: idx }));
    });
  };

  const updateSubtaskTags = (id, tagIds) => {
    setWorkingSubtasks(prev => prev.map(item => (item.id === id ? { ...item, tagIds } : item)));
  };

  const loadFromTemplate = () => {
    if (!selectedTemplateId) return;
    const source = templateOptions.find(template => template.id === selectedTemplateId);
    if (!source) return;
    const cloned = dedupeTitles(
      (source.subtasks || []).map((subtask, idx) => ({
        id: createLocalId(),
        title: subtask.title,
        completed: false,
        time: null,
        duration: subtask.duration ?? 30,
        order: idx,
        tagIds: subtask.tagIds || [],
      }))
    );
    setWorkingSubtasks(cloned);
  };

  const handleDragEnd = result => {
    const { destination, source, draggableId } = result;
    if (!destination) return;

    if (source.droppableId === "template" && destination.droppableId === "template") {
      if (source.index === destination.index) return;
      setWorkingSubtasks(prev => {
        const next = [...prev];
        const [moved] = next.splice(source.index, 1);
        next.splice(destination.index, 0, moved);
        return next.map((item, idx) => ({ ...item, order: idx }));
      });
      return;
    }

    if (source.droppableId === "available" && destination.droppableId === "template") {
      const normalized = draggableId.replace("available-", "");
      const item = availableItems.find(row => row.id === normalized);
      if (item) {
        addToTemplate(item.name, destination.index);
      }
      return;
    }

    if (source.droppableId === "template" && destination.droppableId === "available") {
      const moved = workingSubtasks[source.index];
      if (moved) removeFromTemplate(moved.id);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{ sx: { height: { xs: "100vh", md: "85vh" }, maxHeight: { xs: "100vh", md: "85vh" } } }}
    >
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">List Template Builder</Typography>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent dividers sx={{ overflow: "auto" }}>
        <Stack spacing={2}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
            <FormControl size="small" sx={{ minWidth: 260 }}>
              <InputLabel>Start From Existing Template</InputLabel>
              <Select
                value={selectedTemplateId}
                label="Start From Existing Template"
                onChange={event => setSelectedTemplateId(event.target.value)}
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {templateOptions.map(template => (
                  <MenuItem key={template.id} value={template.id}>
                    {template.title}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button variant="outlined" disabled={!selectedTemplateId} onClick={loadFromTemplate}>
              Load Template
            </Button>
          </Stack>

          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
            <TextField
              size="small"
              fullWidth
              label="Add Custom Item"
              value={newItemName}
              onChange={event => setNewItemName(event.target.value)}
              onKeyDown={event => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleAddCustomItem();
                }
              }}
            />
            <Button
              variant="contained"
              onClick={handleAddCustomItem}
              disabled={!newItemName.trim() && !search.trim()}
              startIcon={<Add />}
            >
              Add
            </Button>
          </Stack>

          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
            <TextField
              size="small"
              label="Search Available Items"
              value={search}
              onChange={event => setSearch(event.target.value)}
              sx={{ flex: 1 }}
            />
            <FormControl size="small" sx={{ minWidth: 170 }}>
              <InputLabel>Category</InputLabel>
              <Select value={filterCategory} label="Category" onChange={event => setFilterCategory(event.target.value)}>
                <MenuItem value="all">All</MenuItem>
                {categoryOptions.map(value => (
                  <MenuItem key={value} value={value}>
                    {value}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 170 }}>
              <InputLabel>Subcategory</InputLabel>
              <Select
                value={filterSubCategory}
                label="Subcategory"
                onChange={event => setFilterSubCategory(event.target.value)}
              >
                <MenuItem value="all">All</MenuItem>
                {subCategoryOptions.map(value => (
                  <MenuItem key={value} value={value}>
                    {value}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 170 }}>
              <InputLabel>Tag</InputLabel>
              <Select value={filterTag} label="Tag" onChange={event => setFilterTag(event.target.value)}>
                <MenuItem value="all">All</MenuItem>
                {tagOptions.map(value => (
                  <MenuItem key={value} value={value}>
                    {value}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 170 }}>
              <InputLabel>Group By</InputLabel>
              <Select value={groupBy} label="Group By" onChange={event => setGroupBy(event.target.value)}>
                <MenuItem value="none">None</MenuItem>
                <MenuItem value="category">Category</MenuItem>
                <MenuItem value="subCategory">Subcategory</MenuItem>
                <MenuItem value="tag">Tag</MenuItem>
              </Select>
            </FormControl>
          </Stack>

          <DragDropContext onDragEnd={handleDragEnd}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              {/* ── Available Items ── */}
              <Paper variant="outlined" sx={{ p: 1.5, flex: 1, minHeight: 320 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Available Items ({availableItems.length})
                </Typography>
                <Droppable droppableId="available">
                  {provided => (
                    <List ref={provided.innerRef} {...provided.droppableProps} dense>
                      {availableRows.map(row => {
                        if (row.type === "group") {
                          return (
                            <Box key={row.id} sx={{ py: 1 }}>
                              <Divider sx={{ mb: 1 }} />
                              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                {row.label}
                              </Typography>
                            </Box>
                          );
                        }

                        const item = row.item;
                        return (
                          <Draggable key={row.id} draggableId={row.id} index={row.draggableIndex}>
                            {(dragProvided, snapshot) => (
                              <ListItem
                                ref={dragProvided.innerRef}
                                {...dragProvided.draggableProps}
                                divider
                                sx={{ opacity: snapshot.isDragging ? 0.6 : 1 }}
                              >
                                <Box
                                  {...dragProvided.dragHandleProps}
                                  sx={{ display: "flex", alignItems: "center", mr: 1 }}
                                >
                                  <DragIndicator fontSize="small" />
                                </Box>
                                <Box sx={{ flex: 1, minWidth: 0, pr: 8 }}>
                                  <Typography variant="body2">{item.name}</Typography>
                                  <Stack
                                    direction="row"
                                    spacing={0.5}
                                    sx={{ mt: 0.5 }}
                                    flexWrap="wrap"
                                    useFlexGap
                                    alignItems="center"
                                  >
                                    {getBadgeTags(item).map(tag => (
                                      <TagChip
                                        key={`${item.id}-${tag.id}`}
                                        tag={tag}
                                        size="xs"
                                        sx={{ textTransform: "none", fontWeight: 500 }}
                                      />
                                    ))}
                                  </Stack>
                                </Box>
                                <ListItemSecondaryAction>
                                  <Button size="small" startIcon={<Add />} onClick={() => addToTemplate(item.name)}>
                                    Add
                                  </Button>
                                </ListItemSecondaryAction>
                              </ListItem>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </List>
                  )}
                </Droppable>
              </Paper>

              {/* ── In Template ── */}
              <Paper variant="outlined" sx={{ p: 1.5, flex: 1, minHeight: 320 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  In Template ({workingSubtasks.length})
                </Typography>
                <Droppable droppableId="template">
                  {provided => (
                    <List ref={provided.innerRef} {...provided.droppableProps} dense>
                      {templateItemWithMetadata.map((item, index) => (
                        <Draggable key={item.id} draggableId={`template-${item.id}`} index={index}>
                          {(dragProvided, snapshot) => (
                            <ListItem
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              divider
                              sx={{ opacity: snapshot.isDragging ? 0.6 : 1 }}
                            >
                              <Box
                                {...dragProvided.dragHandleProps}
                                sx={{ display: "flex", alignItems: "center", mr: 1 }}
                              >
                                <DragIndicator fontSize="small" />
                              </Box>
                              <Box sx={{ flex: 1, minWidth: 0, pr: 8 }}>
                                <Typography variant="body2">{item.title}</Typography>
                                <ItemTagRow
                                  taxonomyItem={item}
                                  tagIds={item.tagIds || []}
                                  allTags={allTags}
                                  onCreateTag={handleCreateTag}
                                  onTagsChange={tagIds => updateSubtaskTags(item.id, tagIds)}
                                />
                              </Box>
                              <ListItemSecondaryAction>
                                <Button
                                  size="small"
                                  color="error"
                                  startIcon={<Delete />}
                                  onClick={() => removeFromTemplate(item.id)}
                                >
                                  Clear
                                </Button>
                              </ListItemSecondaryAction>
                            </ListItem>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </List>
                  )}
                </Droppable>
              </Paper>
            </Stack>
          </DragDropContext>
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={() => onApply(workingSubtasks.map((item, index) => ({ ...item, order: index })))}
          disabled={workingSubtasks.length === 0}
        >
          Apply Builder
        </Button>
      </DialogActions>
    </Dialog>
  );
}
