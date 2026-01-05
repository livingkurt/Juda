# Mantine UI Migration Status

## ✅ Completed Phases

### Phase 1: Package Installation & Setup ✅

- [x] Installed Mantine core packages (`@mantine/core`, `@mantine/hooks`)
- [x] Installed Mantine feature packages (`@mantine/dates`, `@mantine/notifications`, `@mantine/form`, `@mantine/charts`)
- [x] Installed PostCSS packages (`postcss`, `postcss-preset-mantine`, `postcss-simple-vars`)
- [x] Created `postcss.config.cjs` with Mantine configuration
- [x] Updated `next.config.js` with Mantine package optimization

### Phase 2: Provider Setup ✅

- [x] Created `lib/theme.js` with Mantine theme configuration
- [x] Updated `app/layout.jsx` to import Mantine CSS and use `ColorSchemeScript`
- [x] Updated `app/providers.jsx` to use `MantineProvider`
- [x] Created `components/MantineColorModeSync.jsx` to sync Mantine color scheme with preferences
- [x] Created `hooks/useToast.js` using Mantine notifications API
- [x] Updated `components/MobileZoomFix.jsx` for Mantine selectors

### Phase 3: Component Migrations ✅ (10/58 completed)

- [x] Migrated `components/SelectDropdown.jsx` (simplified API!)
- [x] Migrated `components/Skeletons.jsx` (Loader instead of Spinner)
- [x] Migrated `components/DebouncedInput.jsx` (TextInput)
- [x] Migrated `components/OfflineIndicator.jsx` (Badge, ActionIcon, Loader)
- [x] Migrated `components/SyncStatusIndicator.jsx` (Group, Box, Text)
- [x] Migrated `components/ThemeSelector.jsx` (Menu simplified!)
- [x] Migrated `components/TagChip.jsx` (Badge with CloseButton)
- [x] Migrated `components/WeekdaySelector.jsx` (Button, Group)
- [x] Migrated `components/CurrentTimeLine.jsx` (Box with useMantineColorScheme)
- [x] Migrated `components/DateNavigation.jsx` (Updated to use new SelectDropdown API)

---

## 🚧 Remaining Work

### Phase 4-9: Component Migrations (56 files remaining)

**Priority Order:**

#### High Priority (Core Components)

1. `app/page.jsx` - Main app component (largest file)
2. `components/TaskDialog.jsx` - Task creation/editing (lots of forms/selects)
3. `components/TaskItem.jsx` - Task display component
4. `components/Section.jsx` - Today view sections
5. `components/BacklogDrawer.jsx` - Backlog sidebar

#### Medium Priority (Feature Components)

6. `components/AuthPage.jsx`
7. `components/LoginForm.jsx`
8. `components/RegisterForm.jsx`
9. `components/ForgotPasswordForm.jsx`
10. `components/SectionDialog.jsx`
11. `components/SectionCard.jsx`
12. `components/TaskContextMenu.jsx`
13. `components/TaskSearchInput.jsx`
14. `components/InlineTaskInput.jsx`

#### Calendar Components

15. `components/CalendarDayView.jsx`
16. `components/CalendarWeekView.jsx`
17. `components/CalendarMonthView.jsx`
18. `components/CalendarYearView.jsx`
19. `components/CalendarTask.jsx`
20. `components/DateNavigation.jsx`
21. `components/DayHeaderColumn.jsx`
22. `components/TimedColumn.jsx`
23. `components/CurrentTimeLine.jsx`

#### Other Feature Components

24. `components/NotesView.jsx`
25. `components/NoteEditor.jsx`
26. `components/RichTextEditor.jsx` (keep TipTap, update container)
27. `components/KanbanView.jsx`
28. `components/JournalView.jsx`
29. `components/JournalDayEntry.jsx`
30. `components/RecurringTableView.jsx`
31. `components/StatusTaskBlock.jsx`

#### Workout Components

32. `components/WorkoutModal.jsx`
33. `components/WorkoutBuilder.jsx`
34. `components/WorkoutDaySection.jsx`
35. `components/WorkoutExerciseCard.jsx`

#### Tag & Filter Components

36. `components/TagSelector.jsx`
37. `components/TagFilter.jsx`
38. `components/TagChip.jsx`
39. `components/TagEditor.jsx`
40. `components/TagMenuSelector.jsx`
41. `components/BacklogTagSidebar.jsx`

