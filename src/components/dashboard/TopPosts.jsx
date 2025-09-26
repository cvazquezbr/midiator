import React from 'react';
import {
  Box,
  Typography,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Link,
  Tooltip
} from '@mui/material';
import { Link as LinkIcon } from '@mui/icons-material';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const TopPosts = ({ data, loading }) => {
  if (loading) {
    return (
        <TableContainer component={Paper}>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>Rank</TableCell>
                        <TableCell>Título do Post</TableCell>
                        <TableCell>Campanha</TableCell>
                        <TableCell>Data de Publicação</TableCell>
                        <TableCell align="right">Métrica</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {[...Array(5)].map((_, i) => (
                        <TableRow key={i}>
                            <TableCell><Skeleton /></TableCell>
                            <TableCell><Skeleton /></TableCell>
                            <TableCell><Skeleton /></TableCell>
                            <TableCell><Skeleton /></TableCell>
                            <TableCell><Skeleton /></TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
  }

  if (!data || data.length === 0) {
    return <Typography>Nenhum post encontrado para os filtros selecionados.</Typography>;
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>Top Posts por Performance</Typography>
      <TableContainer component={Paper}>
        <Table aria-label="top posts table">
          <TableHead>
            <TableRow>
              <TableCell>#</TableCell>
              <TableCell>Título do Post</TableCell>
              <TableCell>Campanha</TableCell>
              <TableCell>Data de Publicação</TableCell>
              <TableCell align="right">Valor da Métrica</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((post, index) => {
              const publicationDate = new Date(post.publication_date);
              const daysSincePublication = differenceInDays(new Date(), publicationDate);
              const formattedDate = format(publicationDate, 'P', { locale: ptBR });
              const daysText = daysSincePublication === 1 ? 'dia' : 'dias';

              return (
                <TableRow key={post.post_id}>
                  <TableCell component="th" scope="row">
                    {index + 1}
                  </TableCell>
                  <TableCell>
                    {post.linkedin_post_url ? (
                      <Link href={post.linkedin_post_url} target="_blank" rel="noopener" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {post.post_title}
                        <LinkIcon fontSize="inherit" />
                      </Link>
                    ) : (
                      post.post_title
                    )}
                  </TableCell>
                  <TableCell>{post.campaign_name}</TableCell>
                  <TableCell>
                    <Tooltip title={`Publicado há ${daysSincePublication} ${daysText}`}>
                      <span>{formattedDate}</span>
                    </Tooltip>
                  </TableCell>
                  <TableCell align="right">{post.value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default TopPosts;
