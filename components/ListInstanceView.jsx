"use client";

import { useCallback, useMemo } from "react";
import {
  Box,
  Typography,
  Checkbox,
  LinearProgress,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Chip,
  IconButton,
  Stack,
} from "@mui/material";
import { CheckCircle, RadioButtonUnchecked, Archive, Delete } from "@mui/icons-material";
import { useToggleListInstanceItemsMutation, useUpdateListInstanceMutation } from "@/lib/store/api/listApi";

export function ListInstanceView({ instance, onDelete }) {
  const [toggleItems] = useToggleListInstanceItemsMutation();
  const [updateInstance] = useUpdateListInstanceMutation();

  const items = instance?.instanceItems || [];
  const checkedCount = items.filter(i => i.checked).length;
  const totalCount = items.length;
  const progress = totalCount > 0 ? (checkedCount / totalCount) * 100 : 0;

  const handleToggle = useCallback(
    (itemId, currentChecked) => {
      toggleItems({
        instanceId: instance.id,
        items: [{ id: itemId, checked: !currentChecked }],
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
        </Box>
        <Stack direction="row" spacing={0.5}>
          <Chip
            size="small"
            label={`${checkedCount}/${totalCount}`}
            color={checkedCount === totalCount && totalCount > 0 ? "success" : "default"}
          />
          {instance.status === "active" && (
            <>
              <IconButton size="small" onClick={handleArchive} title="Archive">
                <Archive fontSize="small" />
              </IconButton>
              {onDelete && (
                <IconButton size="small" onClick={() => onDelete(instance.id)} title="Delete">
                  <Delete fontSize="small" />
                </IconButton>
              )}
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

      <List dense disablePadding>
        {items.map(item => (
          <ListItem key={item.id} disablePadding>
            <ListItemButton
              dense
              onClick={() => handleToggle(item.id, item.checked)}
              disabled={instance.status !== "active"}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                {item.checked ? (
                  <CheckCircle color="success" fontSize="small" />
                ) : (
                  <RadioButtonUnchecked fontSize="small" />
                )}
              </ListItemIcon>
              <ListItemText
                primary={item.name}
                sx={{
                  textDecoration: item.checked ? "line-through" : "none",
                  opacity: item.checked ? 0.6 : 1,
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      {instance.status === "active" && checkedCount === totalCount && totalCount > 0 && (
        <Box sx={{ mt: 1, textAlign: "center" }}>
          <Chip label="Mark Complete" color="success" onClick={handleComplete} clickable />
        </Box>
      )}
    </Box>
  );
}

export default ListInstanceView;
