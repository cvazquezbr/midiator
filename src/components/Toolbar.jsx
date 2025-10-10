import React from 'react';
import {
  Box,
  IconButton,
  Tooltip,
  Divider,
  Select,
  MenuItem,
  FormControl,
} from '@mui/material';
import {
  FormatBold,
  FormatItalic,
  StrikethroughS,
  FormatListBulleted,
  FormatListNumbered,
  FormatQuote,
  FormatClear,
  FontDownload,
  FormatSize,
  LineWeight,
  TableChart,
  PlaylistAdd,
  PlaylistRemove,
  Add,
  Remove,
  DeleteForever,
  Grading,
} from '@mui/icons-material';

const FONT_FAMILIES = [
  { label: 'Inter', value: 'Inter, sans-serif' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Times New Roman', value: 'Times New Roman, serif' },
  { label: 'Verdana', value: 'Verdana, sans-serif' },
];

const FONT_SIZES = ['12px', '14px', '16px', '18px', '24px', '30px', '36px'];
const LINE_HEIGHTS = ['1', '1.2', '1.5', '1.8', '2'];

const Toolbar = ({ editor }) => {
  if (!editor) {
    return null;
  }

  const handleFontFamilyChange = (e) => {
    editor.chain().focus().setFontFamily(e.target.value).run();
  };

  const handleFontSizeChange = (e) => {
    editor.chain().focus().setFontSize(`${e.target.value}px`).run();
  };

  const handleLineHeightChange = (e) => {
    editor.chain().focus().setLineHeight(e.target.value).run();
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        borderBottom: '1px solid #ccc',
        p: 1,
        gap: 1,
      }}
    >
      {/* Font Family */}
      <FormControl size="small" sx={{ minWidth: 120 }}>
        <Select
          value={editor.getAttributes('textStyle').fontFamily || ''}
          onChange={handleFontFamilyChange}
          displayEmpty
        >
          <MenuItem value=""><em>Font</em></MenuItem>
          {FONT_FAMILIES.map(font => (
            <MenuItem key={font.value} value={font.value}>{font.label}</MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Font Size */}
      <FormControl size="small" sx={{ minWidth: 80 }}>
        <Select
          value={editor.getAttributes('textStyle').fontSize?.replace('px', '') || ''}
          onChange={handleFontSizeChange}
          displayEmpty
        >
          <MenuItem value=""><em>Size</em></MenuItem>
          {FONT_SIZES.map(size => (
            <MenuItem key={size} value={size.replace('px', '')}>{size}</MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Line Height */}
      <FormControl size="small" sx={{ minWidth: 80 }}>
        <Select
          value={editor.getAttributes('textStyle').lineHeight || ''}
          onChange={handleLineHeightChange}
          displayEmpty
        >
          <MenuItem value=""><em>Line Height</em></MenuItem>
          {LINE_HEIGHTS.map(height => (
            <MenuItem key={height} value={height}>{height}</MenuItem>
          ))}
        </Select>
      </FormControl>

      <Divider orientation="vertical" flexItem />

      {/* Block Styles */}
      <FormControl size="small" sx={{ minWidth: 120 }}>
        <Select
          value={
            editor.isActive('heading', { level: 1 }) ? 'h1' :
            editor.isActive('heading', { level: 2 }) ? 'h2' :
            editor.isActive('heading', { level: 3 }) ? 'h3' :
            editor.isActive('codeBlock') ? 'code' : 'p'
          }
          onChange={(e) => {
            const value = e.target.value;
            if (value === 'p') editor.chain().focus().setParagraph().run();
            if (value === 'h1') editor.chain().focus().toggleHeading({ level: 1 }).run();
            if (value === 'h2') editor.chain().focus().toggleHeading({ level: 2 }).run();
            if (value === 'h3') editor.chain().focus().toggleHeading({ level: 3 }).run();
            if (value === 'code') editor.chain().focus().toggleCodeBlock().run();
          }}
          displayEmpty
        >
          <MenuItem value="p">Paragraph</MenuItem>
          <MenuItem value="h1">Heading 1</MenuItem>
          <MenuItem value="h2">Heading 2</MenuItem>
          <MenuItem value="h3">Heading 3</MenuItem>
          <MenuItem value="code">Code Block</MenuItem>
        </Select>
      </FormControl>

      <Divider orientation="vertical" flexItem />

      {/* Basic Formatting */}
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

      <Divider orientation="vertical" flexItem />

      {/* List Formatting */}
      <Tooltip title="Bullet List">
        <IconButton onClick={() => editor.chain().focus().toggleBulletList().run()} color={editor.isActive('bulletList') ? 'primary' : 'default'} size="small">
          <FormatListBulleted />
        </IconButton>
      </Tooltip>
      <Tooltip title="Numbered List">
        <IconButton onClick={() => editor.chain().focus().toggleOrderedList().run()} color={editor.isActive('orderedList') ? 'primary' : 'default'} size="small">
          <FormatListNumbered />
        </IconButton>
      </Tooltip>
      <Tooltip title="Blockquote">
        <IconButton onClick={() => editor.chain().focus().toggleBlockquote().run()} color={editor.isActive('blockquote') ? 'primary' : 'default'} size="small">
          <FormatQuote />
        </IconButton>
      </Tooltip>

      <Divider orientation="vertical" flexItem />

      {/* Clear Formatting */}
      <Tooltip title="Clear Formats">
        <IconButton onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()} size="small">
          <FormatClear />
        </IconButton>
      </Tooltip>

      <Divider orientation="vertical" flexItem />

      {/* Table Formatting */}
      <Tooltip title="Insert Table">
        <IconButton onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} size="small">
          <TableChart />
        </IconButton>
      </Tooltip>
      <Tooltip title="Add Column Before">
        <IconButton onClick={() => editor.chain().focus().addColumnBefore().run()} disabled={!editor.can().addColumnBefore()} size="small">
          <PlaylistAdd sx={{ transform: 'rotate(270deg)' }} />
        </IconButton>
      </Tooltip>
      <Tooltip title="Add Column After">
        <IconButton onClick={() => editor.chain().focus().addColumnAfter().run()} disabled={!editor.can().addColumnAfter()} size="small">
         <PlaylistAdd sx={{ transform: 'rotate(90deg)' }} />
        </IconButton>
      </Tooltip>
      <Tooltip title="Delete Column">
        <IconButton onClick={() => editor.chain().focus().deleteColumn().run()} disabled={!editor.can().deleteColumn()} size="small">
          <PlaylistRemove sx={{ transform: 'rotate(90deg)' }} />
        </IconButton>
      </Tooltip>
      <Tooltip title="Add Row Before">
        <IconButton onClick={() => editor.chain().focus().addRowBefore().run()} disabled={!editor.can().addRowBefore()} size="small">
          <PlaylistAdd />
        </IconButton>
      </Tooltip>
      <Tooltip title="Add Row After">
        <IconButton onClick={() => editor.chain().focus().addRowAfter().run()} disabled={!editor.can().addRowAfter()} size="small">
          <Add />
        </IconButton>
      </Tooltip>
      <Tooltip title="Delete Row">
        <IconButton onClick={() => editor.chain().focus().deleteRow().run()} disabled={!editor.can().deleteRow()} size="small">
          <Remove />
        </IconButton>
      </Tooltip>
       <Tooltip title="Toggle Header Cell">
        <IconButton onClick={() => editor.chain().focus().toggleHeaderCell().run()} disabled={!editor.can().toggleHeaderCell()} size="small">
          <Grading />
        </IconButton>
      </Tooltip>
      <Tooltip title="Delete Table">
        <IconButton onClick={() => editor.chain().focus().deleteTable().run()} disabled={!editor.can().deleteTable()} size="small">
          <DeleteForever />
        </IconButton>
      </Tooltip>

    </Box>
  );
};

export default Toolbar;