import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Tabs, Tab, List, ListItem, ListItemText,
  Button, Chip, Divider, CircularProgress, Card, CardContent,
  IconButton, Tooltip, TextField, Alert, Grid
} from '@mui/material';
import {
  ThumbUp, ThumbDown, Comment, OpenInNew, CheckCircle,
  Refresh, AutoAwesome, Send, PlayCircleFilled, Download, UploadFile, Delete
} from '@mui/icons-material';
import { toast } from 'sonner';

const LinkedInEngagement = () => {
  const [tabValue, setTabValue] = useState(0);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isGlobalProcessing, setIsGlobalProcessing] = useState(false);
  const [processingSessions, setProcessingSessions] = useState({});
  const [selectedSession, setSelectedSession] = useState(null);
  const [posts, setPosts] = useState([]);
  const [comments, setComments] = useState([]);

  useEffect(() => {
    fetchSessions();
    fetchComments();
  }, []);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/engagement/discovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getSessions' })
      });
      const data = await response.json();
      if (Array.isArray(data)) {
        setSessions(data);
        return data;
      } else {
        console.error('Error fetching sessions: Data is not an array', data);
        setSessions([]);
        return [];
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
      setSessions([]);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const response = await fetch('/api/engagement/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getComments' })
      });
      const data = await response.json();
      if (Array.isArray(data)) {
        setComments(data);
        return data;
      } else {
        console.error('Error fetching comments: Data is not an array', data);
        setComments([]);
        return [];
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
      setComments([]);
      return [];
    }
  };

  const handleSessionClick = async (session) => {
    setSelectedSession(session);
    setLoading(true);
    try {
      const response = await fetch('/api/engagement/discovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getSessionDetails', sessionId: session.id })
      });
      const data = await response.json();
      setPosts(data.posts);

      // If session is scoring, start polling for completion
      if (session.status === 'scoring') {
        setTimeout(() => pollSessionStatus(session.id), 5000);
      }
    } catch (error) {
      console.error('Error fetching session details:', error);
    } finally {
      setLoading(false);
    }
  };

  const pollSessionStatus = async (sessionId) => {
    try {
      const response = await fetch('/api/engagement/discovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getSessions' })
      });
      const sessionsData = await response.json();
      setSessions(sessionsData);

      const currentSession = sessionsData.find(s => s.id === sessionId);
      if (currentSession && currentSession.status === 'scoring') {
        setTimeout(() => pollSessionStatus(sessionId), 5000);
      } else if (currentSession && selectedSession?.id === sessionId) {
        // Status changed, refresh details
        handleSessionClick(currentSession);
      }
    } catch (err) {
      console.error('Polling error:', err);
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending': return 'Pendente';
      case 'searching': return 'Buscando...';
      case 'awaiting_external_search': return 'Aguardando Busca Externa';
      case 'scoring': return 'Avaliando...';
      case 'ready': return 'Pronto';
      case 'completed': return 'Concluído (Sem posts)';
      case 'error': return 'Erro';
      default: return status;
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Tem certeza que deseja excluir este post sugerido?')) return;

    try {
      const response = await fetch('/api/engagement/discovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deletePost', postId })
      });
      if (response.ok) {
        toast.success('Post excluído.');
        handleSessionClick(selectedSession);
      } else {
        toast.error('Erro ao excluir post.');
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Erro ao conectar com o servidor.');
    }
  };

  const handleDecision = async (postId, decision) => {
    try {
      const response = await fetch('/api/engagement/discovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updatePostDecision', postId, decision })
      });
      if (response.ok) {
        toast.success(decision === 'approved' ? 'Post aprovado! Gerando comentário...' : 'Post rejeitado.');
        // Refresh posts
        handleSessionClick(selectedSession);
        if (decision === 'approved') {
          // Poll for comments after a short delay
          setTimeout(fetchComments, 3000);
        }
      }
    } catch (error) {
      console.error('Error updating decision:', error);
      toast.error('Erro ao atualizar decisão.');
    }
  };

  const handleUpdateCommentText = async (commentId, text) => {
    try {
      await fetch('/api/engagement/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateComment', commentId, finalText: text })
      });
    } catch (error) {
      console.error('Error updating comment:', error);
    }
  };

  const handlePublishComment = async (commentId) => {
    toast.loading('Publicando comentário no LinkedIn...', { id: 'publish' });
    try {
      const response = await fetch('/api/engagement/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'publishComment', commentId })
      });
      const data = await response.json();
      if (response.ok) {
        toast.success('Comentário publicado com sucesso!', { id: 'publish' });
        fetchComments();
      } else {
        toast.error(data.error || 'Falha ao publicar comentário.', { id: 'publish' });
      }
    } catch (error) {
      console.error('Error publishing comment:', error);
      toast.error('Erro ao conectar com o servidor.', { id: 'publish' });
    }
  };

  const handleRegenerateComment = async (commentId) => {
    toast.loading('Regenerando comentário...', { id: 'regen' });
    try {
      const response = await fetch('/api/engagement/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'regenerateComment', commentId })
      });
      if (response.ok) {
        toast.success('Novo comentário gerado!', { id: 'regen' });
        fetchComments();
      } else {
        toast.error('Falha ao regenerar comentário.', { id: 'regen' });
      }
    } catch (error) {
      console.error('Error regenerating comment:', error);
      toast.error('Erro ao conectar com o servidor.', { id: 'regen' });
    }
  };

  const handleRunGlobalDiscovery = async () => {
    setIsGlobalProcessing(true);
    toast.info('Iniciando processamento das sessões...');
    try {
      const response = await fetch('/api/engagement/discovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'processMySessions' })
      });
      const data = await response.json();
      if (response.ok) {
        toast.success(data.message || 'Processamento concluído.');
        await fetchSessions();
      } else {
        toast.error(data.error || 'Falha ao processar sessões.');
      }
    } catch (error) {
      toast.error('Erro ao conectar com o servidor.');
    } finally {
      setIsGlobalProcessing(false);
    }
  };

  const handleProcessSession = async (e, sessionId) => {
    if (e) e.stopPropagation();
    setProcessingSessions(prev => ({ ...prev, [sessionId]: true }));
    try {
      const response = await fetch('/api/engagement/discovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'processSession', sessionId })
      });
      if (response.ok) {
        const updatedSession = await response.json();
        toast.success('Sessão processada com sucesso!');
        // Refresh sessions to see updated status
        const freshSessions = await fetchSessions();
        // If it's the currently selected session, refresh its details too
        if (selectedSession?.id === sessionId) {
          handleSessionClick(updatedSession || freshSessions?.find(s => s.id === sessionId));
        }
      } else {
        const data = await response.json();
        toast.error(data.error || 'Falha ao processar sessão.');
      }
    } catch (error) {
      console.error('Error processing session:', error);
      toast.error('Erro ao conectar com o servidor.');
    } finally {
      setProcessingSessions(prev => ({ ...prev, [sessionId]: false }));
    }
  };

  const handleImportJSON = async (e, sessionId = null) => {
    if (e) e.stopPropagation();

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = async (event) => {
      const file = event.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const content = JSON.parse(e.target.result);
          const isGlobal = sessionId === null;
          const fileSessionId = content.sessionId;

          toast.loading('Importando resultados...', { id: 'import' });

          const response = await fetch('/api/engagement/discovery', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'importExternalResults',
              sessionId,
              fileSessionId,
              isGlobal,
              resultados: content.resultados
            })
          });

          const data = await response.json();
          if (response.ok) {
            toast.success(data.message || 'Importação concluída.', { id: 'import' });
            const freshSessions = await fetchSessions();

            const targetId = isGlobal ? fileSessionId : sessionId;
            if (selectedSession?.id === targetId || isGlobal) {
               // Se global ou se for a selecionada, atualiza detalhes
               const updatedSession = freshSessions?.find(s => s.id === targetId);
               if (updatedSession) handleSessionClick(updatedSession);
            }
          } else {
            toast.error(data.error || 'Falha ao importar resultados.', { id: 'import' });
          }
        } catch (error) {
          console.error('Error importing JSON:', error);
          toast.error('Erro ao processar o arquivo. Verifique se é um JSON válido.', { id: 'import' });
        }
      };
      reader.readAsText(file);
    };

    input.click();
  };

  const handleExportJSON = async (e, sessionId) => {
    if (e) e.stopPropagation();
    try {
      const response = await fetch('/api/engagement/discovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'exportSessionJSON', sessionId })
      });
      const data = await response.json();
      if (response.ok) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `linkedin-discovery-${sessionId}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('JSON exportado com sucesso!');
      } else {
        toast.error(data.error || 'Falha ao exportar JSON.');
      }
    } catch (error) {
      console.error('Error exporting JSON:', error);
      toast.error('Erro ao conectar com o servidor.');
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
        <AutoAwesome color="primary" /> Engajamento LinkedIn
      </Typography>
      
      <Paper sx={{ mt: 2 }}>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} variant="fullWidth">
          <Tab label="Descoberta de Posts" />
          <Tab label="Comentários para Aprovação" />
        </Tabs>

        <Box sx={{ p: 2 }}>
          {tabValue === 0 && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle1">Sessões de Descoberta</Typography>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Tooltip title="Importação Global">
                      <IconButton
                        size="small"
                        color="success"
                        onClick={(e) => handleImportJSON(e, null)}
                        disabled={loading}
                        sx={{ border: '1px solid', borderColor: 'success.light' }}
                      >
                        <UploadFile fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Executar job global de descoberta">
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={isGlobalProcessing ? <CircularProgress size={16} /> : <PlayCircleFilled />}
                        onClick={handleRunGlobalDiscovery}
                        disabled={isGlobalProcessing || loading}
                      >
                        Processar Todas
                      </Button>
                    </Tooltip>
                  </Box>
                </Box>
                {loading && sessions.length === 0 ? (
                  <CircularProgress />
                ) : sessions.length === 0 ? (
                  <Alert severity="info">Nenhuma sessão de descoberta encontrada. Publique um post para iniciar.</Alert>
                ) : (
                  <List>
                    {sessions.map(session => (
                      <ListItem 
                        button 
                        key={session.id} 
                        selected={selectedSession?.id === session.id}
                        onClick={() => handleSessionClick(session)}
                      >
                        <ListItemText 
                          primary={`Post: ${session.source_post_content?.substring(0, 30)}...`}
                          secondary={
                            <Box component="span" sx={{ display: 'flex', flexDirection: 'column', mt: 0.5 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                {new Date(session.created_at).toLocaleDateString()}
                                {session.post_count > 0 && (
                                  <Chip
                                    size="small"
                                    label={`${session.post_count} posts`}
                                    sx={{ height: 18, fontSize: '0.65rem', ml: 1, backgroundColor: 'success.light', color: 'success.contrastText' }}
                                  />
                                )}
                              </Box>
                              <Typography variant="caption" color={session.status === 'error' ? 'error' : 'textSecondary'}>
                                Status: {getStatusLabel(session.status)}
                              </Typography>
                            </Box>
                          }
                        />
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {processingSessions[session.id] ? (
                            <CircularProgress size={20} />
                          ) : (
                            <Tooltip title="Processar agora">
                              <IconButton
                                size="small"
                                onClick={(e) => handleProcessSession(e, session.id)}
                                color="primary"
                              >
                                <Refresh />
                              </IconButton>
                            </Tooltip>
                          )}
                          {session.status === 'awaiting_external_search' && (
                            <>
                              <Tooltip title="Exportar JSON para busca">
                                <IconButton
                                  size="small"
                                  onClick={(e) => handleExportJSON(e, session.id)}
                                  color="secondary"
                                >
                                  <Download />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Importar resultados da busca">
                                <IconButton
                                  size="small"
                                  onClick={(e) => handleImportJSON(e, session.id)}
                                  color="success"
                                >
                                  <UploadFile />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                          <Chip size="small" label={getStatusLabel(session.status)} color="info" variant="outlined" />
                        </Box>
                      </ListItem>
                    ))}
                  </List>
                )}
              </Grid>
              <Grid item xs={12} md={8}>
                {selectedSession ? (
                  <Box>
                    <Typography variant="subtitle1" gutterBottom>Posts Sugeridos</Typography>
                    {loading ? <CircularProgress /> : posts.length === 0 ? (
                      <Alert
                        severity={selectedSession.status === 'completed' ? "warning" : "info"}
                        action={
                          <Button
                            color="inherit"
                            size="small"
                            onClick={() => handleProcessSession(null, selectedSession.id)}
                            disabled={processingSessions[selectedSession.id]}
                            startIcon={processingSessions[selectedSession.id] ? <CircularProgress size={16} color="inherit" /> : <Refresh />}
                          >
                            {selectedSession.status === 'completed' ? 'Tentar novamente' : 'Processar agora'}
                          </Button>
                        }
                      >
                        {selectedSession.status === 'completed' 
                          ? "A busca foi concluída, mas nenhum post relevante foi encontrado para os temas deste conteúdo."
                          : "Nenhum post descoberto para esta sessão."}
                      </Alert>
                    ) : (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {posts.map(post => (
                          <Card key={post.id} variant="outlined">
                            <CardContent>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                <Box>
                                  <Typography variant="subtitle2" color="primary">{post.post_author_name || 'Autor Desconhecido'}</Typography>
                                  <Typography variant="caption" color="textSecondary">{post.post_author_title}</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                                  <Chip
                                    label={`Relevância: ${post.final_score}%`}
                                    color={post.final_score >= 80 ? "success" : post.final_score >= 60 ? "primary" : "default"}
                                    size="small"
                                  />
                                  {post.relation_type && (
                                    <Typography variant="caption" sx={{ fontStyle: 'italic' }}>
                                      {post.relation_type}
                                    </Typography>
                                  )}
                                </Box>
                              </Box>
                              <Typography variant="body2" sx={{ mb: 1 }}>{post.post_content}</Typography>
                              {post.score_justification && (
                                <Typography variant="caption" display="block" sx={{ mb: 2, p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                                  <strong>IA:</strong> {post.score_justification}
                                </Typography>
                              )}
                              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', alignItems: 'center' }}>
                                <Tooltip title="Excluir post">
                                    <IconButton
                                        size="small"
                                        color="error"
                                        onClick={() => handleDeletePost(post.id)}
                                        sx={{ mr: 'auto' }}
                                    >
                                        <Delete fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                                <Button 
                                  size="small" 
                                  startIcon={<ThumbDown />} 
                                  color="error"
                                  onClick={() => handleDecision(post.id, 'rejected')}
                                  disabled={post.user_decision !== 'pending'}
                                >
                                  Rejeitar
                                </Button>
                                <Button 
                                  size="small" 
                                  startIcon={<ThumbUp />} 
                                  color="success" 
                                  variant="contained"
                                  onClick={() => handleDecision(post.id, 'approved')}
                                  disabled={post.user_decision !== 'pending'}
                                >
                                  Aprovar
                                </Button>
                              </Box>
                            </CardContent>
                          </Card>
                        ))}
                      </Box>
                    )}
                  </Box>
                ) : (
                  <Alert severity="info">Selecione uma sessão para ver os posts descobertos.</Alert>
                )}
              </Grid>
            </Grid>
          )}

          {tabValue === 1 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1">Comentários Gerados</Typography>
                <Button size="small" startIcon={<Refresh />} onClick={fetchComments}>Atualizar</Button>
              </Box>
              {comments.length === 0 ? (
                <Alert severity="info">Nenhum comentário gerado. Aprove posts descobertos para gerar comentários.</Alert>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {comments.map(comment => (
                    <Paper key={comment.id} sx={{ p: 2, border: '1px solid #eee' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="caption" color="textSecondary">
                          Para o post de <strong>{comment.post_author_name}</strong>
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                          {comment.generation_version > 1 && (
                            <Chip label={`v${comment.generation_version}`} size="small" variant="outlined" />
                          )}
                          <Chip
                            label={comment.status === 'published' ? 'Publicado' : 'Pendente'}
                            color={comment.status === 'published' ? 'success' : 'warning'}
                            size="small"
                          />
                        </Box>
                      </Box>
                      <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary', mb: 1, fontSize: '0.8rem' }}>
                        "{comment.post_content?.substring(0, 150)}..."
                      </Typography>
                      <TextField
                        fullWidth
                        multiline
                        rows={3}
                        defaultValue={comment.final_text || comment.generated_text}
                        onBlur={(e) => handleUpdateCommentText(comment.id, e.target.value)}
                        sx={{ mt: 1, mb: 1 }}
                        disabled={comment.status === 'published'}
                      />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                        <Box>
                            <Button
                                size="small"
                                startIcon={<Refresh />}
                                onClick={() => handleRegenerateComment(comment.id)}
                                disabled={comment.status === 'published'}
                            >
                                Regenerar
                            </Button>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                                size="small"
                                startIcon={<OpenInNew />}
                                href={comment.post_url}
                                target="_blank"
                            >
                                Ver Post
                            </Button>
                            <Button
                                size="small"
                                startIcon={<Send />}
                                variant="contained"
                                color="primary"
                                onClick={() => handlePublishComment(comment.id)}
                                disabled={comment.status === 'published'}
                            >
                                {comment.status === 'published' ? 'Publicado' : 'Publicar Agora'}
                            </Button>
                        </Box>
                      </Box>
                    </Paper>
                  ))}
                </Box>
              )}
            </Box>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default LinkedInEngagement;
