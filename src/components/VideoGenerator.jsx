import React, { useState, useRef, useEffect } from 'react';
import {
  Box, Button, Typography, Card, CardContent, Grid,
  LinearProgress, Alert, Select, MenuItem,
  FormControl, InputLabel, TextField, Paper,
  Snackbar, CircularProgress, IconButton, Tooltip, Checkbox, FormControlLabel,
  Switch
} from '@mui/material';
import { Movie, PlayArrow, GetApp, Info, ErrorOutline, Refresh, Download, UploadFile } from '@mui/icons-material';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import ProgressModal from './ProgressModal';
import Draggable from 'react-draggable';

import { FFmpeg } from '@ffmpeg/ffmpeg';

import { fetchFile } from '@ffmpeg/util';

const VideoGenerator = ({ generatedImages, generatedAudioData }) => {
  const [video, setVideo] = useState(null);
  const [videos, setVideos] = useState([]);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [slideDuration, setSlideDuration] = useState(3);
  const [fps, setFps] = useState(24);
  const [transition, setTransition] = useState('fade');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [ffmpegLoaded, setFfmpegLoaded] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [processingTime, setProcessingTime] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState(0);
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);
  const [environmentChecks, setEnvironmentChecks] = useState(null);
  const [compatibilityMode, setCompatibilityMode] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [totalFrames, setTotalFrames] = useState(0);
  const [generatePerRecord, setGeneratePerRecord] = useState(false);
  const [generationMode, setGenerationMode] = useState('slides'); // 'slides' or 'narration'
  const [narrationVideo, setNarrationVideo] = useState(null);
  const [chromaKeyColor, setChromaKeyColor] = useState('#00ff00');
  const [chromaKeySimilarity, setChromaKeySimilarity] = useState(0.1);
  const [chromaKeyBlend, setChromaKeyBlend] = useState(0.1);
  const [narrationVideoData, setNarrationVideoData] = useState({
    file: null,
    url: null,
    width: 0,
    height: 0,
    duration: 0,
  });
  const [videoPosition, setVideoPosition] = useState({ x: 0, y: 0 });
  const [videoScale, setVideoScale] = useState(1);


  const isCancelledRef = useRef(false);

  const ffmpegRef = useRef(null);
  const imageContainerRef = useRef(null);
  const progressIntervalRef = useRef(null);
  const startTimeRef = useRef(null);
  const iframeRef = useRef(null);

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.source === iframeRef.current.contentWindow && event.data.type === 'ffmpeg-loaded') {
        ffmpegRef.current = new FFmpeg();
        setFfmpegLoaded(true);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    const loadFfmpeg = async () => {
      if (ffmpegLoaded) {
        try {
          await ffmpegRef.current.load();
        } catch (err) {
          setError(`Não foi possível carregar o editor de vídeo: ${err.message}`);
          setSnackbarOpen(true);
          setCompatibilityMode(true);
        }
      }
    };
    loadFfmpeg();
  }, [ffmpegLoaded]);


  const transitionOptions = [
    { value: 'fade', label: 'Fade (Recomendado)' },
    { value: 'dissolve', label: 'Dissolve' },
    { value: 'slideleft', label: 'Deslizar Esquerda' },
    { value: 'slideright', label: 'Deslizar Direita' },
    { value: 'none', label: 'Nenhuma (Mais Rápido)' },
  ];

  useEffect(() => {
    const checkEnvironmentSupport = async () => {
      const checks = {
        webAssemblySupport: typeof WebAssembly !== 'undefined',
        sharedArrayBufferSupport: typeof SharedArrayBuffer !== 'undefined',
        crossOriginIsolated: window.crossOriginIsolated || false,
        adBlockerDetected: false,
        networkRestricted: false,
      };

      try {
        const testImg = new Image();
        testImg.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
        await new Promise((resolve, reject) => {
          testImg.onload = resolve;
          testImg.onerror = () => {
            checks.adBlockerDetected = true;
            resolve();
          };
          setTimeout(reject, 2000);
        });
      } catch (e) {
        checks.adBlockerDetected = true;
      }

      try {
        await fetch('https://cdn.jsdelivr.net/npm/react@18.0.0/package.json', {
          method: 'HEAD',
          mode: 'no-cors',
        });
      } catch (e) {
        checks.networkRestricted = true;
      }

      setEnvironmentChecks(checks);
    };

    checkEnvironmentSupport();
  }, []);

  useEffect(() => {
    console.log('BASE_URL:', import.meta.env.BASE_URL);
    console.log('FFmpeg Path:', `${window.location.origin}/ffmpeg/`);
  }, []);

  useEffect(() => {
    let interval;
    if (isPlaying && generatedImages.length > 0) {
      interval = setInterval(() => {
        setCurrentImageIndex((prevIndex) => (prevIndex + 1) % generatedImages.length);
      }, slideDuration * 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, slideDuration, generatedImages.length]);

  const handleGeneratePreview = () => {
    setCurrentImageIndex(0);
    setIsPlaying(!isPlaying);
  };

  const handleGenerateFinalVideo = async () => {
    if (!ffmpegLoaded && !compatibilityMode) {
      setError('Editor de vídeo ainda não está carregado. Aguarde ou recarregue a página.');
      setSnackbarOpen(true);
      return;
    }

    if (generatedImages.length === 0) {
      setError('Nenhuma imagem disponível para gerar o vídeo.');
      setSnackbarOpen(true);
      return;
    }

    setShowProgressModal(true);
    isCancelledRef.current = false;
    setVideos([]);
    setVideo(null);

    if (generationMode === 'narration') {
      await generateNarrationVideo();
    } else if (generatePerRecord) {
      await generateVideoPerRecord();
    } else {
      const totalVideoFrames = generatedImages.reduce((acc, _, i) => {
        const duration = (generatedAudioData && generatedAudioData[i]) ? generatedAudioData[i].duration : slideDuration;
        return acc + Math.floor(duration * fps);
      }, 0);
      setTotalFrames(totalVideoFrames);

      if (compatibilityMode || !ffmpegLoaded) {
        await generateVideoWithCompatibilityMode();
      } else {
        await generateVideoWithFFmpeg();
      }
    }
    setShowProgressModal(false);
  };

// Version with **optional fixed output resolution**
// -------------------------------------------------------------
// External vars expected in scope:
//   generatedImages      – array of { url }
//   slideDuration        – seconds each still stays on screen *before* fade
//   transition           – "none" | any xfade transition name (e.g. "fade")
//   transitionDuration   – seconds (optional, defaults to 1)
//   fps                  – frames per second
//   outputResolution     – "source" | "1080p" | "720p" | "480p" (defaults to "source")
//   ffmpegRef            – React ref to an already‑loaded FFmpeg.wasm instance
// -------------------------------------------------------------
const generateVideoWithFFmpeg = async () => {
  /* ------------------------------------------------------------------
   * 0. Defaults & helpers
   * ----------------------------------------------------------------*/
  const fadeSeconds = (typeof transition === "number" && transition > 0)
    ? transition
    : 1;

    const firstImage = new Image();
    firstImage.src = generatedImages[0].url;
    await firstImage.decode();

  const outW = firstImage.width;
  const outH = firstImage.height;

  /* ------------------------------------------------------------------
   *  UI helpers (unchanged)
   * ----------------------------------------------------------------*/
  setIsLoading(true);
  setError(null);
  setVideo(null);
  setProgress(0);
  setProcessingTime(0);
  setEstimatedTime(0);
  startTimeRef.current = Date.now();
  clearInterval(progressIntervalRef.current);
  progressIntervalRef.current = setInterval(() => {
    if (startTimeRef.current) {
      setProcessingTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }
  }, 1000);

  /* ------------------------------------------------------------------
   * 1.  FFmpeg WASM instance
   * ----------------------------------------------------------------*/
  const ffmpeg = ffmpegRef.current;
  try {
    await ffmpeg.deleteFile("output.mp4").catch(() => {});

    // 1.1 Load stills into FS
    for (let i = 0; i < generatedImages.length; i++) {
      if (isCancelledRef.current) {
        console.log('Video generation cancelled by user.');
        return;
      }
      const img = generatedImages[i];
      const fileData = await fetchFile(img.url);
      await ffmpeg.writeFile(`img${i}.png`, fileData);
      setProgress(i + 1);
    }

    // 1.2 Load audio into FS
    const hasAudio = generatedAudioData && generatedAudioData.length > 0;
    if (hasAudio) {
      await Promise.all(
        generatedAudioData.map(async (audio, i) => {
          if (audio.blob) {
            const audioData = await fetchFile(URL.createObjectURL(audio.blob));
            await ffmpeg.writeFile(`audio${i}.mp3`, audioData);
          }
        })
      );
    }

    /* ----------------------------------------------------------------
     * 2. Build dynamic FFmpeg CLI parts
     * --------------------------------------------------------------*/

    // 2.1 inputs
    const inputs = [];
    generatedImages.forEach((_, i) => {
      const duration = hasAudio && generatedAudioData[i] ? generatedAudioData[i].duration : slideDuration;
      inputs.push("-loop", "1", "-t", duration.toString(), "-i", `img${i}.png`);
    });
    if (hasAudio) {
        generatedAudioData.forEach((_, i) => {
            if (generatedAudioData[i].blob) {
                inputs.push("-i", `audio${i}.mp3`);
            }
        });
    }


    // 2.2 filter chains – colour + SAR (+ opcional scale/pad)
    const filterParts = generatedImages.map((_, i) => {
      const base = `[${i}:v]format=yuv420p,setsar=1,setpts=PTS-STARTPTS`;
      return `${base},scale=${outW}:${outH}:force_original_aspect_ratio=decrease,pad=${outW}:${outH}:(ow-iw)/2:(oh-ih)/2[v${i}]`;
    });

    // 2.3 concatenation vs. cross‑fades
    let filterComplex = "";
    let lastVideoLabel = "";
    let lastAudioLabel = "";
    let totalDuration = 0;

    if (transition === "none") {
      const videoConcat = generatedImages.map((_, i) => `[v${i}]`).join("");
      const audioConcat = hasAudio ? generatedAudioData.map((_, i) => `[${generatedImages.length + i}:a]`).join("") : "";
      const audioOutput = hasAudio ? ":a=1[outa]" : "";
      filterComplex = [
        ...filterParts,
        `${videoConcat}concat=n=${generatedImages.length}:v=1:a=0[outv]`,
        hasAudio ? `${audioConcat}concat=n=${generatedAudioData.length}:v=0${audioOutput}` : ""
      ].filter(Boolean).join(";");
      lastVideoLabel = "[outv]";
      if (hasAudio) lastAudioLabel = "[outa]";


      totalDuration = generatedImages.reduce((acc, _, i) => {
        const duration = hasAudio && generatedAudioData[i] ? generatedAudioData[i].duration : slideDuration;
        return acc + duration;
      }, 0);

    } else {
      const transitionFilters = [];
      let previous = "v0";
      let currentTime = 0;
      generatedImages.slice(1).forEach((_, idx) => {
        const next = `v${idx + 1}`;
        const label = `xf${idx}`;
        const duration = hasAudio && generatedAudioData[idx] ? generatedAudioData[idx].duration : slideDuration;
        currentTime += duration;
        const offset = currentTime;
        transitionFilters.push(
          `[${previous}][${next}]xfade=transition=${transition}:duration=${fadeSeconds}:offset=${offset}[${label}]`
        );
        previous = label;
      });
      filterComplex = [...filterParts, ...transitionFilters].join(";");
      lastVideoLabel = `[${previous}]`;
      const lastImageDuration = hasAudio && generatedAudioData[generatedImages.length - 1] ? generatedAudioData[generatedImages.length - 1].duration : slideDuration;
      totalDuration = currentTime + lastImageDuration;

      if (hasAudio) {
        const audioConcat = generatedAudioData.map((_, i) => `[${generatedImages.length + i}:a]`).join("");
        filterComplex += `;${audioConcat}concat=n=${generatedAudioData.length}:v=0:a=1[outa]`;
        lastAudioLabel = "[outa]";
      }
    }

    /* ----------------------------------------------------------------
     * 3. Execute FFmpeg
     * --------------------------------------------------------------*/
    const cmd = [
      "-y",
      ...inputs,
      "-filter_complex", filterComplex,
      "-map", lastVideoLabel,
    ];

    if (hasAudio && lastAudioLabel) {
        cmd.push("-map", lastAudioLabel);
        cmd.push("-c:a", "aac");
    }

    cmd.push(
      "-c:v", "libx264",
      "-r", fps.toString(),
      "-pix_fmt", "yuv420p",
      "-t", totalDuration.toString(),
      "-preset", "ultrafast",
      "output.mp4"
    );

    ffmpeg.on('progress', ({ time }) => {
      const framesProcessed = Math.round(time / 1000000 * fps);
      setProgress(framesProcessed);
    });

    console.log("⚙️ FFmpeg cmd:", cmd.join(" "));
    await ffmpeg.exec(cmd);

    /* ----------------------------------------------------------------
     * 4. Collect & expose output
     * --------------------------------------------------------------*/
    const data = await ffmpeg.readFile("output.mp4");
    const url = URL.createObjectURL(new Blob([data.buffer], { type: "video/mp4" }));
    setVideo(url);
  } catch (err) {
    console.error("Erro na geração do vídeo:", err);
    setError(`Erro na geração do vídeo: ${err.message}`);
    setSnackbarOpen(true);
  } finally {
    setIsLoading(false);
    setProgress(0);
    clearInterval(progressIntervalRef.current);
    startTimeRef.current = null;
    setShowProgressModal(false);
  }
};

const generateVideoPerRecord = async () => {
  setIsLoading(true);
  setError(null);
  setVideos([]);
  startTimeRef.current = Date.now();

  for (let i = 0; i < generatedImages.length; i++) {
    if (isCancelledRef.current) {
      console.log('Video generation cancelled by user.');
      break;
    }
    setTotalFrames(Math.floor((generatedAudioData[i]?.duration || slideDuration) * fps));
    const imageData = [generatedImages[i]];
    const audioData = generatedAudioData[i] ? [generatedAudioData[i]] : null;

    try {
      const videoBlob = await generateSingleVideo(imageData, audioData, i);
      const videoUrl = URL.createObjectURL(videoBlob);
      setVideos(prev => [...prev, { url: videoUrl, name: `video_${i + 1}.mp4` }]);
    } catch (err) {
      setError(`Erro ao gerar vídeo para o registro ${i + 1}: ${err.message}`);
      setSnackbarOpen(true);
      // Continue to the next video
    }
  }

  setIsLoading(false);
  clearInterval(progressIntervalRef.current);
  startTimeRef.current = null;
  setShowProgressModal(false);
};

const generateSingleVideo = async (imageData, audioData, index) => {
  const ffmpeg = ffmpegRef.current;
  const hasAudio = audioData && audioData.length > 0 && audioData[0].blob;
  const duration = hasAudio ? audioData[0].duration : slideDuration;
  const outputFilename = `output_${index}.mp4`;

  await ffmpeg.deleteFile(outputFilename).catch(() => {});

  const imgFile = `img_${index}.png`;
  const audioFile = `audio_${index}.mp3`;

  const fileData = await fetchFile(imageData[0].url);
  await ffmpeg.writeFile(imgFile, fileData);

  const inputs = ["-loop", "1", "-t", duration.toString(), "-i", imgFile];
  if (hasAudio) {
    const audioBlob = await fetchFile(URL.createObjectURL(audioData[0].blob));
    await ffmpeg.writeFile(audioFile, audioBlob);
    inputs.push("-i", audioFile);
  }

  const firstImage = new Image();
  firstImage.src = imageData[0].url;
  await firstImage.decode();
  const outW = firstImage.width;
  const outH = firstImage.height;

  const filterComplex = `[0:v]format=yuv420p,setsar=1,setpts=PTS-STARTPTS,scale=${outW}:${outH}:force_original_aspect_ratio=decrease,pad=${outW}:${outH}:(ow-iw)/2:(oh-ih)/2[v]`;

  const cmd = [
    "-y",
    ...inputs,
    "-filter_complex", filterComplex,
    "-map", "[v]",
  ];

  if (hasAudio) {
    cmd.push("-map", "1:a");
    cmd.push("-c:a", "aac");
  }

  cmd.push(
    "-c:v", "libx264",
    "-r", fps.toString(),
    "-pix_fmt", "yuv420p",
    "-t", duration.toString(),
    "-preset", "ultrafast",
    outputFilename
  );

  ffmpeg.on('progress', ({ time }) => {
    const framesProcessed = Math.round(time / 1000000 * fps);
    setProgress(framesProcessed);
  });

  console.log(`⚙️ FFmpeg cmd for video ${index}:`, cmd.join(" "));
  await ffmpeg.exec(cmd);

  const data = await ffmpeg.readFile(outputFilename);
  return new Blob([data.buffer], { type: "video/mp4" });
};

  const generateVideoWithCompatibilityMode = async () => {
    setIsLoading(true);
    setError(null);
    setVideo(null);
    setProgress(0);
    setProcessingTime(0);
    startTimeRef.current = Date.now();

    try {
      console.log('🔄 Usando modo de compatibilidade (Canvas + MediaRecorder)');

      if (typeof MediaRecorder === 'undefined') {
        throw new Error('MediaRecorder não está disponível neste navegador');
      }

      const firstImage = new Image();
      firstImage.src = generatedImages[0].url;
      await firstImage.decode();

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const width = firstImage.width;
      const height = firstImage.height;

      canvas.width = width;
      canvas.height = height;

      const stream = canvas.captureStream(fps);
      const recorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9'
      });
      const chunks = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const videoUrl = URL.createObjectURL(blob);
        setVideo(videoUrl);
      };

      recorder.start();

      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 5;
        });
      }, 200);

      for (let i = 0; i < generatedImages.length; i++) {
        const img = new Image();
        img.crossOrigin = 'anonymous';

        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = generatedImages[i].url;
        });

        const scale = Math.min(width / img.width, height / img.height);
        const scaledWidth = img.width * scale;
        const scaledHeight = img.height * scale;
        const x = (width - scaledWidth) / 2;
        const y = (height - scaledHeight) / 2;

        const frames = slideDuration * fps;
        for (let frame = 0; frame < frames; frame++) {
          ctx.fillStyle = '#000';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
          await new Promise(resolve => setTimeout(resolve, 1000 / fps));
        }
      }

      clearInterval(progressInterval);
      setProgress(100);
      recorder.stop();

    } catch (err) {
      console.error('Erro na geração alternativa do vídeo:', err);
      setError(`Modo de compatibilidade falhou: ${err.message}. Tente recarregar a página.`);
      setSnackbarOpen(true);
    } finally {
      setIsLoading(false);
      setProgress(0);
      clearInterval(progressIntervalRef.current);
      startTimeRef.current = null;
    setShowProgressModal(false);
    }
  };

  const generateNarrationVideo = async () => {
    setIsLoading(true);
    setError(null);
    setVideo(null);
    setProgress(0);
    setShowProgressModal(true);
    startTimeRef.current = Date.now();

    const ffmpeg = ffmpegRef.current;

    try {
      const bgImage = generatedImages[0];
      if (!bgImage) {
        setError("Por favor, gere ou selecione uma imagem de fundo primeiro.");
        setSnackbarOpen(true);
        setIsLoading(false);
        setShowProgressModal(false);
        return;
      }
      if (!narrationVideoData.file) {
        setError("Por favor, carregue um vídeo de narração.");
        setSnackbarOpen(true);
        setIsLoading(false);
        setShowProgressModal(false);
        return;
      }

      // Fetch files
      const bgImageData = await fetchFile(bgImage.url);
      const narrationVideoFileData = await fetchFile(narrationVideoData.url);

      await ffmpeg.writeFile('background.png', bgImageData);
      await ffmpeg.writeFile('narration.mp4', narrationVideoFileData);

      const firstImage = new Image();
      firstImage.src = bgImage.url;
      await firstImage.decode();
      const realBgWidth = firstImage.width;
      const realBgHeight = firstImage.height;

      const previewBgWidth = imageContainerRef.current.offsetWidth;
      const previewBgHeight = imageContainerRef.current.offsetHeight;

      // Proportional mapping
      const scaleFactorX = realBgWidth / previewBgWidth;
      const scaleFactorY = realBgHeight / previewBgHeight;

      const realX = videoPosition.x * scaleFactorX;
      const realY = videoPosition.y * scaleFactorY;
      const realWidth = (narrationVideoData.width * videoScale) * scaleFactorX;
      const realHeight = (narrationVideoData.height * videoScale) * scaleFactorY;

      const colorHex = `0x${chromaKeyColor.replace('#', '')}`;

      const filterComplex = `[1:v]chromakey=${colorHex}:${chromaKeySimilarity}:${chromaKeyBlend},scale=${realWidth}:${realHeight}[vid];[0:v][vid]overlay=${realX}:${realY}:shortest=1`;

      const cmd = [
        '-i', 'background.png',
        '-i', 'narration.mp4',
        '-filter_complex', filterComplex,
        '-c:v', 'libx264',
        '-t', `${narrationVideoData.duration}`,
        'output.mp4'
      ];

      console.log("⚙️ FFmpeg cmd:", cmd.join(" "));

      ffmpeg.on('progress', ({ time }) => {
        const percentage = (time / (narrationVideoData.duration * 1000000)) * 100;
        setProgress(Math.min(100, Math.round(percentage)));
      });

      await ffmpeg.exec(cmd);

      const data = await ffmpeg.readFile('output.mp4');
      const url = URL.createObjectURL(new Blob([data.buffer], { type: 'video/mp4' }));
      setVideo(url);

    } catch (err) {
      console.error("Erro na geração do vídeo de narração:", err);
      setError(`Erro na geração do vídeo: ${err.message}`);
      setSnackbarOpen(true);
    } finally {
      setIsLoading(false);
      setShowProgressModal(false);
      clearInterval(progressIntervalRef.current);
      startTimeRef.current = null;
    }
  };

  const handleExport = async () => {
    if (video) {
      try {
        const data = await ffmpegRef.current.readFile('output.mp4');
        const blob = new Blob([data.buffer], { type: 'video/mp4' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `video-${Date.now()}.mp4`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Error exporting video:', error);
        setError('Erro ao exportar o vídeo. Tente gerar o vídeo novamente.');
        setSnackbarOpen(true);
      }
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  const handleReload = () => {
    window.location.reload();
  };

  const handleCancel = () => {
    isCancelledRef.current = true;
  };

  const handleDownloadAll = async () => {
    const zip = new JSZip();
    for (const video of videos) {
      const response = await fetch(video.url);
      const blob = await response.blob();
      zip.file(video.name, blob);
    }
    zip.generateAsync({ type: 'blob' }).then((content) => {
      saveAs(content, 'videos.zip');
    });
  };

  const handleNarrationVideoUpload = (event) => {
    const file = event.target.files[0];
    if (file && (file.type === 'video/mp4' || file.type === 'video/webm' || file.type === 'video/quicktime')) {
      const videoUrl = URL.createObjectURL(file);
      const videoElement = document.createElement('video');
      videoElement.src = videoUrl;
      videoElement.onloadedmetadata = () => {
        const bgWidth = imageContainerRef.current.offsetWidth;
        const bgHeight = imageContainerRef.current.offsetHeight;
        const scaleX = bgWidth / videoElement.videoWidth;
        const scaleY = bgHeight / videoElement.videoHeight;
        const scale = Math.min(scaleX, scaleY, 1); // Ensure it doesn't scale up initially

        setNarrationVideoData({
          file: file,
          url: videoUrl,
          width: videoElement.videoWidth,
          height: videoElement.videoHeight,
          duration: videoElement.duration,
        });
        setVideoScale(scale);
        // Center the video initially
        const scaledWidth = videoElement.videoWidth * scale;
        const scaledHeight = videoElement.videoHeight * scale;
        setVideoPosition({
          x: (bgWidth - scaledWidth) / 2,
          y: (bgHeight - scaledHeight) / 2,
        });
      };
    } else {
      setError('Formato de vídeo inválido. Use .mp4, .mov ou .webm');
      setSnackbarOpen(true);
    }
  };

  const formatTime = (seconds) => {
    if (seconds < 60) return `${seconds} segundos`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds} min`;
  };

  const LoadingStatus = () => {
    if (ffmpegLoaded) return null;

    return (
      <Box sx={{ my: 2, textAlign: 'center' }}>
        {!error ? (
          <>
            <CircularProgress sx={{ color: 'white', mb: 1 }} />
            <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.8)' }}>
              Carregando motor de vídeo...
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
              {compatibilityMode ? 'Preparando modo de compatibilidade...' : 'Primeira vez pode levar até 30 segundos'}
            </Typography>
          </>
        ) : (
          <Alert
            severity="error"
            sx={{
              mb: 2,
              backgroundColor: 'rgba(244,67,54,0.2)',
              color: 'white',
              '& .MuiAlert-icon': { color: 'white' }
            }}
          >
            <Typography variant="body2" sx={{ mb: 1 }}>
              {error}
            </Typography>

            <Button
              size="small"
              onClick={() => setShowTroubleshooting(!showTroubleshooting)}
              sx={{ color: 'white', textDecoration: 'underline' }}
            >
              {showTroubleshooting ? 'Ocultar' : 'Ver'} soluções
            </Button>

            {showTroubleshooting && (
              <Box sx={{ mt: 2, textAlign: 'left' }}>
                <Typography variant="caption" sx={{ display: 'block', mb: 1 }}>
                  💡 Possíveis soluções:
                </Typography>
                <Typography variant="caption" sx={{ display: 'block' }}>
                  • Verifique sua conexão com a internet
                </Typography>
                <Typography variant="caption" sx={{ display: 'block' }}>
                  • Desative temporariamente bloqueadores de anúncios
                </Typography>
                <Typography variant="caption" sx={{ display: 'block' }}>
                  • Tente em modo de navegação anônima
                </Typography>
                <Typography variant="caption" sx={{ display: 'block' }}>
                  • Use Chrome ou Firefox (versões recentes)
                </Typography>
                <Typography variant="caption" sx={{ display: 'block' }}>
                  • Recarregue a página (Ctrl+F5)
                </Typography>

                <Button
                  size="small"
                  onClick={handleReload}
                  startIcon={<Refresh />}
                  sx={{ mt: 1, color: 'white', border: '1px solid white' }}
                >
                  Recarregar Página
                </Button>
              </Box>
            )}
          </Alert>
        )}
      </Box>
    );
  };

  return (
    <Box sx={{ mt: 3 }}>
      <ProgressModal
        open={showProgressModal}
        progress={generationMode === 'narration' ? progress : (progress / totalFrames) * 100}
        total={100}
        onCancel={handleCancel}
        title="Gerando Vídeo"
        progressText={
          generationMode === 'narration'
            ? `Processando... ${Math.round(progress)}%`
            : `Progresso: ${progress} de ${totalFrames} frames processados.`
        }
      />
      <iframe
        ref={iframeRef}
        src="/ffmpeg-loader.html"
        style={{ display: 'none' }}
        title="FFmpeg Loader"
      />
      <Card sx={{
        background: 'linear-gradient(135deg, #1e3c72, #2a5298)',
        color: 'white',
        borderRadius: 2,
        boxShadow: '0 8px 16px rgba(0,0,0,0.2)'
      }}>
        <CardContent>
          <Typography variant="h5" gutterBottom sx={{
            display: 'flex',
            alignItems: 'center',
            fontWeight: 'bold',
            color: 'white'
          }}>
            <Movie sx={{ mr: 1, fontSize: 32 }} />
            Gerador de Vídeo
            {compatibilityMode && (
              <Tooltip title="Modo de compatibilidade ativo - funcionalidade limitada mas funcional">
                <Info sx={{ ml: 1, fontSize: 20, color: 'orange' }} />
              </Tooltip>
            )}
          </Typography>

          <LoadingStatus />

          {compatibilityMode && (
            <Alert
              severity="info"
              sx={{
                mb: 2,
                backgroundColor: 'rgba(25,118,210,0.2)',
                color: 'white',
                '& .MuiAlert-icon': { color: 'white' }
              }}
            >
              Modo de compatibilidade ativo. O vídeo será gerado em formato WebM com funcionalidade limitada.
            </Alert>
          )}

          {environmentChecks && (
            <Paper elevation={0} sx={{
              p: 2,
              mb: 3,
              backgroundColor: 'rgba(255,255,255,0.1)',
              borderRadius: 2
            }}>
              <Typography variant="h6" sx={{ mb: 1, color: 'white' }}>
                Status do Sistema
              </Typography>
              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: environmentChecks.webAssemblySupport ? 'lightgreen' : 'lightcoral' }}>
                    WebAssembly: {environmentChecks.webAssemblySupport ? '✅' : '❌'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: environmentChecks.sharedArrayBufferSupport ? 'lightgreen' : 'orange' }}>
                    SharedArrayBuffer: {environmentChecks.sharedArrayBufferSupport ? '✅' : '⚠️'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: environmentChecks.crossOriginIsolated ? 'lightgreen' : 'orange' }}>
                    Cross-Origin Isolated: {environmentChecks.crossOriginIsolated ? '✅' : '⚠️'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: environmentChecks.adBlockerDetected ? 'orange' : 'lightgreen' }}>
                    Bloqueador: {environmentChecks.adBlockerDetected ? '⚠️ Detectado' : '✅ Não detectado'}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          )}

          <Paper elevation={0} sx={{
            p: 2,
            mb: 3,
            backgroundColor: 'rgba(255,255,255,0.1)',
            borderRadius: 2
          }}>
            <Typography variant="h6" sx={{ mb: 1, color: 'white' }}>
                Modo de Geração
            </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={generationMode === 'narration'}
                    onChange={(e) => setGenerationMode(e.target.checked ? 'narration' : 'slides')}
                    color="primary"
                  />
                }
                label={generationMode === 'narration' ? "Narração com Vídeo" : "Apresentação de Slides"}
              />

              {generationMode === 'slides' && (
                <Paper elevation={0} sx={{ p: 2, mt: 2, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 1 }}>
                  <Typography variant="h6" sx={{ mb: 1, color: 'white' }}>
                    Configurações dos Slides
                    <Tooltip title="Configurações para o modo de apresentação de slides">
                      <Info sx={{ ml: 1, fontSize: 18, verticalAlign: 'middle' }} />
                    </Tooltip>
                  </Typography>
                  <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Duração por Slide (segundos)"
                        type="number"
                        value={slideDuration}
                        onChange={(e) => setSlideDuration(Math.max(1, Math.min(45, Number(e.target.value))))}
                        fullWidth
                        InputProps={{ style: { color: 'white' } }}
                        InputLabelProps={{ style: { color: 'rgba(255,255,255,0.7)' } }}
                        variant="outlined"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Quadros por Segundo (FPS)"
                        type="number"
                        value={fps}
                        onChange={(e) => setFps(Math.max(10, Math.min(60, Number(e.target.value))))}
                        fullWidth
                        InputProps={{ style: { color: 'white' } }}
                        InputLabelProps={{ style: { color: 'rgba(255,255,255,0.7)' } }}
                        variant="outlined"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>Transição</InputLabel>
                        <Select
                          value={transition}
                          onChange={(e) => setTransition(e.target.value)}
                          sx={{ color: 'white' }}
                          disabled={compatibilityMode}
                        >
                          {transitionOptions.map(option => (
                            <MenuItem key={option.value} value={option.value}>
                              {option.label} {compatibilityMode && option.value !== 'none' ? '(Indisponível)' : ''}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={generatePerRecord}
                            onChange={(e) => setGeneratePerRecord(e.target.checked)}
                            sx={{ color: 'white' }}
                          />
                        }
                        label="Gerar um vídeo por registro"
                        sx={{ color: 'white' }}
                      />
                    </Grid>
                  </Grid>
                </Paper>
              )}

              {generationMode === 'narration' && (
                <Paper elevation={0} sx={{ p: 2, mt: 2, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 1 }}>
                  <Typography variant="h6" sx={{ mb: 2, color: 'white' }}>
                    Configurações da Narração
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Button
                        variant="outlined"
                        component="label"
                        fullWidth
                        startIcon={<UploadFile />}
                        sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)' }}
                      >
                        Carregar Vídeo de Narração
                        <input
                          type="file"
                          hidden
                          accept=".mp4,.mov,.webm"
                          onChange={handleNarrationVideoUpload}
                        />
                      </Button>
                      {narrationVideoData.file && (
                        <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
                          Arquivo: {narrationVideoData.file.name}
                        </Typography>
                      )}
                    </Grid>
                    <Grid item xs={12}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={!!narrationVideoData.file} // Enable chroma if video is uploaded
                            onChange={() => { /* Logic to toggle chroma key */ }}
                            color="secondary"
                          />
                        }
                        label="Ativar Chroma Key"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Typography gutterBottom>Zoom (Escala)</Typography>
                      <Slider
                        value={videoScale}
                        onChange={(e, newValue) => setVideoScale(newValue)}
                        aria-labelledby="scale-slider"
                        valueLabelDisplay="auto"
                        step={0.05}
                        min={0.1}
                        max={2}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Typography gutterBottom>Chroma Key (Remoção de Fundo)</Typography>
                      <TextField
                        label="Cor do Fundo"
                        type="color"
                        value={chromaKeyColor}
                        onChange={(e) => setChromaKeyColor(e.target.value)}
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        sx={{ mb: 2 }}
                      />
                      <Typography gutterBottom>Tolerância ({chromaKeySimilarity})</Typography>
                      <Slider
                        value={chromaKeySimilarity}
                        onChange={(e, newValue) => setChromaKeySimilarity(newValue)}
                        aria-labelledby="similarity-slider"
                        valueLabelDisplay="auto"
                        step={0.01}
                        min={0.01}
                        max={0.4}
                      />
                      <Typography gutterBottom>Suavização da Borda ({chromaKeyBlend})</Typography>
                      <Slider
                        value={chromaKeyBlend}
                        onChange={(e, newValue) => setChromaKeyBlend(newValue)}
                        aria-labelledby="blend-slider"
                        valueLabelDisplay="auto"
                        step={0.01}
                        min={0}
                        max={0.5}
                      />
                    </Grid>
                  </Grid>
                </Paper>
              )}
            </Paper>

            <Paper elevation={0} sx={{
              p: 2,
              mb: 3,
              backgroundColor: 'rgba(255,255,255,0.1)',
              borderRadius: 2
            }}>
              <Typography variant="h6" sx={{ mb: 1, color: 'white' }}>
                Pré-visualização
              </Typography>

              <Box
                ref={imageContainerRef}
                sx={{
                  width: '100%',
                  aspectRatio: '16/9',
                  backgroundColor: 'rgba(0,0,0,0.3)',
                  position: 'relative',
                  borderRadius: 2,
                  overflow: 'hidden',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}
              >
                {generatedImages.length > 0 ? (
                  <img
                    src={generatedImages[0].url}
                    alt="Background"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                    }}
                  />
                ) : (
                  <Box sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100%',
                    color: 'rgba(255,255,255,0.5)'
                  }}>
                    <Typography>Nenhuma imagem de fundo disponível</Typography>
                  </Box>
                )}
              </Box>
            </Paper>
          </Paper>

          <Paper elevation={0} sx={{
            p: 2,
            mb: 3,
            backgroundColor: 'rgba(255,255,255,0.1)',
            borderRadius: 2
          }}>
            <Typography variant="h6" sx={{ mb: 1, color: 'white' }}>
              Pré-visualização
            </Typography>

            <Box
              ref={imageContainerRef}
              sx={{
                width: '100%',
                aspectRatio: '16/9',
                backgroundColor: 'rgba(0,0,0,0.3)',
                position: 'relative',
                borderRadius: 2,
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.1)'
              }}
            >
              {generatedImages.length > 0 && generationMode === 'slides' ? (
                <img
                  src={generatedImages[currentImageIndex].url}
                  alt={`Frame ${currentImageIndex + 1}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    transition: 'opacity 0.5s ease-in-out',
                  }}
                />
              ) : generatedImages.length > 0 && generationMode === 'narration' ? (
                 <img
                    src={generatedImages[0].url}
                    alt="Background"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                    }}
                  />
              ) : (
                <Box sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: '100%',
                  color: 'rgba(255,255,255,0.5)'
                }}>
                  <Typography>Nenhuma imagem disponível</Typography>
                </Box>
              )}
              {generationMode === 'narration' && narrationVideoData.url && (
                <Draggable
                  position={videoPosition}
                  onStop={(e, data) => setVideoPosition({ x: data.x, y: data.y })}
                  bounds="parent"
                >
                  <video
                    src={narrationVideoData.url}
                    autoPlay
                    loop
                    muted
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: `${narrationVideoData.width * videoScale}px`,
                      height: `${narrationVideoData.height * videoScale}px`,
                      cursor: 'move',
                      border: '2px dashed #fff',
                    }}
                  />
                </Draggable>
              )}
            </Box>
          </Paper>

          {isLoading && (
            <Box sx={{ mt: 2, backgroundColor: 'rgba(0,0,0,0.2)', p: 2, borderRadius: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  type="number"
                  value={slideDuration}
                  onChange={(e) => setSlideDuration(Math.max(1, Math.min(45, Number(e.target.value))))}
                  fullWidth
                  InputProps={{
                    style: { color: 'white' }
                  }}
                  InputLabelProps={{
                    style: { color: 'rgba(255,255,255,0.7)' }
                  }}
                  variant="outlined"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Quadros por Segundo (FPS)"
                  type="number"
                  value={fps}
                  onChange={(e) => setFps(Math.max(10, Math.min(60, Number(e.target.value))))}
                  fullWidth
                  InputProps={{
                    style: { color: 'white' }
                  }}
                  InputLabelProps={{
                    style: { color: 'rgba(255,255,255,0.7)' }
                  }}
                  variant="outlined"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>Transição</InputLabel>
                  <Select
                    value={transition}
                    onChange={(e) => setTransition(e.target.value)}
                    sx={{ color: 'white' }}
                    disabled={compatibilityMode}
                  >
                    {transitionOptions.map(option => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label} {compatibilityMode && option.value !== 'none' ? '(Indisponível)' : ''}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={generatePerRecord}
                      onChange={(e) => setGeneratePerRecord(e.target.checked)}
                      sx={{ color: 'white' }}
                    />
                  }
                  label="Gerar um vídeo por registro"
                  sx={{ color: 'white' }}
                />
              </Grid>
            </Grid>
          </Paper>

          <Paper elevation={0} sx={{
            p: 2,
            mb: 3,
            backgroundColor: 'rgba(255,255,255,0.1)',
            borderRadius: 2
          }}>
            <Typography variant="h6" sx={{ mb: 1, color: 'white' }}>
              Pré-visualização
            </Typography>

            <Box
              ref={imageContainerRef}
              sx={{
                width: '100%',
                aspectRatio: '16/9',
                backgroundColor: 'rgba(0,0,0,0.3)',
                position: 'relative',
                borderRadius: 2,
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.1)'
              }}
            >
              {generatedImages.length > 0 ? (
                <img
                  src={generatedImages[currentImageIndex].url}
                  alt={`Frame ${currentImageIndex + 1}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    transition: 'opacity 0.5s ease-in-out',
                  }}
                />
              ) : (
                <Box sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: '100%',
                  color: 'rgba(255,255,255,0.5)'
                }}>
                  <Typography>Nenhuma imagem disponível</Typography>
                </Box>
              )}
            </Box>
          </Paper>

          {isLoading && (
            <Box sx={{ mt: 2, backgroundColor: 'rgba(0,0,0,0.2)', p: 2, borderRadius: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" sx={{ color: 'white' }}>
                  Gerando vídeo... {progress}%
                </Typography>
                <Typography variant="body2" sx={{ color: 'white' }}>
                  {estimatedTime > 0 ? `Tempo estimado: ${formatTime(estimatedTime)}` : 'Calculando...'}
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={progress}
                sx={{ height: 10, borderRadius: 5 }}
              />
              <Typography variant="caption" sx={{ display: 'block', mt: 1, textAlign: 'center', color: 'rgba(255,255,255,0.7)' }}>
                Processando há {processingTime} segundos
                {compatibilityMode && ' (Modo de compatibilidade)'}
              </Typography>
            </Box>
          )}

          {video && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" sx={{ mb: 1, color: 'white' }}>
                Vídeo Final {compatibilityMode && '(WebM)'}
              </Typography>
              <video
                src={video}
                controls
                style={{
                  width: '100%',
                  borderRadius: 8,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  backgroundColor: '#000'
                }}
              />
            </Box>
          )}

          {videos.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" sx={{ mb: 1, color: 'white' }}>
                Vídeos Gerados
              </Typography>
              {videos.map((v, index) => (
                <Paper
                  key={index}
                  elevation={2}
                  sx={{
                    p: 2,
                    mb: 2,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: 'rgba(255,255,255,0.15)',
                    borderRadius: 2,
                  }}
                >
                  <Typography sx={{ color: 'white' }}>{v.name}</Typography>
                  <Button
                    variant="contained"
                    color="secondary"
                    startIcon={<Download />}
                    onClick={() => {
                      const a = document.createElement('a');
                      a.href = v.url;
                      a.download = v.name;
                      a.click();
                    }}
                  >
                    Baixar
                  </Button>
                </Paper>
              ))}
            </Box>
          )}

          <Box sx={{ mt: 3, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <Button
              variant="contained"
              onClick={handleGeneratePreview}
              disabled={isLoading || generatedImages.length === 0}
              startIcon={<PlayArrow />}
              sx={{
                flex: 1,
                minWidth: 200,
                background: 'linear-gradient(45deg, #00c853, #64dd17)',
                fontWeight: 'bold'
              }}
            >
              {isPlaying ? 'Parar Preview' : 'Iniciar Preview'}
            </Button>

            <Button
              variant="contained"
              color="primary"
              onClick={handleGenerateFinalVideo}
              disabled={isLoading || generatedImages.length === 0}
              startIcon={<Movie />}
              sx={{
                flex: 1,
                minWidth: 200,
                background: compatibilityMode ?
                  'linear-gradient(45deg, #ff9800, #ffc107)' :
                  'linear-gradient(45deg, #2962ff, #2979ff)',
                fontWeight: 'bold'
              }}
            >
              {compatibilityMode ? 'Gerar Vídeo (Compatibilidade)' : 'Gerar Vídeo Final'}
            </Button>

            <Button
              variant="contained"
              onClick={handleExport}
              disabled={!video || isLoading}
              startIcon={<GetApp />}
              sx={{
                flex: 1,
                minWidth: 200,
                background: 'linear-gradient(45deg, #ff6d00, #ff9100)',
                fontWeight: 'bold'
              }}
            >
              Exportar Vídeo
            </Button>

            {videos.length > 0 && (
                <Button
                  variant="contained"
                  onClick={handleDownloadAll}
                  disabled={isLoading}
                  startIcon={<Download />}
                  sx={{
                    flex: 1,
                    minWidth: 200,
                    background: 'linear-gradient(45deg, #4caf50, #81c784)',
                    fontWeight: 'bold'
                  }}
                >
                  Baixar Todos
                </Button>
            )}
          </Box>
        </CardContent>
      </Card>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity="error"
          onClose={handleCloseSnackbar}
          icon={<ErrorOutline />}
          sx={{ width: '100%' }}
        >
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default VideoGenerator;

