import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Grid,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  OutlinedInput
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ptBR } from 'date-fns/locale';
import { getCampaigns } from '../utils/campaignState';
import fetchWithAuth from '../utils/fetchWithAuth';
import { subDays } from 'date-fns';
import Overview from './dashboard/Overview';
import TemporalAnalysis from './dashboard/TemporalAnalysis';
import CampaignComparison from './dashboard/CampaignComparison';
import TopPosts from './dashboard/TopPosts';


const TabPanel = (props) => {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
};

const AVAILABLE_METRICS = [
    { value: 'impression_count', label: 'Impressões' },
    { value: 'click_count', label: 'Cliques' },
    { value: 'like_count', label: 'Curtidas' },
    { value: 'comment_count', label: 'Comentários' },
    { value: 'share_count', label: 'Compartilhamentos' },
    { value: 'engagement', label: 'Taxa de Engajamento' }
];

const AnalyticsDashboard = ({ currentCampaign }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaigns, setSelectedCampaigns] = useState([]);
  const [selectedMetric, setSelectedMetric] = useState('impression_count');
  const [dateRange, setDateRange] = useState({
    startDate: subDays(new Date(), 30),
    endDate: new Date(),
  });
  const [dashboardData, setDashboardData] = useState({
    overview: null,
    timeline: null,
    campaignCompare: null,
    topPosts: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch date range and campaigns on initial load
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Fetch available date range
        const dateRangeRes = await fetchWithAuth('/api/analytics/daterange');
        if (dateRangeRes.ok) {
          const { min_date, max_date } = await dateRangeRes.json();
          if (min_date && max_date) {
            // Set dates, adding a day to max_date to ensure it's inclusive
            const startDate = new Date(min_date);
            const endDate = new Date(max_date);
            setDateRange({ startDate, endDate });
          }
        }

        // Fetch campaigns
        const userCampaigns = await getCampaigns();
        setCampaigns(userCampaigns);
        if (currentCampaign?.id) {
          setSelectedCampaigns([currentCampaign.id]);
        }
      } catch (err) {
        setError('Falha ao carregar dados iniciais do dashboard.');
        console.error(err);
      }
    };

    loadInitialData();
  }, [currentCampaign]);

  // Fetch analytics data when filters change
  const fetchDashboardData = useCallback(async () => {
    if (selectedCampaigns.length === 0 || !dateRange.startDate || !dateRange.endDate) {
      return;
    }
    setLoading(true);
    setError('');

    const campaignIds = selectedCampaigns.join(',');
    const startDate = dateRange.startDate.toISOString().split('T')[0];
    const endDate = dateRange.endDate.toISOString().split('T')[0];

    try {
      const campaignCompareMetricMap = {
        'impression_count': 'total_impressions',
        'click_count': 'total_clicks',
        'like_count': 'total_likes',
        'comment_count': 'total_comments',
        'share_count': 'total_shares',
        'engagement': 'avg_engagement_rate'
      };
      const campaignCompareMetric = campaignCompareMetricMap[selectedMetric] || 'total_impressions';

      const endpoints = {
        overview: `/api/analytics/overview?startDate=${startDate}&endDate=${endDate}&campaignIds=${campaignIds}`,
        timeline: `/api/analytics/timeline?startDate=${startDate}&endDate=${endDate}&campaignIds=${campaignIds}&metric=${selectedMetric}`,
        campaignCompare: `/api/analytics/campaigns/compare?startDate=${startDate}&endDate=${endDate}&campaignIds=${campaignIds}&metric=${campaignCompareMetric}`,
        topPosts: `/api/analytics/posts/top?startDate=${startDate}&endDate=${endDate}&campaignIds=${campaignIds}&metric=engagement&limit=10`,
      };

      const requests = Object.entries(endpoints).map(([key, url]) =>
        fetchWithAuth(url).then(res => {
            if (!res.ok) throw new Error(`Failed to fetch ${key}`);
            return res.json();
        })
      );

      const results = await Promise.all(requests);

      setDashboardData({
        overview: results[0],
        timeline: results[1],
        campaignCompare: results[2],
        topPosts: results[3],
      });

    } catch (err) {
      setError(`Falha ao carregar dados do dashboard: ${err.message}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedCampaigns, dateRange, selectedMetric]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleCampaignSelection = (event) => {
    const {
      target: { value },
    } = event;
    setSelectedCampaigns(
      typeof value === 'string' ? value.split(',') : value,
    );
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
      <Box>
        <Typography variant="h6" gutterBottom>Dashboard de Analytics</Typography>

        {/* Filter Controls */}
        <Grid container spacing={2} sx={{ mb: 2, alignItems: 'center' }}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Campanhas</InputLabel>
              <Select
                multiple
                value={selectedCampaigns}
                onChange={handleCampaignSelection}
                input={<OutlinedInput label="Campanhas" />}
                renderValue={(selected) => campaigns.filter(c => selected.includes(c.id)).map(c => c.name).join(', ')}
              >
                {campaigns.map((campaign) => (
                  <MenuItem key={campaign.id} value={campaign.id}>
                    <Checkbox checked={selectedCampaigns.indexOf(campaign.id) > -1} />
                    <ListItemText primary={campaign.name} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} md={3}>
            <DatePicker
              label="Data de Início"
              value={dateRange.startDate}
              onChange={(newValue) => setDateRange(prev => ({ ...prev, startDate: newValue }))}
            />
          </Grid>
          <Grid item xs={6} md={3}>
            <DatePicker
              label="Data de Fim"
              value={dateRange.endDate}
              onChange={(newValue) => setDateRange(prev => ({ ...prev, endDate: newValue }))}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Métrica</InputLabel>
              <Select
                value={selectedMetric}
                onChange={(e) => setSelectedMetric(e.target.value)}
                input={<OutlinedInput label="Métrica" />}
              >
                {AVAILABLE_METRICS.map((metric) => (
                  <MenuItem key={metric.value} value={metric.value}>
                    <ListItemText primary={metric.label} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {error && <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>}

        {/* Nested Tabs for Dashboard Views */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={handleTabChange} aria-label="dashboard views">
            <Tab label="Visão Geral" />
            <Tab label="Análise Temporal" />
            <Tab label="Comparação de Campanhas" />
            <Tab label="Top Posts" />
          </Tabs>
        </Box>

        <TabPanel value={activeTab} index={0}>
          <Overview data={dashboardData.overview} loading={loading} />
        </TabPanel>
        <TabPanel value={activeTab} index={1}>
          <TemporalAnalysis data={dashboardData.timeline} loading={loading} />
        </TabPanel>
        <TabPanel value={activeTab} index={2}>
          <CampaignComparison data={dashboardData.campaignCompare} loading={loading} />
        </TabPanel>
        <TabPanel value={activeTab} index={3}>
          <TopPosts data={dashboardData.topPosts} loading={loading} />
        </TabPanel>
      </Box>
    </LocalizationProvider>
  );
};

export default AnalyticsDashboard;
