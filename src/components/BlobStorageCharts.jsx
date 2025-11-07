import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Box, Typography, Grid, Paper } from '@mui/material';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF19AF'];

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const sizeInMB = (data.value / (1024 * 1024)).toFixed(2);
    return (
      <Paper sx={{ p: 1, backgroundColor: 'rgba(255, 255, 255, 0.9)' }}>
        <Typography variant="body2">{`${data.name}: ${sizeInMB} MB`}</Typography>
      </Paper>
    );
  }
  return null;
};

const processData = (data, keyName = 'name', valueName = 'size') => {
  const chartData = Object.entries(data).map(([key, value]) => ({
    name: key,
    value: value[valueName],
  }));

  chartData.sort((a, b) => b.value - a.value);

  if (chartData.length > 5) {
    const otherValue = chartData.slice(5).reduce((acc, item) => acc + item.value, 0);
    return [...chartData.slice(0, 5), { name: 'Others', value: otherValue }];
  }
  return chartData;
};

const BlobStorageCharts = ({ data }) => {
  if (!data) return null;

  const campaignData = processData(data.campaignUsage);
  const userData = processData(data.userUsage);
  const orphanData = [
    { name: 'Active Files', value: data.orphanAnalysis.activeSize },
    { name: 'Orphaned Files', value: data.orphanAnalysis.orphanedSize },
  ];

  return (
    <Box sx={{ mb: 4 }}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Typography variant="h6" align="center">Storage by Campaign</Typography>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={campaignData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} fill="#8884d8" label>
                {campaignData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Grid>
        <Grid item xs={12} md={4}>
          <Typography variant="h6" align="center">Storage by User</Typography>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={userData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} fill="#82ca9d" label>
                {userData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Grid>
        <Grid item xs={12} md={4}>
          <Typography variant="h6" align="center">Active vs. Orphaned</Typography>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={orphanData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} fill="#ffc658" label>
                {orphanData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Grid>
      </Grid>
    </Box>
  );
};

export default BlobStorageCharts;
