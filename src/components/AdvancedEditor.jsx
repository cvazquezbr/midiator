import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import CharacterCount from '@tiptap/extension-character-count';
import FontFamily from '@tiptap/extension-font-family';
import { TextStyle, LineHeight } from '@tiptap/extension-text-style';
import { Box, Typography } from '@mui/material';
import Toolbar from './Toolbar';

const AdvancedEditor = ({ value, onChange, html = false }) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Let StarterKit handle basic marks
      }),
      TextStyle,
      FontFamily,
      LineHeight,
      CharacterCount,
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none',
      },
    },
  });

  if (!editor) {
    return null;
  }

  // Do not render the advanced editor if HTML editing is disabled
  if (!html) {
      // In the parent component, this case is handled by rendering a simple TextField.
      // However, as a fallback, we can render a message or null.
      return null;
  }

  return (
    <Box sx={{
      border: '1px solid #ccc',
      borderRadius: '4px',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
    }}>
      <Toolbar editor={editor} />
      <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2 }}>
        <EditorContent editor={editor} />
      </Box>
      <Box sx={{
        p: 1,
        textAlign: 'right',
        borderTop: '1px solid #ccc',
        backgroundColor: '#f5f5f5',
      }}>
        <Typography variant="caption" color="textSecondary">
          {editor.storage.characterCount.characters()} caracteres
        </Typography>
      </Box>
    </Box>
  );
};

export default AdvancedEditor;
