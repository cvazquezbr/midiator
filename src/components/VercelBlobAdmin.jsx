import React, { useState, useCallback } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Checkbox,
  Tooltip,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  CloudSync,
} from '@mui/icons-material';
import { toast } from 'sonner';

const VercelBlobAdmin = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState(new Set());

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/blob/admin');
      if (!response.ok) {
        throw new Error('Failed to fetch blob data');
      }
      const result = await response.json();
      setData(result);
    } catch (error) {
      toast.error(error.message || 'An error occurred while fetching blob data.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleFileSelect = (url) => {
    setSelectedFiles(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(url)) {
        newSelection.delete(url);
      } else {
        newSelection.add(url);
      }
      return newSelection;
    });
  };

  const handleDelete = async () => {
    const urlsToDelete = Array.from(selectedFiles);
    if (urlsToDelete.length === 0) {
      toast.info('No files selected for deletion.');
      return;
    }

    const toastId = toast.loading(`Deleting ${urlsToDelete.length} files...`);

    try {
      const response = await fetch('/api/blob/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: urlsToDelete }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete files.');
      }

      toast.success('Files deleted successfully.', { id: toastId });
      setSelectedFiles(new Set());
      fetchData(); // Refresh data
    } catch (error) {
      toast.error(error.message, { id: toastId });
    }
  };

  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Vercel Blob Storage Management
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <Button
          variant="contained"
          onClick={fetchData}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : <CloudSync />}
        >
          {loading ? 'Loading...' : 'Sync & Analyze'}
        </Button>
        {selectedFiles.size > 0 && (
          <Tooltip title="Delete selected files">
            <Button
              variant="outlined"
              color="error"
              onClick={handleDelete}
              startIcon={<DeleteIcon />}
            >
              Delete ({selectedFiles.size})
            </Button>
          </Tooltip>
        )}
      </Box>

      {data && (
        <Box>
          <Typography variant="h6" sx={{ mt: 4 }}>Campaign Storage Usage</Typography>
          <TableContainer component={Paper} sx={{ mb: 4 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Campaign ID</TableCell>
                  <TableCell align="right">File Count</TableCell>
                  <TableCell align="right">Total Size</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.entries(data.campaignUsage).map(([campaignId, usage]) => (
                  <TableRow key={campaignId}>
                    <TableCell>{campaignId}</TableCell>
                    <TableCell align="right">{usage.count}</TableCell>
                    <TableCell align="right">{formatBytes(usage.size)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Typography variant="h6">Orphaned Files ({data.orphanedFiles.length})</Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={selectedFiles.size > 0 && selectedFiles.size < data.orphanedFiles.length}
                      checked={data.orphanedFiles.length > 0 && selectedFiles.size === data.orphanedFiles.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedFiles(new Set(data.orphanedFiles.map(f => f.url)));
                        } else {
                          setSelectedFiles(new Set());
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell>Pathname</TableCell>
                  <TableCell align="right">Size</TableCell>
                  <TableCell align="right">Uploaded At</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.orphanedFiles.map((file) => (
                  <TableRow key={file.url} hover>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedFiles.has(file.url)}
                        onChange={() => handleFileSelect(file.url)}
                      />
                    </TableCell>
                    <TableCell>
                      <a href={file.url} target="_blank" rel="noopener noreferrer">
                        {file.pathname}
                      </a>
                    </TableCell>
                    <TableCell align="right">{formatBytes(file.size)}</TableCell>
                    <TableCell align="right">{new Date(file.uploadedAt).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
    </Box>
  );
};

export default VercelBlobAdmin;
