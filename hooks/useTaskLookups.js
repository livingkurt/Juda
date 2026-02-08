import { useMemo } from "react";

const collectTasks = tasks => {
  const collected = [];
  const walk = list => {
    list.forEach(task => {
      collected.push(task);
      if (Array.isArray(task.subtasks) && task.subtasks.length > 0) {
        walk(task.subtasks);
      }
    });
  };
  walk(tasks);
  return collected;
};

export function useTaskLookups({ tasks = [], tags = [], sections = [] } = {}) {
  const allTasksFlat = useMemo(() => collectTasks(tasks), [tasks]);

  const taskById = useMemo(() => {
    const map = new Map();
    allTasksFlat.forEach(task => {
      map.set(task.id, task);
    });
    return map;
  }, [allTasksFlat]);

  const tagById = useMemo(() => {
    const map = new Map();
    tags.forEach(tag => {
      map.set(tag.id, tag);
    });
    return map;
  }, [tags]);

  const sectionById = useMemo(() => {
    const map = new Map();
    sections.forEach(section => {
      map.set(section.id, section);
    });
    return map;
  }, [sections]);

  const tasksBySection = useMemo(() => {
    const map = new Map();
    tasks.forEach(task => {
      const sectionId = task.sectionId || "no-section";
      if (!map.has(sectionId)) {
        map.set(sectionId, []);
      }
      map.get(sectionId).push(task);
    });
    return map;
  }, [tasks]);

  const tagsForTask = useMemo(() => {
    const map = new Map();
    allTasksFlat.forEach(task => {
      if (Array.isArray(task.tags) && task.tags.length > 0) {
        map.set(task.id, task.tags);
        return;
      }
      const resolved = (task.tagIds || []).map(id => tagById.get(id)).filter(Boolean);
      map.set(task.id, resolved);
    });
    return map;
  }, [allTasksFlat, tagById]);

  return { taskById, tagById, sectionById, tasksBySection, tagsForTask };
}
