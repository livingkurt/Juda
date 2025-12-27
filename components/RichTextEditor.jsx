"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Link from "@tiptap/extension-link";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import { Box, HStack, IconButton, Separator } from "@chakra-ui/react";
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

export const RichTextEditor = ({
  content,
  onChange,
  placeholder = "Start writing...",
  editable = true,
  showToolbar = true,
}) => {
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
    const url = window.prompt("URL", previousUrl);

    if (url === null) return;

    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  if (!editor) return null;

  const ToolbarButton = ({ icon: Icon, isActive, onClick, label }) => (
    <IconButton
      size="xs"
      variant={isActive ? "solid" : "ghost"}
      colorScheme={isActive ? "blue" : "gray"}
      onClick={onClick}
      aria-label={label}
      borderRadius="md"
    >
      <Icon size={14} />
    </IconButton>
  );

  return (
    <Box h="100%" display="flex" flexDirection="column">
      {/* Floating Toolbar */}
      {editable && showToolbar && (
        <HStack
          px={4}
          py={2}
          bg={{ base: "gray.50", _dark: "gray.800" }}
          borderBottomWidth="1px"
          borderColor={{ base: "gray.100", _dark: "gray.700" }}
          gap={0.5}
          flexWrap="wrap"
          flexShrink={0}
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

          <Separator orientation="vertical" h={4} mx={1} />

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

          <Separator orientation="vertical" h={4} mx={1} />

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

          <Separator orientation="vertical" h={4} mx={1} />

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

          <Separator orientation="vertical" h={4} mx={1} />

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

          <Separator orientation="vertical" h={4} mx={1} />

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
        </HStack>
      )}

      {/* Editor Content - Clean, borderless, full height */}
      <Box
        flex={1}
        overflowY="auto"
        px={{ base: 6, md: 12 }}
        py={6}
        bg={{ base: "white", _dark: "gray.800" }}
        css={{
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

            "&:focus-visible": {
              outline: "none",
              border: "none",
              boxShadow: "none",
            },

            /* Placeholder */
            "& p.is-editor-empty:first-of-type::before": {
              content: "attr(data-placeholder)",
              color: "var(--chakra-colors-gray-400)",
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
              borderLeft: "3px solid var(--chakra-colors-gray-300)",
              paddingLeft: "1em",
              marginLeft: 0,
              marginRight: 0,
              marginTop: "0.75em",
              marginBottom: "0.75em",
              color: "var(--chakra-colors-gray-600)",
            },

            /* Code blocks */
            "& pre": {
              backgroundColor: "var(--chakra-colors-gray-900)",
              color: "var(--chakra-colors-gray-100)",
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
              backgroundColor: "var(--chakra-colors-gray-100)",
              color: "var(--chakra-colors-pink-600)",
              padding: "0.15em 0.4em",
              borderRadius: "4px",
              fontSize: "0.9em",
              fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
            },

            /* Links */
            "& a": {
              color: "var(--chakra-colors-blue-600)",
              textDecoration: "underline",
              textDecorationColor: "var(--chakra-colors-blue-200)",
              textUnderlineOffset: "2px",
              cursor: "pointer",
              "&:hover": {
                textDecorationColor: "var(--chakra-colors-blue-600)",
              },
            },

            /* Highlight */
            "& mark": {
              backgroundColor: "var(--chakra-colors-yellow-200)",
              padding: "0.1em 0.2em",
              borderRadius: "2px",
            },

            /* Horizontal rule */
            "& hr": {
              border: "none",
              borderTop: "1px solid var(--chakra-colors-gray-200)",
              marginTop: "1.5em",
              marginBottom: "1.5em",
            },
          },

          /* Dark mode overrides */
          "[data-theme='dark'] &, .dark &": {
            ".ProseMirror": {
              "& p.is-editor-empty:first-of-type::before": {
                color: "var(--chakra-colors-gray-500)",
              },
              "& blockquote": {
                borderLeftColor: "var(--chakra-colors-gray-600)",
                color: "var(--chakra-colors-gray-400)",
              },
              "& code": {
                backgroundColor: "var(--chakra-colors-gray-700)",
                color: "var(--chakra-colors-pink-300)",
              },
              "& a": {
                color: "var(--chakra-colors-blue-400)",
                textDecorationColor: "var(--chakra-colors-blue-700)",
                "&:hover": {
                  textDecorationColor: "var(--chakra-colors-blue-400)",
                },
              },
              "& mark": {
                backgroundColor: "var(--chakra-colors-yellow-700)",
                color: "var(--chakra-colors-yellow-100)",
              },
              "& hr": {
                borderTopColor: "var(--chakra-colors-gray-700)",
              },
            },
          },
        }}
      >
        <EditorContent editor={editor} style={{ height: "100%" }} />
      </Box>
    </Box>
  );
};
