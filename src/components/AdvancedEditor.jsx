import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import CharacterCount from '@tiptap/extension-character-count';
import FontFamily from '@tiptap/extension-font-family';
import { TextStyle } from '@tiptap/extension-text-style';
import { Table } from '@tiptap/extension-table';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableRow } from '@tiptap/extension-table-row';
import LineHeight from '../lib/tiptap-line-height'; // Assuming this custom extension exists
import { Box, Typography } from '@mui/material';
import Toolbar from './Toolbar';

const AdvancedEditor = ({ value, onChange, html = false }) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // configure starter kit options if needed
      }),
      TextStyle,
      FontFamily,
      LineHeight,
      CharacterCount,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
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

  React.useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, false);
    }
  }, [value, editor]);

  if (!editor || !html) {
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
      <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2,
        // Basic ProseMirror styling
        '.ProseMirror': {
            minHeight: '100%',
            outline: 'none',
            'p, h1, h2, h3, ul, ol': {
                margin: '0.5em 0',
            },
            'table': {
                width: '100%',
                borderCollapse: 'collapse',
                margin: '1em 0',
                'th, td': {
                    border: '1px solid #ccc',
                    padding: '8px',
                    minWidth: '1em',
                    verticalAlign: 'top',
                    boxSizing: 'border-box',
                    position: 'relative',
                },
                'th': {
                    fontWeight: 'bold',
                    backgroundColor: '#f5f5f5',
                    textAlign: 'left',
                },
            },
            '.grip-column, .grip-row': {
                position: 'absolute',
                backgroundColor: '#3b82f6',
                pointerEvents: 'none',
            },
            '.grip-column': {
                top: 0,
                right: '-2px',
                width: '4px',
                height: '100%',
            },
            '.grip-row': {
                left: 0,
                bottom: '-2px',
                width: '100%',
                height: '4px',
            },
            '.selectedCell': {
              'td, th': {
                backgroundColor: 'rgba(172, 214, 255, 0.3)',
              }
            }
        }
      }}>
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