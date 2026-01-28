"use client";

import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
} from "@mui/material";
import {
  useCreateFolderMutation,
  useUpdateFolderMutation,
  useDeleteFolderMutation,
  useGetFoldersQuery,
} from "@/lib/store/api/foldersApi";

export const FolderDialog = ({ open, onClose, editingFolder = null }) => {
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("");
  const [color, setColor] = useState("#6b7280");

  const { data: folders = [] } = useGetFoldersQuery();
  const [createFolder, { isLoading: isCreating }] = useCreateFolderMutation();
  const [updateFolder, { isLoading: isUpdating }] = useUpdateFolderMutation();
  const [deleteFolder, { isLoading: isDeleting }] = useDeleteFolderMutation();

  const resetForm = () => {
    setName("");
    setParentId("");
    setColor("#6b7280");
  };

  const syncFormState = () => {
    if (editingFolder) {
      setName(editingFolder.name || "");
      setParentId(editingFolder.parentId || "");
      setColor(editingFolder.color || "#6b7280");
    } else {
      resetForm();
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;

    try {
      if (editingFolder) {
        await updateFolder({
          id: editingFolder.id,
          name: name.trim(),
          parentId: parentId || null,
          color,
        }).unwrap();
      } else {
        await createFolder({
          name: name.trim(),
          parentId: parentId || null,
          color,
        }).unwrap();
      }
      onClose();
    } catch (error) {
      console.error("Failed to save folder:", error);
    }
  };

  const handleDelete = async () => {
    if (!editingFolder) return;

    if (
      // eslint-disable-next-line no-alert
      window.confirm(`Delete folder "${editingFolder.name}"? Notes in this folder will be moved to the root level.`)
    ) {
      try {
        await deleteFolder(editingFolder.id).unwrap();
        onClose();
      } catch (error) {
        console.error("Failed to delete folder:", error);
      }
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      onTransitionEnter={syncFormState}
      onTransitionExited={resetForm}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle>{editingFolder ? "Edit Folder" : "New Folder"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="Folder Name" value={name} onChange={e => setName(e.target.value)} fullWidth autoFocus />
          <FormControl fullWidth>
            <InputLabel>Parent Folder (optional)</InputLabel>
            <Select value={parentId} onChange={e => setParentId(e.target.value)} label="Parent Folder (optional)">
              <MenuItem value="">None (Root level)</MenuItem>
              {folders
                .filter(f => f.id !== editingFolder?.id)
                .map(folder => (
                  <MenuItem key={folder.id} value={folder.id}>
                    {folder.name}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
          <TextField
            label="Color"
            type="color"
            value={color}
            onChange={e => setColor(e.target.value)}
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        {editingFolder && (
          <Button onClick={handleDelete} color="error" disabled={isDeleting} sx={{ mr: "auto" }}>
            Delete
          </Button>
        )}
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={!name.trim() || isCreating || isUpdating}>
          {editingFolder ? "Update" : "Create"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FolderDialog;
