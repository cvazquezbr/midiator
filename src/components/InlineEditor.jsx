import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/extension-bubble-menu';
import StarterKit from '@tiptap/starter-kit';
import { Box, IconButton, Tooltip, Paper } from '@mui/material';
import { FormatBold, FormatItalic, StrikethroughS } from '@mui/icons-material';

const InlineEditor = ({ value, onChange }) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable block-level nodes for a truly inline experience if needed
        heading: false,
        blockquote: false,
        codeBlock: false,
        bulletList: false,
        orderedList: false,
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  React.useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, false);
    }
  }, [value, editor]);

  if (!editor) {
    return null;
  }

  return (
    <>
      {editor && (
        <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }}>
          <Paper sx={{ display: 'flex', p: 0.5 }}>
            <Tooltip title="Bold">
              <IconButton onClick={() => editor.chain().focus().toggleBold().run()} color={editor.isActive('bold') ? 'primary' : 'default'} size="small">
                <FormatBold />
              </IconButton>
            </Tooltip>
            <Tooltip title="Italic">
              <IconButton onClick={() => editor.chain().focus().toggleItalic().run()} color={editor.isActive('italic') ? 'primary' : 'default'} size="small">
                <FormatItalic />
              </IconButton>
            </Tooltip>
            <Tooltip title="Strike">
              <IconButton onClick={() => editor.chain().focus().toggleStrike().run()} color={editor.isActive('strike') ? 'primary' : 'default'} size="small">
                <StrikethroughS />
              </IconButton>
            </Tooltip>
          </Paper>
        </BubbleMenu>
      )}
      <Box
        component={EditorContent}
        editor={editor}
        sx={{
            border: '1px solid #ccc',
            borderRadius: '4px',
            p: 1,
            minHeight: '40px',
             '.ProseMirror': {
                outline: 'none',
            }
        }}
       />
    </>
  );
};

export default InlineEditor;