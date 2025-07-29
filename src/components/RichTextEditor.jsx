import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  showHtmlToggle = true,
  darkMode = false
}) => {
  const [htmlMode, setHtmlMode] = useState(false);
  const [selection, setSelection] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const editorRef = useRef(null);
  const textareaRef = useRef(null);

  // Função para salvar a posição do cursor
  const saveSelection = () => {
    if (htmlMode || !editorRef.current) return null;
    
    const sel = window.getSelection();
    if (sel.rangeCount === 0) return null;
    
    const range = sel.getRangeAt(0);
    const preSelectionRange = range.cloneRange();
    preSelectionRange.selectNodeContents(editorRef.current);
    preSelectionRange.setEnd(range.startContainer, range.startOffset);
    const start = preSelectionRange.toString().length;
    
    return {
      start,
      end: start + range.toString().length
    };
  };

  // Função para restaurar a posição do cursor
  const restoreSelection = (savedSelection) => {
    if (!savedSelection || htmlMode || !editorRef.current) return;
    
    const range = document.createRange();
    const sel = window.getSelection();
    let charCount = 0;
    let foundStart = false;
    let foundEnd = false;
    
    const walker = document.createTreeWalker(
      editorRef.current,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    
    let node;
    while (node = walker.nextNode()) {
      const nextCharCount = charCount + node.textContent.length;
      
      if (!foundStart && savedSelection.start >= charCount && savedSelection.start <= nextCharCount) {
        range.setStart(node, savedSelection.start - charCount);
        foundStart = true;
      }
      
      if (foundStart && savedSelection.end >= charCount && savedSelection.end <= nextCharCount) {
        range.setEnd(node, savedSelection.end - charCount);
        foundEnd = true;
        break;
      }
      
      charCount = nextCharCount;
    }
    
    if (foundStart) {
      if (!foundEnd) {
        range.setEnd(range.startContainer, range.startOffset);
      }
      sel.removeAllRanges();
      sel.addRange(range);
    }
  };

  // Inicialização do conteúdo apenas uma vez
  useEffect(() => {
    if (editorRef.current && !htmlMode && !isInitialized) {
      editorRef.current.innerHTML = value;
      setIsInitialized(true);
    }
  }, [value, htmlMode, isInitialized]);

  // Atualização externa do valor (apenas quando não está focado)
  useEffect(() => {
    if (editorRef.current && !htmlMode && isInitialized) {
      const isEditorFocused = document.activeElement === editorRef.current || 
                             editorRef.current.contains(document.activeElement);
      
      if (!isEditorFocused && editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value;
      }
    }
  }, [value, htmlMode, isInitialized]);

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
    
    const savedSelection = saveSelection();
    document.execCommand(command, false, value);
    
    // Permitir que o DOM se atualize antes de restaurar a seleção
    setTimeout(() => {
      if (savedSelection) {
        restoreSelection(savedSelection);
      }
      handleContentChange();
    }, 0);
  };

  const handleContentChange = useCallback(() => {
    if (htmlMode) {
      onChange(textareaRef.current.value);
    } else {
      onChange(editorRef.current.innerHTML);
    }
  }, [htmlMode, onChange]);

  const handleInput = (e) => {
    // Não fazer nada especial, apenas propagar a mudança
    handleContentChange();
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
      const savedSelection = saveSelection();
      document.execCommand('insertHTML', false, html);
      setTimeout(() => {
        handleContentChange();
      }, 0);
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
          handleContentChange();
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
      className={`${styles.richTextEditor} ${darkMode ? styles.darkMode : ''}`}
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
                sx={darkMode ? {
                  color: '#ffffff !important',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.08) !important'
                  },
                  '&.active': {
                    backgroundColor: '#90caf9 !important',
                    color: '#000000 !important'
                  }
                } : {}}
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
                sx={darkMode ? {
                  color: '#ffffff !important',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.08) !important'
                  },
                  '&.active': {
                    backgroundColor: '#90caf9 !important',
                    color: '#000000 !important'
                  }
                } : {}}
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
              sx={darkMode ? {
                color: '#ffffff !important',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.08) !important'
                },
                '&.active': {
                  backgroundColor: '#90caf9 !important',
                  color: '#000000 !important'
                }
              } : {}}
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
              sx={darkMode ? {
                color: '#ffffff !important',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.08) !important'
                },
                '&.active': {
                  backgroundColor: '#90caf9 !important',
                  color: '#000000 !important'
                }
              } : {}}
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
              sx={darkMode ? {
                color: '#ffffff !important',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.08) !important'
                },
                '&.active': {
                  backgroundColor: '#90caf9 !important',
                  color: '#000000 !important'
                }
              } : {}}
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
              sx={darkMode ? {
                color: '#ffffff !important',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.08) !important'
                },
                '&.active': {
                  backgroundColor: '#90caf9 !important',
                  color: '#000000 !important'
                }
              } : {}}
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
                sx={darkMode ? {
                  color: '#ffffff !important',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.08) !important'
                  },
                  '&.active': {
                    backgroundColor: '#90caf9 !important',
                    color: '#000000 !important'
                  }
                } : {}}
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
            className={`${styles.editor} ${darkMode ? styles.darkModeEditor : ''}`}
            contentEditable={!disabled}
            onInput={handleInput}
            onMouseUp={handleSelectionChange}
            onKeyUp={handleSelectionChange}
            onKeyDown={handleKeyDown}
            data-placeholder={placeholder}
            style={{
              maxHeight: `${maxHeight}px`,
            }}
            suppressContentEditableWarning={true}
          />
        )}
      </Box>
    </Paper>
  );
};

export default RichTextEditor;