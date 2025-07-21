import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  IconButton,
  Tooltip,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
  Popover,
  Typography,
  Button
} from '@mui/material';
import {
  FormatBold,
  FormatItalic,
  FormatUnderlined,
  FormatAlignLeft,
  FormatAlignCenter,
  FormatAlignRight,
  FormatListBulleted,
  FormatListNumbered,
  Undo,
  Redo,
  Code
} from '@mui/icons-material';
import styles from './RichTextEditor.module.css';

const RichTextEditor = ({
  value = '',
  onChange,
  placeholder = 'Digite seu texto...',
  disabled = false,
  maxHeight = 200,
  showHtmlToggle = true
}) => {
  const [htmlMode, setHtmlMode] = useState(false);
  const [selection, setSelection] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const editorRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (editorRef.current && !htmlMode) {
      editorRef.current.innerHTML = value;
    }
  }, [value, htmlMode]);

  const handleSelectionChange = () => {
    if (htmlMode) return;
    
    const sel = window.getSelection();
    if (sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      setSelection({
        range: range.cloneRange(),
        text: sel.toString()
      });
    }
  };

  const execCommand = (command, value = null) => {
    if (htmlMode) return;
    
    document.execCommand(command, false, value);
    editorRef.current.focus();
    handleContentChange();
  };

  const handleContentChange = () => {
    if (htmlMode) {
      onChange(textareaRef.current.value);
    } else {
      onChange(editorRef.current.innerHTML);
    }
  };

  const insertHtml = (html) => {
    if (htmlMode) {
      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      const newText = text.substring(0, start) + html + text.substring(end);
      textarea.value = newText;
      textarea.selectionStart = textarea.selectionEnd = start + html.length;
      onChange(newText);
    } else {
      execCommand('insertHTML', html);
    }
  };

  const formatButtons = [
    {
      command: 'bold',
      icon: <FormatBold />,
      tooltip: 'Negrito (Ctrl+B)',
      shortcut: 'Ctrl+B'
    },
    {
      command: 'italic',
      icon: <FormatItalic />,
      tooltip: 'Itálico (Ctrl+I)',
      shortcut: 'Ctrl+I'
    },
    {
      command: 'underline',
      icon: <FormatUnderlined />,
      tooltip: 'Sublinhado (Ctrl+U)',
      shortcut: 'Ctrl+U'
    }
  ];

  const alignButtons = [
    {
      command: 'justifyLeft',
      icon: <FormatAlignLeft />,
      tooltip: 'Alinhar à esquerda',
      value: 'left'
    },
    {
      command: 'justifyCenter',
      icon: <FormatAlignCenter />,
      tooltip: 'Centralizar',
      value: 'center'
    },
    {
      command: 'justifyRight',
      icon: <FormatAlignRight />,
      tooltip: 'Alinhar à direita',
      value: 'right'
    }
  ];

  const listButtons = [
    {
      command: 'insertUnorderedList',
      icon: <FormatListBulleted />,
      tooltip: 'Lista com marcadores'
    },
    {
      command: 'insertOrderedList',
      icon: <FormatListNumbered />,
      tooltip: 'Lista numerada'
    }
  ];

  const handleKeyDown = (e) => {
    if (htmlMode) return;

    // Atalhos de teclado
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault();
          execCommand('bold');
          break;
        case 'i':
          e.preventDefault();
          execCommand('italic');
          break;
        case 'u':
          e.preventDefault();
          execCommand('underline');
          break;
        case 'z':
          e.preventDefault();
          if (e.shiftKey) {
            execCommand('redo');
          } else {
            execCommand('undo');
          }
          break;
        default:
          break;
      }
    }
  };

  const toggleHtmlMode = () => {
    if (htmlMode) {
      // Saindo do modo HTML - aplicar o HTML ao editor visual
      setHtmlMode(false);
      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.innerHTML = textareaRef.current.value;
        }
      }, 0);
    } else {
      // Entrando no modo HTML - pegar o HTML do editor visual
      setHtmlMode(true);
      setTimeout(() => {
        if (textareaRef.current && editorRef.current) {
          textareaRef.current.value = editorRef.current.innerHTML;
        }
      }, 0);
    }
  };

  const insertBulletList = () => {
    if (htmlMode) {
      insertHtml('<ul><li>Item 1</li><li>Item 2</li></ul>');
    } else {
      execCommand('insertUnorderedList');
    }
  };

  const insertNumberedList = () => {
    if (htmlMode) {
      insertHtml('<ol><li>Item 1</li><li>Item 2</li></ol>');
    } else {
      execCommand('insertOrderedList');
    }
  };

  return (
    <Paper 
      elevation={1} 
      className={styles.richTextEditor}
      sx={{ 
        border: '1px solid #e0e0e0',
        borderRadius: 1,
        overflow: 'hidden'
      }}
    >
      {/* Toolbar */}
      <Box className={styles.toolbar}>
        {/* Botões de formatação */}
        <Box className={styles.toolbarGroup}>
          {formatButtons.map((button) => (
            <Tooltip key={button.command} title={button.tooltip}>
              <IconButton
                className={styles.toolbarButton}
                size="small"
                onClick={() => execCommand(button.command)}
                disabled={disabled || htmlMode}
              >
                {button.icon}
              </IconButton>
            </Tooltip>
          ))}
        </Box>

        <div className={styles.divider} />

        {/* Botões de alinhamento */}
        <Box className={styles.toolbarGroup}>
          {alignButtons.map((button) => (
            <Tooltip key={button.command} title={button.tooltip}>
              <IconButton
                className={styles.toolbarButton}
                size="small"
                onClick={() => execCommand(button.command)}
                disabled={disabled || htmlMode}
              >
                {button.icon}
              </IconButton>
            </Tooltip>
          ))}
        </Box>

        <div className={styles.divider} />

        {/* Botões de lista */}
        <Box className={styles.toolbarGroup}>
          <Tooltip title="Lista com marcadores">
            <IconButton
              className={styles.toolbarButton}
              size="small"
              onClick={insertBulletList}
              disabled={disabled}
            >
              <FormatListBulleted />
            </IconButton>
          </Tooltip>
          <Tooltip title="Lista numerada">
            <IconButton
              className={styles.toolbarButton}
              size="small"
              onClick={insertNumberedList}
              disabled={disabled}
            >
              <FormatListNumbered />
            </IconButton>
          </Tooltip>
        </Box>

        <div className={styles.divider} />

        {/* Botões de desfazer/refazer */}
        <Box className={styles.toolbarGroup}>
          <Tooltip title="Desfazer (Ctrl+Z)">
            <IconButton
              className={styles.toolbarButton}
              size="small"
              onClick={() => execCommand('undo')}
              disabled={disabled || htmlMode}
            >
              <Undo />
            </IconButton>
          </Tooltip>
          <Tooltip title="Refazer (Ctrl+Shift+Z)">
            <IconButton
              className={styles.toolbarButton}
              size="small"
              onClick={() => execCommand('redo')}
              disabled={disabled || htmlMode}
            >
              <Redo />
            </IconButton>
          </Tooltip>
        </Box>

        {showHtmlToggle && (
          <>
            <div className={styles.divider} />
            
            {/* Toggle HTML */}
            <Tooltip title={htmlMode ? "Modo Visual" : "Modo HTML"}>
              <IconButton
                className={`${styles.toolbarButton} ${htmlMode ? styles.active : ''}`}
                size="small"
                onClick={toggleHtmlMode}
                disabled={disabled}
              >
                <Code />
              </IconButton>
            </Tooltip>
          </>
        )}
      </Box>

      {/* Editor */}
      <Box className={styles.editorContainer}>
        {htmlMode ? (
          <textarea
            ref={textareaRef}
            className={styles.htmlEditor}
            defaultValue={value}
            onChange={handleContentChange}
            placeholder={placeholder}
            disabled={disabled}
            style={{
              maxHeight: `${maxHeight}px`,
            }}
          />
        ) : (
          <Box
            ref={editorRef}
            className={styles.editor}
            contentEditable={!disabled}
            onInput={handleContentChange}
            onMouseUp={handleSelectionChange}
            onKeyUp={handleSelectionChange}
            onKeyDown={handleKeyDown}
            data-placeholder={placeholder}
            style={{
              maxHeight: `${maxHeight}px`,
            }}
            dangerouslySetInnerHTML={{ __html: htmlMode ? '' : value }}
          />
        )}
      </Box>
    </Paper>
  );
};

export default RichTextEditor;

