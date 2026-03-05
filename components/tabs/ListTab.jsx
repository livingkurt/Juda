"use client";

import { useState, useCallback, useMemo } from "react";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Grid,
  Stack,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Divider,
  Collapse,
  CircularProgress,
} from "@mui/material";
import {
  Add,
  PlaylistAddCheck,
  MoreVert,
  Edit,
  Delete,
  PlayArrow,
  ExpandMore,
  ExpandLess,
} from "@mui/icons-material";
import {
  useGetListTemplatesQuery,
  useGetListInstancesQuery,
  useCreateListInstanceMutation,
  useDeleteListTemplateMutation,
  useDeleteListInstanceMutation,
  useGetListTasksQuery,
} from "@/lib/store/api/listApi";
import { ListInstanceView } from "@/components/ListInstanceView";
import { TagChip } from "@/components/TagChip";
import { useGetTagsQuery } from "@/lib/store/api/tagsApi";
import dynamic from "next/dynamic";

const ListTemplateBuilder = dynamic(() => import("@/components/ListTemplateBuilder"), { ssr: false });

export function ListTab({ isLoading }) {
  const { data: tags = [] } = useGetTagsQuery();
  const { data: templates = [], isLoading: templatesLoading } = useGetListTemplatesQuery();
  const { data: instances = [], isLoading: instancesLoading } = useGetListInstancesQuery();
  const { data: listTasks = [] } = useGetListTasksQuery();

  // Map taskId → task for passing to ListInstanceView
  const tasksByIdMap = useMemo(() => {
    const map = {};
    listTasks.forEach(t => { map[t.id] = t; });
    return map;
  }, [listTasks]);
  const [createInstance] = useCreateListInstanceMutation();
  const [deleteTemplate] = useDeleteListTemplateMutation();
  const [deleteInstance] = useDeleteListInstanceMutation();

  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuTemplate, setMenuTemplate] = useState(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [expandedInstanceId, setExpandedInstanceId] = useState(null);
  const [instanceGroupByTag, setInstanceGroupByTag] = useState(false);

  const activeInstances = useMemo(
    () => instances.filter(i => i.status === "active"),
    [instances]
  );

  // Group active instances by their task's first tag
  const groupedActiveInstances = useMemo(() => {
    if (!instanceGroupByTag) return null;
    const groups = {};
    const untagged = [];
    activeInstances.forEach(inst => {
      const task = tasksByIdMap[inst.taskId];
      const firstTag = task?.tags?.[0];
      if (firstTag) {
        if (!groups[firstTag.id]) groups[firstTag.id] = { tag: firstTag, instances: [] };
        groups[firstTag.id].instances.push(inst);
      } else {
        untagged.push(inst);
      }
    });
    const result = Object.values(groups).sort((a, b) => a.tag.name.localeCompare(b.tag.name));
    if (untagged.length) result.push({ tag: { id: "_none", name: "No Tags", color: "#666" }, instances: untagged });
    return result;
  }, [activeInstances, instanceGroupByTag, tasksByIdMap]);
  const completedInstances = useMemo(
    () => instances.filter(i => i.status === "completed" || i.status === "archived"),
    [instances]
  );

  const handleUseTemplate = useCallback(
    async templateId => {
      await createInstance({ templateId });
    },
    [createInstance]
  );

  const handleEditTemplate = useCallback(template => {
    setEditingTemplate(template);
    setBuilderOpen(true);
    setMenuAnchor(null);
  }, []);

  const handleDeleteTemplate = useCallback(
    async id => {
      await deleteTemplate(id);
      setMenuAnchor(null);
    },
    [deleteTemplate]
  );

  const handleDeleteInstance = useCallback(
    async id => {
      await deleteInstance(id);
    },
    [deleteInstance]
  );

  const handleOpenMenu = useCallback((event, template) => {
    setMenuAnchor(event.currentTarget);
    setMenuTemplate(template);
  }, []);

  if (isLoading || templatesLoading || instancesLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%", p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, overflow: "auto", height: "100%" }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <PlaylistAddCheck />
          <Typography variant="h5" fontWeight="bold">
            Lists
          </Typography>
        </Stack>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => {
            setEditingTemplate(null);
            setBuilderOpen(true);
          }}
          size="small"
        >
          New Template
        </Button>
      </Stack>

      {/* Templates Section */}
      <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1.5 }}>
        Templates
      </Typography>

      {templates.length === 0 ? (
        <Card variant="outlined" sx={{ mb: 3, p: 3, textAlign: "center" }}>
          <Typography color="text.secondary">
            No templates yet. Create one to get started!
          </Typography>
        </Card>
      ) : (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {templates.map(template => (
            <Grid item xs={12} sm={6} md={4} key={template.id}>
              <Card variant="outlined">
                <CardContent sx={{ pb: 1 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {template.icon ? `${template.icon} ` : ""}{template.name}
                      </Typography>
                      {template.description && (
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {template.description}
                        </Typography>
                      )}
                      <Typography variant="caption" color="text.secondary">
                        {template.items?.length || 0} items
                      </Typography>
                      {template.tagIds?.length > 0 && (
                        <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: "wrap", gap: 0.25 }}>
                          {tags.filter(t => template.tagIds.includes(t.id)).map(tag => (
                            <TagChip key={tag.id} tag={tag} size="xs" />
                          ))}
                        </Stack>
                      )}
                    </Box>
                    <IconButton size="small" onClick={e => handleOpenMenu(e, template)}>
                      <MoreVert fontSize="small" />
                    </IconButton>
                  </Stack>
                </CardContent>
                <CardActions>
                  <Button
                    size="small"
                    startIcon={<PlayArrow />}
                    onClick={() => handleUseTemplate(template.id)}
                    variant="outlined"
                  >
                    Use
                  </Button>
                  <Button size="small" startIcon={<Edit />} onClick={() => handleEditTemplate(template)}>
                    Edit
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Divider sx={{ mb: 2 }} />

      {/* Active Instances */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
        <Typography variant="subtitle1" fontWeight="bold">
          Active Lists ({activeInstances.length})
        </Typography>
        <Chip
          label="Group by Tag"
          size="small"
          variant={instanceGroupByTag ? "filled" : "outlined"}
          color={instanceGroupByTag ? "primary" : "default"}
          onClick={() => setInstanceGroupByTag(prev => !prev)}
        />
      </Stack>

      {activeInstances.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          No active lists. Use a template to create one.
        </Typography>
      ) : instanceGroupByTag && groupedActiveInstances ? (
        <Stack spacing={3} sx={{ mb: 3 }}>
          {groupedActiveInstances.map(group => (
            <Box key={group.tag.id}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: group.tag.color }} />
                <Typography variant="subtitle2" fontWeight="bold">
                  {group.tag.name} ({group.instances.length})
                </Typography>
              </Stack>
              <Stack spacing={2}>
                {group.instances.map(instance => (
                  <Card key={instance.id} variant="outlined">
                    <CardContent>
                      <ListInstanceView instance={instance} task={tasksByIdMap[instance.taskId]} onDelete={handleDeleteInstance} />
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            </Box>
          ))}
        </Stack>
      ) : (
        <Stack spacing={2} sx={{ mb: 3 }}>
          {activeInstances.map(instance => (
            <Card key={instance.id} variant="outlined">
              <CardContent>
                <ListInstanceView instance={instance} task={tasksByIdMap[instance.taskId]} onDelete={handleDeleteInstance} />
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      {/* Completed Section */}
      {completedInstances.length > 0 && (
        <>
          <Divider sx={{ mb: 1 }} />
          <Button
            onClick={() => setShowCompleted(!showCompleted)}
            endIcon={showCompleted ? <ExpandLess /> : <ExpandMore />}
            size="small"
            sx={{ mb: 1, textTransform: "none" }}
          >
            Completed ({completedInstances.length})
          </Button>
          <Collapse in={showCompleted}>
            <Stack spacing={2}>
              {completedInstances.map(instance => (
                <Card key={instance.id} variant="outlined" sx={{ opacity: 0.6 }}>
                  <CardContent>
                    <ListInstanceView instance={instance} task={tasksByIdMap[instance.taskId]} onDelete={handleDeleteInstance} />
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </Collapse>
        </>
      )}

      {/* Template Context Menu */}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        <MenuItem
          onClick={() => {
            if (menuTemplate) handleEditTemplate(menuTemplate);
          }}
        >
          <Edit fontSize="small" sx={{ mr: 1 }} /> Edit
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuTemplate) handleDeleteTemplate(menuTemplate.id);
          }}
          sx={{ color: "error.main" }}
        >
          <Delete fontSize="small" sx={{ mr: 1 }} /> Delete
        </MenuItem>
      </Menu>

      {/* Template Builder Dialog */}
      <ListTemplateBuilder
        open={builderOpen}
        onClose={() => {
          setBuilderOpen(false);
          setEditingTemplate(null);
        }}
        editingTemplate={editingTemplate}
      />
    </Box>
  );
}

export default ListTab;
