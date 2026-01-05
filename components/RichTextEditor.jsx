"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Link from "@tiptap/extension-link";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import { Box, Group, ActionIcon, Divider } from "@mantine/core";
import {
  Bold,
  Italic,
  Strikethrough,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Code,
  Link as LinkIcon,
  Highlighter,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Heading1,
  Heading2,
  Heading3,
  Undo,
  Redo,
} from "lucide-react";
import { useCallback, useEffect } from "react";
import { promptUser } from "@/lib/prompt";
import { useSemanticColors } from "@/hooks/useSemanticColors";

// ToolbarButton component defined outside to avoid re-creation during render
const ToolbarButton = ({ icon: Icon, isActive, onClick, label }) => (
  <ActionIcon
    size="xs"
    variant={isActive ? "filled" : "subtle"}
    color={isActive ? "blue" : "gray"}
    onClick={onClick}
    aria-label={label}
    style={{ borderRadius: "var(--mantine-radius-md)" }}
  >
    <Icon size={14} />
  </ActionIcon>
);

export const RichTextEditor = ({
  content,
  onChange,
  placeholder = "Start writing...",
  editable = true,
  showToolbar = true,
}) => {
  const { mode } = useSemanticColors();
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Link.configure({
        openOnClick: false,
      }),
      Highlight,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
    ],
    content: content || "",
    editable,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
  });

  // Update content when prop changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || "");
    }
  }, [content, editor]);

  const setLink = useCallback(() => {
    if (!editor) return;

    const previousUrl = editor.getAttributes("link").href;
    const url = promptUser("URL", previousUrl);

    if (url === null) return;

    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  if (!editor) return null;

  return (
    <Box style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Floating Toolbar */}
      {editable && showToolbar && (
        <Group
          style={{
            paddingLeft: 16,
            paddingRight: 16,
            paddingTop: 8,
            paddingBottom: 8,
            background: mode.bg.canvas,
            borderBottomWidth: "1px",
            borderBottomColor: mode.border.default,
            borderBottomStyle: "solid",
            gap: 2,
            flexWrap: "wrap",
            flexShrink: 0,
          }}
        >
          <ToolbarButton
            icon={Bold}
            isActive={editor.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
            label="Bold"
          />
          <ToolbarButton
            icon={Italic}
            isActive={editor.isActive("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            label="Italic"
          />
          <ToolbarButton
            icon={Strikethrough}
            isActive={editor.isActive("strike")}
            onClick={() => editor.chain().focus().toggleStrike().run()}
            label="Strikethrough"
          />
          <ToolbarButton
            icon={Highlighter}
            isActive={editor.isActive("highlight")}
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            label="Highlight"
          />

          <Divider orientation="vertical" style={{ height: 16, marginLeft: 4, marginRight: 4 }} />

          <ToolbarButton
            icon={Heading1}
            isActive={editor.isActive("heading", { level: 1 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            label="Heading 1"
          />
          <ToolbarButton
            icon={Heading2}
            isActive={editor.isActive("heading", { level: 2 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            label="Heading 2"
          />
          <ToolbarButton
            icon={Heading3}
            isActive={editor.isActive("heading", { level: 3 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            label="Heading 3"
          />

          <Divider orientation="vertical" style={{ height: 16, marginLeft: 4, marginRight: 4 }} />

          <ToolbarButton
            icon={List}
            isActive={editor.isActive("bulletList")}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            label="Bullet List"
          />
          <ToolbarButton
            icon={ListOrdered}
            isActive={editor.isActive("orderedList")}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            label="Numbered List"
          />
          <ToolbarButton
            icon={CheckSquare}
            isActive={editor.isActive("taskList")}
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            label="Task List"
          />

          <Divider orientation="vertical" style={{ height: 16, marginLeft: 4, marginRight: 4 }} />

          <ToolbarButton
            icon={Quote}
            isActive={editor.isActive("blockquote")}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            label="Quote"
          />
          <ToolbarButton
            icon={Code}
            isActive={editor.isActive("codeBlock")}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            label="Code Block"
          />
          <ToolbarButton icon={LinkIcon} isActive={editor.isActive("link")} onClick={setLink} label="Link" />

          <Divider orientation="vertical" style={{ height: 16, marginLeft: 4, marginRight: 4 }} />

          <ToolbarButton
            icon={AlignLeft}
            isActive={editor.isActive({ textAlign: "left" })}
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
            label="Align Left"
          />
          <ToolbarButton
            icon={AlignCenter}
            isActive={editor.isActive({ textAlign: "center" })}
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
            label="Align Center"
          />
          <ToolbarButton
            icon={AlignRight}
            isActive={editor.isActive({ textAlign: "right" })}
            onClick={() => editor.chain().focus().setTextAlign("right").run()}
            label="Align Right"
          />

          <Divider orientation="vertical" style={{ height: 16, marginLeft: 4, marginRight: 4 }} />

          <ToolbarButton
            icon={Undo}
            isActive={false}
            onClick={() => editor.chain().focus().undo().run()}
            label="Undo"
          />
          <ToolbarButton
            icon={Redo}
            isActive={false}
            onClick={() => editor.chain().focus().redo().run()}
            label="Redo"
          />
        </Group>
      )}

      {/* Editor Content - Clean, borderless, full height */}
      <Box
        style={{
          flex: 1,
          overflowY: "auto",
          paddingLeft: 24,
          paddingRight: 24,
          paddingTop: 24,
          paddingBottom: 24,
          background: mode.bg.surface,
        }}
        sx={{
          /* Remove focus outline from editor wrapper */
          "&:focus-within": {
            outline: "none",
          },
          "& > div": {
            outline: "none",
          },
          "& .tiptap": {
            outline: "none",
          },

          /* Notion-style editor styling */
          ".ProseMirror": {
            outline: "none",
            border: "none",
            boxShadow: "none",
            minHeight: "100%",
            fontSize: "16px",
            lineHeight: "1.8",
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',

            "&:focus": {
              outline: "none",
              border: "none",
              boxShadow: "none",
            },

            "&:focusVisible": {
              outline: "none",
              border: "none",
              boxShadow: "none",
            },

            /* Placeholder */
            "& p.is-editor-empty:first-of-type::before": {
              content: "attr(data-placeholder)",
              color: mode.text.placeholder,
              pointerEvents: "none",
              float: "left",
              height: 0,
              fontSize: "16px",
            },

            /* Paragraphs */
            "& p": {
              marginBottom: "0.75em",
              marginTop: 0,
            },

            /* Headings - Notion style */
            "& h1": {
              fontSize: "1.875em",
              fontWeight: "700",
              lineHeight: "1.3",
              marginTop: "2em",
              marginBottom: "0.5em",
              "&:first-of-type": {
                marginTop: 0,
              },
            },
            "& h2": {
              fontSize: "1.5em",
              fontWeight: "600",
              lineHeight: "1.35",
              marginTop: "1.75em",
              marginBottom: "0.5em",
            },
            "& h3": {
              fontSize: "1.25em",
              fontWeight: "600",
              lineHeight: "1.4",
              marginTop: "1.5em",
              marginBottom: "0.5em",
            },

            /* Lists styled via globalCss in providers.jsx */

            /* Blockquotes - Notion style */
            "& blockquote": {
              borderLeft: `3px solid ${mode.border.subtle}`,
              paddingLeft: "1em",
              marginLeft: 0,
              marginRight: 0,
              marginTop: "0.75em",
              marginBottom: "0.75em",
              color: mode.text.secondary,
            },

            /* Code blocks */
            "& pre": {
              backgroundColor: mode.bg.canvas,
              color: mode.text.primary,
              padding: "1em",
              borderRadius: "6px",
              overflow: "auto",
              marginTop: "0.75em",
              marginBottom: "0.75em",
              fontSize: "0.875em",
              lineHeight: "1.6",
              fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
              "& code": {
                backgroundColor: "transparent",
                padding: 0,
                color: "inherit",
                fontSize: "inherit",
              },
            },

            /* Inline code */
            "& code": {
              backgroundColor: mode.bg.muted,
              color: mode.text.primary,
              padding: "0.15em 0.4em",
              borderRadius: "4px",
              fontSize: "0.9em",
              fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
            },

            /* Links */
            "& a": {
              color: mode.text.link,
              textDecoration: "underline",
              textDecorationColor: mode.text.link,
              textUnderlineOffset: "2px",
              cursor: "pointer",
              "&:hover": {
                textDecorationColor: mode.text.linkHover,
              },
            },

            /* Highlight */
            "& mark": {
              backgroundColor: mode.status.warningBg,
              padding: "0.1em 0.2em",
              borderRadius: "2px",
            },

            /* Horizontal rule */
            "& hr": {
              border: "none",
              borderTop: `1px solid ${mode.border.subtle}`,
              marginTop: "1.5em",
              marginBottom: "1.5em",
            },
          },
        }}
      >
        <EditorContent editor={editor} style={{ height: "100%" }} />
      </Box>
    </Box>
  );
};
