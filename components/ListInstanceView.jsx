"use client";

import { useCallback, useState } from "react";
import {
  Box,
  Typography,
  LinearProgress,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Chip,
  IconButton,
  Stack,
  TextField,
  Button,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  CheckCircle,
  RadioButtonUnchecked,
  Archive,
  Delete,
  Add,
  Remove,
  MoreVert,
  SaveAlt,
  Sync,
  Close,
  Edit,
  LocalOffer,
} from "@mui/icons-material";
import {
  useToggleListInstanceItemsMutation,
  useUpdateListInstanceMutation,
  useAddInstanceItemsMutation,
  useRemoveInstanceItemsMutation,
  useUpdateTemplateFromInstanceMutation,
  useSaveInstanceAsTemplateMutation,
  useGetListTagsQuery,
  useCreateListTagMutation,
  useUpdateListItemTagsMutation,
} from "@/lib/store/api/listApi";
import { TagSelectorBase } from "@/components/TagSelector";
import { TagChip } from "@/components/TagChip";
import { useDispatch } from "react-redux";
import { openEditTaskDialog } from "@/lib/store/slices/uiSlice";

export function ListInstanceView({ instance, task, onDelete }) {
  const dispatch = useDispatch();
  const [toggleItems] = useToggleListInstanceItemsMutation();
  const [updateInstance] = useUpdateListInstanceMutation();
  const [addItems] = useAddInstanceItemsMutation();
  const [removeItems] = useRemoveInstanceItemsMutation();
  const [updateTemplate] = useUpdateTemplateFromInstanceMutation();
  const [saveAsTemplate] = useSaveInstanceAsTemplateMutation();
  const { data: listTags = [] } = useGetListTagsQuery();
  const [createListTag] = useCreateListTagMutation();
  const [updateItemTags] = useUpdateListItemTagsMutation();

  const [menuAnchor, setMenuAnchor] = useState(null);
  const [tagAnchorEl, setTagAnchorEl] = useState(null);
  const [tagEditItem, setTagEditItem] = useState(null); // instance item being tagged
  const [addingItem, setAddingItem] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemQty, setNewItemQty] = useState(1);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");

  const items = instance?.instanceItems || [];
  const checkedCount = items.filter(i => i.checked).length;
  const totalCount = items.length;
  const progress = totalCount > 0 ? (checkedCount / totalCount) * 100 : 0;
  const isActive = instance?.status === "active";

  const handleToggle = useCallback(
    (itemId, currentChecked) => {
      toggleItems({
        instanceId: instance.id,
        items: [{ id: itemId, checked: !currentChecked }],
      });
    },
    [instance?.id, toggleItems]
  );

  const handleQuantityChange = useCallback(
    (itemId, newQty) => {
      toggleItems({
        instanceId: instance.id,
        items: [{ id: itemId, quantity: Math.max(1, newQty) }],
      });
    },
    [instance?.id, toggleItems]
  );

  const handleComplete = useCallback(() => {
    updateInstance({ id: instance.id, status: "completed" });
  }, [instance?.id, updateInstance]);

  const handleArchive = useCallback(() => {
    updateInstance({ id: instance.id, status: "archived" });
  }, [instance?.id, updateInstance]);

  const handleAddItem = useCallback(() => {
    if (!newItemName.trim()) return;
    addItems({
      instanceId: instance.id,
      newItems: [{ name: newItemName.trim(), quantity: Math.max(1, newItemQty) }],
    });
    setNewItemName("");
    setNewItemQty(1);
    setAddingItem(false);
  }, [instance?.id, addItems, newItemName, newItemQty]);

  const handleRemoveItem = useCallback(
    itemId => {
      removeItems({ instanceId: instance.id, itemIds: [itemId] });
    },
    [instance?.id, removeItems]
  );

  const handleUpdateTemplate = useCallback(() => {
    updateTemplate({ instanceId: instance.id });
    setMenuAnchor(null);
  }, [instance?.id, updateTemplate]);

  const handleSaveAsTemplate = useCallback(() => {
    saveAsTemplate({ instanceId: instance.id, name: newTemplateName || `${instance.name} (copy)` });
    setSaveDialogOpen(false);
    setNewTemplateName("");
    setMenuAnchor(null);
  }, [instance?.id, instance?.name, saveAsTemplate, newTemplateName]);

  if (!instance) return null;

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Box>
          <Typography variant="subtitle1" fontWeight="bold">
            {instance.name}
          </Typography>
          {instance.template && (
            <Typography variant="caption" color="text.secondary">
              From: {instance.template.name}
            </Typography>
          )}
          {task?.tags?.length > 0 && (
            <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: "wrap", gap: 0.25 }}>
              {task.tags.map(tag => (
                <TagChip key={tag.id} tag={tag} size="xs" />
              ))}
            </Stack>
          )}
        </Box>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Chip
            size="small"
            label={`${checkedCount}/${totalCount}`}
            color={checkedCount === totalCount && totalCount > 0 ? "success" : "default"}
          />
          {isActive && (
            <>
              <IconButton size="small" onClick={() => setAddingItem(true)} title="Add item">
                <Add fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={e => setMenuAnchor(e.currentTarget)} title="More options">
                <MoreVert fontSize="small" />
              </IconButton>
              <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
                {task && (
                  <MenuItem
                    onClick={() => {
                      setMenuAnchor(null);
                      dispatch(openEditTaskDialog({ task }));
                    }}
                  >
                    <Edit fontSize="small" sx={{ mr: 1 }} /> Edit Task
                  </MenuItem>
                )}
                {instance.templateId && (
                  <MenuItem onClick={handleUpdateTemplate}>
                    <Sync fontSize="small" sx={{ mr: 1 }} /> Update Template
                  </MenuItem>
                )}
                <MenuItem
                  onClick={() => {
                    setMenuAnchor(null);
                    setSaveDialogOpen(true);
                  }}
                >
                  <SaveAlt fontSize="small" sx={{ mr: 1 }} /> Save as New Template
                </MenuItem>
                <MenuItem onClick={handleArchive}>
                  <Archive fontSize="small" sx={{ mr: 1 }} /> Archive
                </MenuItem>
                {onDelete && (
                  <MenuItem
                    onClick={() => {
                      setMenuAnchor(null);
                      onDelete(instance.id);
                    }}
                  >
                    <Delete fontSize="small" sx={{ mr: 1 }} /> Delete
                  </MenuItem>
                )}
              </Menu>
            </>
          )}
        </Stack>
      </Stack>

      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{ mb: 1, borderRadius: 1, height: 6 }}
        color={progress === 100 ? "success" : "primary"}
      />

      {/* Add item inline form */}
      {addingItem && isActive && (
        <Stack direction="row" spacing={1} sx={{ mb: 1, px: 1 }} alignItems="center">
          <TextField
            size="small"
            placeholder="Item name"
            value={newItemName}
            onChange={e => setNewItemName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAddItem()}
            autoFocus
            sx={{ flex: 1 }}
          />
          <TextField
            size="small"
            type="number"
            label="Qty"
            value={newItemQty}
            onChange={e => setNewItemQty(Math.max(1, Number(e.target.value) || 1))}
            sx={{ width: 70 }}
            inputProps={{ min: 1 }}
          />
          <Button size="small" variant="contained" onClick={handleAddItem} disabled={!newItemName.trim()}>
            Add
          </Button>
          <IconButton size="small" onClick={() => setAddingItem(false)}>
            <Close fontSize="small" />
          </IconButton>
        </Stack>
      )}

      <List dense disablePadding>
        {items.map(item => (
          <ListItem
            key={item.id}
            disablePadding
            secondaryAction={
              isActive && (
                <Stack direction="row" spacing={0} alignItems="center">
                  {(item.quantity ?? 1) > 1 && (
                    <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
                      ×{item.quantity}
                    </Typography>
                  )}
                  {item.listItemId && (
                    <IconButton
                      size="small"
                      onClick={e => {
                        setTagAnchorEl(e.currentTarget);
                        setTagEditItem(item);
                      }}
                      title="Manage tags"
                    >
                      <LocalOffer sx={{ fontSize: 14 }} />
                    </IconButton>
                  )}
                  <IconButton
                    edge="end"
                    size="small"
                    onClick={() => handleQuantityChange(item.id, (item.quantity ?? 1) - 1)}
                    disabled={(item.quantity ?? 1) <= 1}
                  >
                    <Remove sx={{ fontSize: 14 }} />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleQuantityChange(item.id, (item.quantity ?? 1) + 1)}
                  >
                    <Add sx={{ fontSize: 14 }} />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleRemoveItem(item.id)}>
                    <Close sx={{ fontSize: 14 }} />
                  </IconButton>
                </Stack>
              )
            }
          >
            <ListItemButton dense onClick={() => handleToggle(item.id, item.checked)} disabled={!isActive}>
              <ListItemIcon sx={{ minWidth: 36 }}>
                {item.checked ? (
                  <CheckCircle color="success" fontSize="small" />
                ) : (
                  <RadioButtonUnchecked fontSize="small" />
                )}
              </ListItemIcon>
              <ListItemText
                primary={
                  (item.quantity ?? 1) > 1
                    ? `${item.name} (×${item.quantity})`
                    : item.name
                }
                secondary={
                  item.tags?.length > 0 ? (
                    <Stack direction="row" spacing={0.25} sx={{ mt: 0.25, flexWrap: "wrap", gap: 0.25 }}>
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
                secondaryTypographyProps={{ component: "span" }}
                sx={{
                  textDecoration: item.checked ? "line-through" : "none",
                  opacity: item.checked ? 0.6 : 1,
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      {isActive && checkedCount === totalCount && totalCount > 0 && (
        <Box sx={{ mt: 1, textAlign: "center" }}>
          <Chip label="Mark Complete" color="success" onClick={handleComplete} clickable />
        </Box>
      )}

      {/* Tag Selector for instance items */}
      <TagSelectorBase
        tags={listTags}
        onCreateTag={async (name, color) => {
          const result = await createListTag({ name, color });
          return result.data;
        }}
        selectedTagIds={tagEditItem?.tags?.map(t => t.id) || []}
        onSelectionChange={tagIds => {
          if (tagEditItem?.listItemId) {
            updateItemTags({ id: tagEditItem.listItemId, tagIds });
          }
        }}
        anchorEl={tagAnchorEl}
        open={Boolean(tagAnchorEl)}
        onClose={() => {
          setTagAnchorEl(null);
          setTagEditItem(null);
        }}
        renderTrigger={() => null}
      />

      {/* Save as New Template Dialog */}
      <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Save as New Template</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Template Name"
            value={newTemplateName}
            onChange={e => setNewTemplateName(e.target.value)}
            placeholder={`${instance?.name || "List"} (copy)`}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveAsTemplate}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default ListInstanceView;
