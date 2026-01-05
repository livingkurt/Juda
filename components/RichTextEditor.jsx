"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Link from "@tiptap/extension-link";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import { Box, Stack, IconButton, Divider, Tooltip } from "@mui/material";
import {
  FormatBold as Bold,
  FormatItalic as Italic,
  StrikethroughS as Strikethrough,
  FormatListBulleted as List,
  FormatListNumbered as ListOrdered,
  CheckBox as CheckSquare,
  FormatQuote as Quote,
  Code as Code,
  FormatAlignLeft as AlignLeft,
  FormatAlignCenter as AlignCenter,
  FormatAlignRight as AlignRight,
  Undo as Undo,
  Redo as Redo,
  Highlight as Highlighter,
} from "@mui/icons-material";
import { useEffect } from "react";

const MenuButton = ({ icon: Icon, isActive, onClick, title }) => (
  <Tooltip title={title}>
    <IconButton
      size="small"
      onClick={onClick}
      sx={{
        bgcolor: isActive ? "action.selected" : "transparent",
        "&:hover": { bgcolor: "action.hover" },
      }}
    >
      <Icon fontSize="small" />
    </IconButton>
  </Tooltip>
);

export const RichTextEditor = ({
  content,
  onChange,
  placeholder = "Start writing...",
  editable = true,
  showToolbar = true,
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Link.configure({ openOnClick: false }),
      Highlight,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content,
    editable,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
  });

  // Sync content when it changes externally
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, false);
    }
  }, [content, editor]);

  if (!editor) return null;

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Toolbar */}
      {showToolbar && (
        <Stack
          direction="row"
          spacing={0.5}
          flexWrap="wrap"
          sx={{ pb: 1, mb: 1, borderBottom: 1, borderColor: "divider" }}
        >
          <MenuButton
            icon={Bold}
            isActive={editor.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="Bold"
          />
          <MenuButton
            icon={Italic}
            isActive={editor.isActive("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="Italic"
          />
          <MenuButton
            icon={Strikethrough}
            isActive={editor.isActive("strike")}
            onClick={() => editor.chain().focus().toggleStrike().run()}
            title="Strikethrough"
          />
          <MenuButton
            icon={Highlighter}
            isActive={editor.isActive("highlight")}
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            title="Highlight"
          />

          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

          <MenuButton
            icon={List}
            isActive={editor.isActive("bulletList")}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            title="Bullet List"
          />
          <MenuButton
            icon={ListOrdered}
            isActive={editor.isActive("orderedList")}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            title="Numbered List"
          />
          <MenuButton
            icon={CheckSquare}
            isActive={editor.isActive("taskList")}
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            title="Task List"
          />

          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

          <MenuButton
            icon={Quote}
            isActive={editor.isActive("blockquote")}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            title="Quote"
          />
          <MenuButton
            icon={Code}
            isActive={editor.isActive("codeBlock")}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            title="Code Block"
          />

          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

          <MenuButton
            icon={AlignLeft}
            isActive={editor.isActive({ textAlign: "left" })}
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
            title="Align Left"
          />
          <MenuButton
            icon={AlignCenter}
            isActive={editor.isActive({ textAlign: "center" })}
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
            title="Align Center"
          />
          <MenuButton
            icon={AlignRight}
            isActive={editor.isActive({ textAlign: "right" })}
            onClick={() => editor.chain().focus().setTextAlign("right").run()}
            title="Align Right"
          />

          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

          <MenuButton icon={Undo} isActive={false} onClick={() => editor.chain().focus().undo().run()} title="Undo" />
          <MenuButton icon={Redo} isActive={false} onClick={() => editor.chain().focus().redo().run()} title="Redo" />
        </Stack>
      )}

      {/* Editor Content */}
      <Box
        sx={{
          flex: 1,
          overflow: "auto",
          "& .ProseMirror": {
            outline: "none",
            minHeight: "100%",
            "& p": { my: 0.5 },
            "& h1": { fontSize: "1.75rem", fontWeight: 600, my: 1 },
            "& h2": { fontSize: "1.5rem", fontWeight: 600, my: 1 },
            "& h3": { fontSize: "1.25rem", fontWeight: 600, my: 0.75 },
            "& ul, & ol": { pl: 3 },
            "& blockquote": { borderLeft: 3, borderColor: "divider", pl: 2, ml: 0, fontStyle: "italic" },
            "& code": { bgcolor: "action.hover", px: 0.5, borderRadius: 0.5, fontFamily: "monospace" },
            "& pre": { bgcolor: "grey.900", color: "grey.100", p: 2, borderRadius: 1, overflow: "auto" },
          },
        }}
      >
        <EditorContent editor={editor} />
      </Box>
    </Box>
  );
};

export default RichTextEditor;
