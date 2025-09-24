import React from 'react';
import { Box, Typography, Skeleton } from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

const CampaignComparison = ({ data, loading }) => {
  if (loading) {
    return <Skeleton variant="rectangular" width="100%" height={400} />;
  }

  if (!data || data.length === 0) {
    return <Typography>Nenhuma campanha para comparar no período selecionado.</Typography>;
  }

  // Truncate long campaign names for better display
  const formattedData = data.map(item => ({
    ...item,
    name: item.campaign_name.length > 15 ? `${item.campaign_name.substring(0, 15)}...` : item.campaign_name,
  }));

  return (
    <Box sx={{ height: 400 }}>
      <Typography variant="h6" gutterBottom>Comparativo de Performance por Campanha</Typography>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={formattedData}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" angle={-45} textAnchor="end" height={70} />
          <YAxis />
          <Tooltip
             contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #ccc',
            }}
            labelStyle={{ fontWeight: 'bold' }}
            formatter={(value, name, props) => [value.toLocaleString('pt-BR'), props.payload.campaign_name]}
          />
          <Legend />
          <Bar dataKey="value" name="Valor da Métrica" fill="#82ca9d" />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default CampaignComparison;
