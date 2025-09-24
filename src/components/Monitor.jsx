import React, { useState } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Card,
  CardContent,
  Typography
} from '@mui/material';
import { BarChart, Assessment, TrackChanges } from '@mui/icons-material';

// Import the components for each tab
import PublicationMonitor from './PublicationMonitor';
import AnalyticsDashboard from './AnalyticsDashboard'; // This will be created in the next step

const TabPanel = (props) => {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`monitor-tabpanel-${index}`}
      aria-labelledby={`monitor-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const Monitor = ({ currentCampaign }) => {
  const [activeTab, setActiveTab] = useState(0);

  const handleChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <Card>
      <CardContent sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <BarChart />
                Monitorar Campanha: {currentCampaign?.name || 'N/A'}
            </Typography>
        </Box>

        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={handleChange} aria-label="monitor tabs">
            <Tab icon={<TrackChanges />} iconPosition="start" label="Monitoramento" id="monitor-tab-0" />
            <Tab icon={<Assessment />} iconPosition="start" label="Dashboard" id="monitor-tab-1" />
          </Tabs>
        </Box>

        <TabPanel value={activeTab} index={0}>
          <PublicationMonitor currentCampaign={currentCampaign} />
        </TabPanel>
        <TabPanel value={activeTab} index={1}>
          {/* Placeholder until AnalyticsDashboard is built */}
          <AnalyticsDashboard currentCampaign={currentCampaign} />
        </TabPanel>

      </CardContent>
    </Card>
  );
};

export default Monitor;
