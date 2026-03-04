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
  InputAdornment,
  Divider,
} from "@mui/material";
import { Search, Close, Add, Remove, DragIndicator, LocalOffer } from "@mui/icons-material";
import { Popover } from "@mui/material";
import {
  useGetListItemsQuery,
  useGetListTagsQuery,
  useCreateListItemMutation,
  useCreateListTagMutation,
  useUpdateListItemTagsMutation,
  useCreateListTemplateMutation,
  useUpdateListTemplateMutation,
} from "@/lib/store/api/listApi";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

export function ListTemplateBuilder({ open, onClose, editingTemplate = null }) {
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
  const [itemQuantities, setItemQuantities] = useState({}); // { itemId: quantity }
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTagFilter, setSelectedTagFilter] = useState(null);
  const [newItemName, setNewItemName] = useState("");
  const [tagAnchorEl, setTagAnchorEl] = useState(null);
  const [tagEditItemId, setTagEditItemId] = useState(null);
  const [newTagName, setNewTagName] = useState("");

  // Initialize from editing template
  useEffect(() => {
    if (editingTemplate) {
      setName(editingTemplate.name || "");
      setDescription(editingTemplate.description || "");
      setSelectedItemIds(editingTemplate.items?.map(i => i.id) || []);
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
    }
    setSearchTerm("");
    setSelectedTagFilter(null);
    setNewItemName("");
  }, [editingTemplate, open]);

  const filteredItems = useMemo(() => {
    let items = libraryItems;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      items = items.filter(i => i.name.toLowerCase().includes(term));
    }
    if (selectedTagFilter) {
      items = items.filter(i => i.tags?.some(t => t.id === selectedTagFilter));
    }
    return items;
  }, [libraryItems, searchTerm, selectedTagFilter]);

  const selectedItems = useMemo(() => {
    return selectedItemIds.map(id => libraryItems.find(i => i.id === id)).filter(Boolean);
  }, [selectedItemIds, libraryItems]);

  const handleToggleItem = useCallback(
    itemId => {
      setSelectedItemIds(prev => (prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]));
    },
    []
  );

  const handleRemoveItem = useCallback(
    itemId => {
      setSelectedItemIds(prev => prev.filter(id => id !== itemId));
    },
    []
  );

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
      await updateTemplate({ id: editingTemplate.id, name: name.trim(), description: description.trim() || null, items: itemsPayload });
    } else {
      await createTemplate({ name: name.trim(), description: description.trim() || null, items: itemsPayload });
    }
    onClose();
  }, [name, description, selectedItemIds, editingTemplate, createTemplate, updateTemplate, onClose]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{editingTemplate ? "Edit Template" : "New Template"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
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

          <Box sx={{ display: "flex", gap: 2, minHeight: 300 }}>
            {/* Left: Item Library */}
            <Box sx={{ flex: 1, borderRight: 1, borderColor: "divider", pr: 2 }}>
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

              <TextField
                size="small"
                placeholder="Search items..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                fullWidth
                sx={{ mb: 1 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />

              {/* Tag filter */}
              <Stack direction="row" spacing={0.5} sx={{ mb: 1, flexWrap: "wrap", gap: 0.5 }}>
                {listTags.slice(0, 10).map(tag => (
                  <Chip
                    key={tag.id}
                    label={tag.name}
                    size="small"
                    variant={selectedTagFilter === tag.id ? "filled" : "outlined"}
                    onClick={() => setSelectedTagFilter(prev => (prev === tag.id ? null : tag.id))}
                    sx={{ fontSize: "0.7rem" }}
                  />
                ))}
              </Stack>

              <List dense sx={{ maxHeight: 250, overflow: "auto" }}>
                {filteredItems.map(item => (
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
                        <Checkbox
                          edge="start"
                          checked={selectedItemIds.includes(item.id)}
                          size="small"
                          disableRipple
                        />
                      </ListItemIcon>
                      <ListItemText
                        primary={item.name}
                        secondary={
                          item.tags?.length > 0 ? (
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
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
                {filteredItems.length === 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: "center" }}>
                    No items found
                  </Typography>
                )}
              </List>
            </Box>

            {/* Right: Selected Items */}
            <Box sx={{ flex: 1, pl: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Template Items ({selectedItems.length})
              </Typography>

              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="template-items">
                  {provided => (
                    <List dense ref={provided.innerRef} {...provided.droppableProps} sx={{ minHeight: 50 }}>
                      {selectedItems.map((item, index) => (
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
                                primaryTypographyProps={{ fontSize: "0.875rem" }}
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
      {/* Tag Management Popover */}
      <Popover
        open={Boolean(tagAnchorEl)}
        anchorEl={tagAnchorEl}
        onClose={() => {
          setTagAnchorEl(null);
          setTagEditItemId(null);
          setNewTagName("");
        }}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <Box sx={{ p: 2, minWidth: 220, maxWidth: 280 }}>
          <Typography variant="subtitle2" gutterBottom>
            Tags
          </Typography>
          {(() => {
            const editItem = libraryItems.find(i => i.id === tagEditItemId);
            const currentTagIds = editItem?.tags?.map(t => t.id) || [];
            return (
              <>
                <Stack spacing={0.5} sx={{ mb: 1, maxHeight: 200, overflow: "auto" }}>
                  {listTags.map(tag => (
                    <Chip
                      key={tag.id}
                      label={tag.name}
                      size="small"
                      variant={currentTagIds.includes(tag.id) ? "filled" : "outlined"}
                      sx={{
                        bgcolor: currentTagIds.includes(tag.id) ? tag.color : "transparent",
                        color: currentTagIds.includes(tag.id) ? "white" : "text.primary",
                        borderColor: tag.color,
                        cursor: "pointer",
                      }}
                      onClick={() => {
                        const newTagIds = currentTagIds.includes(tag.id)
                          ? currentTagIds.filter(id => id !== tag.id)
                          : [...currentTagIds, tag.id];
                        updateItemTags({ id: tagEditItemId, tagIds: newTagIds });
                      }}
                    />
                  ))}
                </Stack>
                <Stack direction="row" spacing={0.5}>
                  <TextField
                    size="small"
                    placeholder="New tag..."
                    value={newTagName}
                    onChange={e => setNewTagName(e.target.value)}
                    onKeyDown={async e => {
                      if (e.key === "Enter" && newTagName.trim()) {
                        const result = await createListTag({ name: newTagName.trim() });
                        if (result.data) {
                          updateItemTags({
                            id: tagEditItemId,
                            tagIds: [...currentTagIds, result.data.id],
                          });
                          setNewTagName("");
                        }
                      }
                    }}
                    sx={{ flex: 1 }}
                  />
                  <IconButton
                    size="small"
                    disabled={!newTagName.trim()}
                    onClick={async () => {
                      const result = await createListTag({ name: newTagName.trim() });
                      if (result.data) {
                        updateItemTags({
                          id: tagEditItemId,
                          tagIds: [...currentTagIds, result.data.id],
                        });
                        setNewTagName("");
                      }
                    }}
                  >
                    <Add fontSize="small" />
                  </IconButton>
                </Stack>
              </>
            );
          })()}
        </Box>
      </Popover>
    </Dialog>
  );
}

export default ListTemplateBuilder;