#### Utility Components

42. `components/ThemeSelector.jsx`
43. `components/WeekdaySelector.jsx`
44. `components/BulkEditDialog.jsx`
45. `components/OfflineIndicator.jsx`
46. `components/SyncStatusIndicator.jsx`
47. `components/SyncAnimationWrapper.jsx`
48. `components/TaskOutcomeMenu.jsx`
49. `components/CellEditorPopover.jsx`
50. `components/DebouncedInput.jsx`

#### Shared Components

51. `components/shared/TaskCardMini.jsx`
52. `components/shared/TaskCardCompact.jsx`
53. `components/shared/TaskBadges.jsx`

---

## 📋 Migration Checklist Template

For each component, follow this checklist:

- [ ] Use Mantine imports from `@mantine/core`
- [ ] Use component names: `Loader`, `ActionIcon`, `Select`, `Modal`, `Menu`, `Tabs`
- [ ] Use `Select` with `data` prop (array of { value, label })
- [ ] Use `Modal` with `opened` and `onClose` props
- [ ] Use `Menu` with `Menu.Target` and `Menu.Dropdown`
- [ ] Use `Tabs` with `Tabs.List` and `Tabs.Panel`
- [ ] Use style props (`c` for color, `mih` for minHeight, `maw` for maxWidth, etc.)
- [ ] Use `notifications.show()` for toasts
- [ ] Use `useSemanticColors()` hook for theme-aware colors
- [ ] Test in both light and dark modes
- [ ] Test on mobile
- [ ] Run `npm run lint` and fix errors
- [ ] Run `npm run build` to verify no build errors

---

## 🔄 Common Mantine Patterns

### Select Dropdown

```jsx
import { Select } from "@mantine/core";

<Select value={value} onChange={setValue} placeholder="Select..." data={[{ value: "option", label: "Option" }]} />;
```

### Modal

```jsx
import { Modal, Button, Group } from "@mantine/core";

<Modal opened={isOpen} onClose={onClose} title="Title">
  Content
  <Group justify="flex-end" mt="md">
    <Button onClick={onClose}>Close</Button>
  </Group>
</Modal>;
```

### Toast/Notifications

```jsx
import { notifications } from "@mantine/notifications";

notifications.show({
  title: "Success",
  message: "Done!",
  color: "green",
});
```

### Loading Spinner

```jsx
import { Loader } from "@mantine/core";
<Loader size="xl" color="blue" />;
```

### Icon Button

```jsx
import { ActionIcon } from "@mantine/core";
<ActionIcon variant="subtle" aria-label="Options">
  <Icon />
</ActionIcon>;
```

---

## 🎨 Style Props Reference

| Mantine         | Notes            |
| --------------- | ---------------- |
| `bg`            | Background color |
| `c`             | Text color       |
| `p`, `px`, `py` | Padding          |
| `m`, `mx`, `my` | Margin           |
| `w`             | Width            |
| `h`             | Height           |
| `mih`           | Min height       |
| `maw`           | Max width        |
| `fz`            | Font size        |
| `fw`            | Font weight      |
| `radius`        | Border radius    |
| `align`         | Align items      |
| `justify`       | Justify content  |
| `gap`           | Gap spacing      |

---

## 🚨 Important Notes

1. **Mantine uses CSS modules** - Style props work with Mantine's styling system
2. **Color scheme sync** - `MantineColorModeSync` component ensures Mantine follows Juda's preferences
3. **Theme colors** - Use `useSemanticColors()` hook for theme-aware colors
4. **Notifications are global** - No provider needed, just call `notifications.show()`
5. **Select is simple** - Use `data` prop with array of { value, label } objects
6. **Modal is simple** - Use `opened` and `onClose` props directly

---

## 📝 Next Steps

1. Start migrating components one at a time, starting with high-priority files
2. Test each component after migration
3. Run `npm run lint` after each migration
4. Run `npm run build` periodically to catch errors early
5. Update this document as you progress

---

## ✅ Migration Complete Checklist

- [ ] All 58 component files migrated
- [ ] All tests passing
- [ ] No linting errors
- [ ] Build succeeds
- [ ] Light mode works
- [ ] Dark mode works
- [ ] Mobile responsive
- [ ] All interactions work
- [ ] No console errors
- [ ] Documentation updated
