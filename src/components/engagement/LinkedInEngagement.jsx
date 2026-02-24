import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Tabs, Tab, List, ListItem, ListItemText,
  Button, Chip, Divider, CircularProgress, Card, CardContent,
  IconButton, Tooltip, TextField, Alert, Grid
} from '@mui/material';
import {
  ThumbUp, ThumbDown, Comment, OpenInNew, CheckCircle,
  Refresh, AutoAwesome, Send
} from '@mui/icons-material';

const LinkedInEngagement = () => {
  const [tabValue, setTabValue] = useState(0);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
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
      setSessions(data);
    } catch (error) {
      console.error('Error fetching sessions:', error);
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
      setComments(data);
    } catch (error) {
      console.error('Error fetching comments:', error);
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
    } catch (error) {
      console.error('Error fetching session details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async (postId, decision) => {
    try {
      await fetch('/api/engagement/discovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updatePostDecision', postId, decision })
      });
      // Refresh posts
      handleSessionClick(selectedSession);
      if (decision === 'approved') {
        fetchComments(); // New comment might be generated
      }
    } catch (error) {
      console.error('Error updating decision:', error);
    }
  };

  const handleProcessSession = async (e, sessionId) => {
    e.stopPropagation();
    setProcessingSessions(prev => ({ ...prev, [sessionId]: true }));
    try {
      const response = await fetch('/api/engagement/discovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'processSession', sessionId })
      });
      if (response.ok) {
        const updatedSession = await response.json();
        // Refresh sessions to see updated status
        await fetchSessions();
        // If it's the currently selected session, refresh its details too
        if (selectedSession?.id === sessionId) {
          handleSessionClick(updatedSession);
        }
      } else {
        console.error('Failed to process session');
      }
    } catch (error) {
      console.error('Error processing session:', error);
    } finally {
      setProcessingSessions(prev => ({ ...prev, [sessionId]: false }));
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
                <Typography variant="subtitle1" gutterBottom>Sessões de Descoberta</Typography>
                {loading ? (
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
                          secondary={new Date(session.created_at).toLocaleDateString()}
                        />
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {processingSessions[session.id] ? (
                            <CircularProgress size={20} />
                          ) : (
                            (session.status === 'pending' || session.status === 'error' || session.status === 'searching') && (
                              <Tooltip title="Processar agora">
                                <IconButton
                                  size="small"
                                  onClick={(e) => handleProcessSession(e, session.id)}
                                  color="primary"
                                >
                                  <Refresh />
                                </IconButton>
                              </Tooltip>
                            )
                          )}
                          <Chip size="small" label={session.status} color="info" variant="outlined" />
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
                      <Alert severity="info">Nenhum post descoberto para esta sessão.</Alert>
                    ) : (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {posts.map(post => (
                          <Card key={post.id} variant="outlined">
                            <CardContent>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                <Typography variant="subtitle2" color="primary">{post.post_author_name}</Typography>
                                <Chip label={`Score: ${post.final_score}`} color="success" size="small" />
                              </Box>
                              <Typography variant="body2" sx={{ mb: 2 }}>{post.post_content}</Typography>
                              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
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
              <Typography variant="subtitle1" gutterBottom>Comentários Gerados</Typography>
              {comments.length === 0 ? (
                <Alert severity="info">Nenhum comentário gerado. Aprove posts descobertos para gerar comentários.</Alert>
              ) : (
                <List>
                  {comments.map(comment => (
                    <Paper key={comment.id} sx={{ p: 2, mb: 2, border: '1px solid #eee' }}>
                      <Typography variant="caption" color="textSecondary">Para o post de {comment.post_author_name}</Typography>
                      <TextField
                        fullWidth
                        multiline
                        rows={3}
                        defaultValue={comment.generated_text}
                        sx={{ mt: 1, mb: 1 }}
                      />
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                        <Button size="small" startIcon={<Send />} variant="contained" color="primary">
                          Aprovar e Comentar
                        </Button>
                      </Box>
                    </Paper>
                  ))}
                </List>
              )}
            </Box>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default LinkedInEngagement;
