import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import BubbleMenu from '@tiptap/extension-bubble-menu';
import StarterKit from '@tiptap/starter-kit';
import {
  FormatBold,
  FormatItalic,
  StrikethroughS,
  FormatListBulleted,
  FormatListNumbered,
  FormatQuote,
} from '@mui/icons-material';
import { Box, IconButton, Paper, Tooltip, Divider } from '@mui/material';

const InlineEditor = ({ value, onChange, html = false }) => {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  if (!editor) {
    return null;
  }

  return (
    <Box sx={{ position: 'relative' }}>
      <EditorContent
        editor={editor}
        style={{
          border: '1px solid #ccc',
          borderRadius: '4px',
          padding: '10px',
          minHeight: '200px',
          outline: 'none',
        }}
      />
      <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }}>
        <Paper
          elevation={3}
          sx={{
            display: 'flex',
            alignItems: 'center',
            p: 0.5,
            borderRadius: 1,
          }}
        >
          <Tooltip title="Bold">
            <IconButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              color={editor.isActive('bold') ? 'primary' : 'default'}
              size="small"
            >
              <FormatBold />
            </IconButton>
          </Tooltip>
          <Tooltip title="Italic">
            <IconButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              color={editor.isActive('italic') ? 'primary' : 'default'}
              size="small"
            >
              <FormatItalic />
            </IconButton>
          </Tooltip>
          <Tooltip title="Strike">
            <IconButton
              onClick={() => editor.chain().focus().toggleStrike().run()}
              color={editor.isActive('strike') ? 'primary' : 'default'}
              size="small"
            >
              <StrikethroughS />
            </IconButton>
          </Tooltip>
          {html && (
            <>
              <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
              <Tooltip title="Bullet List">
                <IconButton
                  onClick={() => editor.chain().focus().toggleBulletList().run()}
                  color={editor.isActive('bulletList') ? 'primary' : 'default'}
                  size="small"
                >
                  <FormatListBulleted />
                </IconButton>
              </Tooltip>
              <Tooltip title="Numbered List">
                <IconButton
                  onClick={() => editor.chain().focus().toggleOrderedList().run()}
                  color={editor.isActive('orderedList') ? 'primary' : 'default'}
                  size="small"
                >
                  <FormatListNumbered />
                </IconButton>
              </Tooltip>
              <Tooltip title="Blockquote">
                <IconButton
                  onClick={() => editor.chain().focus().toggleBlockquote().run()}
                  color={editor.isActive('blockquote') ? 'primary' : 'default'}
                  size="small"
                >
                  <FormatQuote />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Paper>
      </BubbleMenu>
    </Box>
  );
};

export default InlineEditor;
