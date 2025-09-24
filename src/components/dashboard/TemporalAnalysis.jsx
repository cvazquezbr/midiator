import React from 'react';
import { Box, Typography, Skeleton } from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const TemporalAnalysis = ({ data, loading }) => {
  if (loading) {
    return <Skeleton variant="rectangular" width="100%" height={400} />;
  }

  if (!data || data.length === 0) {
    return <Typography>Nenhum dado disponível para o período selecionado.</Typography>;
  }

  const formattedData = data.map(item => ({
    ...item,
    date: format(parseISO(item.date), 'dd/MMM', { locale: ptBR }),
  }));

  return (
    <Box sx={{ height: 400 }}>
      <Typography variant="h6" gutterBottom>Evolução da Métrica no Período</Typography>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={formattedData}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip
            contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #ccc',
            }}
            labelStyle={{ fontWeight: 'bold' }}
            formatter={(value) => [value.toLocaleString('pt-BR'), 'Valor']}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="value"
            name="Valor da Métrica"
            stroke="#8884d8"
            activeDot={{ r: 8 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default TemporalAnalysis;
