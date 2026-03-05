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
  IconButton,
  Menu,
  MenuItem,
  Divider,
  Collapse,
  CircularProgress,
} from "@mui/material";
import { Add, PlaylistAddCheck, MoreVert, Edit, Delete, PlayArrow, ExpandMore, ExpandLess } from "@mui/icons-material";
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
import { useCreateTagMutation } from "@/lib/store/api/tagsApi";
import { TaskSearchInput } from "@/components/TaskSearchInput";
import { UNTAGGED_ID } from "@/components/BacklogTagSidebar";
import dynamic from "next/dynamic";

const ListTemplateBuilder = dynamic(() => import("@/components/ListTemplateBuilder"), { ssr: false });

export function ListTab({ isLoading }) {
  const { data: tags = [] } = useGetTagsQuery();
  const [createTag] = useCreateTagMutation();
  const { data: templates = [], isLoading: templatesLoading } = useGetListTemplatesQuery();
  const { data: instances = [], isLoading: instancesLoading } = useGetListInstancesQuery();
  const { data: listTasks = [] } = useGetListTasksQuery();

  const tasksByIdMap = useMemo(() => {
    const map = {};
    listTasks.forEach(t => {
      map[t.id] = t;
    });
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

  // Tag filter state for templates
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState([]);

  const activeInstances = useMemo(() => instances.filter(i => i.status === "active"), [instances]);
  const completedInstances = useMemo(
    () => instances.filter(i => i.status === "completed" || i.status === "archived"),
    [instances]
  );

  // Build a synthetic "tasks" array from templates for the FilterMenu tag count display
  const templatesAsTasks = useMemo(
    () =>
      templates.map(template => ({
        tags: tags.filter(t => (template.tagIds || []).includes(t.id)),
      })),
    [templates, tags]
  );

  // Filter templates by search term and selected tags
  const filteredTemplates = useMemo(() => {
    let result = templates;

    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(t => t.name.toLowerCase().includes(lower));
    }

    if (selectedTagIds.length > 0) {
      const hasUntagged = selectedTagIds.includes(UNTAGGED_ID);
      const regularIds = selectedTagIds.filter(id => id !== UNTAGGED_ID);

      result = result.filter(template => {
        const tTagIds = template.tagIds || [];
        if (hasUntagged && tTagIds.length === 0) return true;
        if (regularIds.length > 0 && regularIds.some(id => tTagIds.includes(id))) return true;
        return false;
      });
    }

    return result;
  }, [templates, searchTerm, selectedTagIds]);

  const handleTagSelect = useCallback(tagId => {
    setSelectedTagIds(prev => (prev.includes(tagId) ? prev : [...prev, tagId]));
  }, []);

  const handleTagDeselect = useCallback(tagId => {
    setSelectedTagIds(prev => prev.filter(id => id !== tagId));
  }, []);

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
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
        <Typography variant="subtitle1" fontWeight="bold">
          Templates
          {selectedTagIds.length > 0 || searchTerm
            ? ` (${filteredTemplates.length} of ${templates.length})`
            : ` (${templates.length})`}
        </Typography>
      </Stack>

      {/* Template search + tag filter */}
      <Box sx={{ mb: 2 }}>
        <TaskSearchInput
          onSearchChange={setSearchTerm}
          placeholder="Search templates..."
          tags={tags}
          tasks={templatesAsTasks}
          selectedTagIds={selectedTagIds}
          onTagSelect={handleTagSelect}
          onTagDeselect={handleTagDeselect}
          onCreateTag={async (name, color) => createTag({ name, color }).unwrap()}
          showPriorityFilter={false}
          showSort={false}
          showUntaggedOption
        />
      </Box>

      {filteredTemplates.length === 0 ? (
        <Card variant="outlined" sx={{ mb: 3, p: 3, textAlign: "center" }}>
          <Typography color="text.secondary">
            {templates.length === 0
              ? "No templates yet. Create one to get started!"
              : "No templates match the current filter."}
          </Typography>
        </Card>
      ) : (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {filteredTemplates.map(template => (
            <Grid item xs={12} sm={6} md={4} key={template.id}>
              <Card variant="outlined">
                <CardContent sx={{ pb: 1 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {template.icon ? `${template.icon} ` : ""}
                        {template.name}
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
                          {tags
                            .filter(t => template.tagIds.includes(t.id))
                            .map(tag => (
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
      <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1.5 }}>
        Active Lists ({activeInstances.length})
      </Typography>

      {activeInstances.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          No active lists. Use a template to create one.
        </Typography>
      ) : (
        <Stack spacing={2} sx={{ mb: 3 }}>
          {activeInstances.map(instance => (
            <Card key={instance.id} variant="outlined">
              <CardContent>
                <ListInstanceView
                  instance={instance}
                  task={tasksByIdMap[instance.taskId]}
                  onDelete={handleDeleteInstance}
                />
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
                    <ListInstanceView
                      instance={instance}
                      task={tasksByIdMap[instance.taskId]}
                      onDelete={handleDeleteInstance}
                    />
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
