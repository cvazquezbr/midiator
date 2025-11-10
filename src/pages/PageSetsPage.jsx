import React, { useState, useEffect } from 'react';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import {
  Paper, Typography, Box, Button, Alert, IconButton, Divider, Drawer, List, ListItem, ListItemButton, ListItemText, CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import CampaignIcon from '@mui/icons-material/Campaign';
import { toast } from 'sonner';
import isEqual from 'lodash.isequal';
import { useNavigate } from 'react-router-dom';

import { getPageSets, savePageSet, updatePageSet, deletePageSet, loadPageSet } from '../utils/pageSetState';
import { importPageSetToCampaign } from '../utils/campaignUtils';
import PageSetEditor from '../components/PageSetEditor';
import UnsavedChangesDialog from '../components/UnsavedChangesDialog';
import { useCampaign } from '../context/CampaignContext';

const PageSetsPage = ({ drawerOpen, setDrawerOpen, onSwitchView }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const { applyLoadedCampaign } = useCampaign();

  const [pageSetList, setPageSetList] = useState([]);
  const [selectedPageSet, setSelectedPageSet] = useState(null);
  const [originalPageSet, setOriginalPageSet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [pendingAssets, setPendingAssets] = useState({});
  const [isDirty, setIsDirty] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [navigationTarget, setNavigationTarget] = useState(null);

  useEffect(() => {
    if (originalPageSet && selectedPageSet) {
      const dirty = !isEqual(originalPageSet, selectedPageSet) || Object.keys(pendingAssets).length > 0;
      setIsDirty(dirty);
    } else {
      setIsDirty(false);
    }
  }, [selectedPageSet, originalPageSet, pendingAssets]);

  useEffect(() => {
    fetchPageSets();
  }, []);

  const fetchPageSets = async () => {
    setLoading(true);
    try {
      const data = await getPageSets();
      setPageSetList(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPageSet = async (ps) => {
    if (!ps || !ps.id) return;
    try {
        const fullPageSet = await loadPageSet(ps.id);
        const pageSetWithData = { ...fullPageSet, page_set_data: fullPageSet.page_set_data || { pages: [], aspectRatio: '1:1' } };
        setSelectedPageSet(pageSetWithData);
        setOriginalPageSet(JSON.parse(JSON.stringify(pageSetWithData)));
        setPendingAssets(fullPageSet.pendingAssets || {});
        setIsDirty(false);
        if (isMobile) setDrawerOpen(false);
    } catch(err) {
        toast.error(`Falha ao carregar PageSet: ${err.message}`);
    }
  };

  const handleNewPageSet = () => {
    const newEmpty = { name: 'Novo Conjunto', page_set_data: { pages: [], aspectRatio: '1:1' } };
    setSelectedPageSet(newEmpty);
    setOriginalPageSet(JSON.parse(JSON.stringify(newEmpty)));
    setPendingAssets({});
    setIsDirty(true);
    if (isMobile) setDrawerOpen(false);
  };

  const handleSave = async () => {
    if (!selectedPageSet) return false;
    const { id, name, page_set_data } = selectedPageSet;
    if (!name) { toast.error('O nome é obrigatório.'); return false; }

    try {
      let result;
      if (id) {
        result = await updatePageSet(id, name, page_set_data, pendingAssets);
      } else {
        result = await savePageSet(name, page_set_data, pendingAssets);
      }
      const saved = result;
      toast.success("Salvo com sucesso!");
      await fetchPageSets();

      const pageSetWithData = { ...saved, page_set_data: saved.page_set_data || { pages: [], aspectRatio: '1:1' } };
      setSelectedPageSet(pageSetWithData);
      setOriginalPageSet(JSON.parse(JSON.stringify(pageSetWithData)));
      setPendingAssets(saved.pendingAssets || {});
      setIsDirty(false);
      return true;
    } catch (err) {
      toast.error(`Falha ao salvar: ${err.message}`);
      return false;
    }
  };

  const handleImport = async () => {
    if (isDirty) {
        toast.error('Salve suas alterações antes de criar uma campanha.');
        return;
    }
    if (!selectedPageSet || !selectedPageSet.id) {
        toast.error('Selecione um PageSet salvo para importar.');
        return;
    }

    toast.promise(importPageSetToCampaign(selectedPageSet), {
        loading: 'Importando assets do PageSet...',
        success: (result) => {
            const newCampaignState = {
                name: selectedPageSet.name,
                campaign_data: result.campaign_data,
                pendingAssets: result.pendingAssets,
            };
            applyLoadedCampaign(newCampaignState);
            onSwitchView('campaigns');
            return 'PageSet importado com sucesso! Salve para criar a nova campanha.';
        },
        error: 'Falha ao importar o PageSet.',
    });
  };

  const handleNavigation = (targetAction) => {
    if (isDirty) {
      setNavigationTarget(() => targetAction);
      setShowUnsavedDialog(true);
    } else {
      targetAction();
    }
  };

  const handleDialogClose = () => setShowUnsavedDialog(false);
  const handleDialogDiscard = () => {
    setShowUnsavedDialog(false);
    setIsDirty(false);
    if (navigationTarget) navigationTarget();
  };
  const handleDialogSaveAndNavigate = async () => {
    const success = await handleSave();
    if (success && navigationTarget) navigationTarget();
    setShowUnsavedDialog(false);
  };

  const handleDelete = async (pageSetId) => {
      try {
        await deletePageSet(pageSetId);
        toast.success('Excluído com sucesso!');
        fetchPageSets();
        setSelectedPageSet(null);
        setOriginalPageSet(null);
      } catch (error) {
        toast.error(`Falha ao excluir: ${error.message}`);
      }
  };

  const handleDeleteClick = (ps) => {
    if (window.confirm(`Tem certeza que deseja excluir "${ps.name}"?`)) {
        handleDelete(ps.id);
    }
  };

  const drawerContent = (
    <Box sx={{ p: 2, width: 320 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>Conjunto de Páginas</Typography>
      <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleNavigation(handleNewPageSet)} fullWidth>Novo Conjunto</Button>
      <Divider sx={{ my: 2 }} />
      {loading && <CircularProgress />}
      {error && <Alert severity="error">{error}</Alert>}
      {!loading && !error && (
        <List>
          {pageSetList.map((ps) => (
            <ListItem key={ps.id} disablePadding secondaryAction={<IconButton edge="end" onClick={() => handleDeleteClick(ps)}><DeleteIcon /></IconButton>}>
              <ListItemButton selected={selectedPageSet?.id === ps.id} onClick={() => handleNavigation(() => handleSelectPageSet(ps))}>
                <ListItemText primary={ps.name} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );

  return (
    <>
      <Box sx={{ display: 'flex', width: '100%', height: '100%' }}>
        <Drawer
          variant={isMobile ? 'temporary' : 'persistent'}
          anchor="left"
          open={drawerOpen}
          onClose={() => handleNavigation(() => setDrawerOpen(false))}
          sx={{ width: 320, flexShrink: 0, '& .MuiDrawer-paper': { width: 320, boxSizing: 'border-box', position: 'absolute' } }}
        >
          {drawerContent}
        </Drawer>
        <Box component="main" sx={{ flexGrow: 1, p: 3, marginLeft: !isMobile && !drawerOpen ? `-${320}px` : 0 }}>
          {selectedPageSet ? (
            <Paper elevation={2} sx={{ p: 3 }}>
              <PageSetEditor
                pageSet={selectedPageSet}
                onPageSetChange={setSelectedPageSet}
                pendingAssets={pendingAssets}
                onPendingAssetsChange={setPendingAssets}
                isSaving={loading}
              />
               <Box sx={{mt: 2, display: 'flex', justifyContent: 'space-between'}}>
                <Button onClick={handleSave} variant="contained" disabled={!isDirty || loading}>Salvar Alterações</Button>
                <Button onClick={handleImport} variant="outlined" startIcon={<CampaignIcon />} disabled={!selectedPageSet.id || isDirty}>Criar Campanha a partir deste Conjunto</Button>
               </Box>
            </Paper>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
              <Typography variant="h6" color="text.secondary">Selecione um conjunto para editar ou crie um novo.</Typography>
            </Box>
          )}
        </Box>
      </Box>
      <UnsavedChangesDialog open={showUnsavedDialog} onClose={handleDialogClose} onConfirmDiscard={handleDialogDiscard} onConfirmSave={handleDialogSaveAndNavigate} />
    </>
  );
};

export default PageSetsPage;
