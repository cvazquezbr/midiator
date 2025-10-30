import React, { useState, useEffect } from 'react';
import {
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  IconButton,
  CircularProgress,
  Alert,
  Box,
  Button,
  Typography,
  Divider,
  Container,
  Paper,
  Fab,
} from '@mui/material';
import { Delete as DeleteIcon, Add as AddIcon, Share as ShareIcon, ContentCopy as CloneIcon } from '@mui/icons-material';
import { getCampaigns, deleteCampaign } from '../utils/campaignState';
import { toast } from 'sonner';
import CampaignCoverFlow from './CampaignCoverFlow';
import ShareCampaignModal from './ShareCampaignModal';
import CloneCampaignModal from './CloneCampaignModal';
import { traverseState } from '../utils/stateTraversal';
import { deserializeCampaignData } from '../utils/campaignState.js';

const MyCampaignsStep = ({ onEditCampaign, onCreateNew, onCloneComplete }) => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [swiperInstance, setSwiperInstance] = useState(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [cloneModalOpen, setCloneModalOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [cloning, setCloning] = useState(false);

  const handleOpenShareModal = (campaign) => {
    setSelectedCampaign(campaign);
    setShareModalOpen(true);
  };

  const handleOpenCloneModal = async (campaign) => {
    setCloning(true);
    try {
      const response = await fetch(`/api/campaigns/${campaign.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch full campaign data.');
      }
      const fullCampaign = await response.json();
      setSelectedCampaign(fullCampaign);
      setCloneModalOpen(true);
    } catch (error) {
      console.error("Failed to open clone modal with full data", error);
      toast.error(error.message || "Could not load campaign data for cloning.");
    } finally {
      setCloning(false);
    }
  };

  const handleCloseShareModal = () => {
    setShareModalOpen(false);
    setSelectedCampaign(null);
  };

  const handleCloseCloneModal = () => {
    setCloneModalOpen(false);
    setSelectedCampaign(null);
  };

  const handleCloneComplete = async (clonedCampaign) => {
    const { finalState, newlyCreatedAssets } = await deserializeCampaignData(clonedCampaign.campaign_data);
    const rehydratedCampaign = {
      ...clonedCampaign,
      campaign_data: finalState,
      pendingAssets: newlyCreatedAssets,
    };
    onCloneComplete(rehydratedCampaign);
  };

  useEffect(() => {
    if (swiperInstance && !swiperInstance.destroyed && swiperInstance.realIndex !== activeIndex) {
      swiperInstance.slideToLoop(activeIndex);
    }
  }, [activeIndex, swiperInstance]);

  const fetchCampaigns = () => {
    setLoading(true);
    setError('');
    getCampaigns()
      .then(data => {
        if (Array.isArray(data)) {
          setCampaigns(data);
        } else {
          console.error("MyCampaignsStep Error: API returned data, but it was not an array.", data);
          setCampaigns([]);
          setError("Received an invalid response from the server.");
        }
      })
      .catch(err => {
        console.error("MyCampaignsStep Error: Failed to fetch campaigns.", err);
        setError(err.message || 'An unknown error occurred while fetching campaigns.');
        setCampaigns([]);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete the campaign "${name}"?`)) {
      try {
        await deleteCampaign(id);
        toast.success(`Campaign "${name}" deleted.`);
        fetchCampaigns();
      } catch (err) {
        toast.error(err.message);
      }
    }
  };

  return (
    <Box>
      <Paper sx={{ p: { xs: 2, sm: 3, md: 4 }, mt: 4, position: 'relative', overflow: 'hidden' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant={{ xs: 'h5', sm: 'h4' }} component="h1">
            Minhas Campanhas
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={onCreateNew}
            sx={{ display: { xs: 'none', md: 'inline-flex' } }}
          >
            Nova Campanha
          </Button>
        </Box>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Selecione uma campanha existente para carregar e continuar editando, ou crie uma nova.
        </Typography>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
        ) : error ? (
          <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>
        ) : (
          <Box>
            {campaigns.length === 0 ? (
              <Typography sx={{ p: 2, textAlign: 'center' }}>
                Nenhuma campanha salva encontrada. Crie uma nova para começar.
              </Typography>
            ) : (
              <>
                <CampaignCoverFlow
                  campaigns={campaigns}
                  onEditCampaign={onEditCampaign}
                  onDeleteCampaign={handleDelete}
                  onShareCampaign={handleOpenShareModal}
                   onCloneCampaign={handleOpenCloneModal}
                  onSlideChange={setActiveIndex}
                  initialSlide={activeIndex}
                  onSwiper={setSwiperInstance}
                />
                <Divider sx={{ my: 4 }} />
                <Typography variant="h6" component="h3" sx={{ mb: 2, pl: { xs: 0, sm: 2 } }}>
                  Todas as Campanhas
                </Typography>
                <List sx={{ maxHeight: 300, overflow: 'auto' }}>
                  {campaigns.map((campaign, index) => (
                    <ListItem
                      key={campaign.id}
                      secondaryAction={
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <IconButton edge="end" aria-label="share" onClick={(e) => { e.stopPropagation(); handleOpenShareModal(campaign); }}>
                            <ShareIcon />
                          </IconButton>
                          <IconButton edge="end" aria-label="clone" onClick={(e) => { e.stopPropagation(); handleOpenCloneModal(campaign); }} disabled={cloning}>
                            {cloning && selectedCampaign?.id === campaign.id ? <CircularProgress size={24} /> : <CloneIcon />}
                          </IconButton>
                          <IconButton edge="end" aria-label="delete" onClick={(e) => { e.stopPropagation(); handleDelete(campaign.id, campaign.name); }}>
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      }
                      disablePadding
                    >
                      <ListItemButton
                        selected={index === activeIndex}
                        onClick={() => setActiveIndex(index)}
                      >
                        <ListItemText primary={campaign.name} secondary={`Atualizado em: ${new Date(campaign.updated_at).toLocaleDateString()}`} />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              </>
            )}
          </Box>
        )}
        {selectedCampaign && (
            <ShareCampaignModal
                open={shareModalOpen}
                onClose={handleCloseShareModal}
                campaign={selectedCampaign}
            />
        )}
        {selectedCampaign && (
            <CloneCampaignModal
                open={cloneModalOpen}
                onClose={handleCloseCloneModal}
                campaign={selectedCampaign}
                onCloneComplete={handleCloneComplete}
            />
        )}
        <Fab
          color="primary"
          aria-label="add"
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            display: { xs: 'flex', md: 'none' }
          }}
          onClick={onCreateNew}
        >
          <AddIcon />
        </Fab>
      </Paper>
    </Box>
  );
};

export default MyCampaignsStep;