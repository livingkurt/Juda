"use client";

import { useState, useMemo } from "react";
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
  Typography,
  Chip,
  Autocomplete,
} from "@mui/material";
import { useCreateSmartFolderMutation, useUpdateSmartFolderMutation } from "@/lib/store/api/smartFoldersApi";
import { useGetTagsQuery } from "@/lib/store/api/tagsApi";

export const SmartFolderDialog = ({ open, onClose, editingSmartFolder = null }) => {
  const [name, setName] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [operator, setOperator] = useState("any"); // "any" | "all" | "none"

  const { data: tags = [] } = useGetTagsQuery();
  const [createSmartFolder, { isLoading: isCreating }] = useCreateSmartFolderMutation();
  const [updateSmartFolder, { isLoading: isUpdating }] = useUpdateSmartFolderMutation();

  const resetForm = () => {
    setName("");
    setSelectedTagIds([]);
    setOperator("any");
  };

  const syncFormState = () => {
    if (editingSmartFolder) {
      setName(editingSmartFolder.name || "");
      setSelectedTagIds(editingSmartFolder.filters?.tags || []);
      setOperator(editingSmartFolder.filters?.operator || "any");
    } else {
      resetForm();
    }
  };

  const selectedTags = useMemo(() => tags.filter(t => selectedTagIds.includes(t.id)), [tags, selectedTagIds]);

  const handleSubmit = async () => {
    if (!name.trim() || selectedTagIds.length === 0) return;

    try {
      const filters = {
        tags: selectedTagIds,
        operator,
      };

      if (editingSmartFolder) {
        await updateSmartFolder({
          id: editingSmartFolder.id,
          name: name.trim(),
          filters,
        }).unwrap();
      } else {
        await createSmartFolder({
          name: name.trim(),
          filters,
        }).unwrap();
      }
      onClose();
    } catch (error) {
      console.error("Failed to save smart folder:", error);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      onTransitionEnter={syncFormState}
      onTransitionExited={resetForm}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>{editingSmartFolder ? "Edit Smart Folder" : "New Smart Folder"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Smart Folder Name"
            value={name}
            onChange={e => setName(e.target.value)}
            fullWidth
            autoFocus
          />

          <Autocomplete
            multiple
            options={tags}
            getOptionLabel={option => option.name}
            value={selectedTags}
            onChange={(_, newValue) => setSelectedTagIds(newValue.map(t => t.id))}
            renderInput={params => <TextField {...params} label="Filter by Tags" placeholder="Select tags..." />}
            renderTags={(value, getTagProps) =>
              value.map((tag, index) => (
                <Chip
                  {...getTagProps({ index })}
                  key={tag.id}
                  label={tag.name}
                  size="small"
                  sx={{ bgcolor: tag.color || "#6b7280", color: "white" }}
                />
              ))
            }
          />

          <FormControl fullWidth>
            <InputLabel>Match Condition</InputLabel>
            <Select value={operator} onChange={e => setOperator(e.target.value)} label="Match Condition">
              <MenuItem value="any">Any of these tags (OR)</MenuItem>
              <MenuItem value="all">All of these tags (AND)</MenuItem>
              <MenuItem value="none">None of these tags (NOT)</MenuItem>
            </Select>
          </FormControl>

          <Typography variant="caption" color="text.secondary">
            {operator === "any" && "Notes with ANY of the selected tags will appear"}
            {operator === "all" && "Notes must have ALL selected tags to appear"}
            {operator === "none" && "Notes with NONE of the selected tags will appear"}
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!name.trim() || selectedTagIds.length === 0 || isCreating || isUpdating}
        >
          {editingSmartFolder ? "Update" : "Create"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SmartFolderDialog;
