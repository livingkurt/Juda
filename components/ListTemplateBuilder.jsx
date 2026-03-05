"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Checkbox,
  Chip,
  Stack,
  IconButton,
  useMediaQuery,
  useTheme as useMuiTheme,
} from "@mui/material";
import { Close, Add, Remove, DragIndicator, LocalOffer } from "@mui/icons-material";
import {
  useGetListItemsQuery,
  useGetListTagsQuery,
  useCreateListItemMutation,
  useCreateListTagMutation,
  useUpdateListItemTagsMutation,
  useCreateListTemplateMutation,
  useUpdateListTemplateMutation,
} from "@/lib/store/api/listApi";
import { TagSelectorBase, TagSelector } from "@/components/TagSelector";
import { TagChip } from "@/components/TagChip";
import { useGetTagsQuery } from "@/lib/store/api/tagsApi";
import { TaskSearchInput } from "@/components/TaskSearchInput";
import { UNTAGGED_ID } from "@/components/BacklogTagSidebar";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

export function ListTemplateBuilder({ open, onClose, editingTemplate = null }) {
  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down("md"));
  const { data: libraryItems = [] } = useGetListItemsQuery();
  const { data: listTags = [] } = useGetListTagsQuery();
  const [createTemplate] = useCreateListTemplateMutation();
  const [updateTemplate] = useUpdateListTemplateMutation();
  const [createItem] = useCreateListItemMutation();
  const [createListTag] = useCreateListTagMutation();
  const [updateItemTags] = useUpdateListItemTagsMutation();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedItemIds, setSelectedItemIds] = useState([]);
  const [templateTagIds, setTemplateTagIds] = useState([]);
  const { data: allTags = [] } = useGetTagsQuery();
  const [itemQuantities, setItemQuantities] = useState({}); // { itemId: quantity }
  const [searchTerm, setSearchTerm] = useState("");
  const [libraryTagIds, setLibraryTagIds] = useState([]);
  const [newItemName, setNewItemName] = useState("");
  const [groupByTag, setGroupByTag] = useState(false);

  const [tagAnchorEl, setTagAnchorEl] = useState(null);
  const [tagEditItemId, setTagEditItemId] = useState(null);
  const [templateTagAnchorEl, setTemplateTagAnchorEl] = useState(null);

  // Right column tag filter + group state
  const [selectedItemsSearch, setSelectedItemsSearch] = useState("");
  const [selectedItemsTagIds, setSelectedItemsTagIds] = useState([]);
  const [selectedItemsGroupByTag, setSelectedItemsGroupByTag] = useState(false);

  // Initialize from editing template
  useEffect(() => {
    if (editingTemplate) {
      setName(editingTemplate.name || "");
      setDescription(editingTemplate.description || "");
      setSelectedItemIds(editingTemplate.items?.map(i => i.id) || []);
      setTemplateTagIds(editingTemplate.tagIds || []);
      const qtys = {};
      editingTemplate.items?.forEach(i => {
        if (i.quantity && i.quantity !== 1) qtys[i.id] = i.quantity;
      });
      setItemQuantities(qtys);
    } else {
      setName("");
      setDescription("");
      setSelectedItemIds([]);
      setItemQuantities({});
      setTemplateTagIds([]);
    }
    setSearchTerm("");
    setLibraryTagIds([]);
    setGroupByTag(false);
    setSelectedItemsSearch("");
    setSelectedItemsTagIds([]);
    setSelectedItemsGroupByTag(false);
    setNewItemName("");
  }, [editingTemplate, open]);

  const filteredItems = useMemo(() => {
    let items = libraryItems;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      items = items.filter(i => i.name.toLowerCase().includes(term));
    }
    if (libraryTagIds.length > 0) {
      const hasUntagged = libraryTagIds.includes(UNTAGGED_ID);
      const regularIds = libraryTagIds.filter(id => id !== UNTAGGED_ID);
      items = items.filter(i => {
        if (hasUntagged && (!i.tags || i.tags.length === 0)) return true;
        if (regularIds.length > 0 && i.tags?.some(t => regularIds.includes(t.id))) return true;
        return false;
      });
    }
    return items;
  }, [libraryItems, searchTerm, libraryTagIds]);

  // Group filtered items by first tag only (so items appear in exactly one group)
  const groupedItems = useMemo(() => {
    if (!groupByTag) return null;
    const groups = {};
    const untagged = [];
    filteredItems.forEach(item => {
      const firstTag = item.tags?.[0];
      if (!firstTag) {
        untagged.push(item);
      } else {
        if (!groups[firstTag.id]) groups[firstTag.id] = { tag: firstTag, items: [] };
        groups[firstTag.id].items.push(item);
      }
    });
    const result = Object.values(groups).sort((a, b) => a.tag.name.localeCompare(b.tag.name));
    if (untagged.length) result.push({ tag: { id: "_untagged", name: "Untagged", color: "#666" }, items: untagged });
    return result;
  }, [filteredItems, groupByTag]);

  const selectedItems = useMemo(() => {
    return selectedItemIds.map(id => libraryItems.find(i => i.id === id)).filter(Boolean);
  }, [selectedItemIds, libraryItems]);

  // Tags present on selected items (for right-column filter menu counts)
  const selectedItemsTags = useMemo(() => {
    const tagMap = {};
    selectedItems.forEach(item => {
      item.tags?.forEach(t => {
        tagMap[t.id] = t;
      });
    });
    return Object.values(tagMap).sort((a, b) => a.name.localeCompare(b.name));
  }, [selectedItems]);

  // Filter selected items by search + tag selection
  const filteredSelectedItems = useMemo(() => {
    let result = selectedItems;
    if (selectedItemsSearch.trim()) {
      const lower = selectedItemsSearch.toLowerCase();
      result = result.filter(item => item.name.toLowerCase().includes(lower));
    }
    if (selectedItemsTagIds.length > 0) {
      const hasUntagged = selectedItemsTagIds.includes(UNTAGGED_ID);
      const regularIds = selectedItemsTagIds.filter(id => id !== UNTAGGED_ID);
      result = result.filter(item => {
        if (hasUntagged && (!item.tags || item.tags.length === 0)) return true;
        if (regularIds.length > 0 && item.tags?.some(t => regularIds.includes(t.id))) return true;
        return false;
      });
    }
    return result;
  }, [selectedItems, selectedItemsSearch, selectedItemsTagIds]);

  // Group filtered selected items by first tag only
  const groupedSelectedItems = useMemo(() => {
    if (!selectedItemsGroupByTag) return null;
    const groups = {};
    const untagged = [];
    filteredSelectedItems.forEach(item => {
      const firstTag = item.tags?.[0];
      if (!firstTag) {
        untagged.push(item);
      } else {
        if (!groups[firstTag.id]) groups[firstTag.id] = { tag: firstTag, items: [] };
        groups[firstTag.id].items.push(item);
      }
    });
    const result = Object.values(groups).sort((a, b) => a.tag.name.localeCompare(b.tag.name));
    if (untagged.length) result.push({ tag: { id: "_untagged", name: "Untagged", color: "#666" }, items: untagged });
    return result;
  }, [filteredSelectedItems, selectedItemsGroupByTag]);

  const handleToggleItem = useCallback(itemId => {
    setSelectedItemIds(prev => (prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]));
  }, []);

  const renderLibraryItem = useCallback(
    item => (
      <ListItem
        key={item.id}
        disablePadding
        secondaryAction={
          <IconButton
            size="small"
            onClick={e => {
              e.stopPropagation();
              setTagAnchorEl(e.currentTarget);
              setTagEditItemId(item.id);
            }}
            title="Manage tags"
          >
            <LocalOffer sx={{ fontSize: 16 }} />
          </IconButton>
        }
      >
        <ListItemButton dense onClick={() => handleToggleItem(item.id)}>
          <ListItemIcon sx={{ minWidth: 36 }}>
            <Checkbox edge="start" checked={selectedItemIds.includes(item.id)} size="small" disableRipple />
          </ListItemIcon>
          <ListItemText
            primary={item.name}
            secondary={
              !groupByTag && item.tags?.length > 0 ? (
                <Stack direction="row" spacing={0.5} sx={{ mt: 0.25, flexWrap: "wrap", gap: 0.25 }}>
                  {item.tags.map(t => (
                    <Chip
                      key={t.id}
                      label={t.name}
                      size="small"
                      sx={{ height: 16, fontSize: "0.625rem", bgcolor: t.color, color: "white" }}
                    />
                  ))}
                </Stack>
              ) : null
            }
            primaryTypographyProps={{ fontSize: "0.875rem" }}
            secondaryTypographyProps={{ component: "span" }}
          />
        </ListItemButton>
      </ListItem>
    ),
    [selectedItemIds, groupByTag, handleToggleItem]
  );

  const handleRemoveItem = useCallback(itemId => {
    setSelectedItemIds(prev => prev.filter(id => id !== itemId));
  }, []);

  const handleDragEnd = useCallback(result => {
    if (!result.destination) return;
    setSelectedItemIds(prev => {
      const newIds = [...prev];
      const [moved] = newIds.splice(result.source.index, 1);
      newIds.splice(result.destination.index, 0, moved);
      return newIds;
    });
  }, []);

  const handleCreateItem = useCallback(async () => {
    if (!newItemName.trim()) return;
    const result = await createItem({ name: newItemName.trim() });
    if (result.data) {
      setSelectedItemIds(prev => [...prev, result.data.id]);
      setNewItemName("");
    }
  }, [newItemName, createItem]);

  const handleSave = useCallback(async () => {
    if (!name.trim()) return;
    const itemsPayload = selectedItemIds.map(id => ({
      listItemId: id,
      quantity: itemQuantities[id] || 1,
    }));
    if (editingTemplate) {
      await updateTemplate({
        id: editingTemplate.id,
        name: name.trim(),
        description: description.trim() || null,
        items: itemsPayload,
        tagIds: templateTagIds,
      });
    } else {
      await createTemplate({
        name: name.trim(),
        description: description.trim() || null,
        items: itemsPayload,
        tagIds: templateTagIds,
      });
    }
    onClose();
  }, [name, description, selectedItemIds, templateTagIds, editingTemplate, createTemplate, updateTemplate, onClose]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={isMobile ? undefined : "md"}
      fullWidth
      PaperProps={{
        sx: {
          height: { xs: "100vh", md: "85vh" },
          maxHeight: { xs: "100vh", md: "85vh" },
          m: { xs: 0, md: "auto" },
          width: { xs: "100%" },
          borderRadius: { xs: 0, md: 1 },
        },
      }}
    >
      <DialogTitle>{editingTemplate ? "Edit Template" : "New Template"}</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", overflow: "hidden", p: 2 }}>
        <Stack spacing={2} sx={{ mt: 1, flex: 1, minHeight: 0 }}>
          <TextField
            label="Template Name"
            value={name}
            onChange={e => setName(e.target.value)}
            fullWidth
            autoFocus
            size="small"
          />
          <TextField
            label="Description (optional)"
            value={description}
            onChange={e => setDescription(e.target.value)}
            fullWidth
            size="small"
            multiline
            rows={2}
          />

          {/* Template Tags */}
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              {allTags
                .filter(t => templateTagIds.includes(t.id))
                .map(tag => (
                  <Box
                    key={tag.id}
                    onClick={e => setTemplateTagAnchorEl(e.currentTarget)}
                    sx={{ cursor: "pointer", display: "inline-flex" }}
                  >
                    <TagChip tag={tag} size="sm" />
                  </Box>
                ))}
              <Button
                size="small"
                variant="text"
                onClick={e => setTemplateTagAnchorEl(e.currentTarget)}
                sx={{ fontSize: "0.75rem", color: "text.secondary", minWidth: "auto" }}
              >
                {templateTagIds.length === 0 ? "+ Add Tags" : "+ Tags"}
              </Button>
              <TagSelector
                selectedTagIds={templateTagIds}
                onSelectionChange={setTemplateTagIds}
                showManageButton
                anchorEl={templateTagAnchorEl}
                open={Boolean(templateTagAnchorEl)}
                onClose={() => setTemplateTagAnchorEl(null)}
              />
            </Stack>
          </Box>

          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", md: "row" },
              gap: 2,
              flex: 1,
              minHeight: 0,
              overflow: "hidden",
            }}
          >
            {/* Left: Item Library */}
            <Box
              sx={{
                flex: 1,
                borderRight: { xs: 0, md: 1 },
                borderBottom: { xs: 1, md: 0 },
                borderColor: "divider",
                pr: { xs: 0, md: 2 },
                pb: { xs: 2, md: 0 },
                display: "flex",
                flexDirection: "column",
                minHeight: { xs: 200, md: 0 },
              }}
            >
              <Typography variant="subtitle2" gutterBottom>
                Item Library
              </Typography>

              {/* New item inline creation */}
              <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                <TextField
                  size="small"
                  placeholder="New item..."
                  value={newItemName}
                  onChange={e => setNewItemName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleCreateItem()}
                  fullWidth
                />
                <IconButton size="small" onClick={handleCreateItem} disabled={!newItemName.trim()}>
                  <Add />
                </IconButton>
              </Stack>

              {/* Search + tag filter + tag sort */}
              <Box sx={{ mb: 1 }}>
                <TaskSearchInput
                  onSearchChange={setSearchTerm}
                  placeholder="Search items..."
                  tags={listTags}
                  tasks={libraryItems}
                  selectedTagIds={libraryTagIds}
                  onTagSelect={id => setLibraryTagIds(prev => [...prev, id])}
                  onTagDeselect={id => setLibraryTagIds(prev => prev.filter(x => x !== id))}
                  onCreateTag={async (tagName, color) => {
                    const result = await createListTag({ name: tagName, color });
                    return result.data;
                  }}
                  showPriorityFilter={false}
                  showTagSortOnly
                  sortByTag={groupByTag}
                  onTagSortToggle={() => setGroupByTag(prev => !prev)}
                  showUntaggedOption
                />
              </Box>

              <List dense sx={{ flex: 1, overflow: "auto", minHeight: 0 }}>
                {groupByTag && groupedItems
                  ? groupedItems.map(group => (
                      <Box key={group.tag.id}>
                        <Typography
                          variant="caption"
                          fontWeight="bold"
                          sx={{
                            px: 2,
                            py: 0.5,
                            bgcolor: "action.hover",
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                          }}
                        >
                          <Box
                            sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: group.tag.color, flexShrink: 0 }}
                          />
                          {group.tag.name} ({group.items.length})
                        </Typography>
                        {group.items.map(item => renderLibraryItem(item))}
                      </Box>
                    ))
                  : filteredItems.map(item => renderLibraryItem(item))}
                {filteredItems.length === 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: "center" }}>
                    No items found
                  </Typography>
                )}
              </List>
            </Box>

            {/* Right: Selected Items */}
            <Box
              sx={{
                flex: 1,
                pl: { xs: 0, md: 2 },
                display: "flex",
                flexDirection: "column",
                minHeight: { xs: 200, md: 0 },
                overflow: "auto",
              }}
            >
              <Typography variant="subtitle2" gutterBottom>
                Template Items ({filteredSelectedItems.length}
                {selectedItemsTagIds.length > 0 || selectedItemsSearch ? ` of ${selectedItems.length}` : ""})
              </Typography>

              {/* Search + tag filter + tag sort for selected items */}
              <Box sx={{ mb: 1 }}>
                <TaskSearchInput
                  onSearchChange={setSelectedItemsSearch}
                  placeholder="Filter selected items..."
                  tags={selectedItemsTags}
                  tasks={selectedItems}
                  selectedTagIds={selectedItemsTagIds}
                  onTagSelect={id => setSelectedItemsTagIds(prev => [...prev, id])}
                  onTagDeselect={id => setSelectedItemsTagIds(prev => prev.filter(x => x !== id))}
                  onCreateTag={async (name, color) => {
                    const result = await createListTag({ name, color });
                    return result.data;
                  }}
                  showPriorityFilter={false}
                  showTagSortOnly
                  sortByTag={selectedItemsGroupByTag}
                  onTagSortToggle={() => setSelectedItemsGroupByTag(prev => !prev)}
                  showUntaggedOption
                />
              </Box>

              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="template-items">
                  {provided => (
                    <List dense ref={provided.innerRef} {...provided.droppableProps} sx={{ minHeight: 50 }}>
                      {selectedItemsGroupByTag && groupedSelectedItems
                        ? groupedSelectedItems.map(group => (
                            <Box key={group.tag.id}>
                              <Typography
                                variant="caption"
                                fontWeight="bold"
                                sx={{
                                  px: 2,
                                  py: 0.5,
                                  bgcolor: "action.hover",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 0.5,
                                }}
                              >
                                <Box
                                  sx={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: "50%",
                                    bgcolor: group.tag.color,
                                    flexShrink: 0,
                                  }}
                                />
                                {group.tag.name} ({group.items.length})
                              </Typography>
                              {group.items.map(item => (
                                <ListItem
                                  key={item.id}
                                  disablePadding
                                  secondaryAction={
                                    <Stack direction="row" alignItems="center" spacing={0}>
                                      <IconButton
                                        size="small"
                                        onClick={() =>
                                          setItemQuantities(prev => ({
                                            ...prev,
                                            [item.id]: Math.max(1, (prev[item.id] || 1) - 1),
                                          }))
                                        }
                                        disabled={(itemQuantities[item.id] || 1) <= 1}
                                      >
                                        <Remove sx={{ fontSize: 14 }} />
                                      </IconButton>
                                      <Typography variant="caption" sx={{ minWidth: 20, textAlign: "center" }}>
                                        {itemQuantities[item.id] || 1}
                                      </Typography>
                                      <IconButton
                                        size="small"
                                        onClick={() =>
                                          setItemQuantities(prev => ({
                                            ...prev,
                                            [item.id]: (prev[item.id] || 1) + 1,
                                          }))
                                        }
                                      >
                                        <Add sx={{ fontSize: 14 }} />
                                      </IconButton>
                                      <IconButton edge="end" size="small" onClick={() => handleRemoveItem(item.id)}>
                                        <Close fontSize="small" />
                                      </IconButton>
                                    </Stack>
                                  }
                                  sx={{ borderRadius: 1 }}
                                >
                                  <ListItemIcon sx={{ minWidth: 28 }}>
                                    <DragIndicator fontSize="small" color="disabled" />
                                  </ListItemIcon>
                                  <ListItemText primary={item.name} primaryTypographyProps={{ fontSize: "0.875rem" }} />
                                </ListItem>
                              ))}
                            </Box>
                          ))
                        : filteredSelectedItems.map((item, index) => (
                            <Draggable key={item.id} draggableId={item.id} index={index}>
                              {(provided, snapshot) => (
                                <ListItem
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  secondaryAction={
                                    <Stack direction="row" alignItems="center" spacing={0}>
                                      <IconButton
                                        size="small"
                                        onClick={() =>
                                          setItemQuantities(prev => ({
                                            ...prev,
                                            [item.id]: Math.max(1, (prev[item.id] || 1) - 1),
                                          }))
                                        }
                                        disabled={(itemQuantities[item.id] || 1) <= 1}
                                      >
                                        <Remove sx={{ fontSize: 14 }} />
                                      </IconButton>
                                      <Typography variant="caption" sx={{ minWidth: 20, textAlign: "center" }}>
                                        {itemQuantities[item.id] || 1}
                                      </Typography>
                                      <IconButton
                                        size="small"
                                        onClick={() =>
                                          setItemQuantities(prev => ({
                                            ...prev,
                                            [item.id]: (prev[item.id] || 1) + 1,
                                          }))
                                        }
                                      >
                                        <Add sx={{ fontSize: 14 }} />
                                      </IconButton>
                                      <IconButton edge="end" size="small" onClick={() => handleRemoveItem(item.id)}>
                                        <Close fontSize="small" />
                                      </IconButton>
                                    </Stack>
                                  }
                                  sx={{
                                    bgcolor: snapshot.isDragging ? "action.selected" : "transparent",
                                    borderRadius: 1,
                                  }}
                                >
                                  <ListItemIcon sx={{ minWidth: 28 }} {...provided.dragHandleProps}>
                                    <DragIndicator fontSize="small" color="action" />
                                  </ListItemIcon>
                                  <ListItemText
                                    primary={item.name}
                                    secondary={
                                      item.tags?.length > 0 ? (
                                        <Stack
                                          direction="row"
                                          spacing={0.25}
                                          sx={{ mt: 0.25, flexWrap: "wrap", gap: 0.25 }}
                                        >
                                          {item.tags.map(t => (
                                            <Chip
                                              key={t.id}
                                              label={t.name}
                                              size="small"
                                              sx={{ height: 16, fontSize: "0.6rem", bgcolor: t.color, color: "white" }}
                                            />
                                          ))}
                                        </Stack>
                                      ) : null
                                    }
                                    primaryTypographyProps={{ fontSize: "0.875rem" }}
                                    secondaryTypographyProps={{ component: "span" }}
                                  />
                                </ListItem>
                              )}
                            </Draggable>
                          ))}
                      {provided.placeholder}
                    </List>
                  )}
                </Droppable>
              </DragDropContext>

              {selectedItems.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", mt: 4 }}>
                  Select items from the library
                </Typography>
              )}
              {selectedItems.length > 0 && filteredSelectedItems.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", mt: 4 }}>
                  No items match the current filter.
                </Typography>
              )}
            </Box>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={!name.trim()}>
          {editingTemplate ? "Save" : "Create"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ListTemplateBuilder;
