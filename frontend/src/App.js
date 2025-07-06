import React, { useState } from 'react';
import axios from 'axios';
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Card,
  CardContent,
  CardActions,
  Button,
  LinearProgress,
  Alert,
  Grid,
  Box,
  IconButton,
  Avatar,
  Paper
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DownloadIcon from '@mui/icons-material/Download';
import ImageIcon from '@mui/icons-material/Image';
import HistoryIcon from '@mui/icons-material/History';
import './App.css';

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [colorizedUrl, setColorizedUrl] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Handle file selection or drop
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setSelectedFile(file);
    setColorizedUrl(null);
    setError(null);
    if (file) {
      setPreview(URL.createObjectURL(file));
    } else {
      setPreview(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    setSelectedFile(file);
    setColorizedUrl(null);
    setError(null);
    if (file) {
      setPreview(URL.createObjectURL(file));
    } else {
      setPreview(null);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  // Handle file upload
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      const res = await axios.post('http://127.0.0.1:8000/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const colorizedFilename = res.data.colorized_filename;
      setColorizedUrl(`http://127.0.0.1:8000/download/${colorizedFilename}?type=colorized`);
      fetchHistory();
    } catch (err) {
      setError('Upload failed.');
    }
    setLoading(false);
  };

  // Fetch upload history
  const fetchHistory = async () => {
    try {
      const res = await axios.get('http://127.0.0.1:8000/history');
      setHistory(res.data);
    } catch (err) {
      setHistory([]);
    }
  };

  React.useEffect(() => {
    fetchHistory();
  }, []);

  return (
    <Box sx={{ flexGrow: 1, bgcolor: '#f5f5f5', minHeight: '100vh' }}>
      <AppBar position="static" color="primary">
        <Toolbar>
          <ImageIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Image Colorization App
          </Typography>
        </Toolbar>
      </AppBar>
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Card sx={{ mb: 4, p: 2 }}>
          <CardContent>
            <Typography variant="h5" gutterBottom>
              Upload a Black & White Image
            </Typography>
            <Paper
              elevation={3}
              sx={{
                p: 2,
                mb: 2,
                textAlign: 'center',
                border: '2px dashed #1976d2',
                bgcolor: '#e3f2fd',
                cursor: 'pointer',
              }}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <CloudUploadIcon sx={{ fontSize: 40, color: '#1976d2' }} />
              <Typography variant="body1" sx={{ mt: 1 }}>
                Drag & drop an image here, or click to select
              </Typography>
              <input
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                id="file-upload"
                onChange={handleFileChange}
              />
              <label htmlFor="file-upload">
                <Button variant="outlined" component="span" sx={{ mt: 2 }}>
                  Browse
                </Button>
              </label>
              {preview && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2">Preview:</Typography>
                  <img
                    src={preview}
                    alt="Preview"
                    style={{ maxWidth: '200px', maxHeight: '200px', borderRadius: 8, marginTop: 8 }}
                  />
                </Box>
              )}
            </Paper>
            {loading && <LinearProgress sx={{ my: 2 }} />}
            {error && <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>}
            <CardActions>
              <Button
                variant="contained"
                color="primary"
                onClick={handleUpload}
                disabled={loading || !selectedFile}
                startIcon={<CloudUploadIcon />}
                size="large"
              >
                Upload & Colorize
              </Button>
            </CardActions>
          </CardContent>
        </Card>
        {colorizedUrl && (
          <Card sx={{ mb: 4, p: 2, bgcolor: '#e8f5e9' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Colorized Image
              </Typography>
              <img
                src={colorizedUrl}
                alt="Colorized"
                style={{ maxWidth: '100%', borderRadius: 8, marginBottom: 8 }}
              />
              <Button
                variant="contained"
                color="success"
                href={colorizedUrl}
                download
                startIcon={<DownloadIcon />}
                sx={{ mt: 2 }}
              >
                Download Colorized Image
              </Button>
            </CardContent>
          </Card>
        )}
        <Card sx={{ p: 2 }}>
          <CardContent>
            <Box display="flex" alignItems="center" mb={2}>
              <HistoryIcon sx={{ mr: 1 }} />
              <Typography variant="h6">Upload History</Typography>
            </Box>
            <Grid container spacing={2}>
              {history.length === 0 && (
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    No uploads yet.
                  </Typography>
                </Grid>
              )}
              {history.map((item, idx) => (
                <Grid item xs={12} sm={6} md={4} key={idx}>
                  <Card variant="outlined" sx={{ height: '100%' }}>
                    <CardContent>
                      <Box display="flex" alignItems="center" mb={1}>
                        <Avatar sx={{ bgcolor: '#1976d2', mr: 1 }}>
                          <ImageIcon />
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2" noWrap>{item.original_filename}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(item.upload_time).toLocaleString()}
                          </Typography>
                        </Box>
                      </Box>
                      <Box display="flex" gap={1} mt={2}>
                        <Button
                          variant="outlined"
                          color="primary"
                          href={`http://127.0.0.1:8000/download/${item.saved_filename}?type=upload`}
                          target="_blank"
                          startIcon={<DownloadIcon />}
                          size="small"
                        >
                          Original
                        </Button>
                        <Button
                          variant="contained"
                          color="secondary"
                          href={`http://127.0.0.1:8000/download/${item.colorized_filename}?type=colorized`}
                          target="_blank"
                          startIcon={<DownloadIcon />}
                          size="small"
                        >
                          Colorized
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}

export default App;
