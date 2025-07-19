import React, { useState, useRef, useEffect } from 'react';
import {
  Box, Button, Typography, Card, CardContent, Grid,
  Alert,
  Paper,
  Snackbar, CircularProgress, Tooltip, FormControlLabel,
  Switch, Slider, Select, MenuItem, FormControl, InputLabel
} from '@mui/material';
import { Movie, PlayArrow, GetApp, Info, ErrorOutline, Refresh, Download, Palette } from '@mui/icons-material';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import ProgressModal from './ProgressModal';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

import NarrationSettings from './VideoGenerator/NarrationSettings';
import Preview from './VideoGenerator/Preview';
import SlidesSettings from './VideoGenerator/SlidesSettings';

const VideoGenerator2 = ({ generatedImages, generatedAudioData }) => {
  const [video, setVideo] = useState(null);
  const [videos, setVideos] = useState([]);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [slideDuration, setSlideDuration] = useState(3);
  const [fps, setFps] = useState(24);
  const [transition, setTransition] = useState('fade');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [ffmpegLoaded, setFfmpegLoaded] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);
  const [environmentChecks, setEnvironmentChecks] = useState(null);
  const [compatibilityMode, setCompatibilityMode] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [totalFrames, setTotalFrames] = useState(0);
  const [generatePerRecord, setGeneratePerRecord] = useState(false);
  const [generationMode, setGenerationMode] = useState('slides'); // 'slides' or 'narration'
  
  // Parâmetros de chromakey expandidos
  const [useChromaKey, setUseChromaKey] = useState(false);
  const [chromaKeyColor, setChromaKeyColor] = useState('#00ff00');
  const [chromaKeySimilarity, setChromaKeySimilarity] = useState(0.1);
  const [chromaKeyBlend, setChromaKeyBlend] = useState(0.1);
  const [chromaKeyYuv, setChromaKeyYuv] = useState(false);
  const [chromaKeySpillSuppress, setChromaKeySpillSuppress] = useState(0.0);
  const [chromaKeyEdgeSmoothing, setChromaKeyEdgeSmoothing] = useState(0.0);
  const [chromaKeyColorspace, setChromaKeyColorspace] = useState('rgb');
  const [chromaKeyPreset, setChromaKeyPreset] = useState('custom');
  
  const [narrationVideoData, setNarrationVideoData] = useState({
    file: null,
    url: null,
    width: 0,
    height: 0,
    duration: 0,
  });
  const [normalizedVideoPosition, setNormalizedVideoPosition] = useState({ x: 0, y: 0 });
  const [videoScale, setVideoScale] = useState(1);
  const [displayedImageSize, setDisplayedImageSize] = useState({ width: 0, height: 0 });

  const isCancelledRef = useRef(false);

  const ffmpegRef = useRef(null);
  const imageContainerRef = useRef(null);
  const bgImageDimsRef = useRef(null);
  const progressIntervalRef = useRef(null);
  const startTimeRef = useRef(null);
  const iframeRef = useRef(null);

  // Presets de chromakey
  const chromaKeyPresets = {
    custom: {
      name: 'Personalizado',
      similarity: 0.1,
      blend: 0.1,
      spillSuppress: 0.0,
      edgeSmoothing: 0.0,
      yuv: false
    },
    greenScreen: {
      name: 'Green Screen Padrão',
      similarity: 0.3,
      blend: 0.2,
      spillSuppress: 0.1,
      edgeSmoothing: 0.05,
      yuv: false
    },
    blueScreen: {
      name: 'Blue Screen',
      similarity: 0.25,
      blend: 0.15,
      spillSuppress: 0.08,
      edgeSmoothing: 0.03,
      yuv: false
    },
    highQuality: {
      name: 'Alta Qualidade',
      similarity: 0.15,
      blend: 0.05,
      spillSuppress: 0.15,
      edgeSmoothing: 0.1,
      yuv: true
    },
    fastProcessing: {
      name: 'Processamento Rápido',
      similarity: 0.4,
      blend: 0.3,
      spillSuppress: 0.0,
      edgeSmoothing: 0.0,
      yuv: false
    }
  };

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
    const calculateSize = () => {
      const container = imageContainerRef.current;
      if (container && generatedImages.length > 0 && generatedImages[0].url) {
        const containerWidth = container.offsetWidth;
        const containerHeight = container.offsetHeight;
        const containerAspectRatio = containerWidth / containerHeight;

        const image = new Image();
        image.src = generatedImages[0].url;
        image.onload = () => {
          const imageAspectRatio = image.width / image.height;

          let newWidth, newHeight;

          if (imageAspectRatio > containerAspectRatio) {
            newWidth = containerWidth;
            newHeight = containerWidth / imageAspectRatio;
          } else {
            newHeight = containerHeight;
            newWidth = containerHeight * imageAspectRatio;
          }

          setDisplayedImageSize({ width: newWidth, height: newHeight });
        };
      }
    };

    calculateSize();
    const currentImageContainer = imageContainerRef.current;

    const resizeObserver = new ResizeObserver(calculateSize);
    if (currentImageContainer) {
      resizeObserver.observe(currentImageContainer);
    }

    return () => {
      if (currentImageContainer) {
        resizeObserver.unobserve(currentImageContainer);
      }
    };
  }, [generatedImages]);

  // Função para aplicar preset de chromakey
  const applyChromaKeyPreset = (presetName) => {
    const preset = chromaKeyPresets[presetName];
    if (preset) {
      setChromaKeyPreset(presetName);
      setChromaKeySimilarity(preset.similarity);
      setChromaKeyBlend(preset.blend);
      setChromaKeySpillSuppress(preset.spillSuppress);
      setChromaKeyEdgeSmoothing(preset.edgeSmoothing);
      setChromaKeyYuv(preset.yuv);
    }
  };

  // Função para gerar comando FFmpeg com chromakey aprimorado
  const generateChromaKeyFilter = () => {
    const colorHex = `0x${chromaKeyColor.replace('#', '')}`;
    
    let filter = '';
    
    if (chromaKeyColorspace === 'yuv' || chromaKeyYuv) {
      // Usar filtro chromakey (YUV)
      filter = `chromakey=${colorHex}:${chromaKeySimilarity}:${chromaKeyBlend}`;
      
      if (chromaKeyYuv) {
        filter += ':yuv=1';
      }
    } else {
      // Usar filtro colorkey (RGB)
      filter = `colorkey=${colorHex}:${chromaKeySimilarity}:${chromaKeyBlend}`;
    }
    
    // Adicionar supressão de spill se configurado
    if (chromaKeySpillSuppress > 0) {
      filter += `,despill=type=green:mix=${chromaKeySpillSuppress}:expand=0`;
    }
    
    // Adicionar suavização de bordas se configurado
    if (chromaKeyEdgeSmoothing > 0) {
      filter += `,boxblur=${chromaKeyEdgeSmoothing}:${chromaKeyEdgeSmoothing}`;
    }
    
    return filter;
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

  const generateVideoWithFFmpeg = async () => {
    const fadeSeconds = (typeof transition === "number" && transition > 0)
      ? transition
      : 1;

    const firstImage = new Image();
    firstImage.src = generatedImages[0].url;
    await firstImage.decode();

    const outW = firstImage.width;
    const outH = firstImage.height;

    setIsLoading(true);
    setError(null);
    setVideo(null);
    setProgress(0);
    startTimeRef.current = Date.now();
    clearInterval(progressIntervalRef.current);

    const ffmpeg = ffmpegRef.current;
    try {
      await ffmpeg.deleteFile("output.mp4").catch(() => { });

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

      const filterParts = generatedImages.map((_, i) => {
        const base = `[${i}:v]format=yuv420p,setsar=1,setpts=PTS-STARTPTS`;
        return `${base},scale=${outW}:${outH}:force_original_aspect_ratio=decrease,pad=${outW}:${outH}:(ow-iw)/2:(oh-ih)/2[v${i}]`;
      });

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

    await ffmpeg.deleteFile(outputFilename).catch(() => { });

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

      const bgImageData = await fetchFile(bgImage.url);
      const narrationVideoFileData = await fetchFile(narrationVideoData.url);

      await ffmpeg.writeFile('background.png', bgImageData);
      await ffmpeg.writeFile('narration.mp4', narrationVideoFileData);

      const firstImage = new Image();
      firstImage.src = bgImage.url;
      await firstImage.decode();
      const realBgWidth = firstImage.width;
      const realBgHeight = firstImage.height;

      const videoAspectRatio = narrationVideoData.width / narrationVideoData.height;
      let realWidth = realBgWidth * videoScale;
      let realHeight = realWidth / videoAspectRatio;

      if (realHeight > realBgHeight * videoScale) {
        realHeight = realBgHeight * videoScale;
        realWidth = realHeight * videoAspectRatio;
      }

      const realX = normalizedVideoPosition.x * realBgWidth;
      const realY = normalizedVideoPosition.y * realBgHeight;

      let filterComplex = `[1:v]scale=${realWidth}:${realHeight}[vid];[0:v][vid]overlay=x=${realX}:y=${realY}`;

      if (useChromaKey) {
        const chromaKeyFilter = generateChromaKeyFilter();
        filterComplex = `[1:v]${chromaKeyFilter},scale=${realWidth}:${realHeight}[vid];[0:v][vid]overlay=x=${realX}:y=${realY}`;
      }

      const cmd = [
        '-i', 'background.png',
        '-i', 'narration.mp4',
        '-filter_complex', filterComplex,
        '-c:v', 'libx264',
        '-c:a', 'aac',
        '-map', '0:v',
        '-map', '1:a',
        '-t', `${narrationVideoData.duration}`,
        '-aspect', `${realBgWidth}:${realBgHeight}`,
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
        setNarrationVideoData({
          file: file,
          url: videoUrl,
          width: videoElement.videoWidth,
          height: videoElement.videoHeight,
          duration: videoElement.duration,
        });
        setVideoScale(0.5); // Default scale to 50%
        setNormalizedVideoPosition({ x: 0.5, y: 0.5 }); // Default position to center
      };
    } else {
      setError('Formato de vídeo inválido. Use .mp4, .mov ou .webm');
      setSnackbarOpen(true);
    }
  };

  const LoadingStatus = () => {
    if (ffmpegLoaded) return null;

    return (
      <Box sx={{ my: 2, textAlign: 'center' }}>
        {!error ? (
          <>
            <CircularProgress sx={{ color: 'primary.main', mb: 1 }} />
            <Typography variant="body1" sx={{ color: 'text.secondary' }}>
              Carregando motor de vídeo...
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {compatibilityMode ? 'Preparando modo de compatibilidade...' : 'Primeira vez pode levar até 30 segundos'}
            </Typography>
          </>
        ) : (
          <Alert
            severity="error"
            sx={{ mb: 2 }}
          >
            <Typography variant="body2" sx={{ mb: 1 }}>
              {error}
            </Typography>

            <Button
              size="small"
              onClick={() => setShowTroubleshooting(!showTroubleshooting)}
              sx={{ textDecoration: 'underline' }}
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
                  sx={{ mt: 1 }}
                  variant="outlined"
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
      <Card sx={{ borderRadius: 3 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom sx={{
            display: 'flex',
            alignItems: 'center',
            fontWeight: 'bold',
            color: 'text.primary'
          }}>
            <Movie sx={{ mr: 1, fontSize: 32 }} />
            Gerador de Vídeo
            {compatibilityMode && (
              <Tooltip title="Modo de compatibilidade ativo - funcionalidade limitada mas funcional">
                <Info sx={{ ml: 1, fontSize: 20, color: 'warning.main' }} />
              </Tooltip>
            )}
          </Typography>

          <LoadingStatus />

          {compatibilityMode && (
            <Alert
              severity="info"
              sx={{ mb: 2 }}
            >
              Modo de compatibilidade ativo. O vídeo será gerado em formato WebM com funcionalidade limitada.
            </Alert>
          )}

          {environmentChecks && (
            <Paper elevation={0} sx={{
              p: 2,
              mb: 3,
              backgroundColor: 'background.default',
              borderRadius: 2,
              border: 1,
              borderColor: 'divider'
            }}>
              <Typography variant="h6" sx={{ mb: 1, color: 'text.primary' }}>
                Status do Sistema
              </Typography>
              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: environmentChecks.webAssemblySupport ? 'success.main' : 'error.main' }}>
                    WebAssembly: {environmentChecks.webAssemblySupport ? '✅' : '❌'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: environmentChecks.sharedArrayBufferSupport ? 'success.main' : 'warning.main' }}>
                    SharedArrayBuffer: {environmentChecks.sharedArrayBufferSupport ? '✅' : '⚠️'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: environmentChecks.crossOriginIsolated ? 'success.main' : 'warning.main' }}>
                    Cross-Origin Isolated: {environmentChecks.crossOriginIsolated ? '✅' : '⚠️'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: environmentChecks.adBlockerDetected ? 'warning.main' : 'success.main' }}>
                    Bloqueador: {environmentChecks.adBlockerDetected ? '⚠️ Detectado' : '✅ Não detectado'}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          )}

          <Paper elevation={0} sx={{
            p: 2,
            mb: 3,
            backgroundColor: 'background.default',
            borderRadius: 2,
            border: 1,
            borderColor: 'divider'
          }}>
            <Typography variant="h6" sx={{ mb: 1, color: 'text.primary' }}>
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
              <SlidesSettings
                slideDuration={slideDuration}
                setSlideDuration={setSlideDuration}
                fps={fps}
                setFps={setFps}
                transition={transition}
                setTransition={setTransition}
                transitionOptions={transitionOptions}
                compatibilityMode={compatibilityMode}
                generatePerRecord={generatePerRecord}
                setGeneratePerRecord={setGeneratePerRecord}
              />
            )}

            {generationMode === 'narration' && (
              <>
                <NarrationSettings
                  narrationVideoData={narrationVideoData}
                  handleNarrationVideoUpload={handleNarrationVideoUpload}
                  videoScale={videoScale}
                  setVideoScale={setVideoScale}
                  useChromaKey={useChromaKey}
                  setUseChromaKey={setUseChromaKey}
                  chromaKeyColor={chromaKeyColor}
                  setChromaKeyColor={setChromaKeyColor}
                  chromaKeySimilarity={chromaKeySimilarity}
                  setChromaKeySimilarity={setChromaKeySimilarity}
                  chromaKeyBlend={chromaKeyBlend}
                  setChromaKeyBlend={setChromaKeyBlend}
                />

                {/* Configurações Avançadas de Chromakey */}
                {useChromaKey && (
                  <Paper elevation={0} sx={{
                    p: 2,
                    mt: 2,
                    backgroundColor: 'background.paper',
                    borderRadius: 2,
                    border: 1,
                    borderColor: 'divider'
                  }}>
                    <Typography variant="h6" sx={{ mb: 2, color: 'text.primary', display: 'flex', alignItems: 'center' }}>
                      <Palette sx={{ mr: 1 }} />
                      Configurações Avançadas de Chromakey
                    </Typography>

                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <FormControl fullWidth sx={{ mb: 2 }}>
                          <InputLabel>Preset</InputLabel>
                          <Select
                            value={chromaKeyPreset}
                            onChange={(e) => applyChromaKeyPreset(e.target.value)}
                            label="Preset"
                          >
                            {Object.entries(chromaKeyPresets).map(([key, preset]) => (
                              <MenuItem key={key} value={key}>{preset.name}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <FormControl fullWidth sx={{ mb: 2 }}>
                          <InputLabel>Espaço de Cor</InputLabel>
                          <Select
                            value={chromaKeyColorspace}
                            onChange={(e) => setChromaKeyColorspace(e.target.value)}
                            label="Espaço de Cor"
                          >
                            <MenuItem value="rgb">RGB (Colorkey)</MenuItem>
                            <MenuItem value="yuv">YUV (Chromakey)</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" sx={{ color: 'text.primary', mb: 1 }}>
                          Supressão de Spill: {chromaKeySpillSuppress.toFixed(2)}
                        </Typography>
                        <Slider
                          value={chromaKeySpillSuppress}
                          onChange={(e, value) => setChromaKeySpillSuppress(value)}
                          min={0}
                          max={1}
                          step={0.01}
                          color="primary"
                        />
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" sx={{ color: 'text.primary', mb: 1 }}>
                          Suavização de Bordas: {chromaKeyEdgeSmoothing.toFixed(2)}
                        </Typography>
                        <Slider
                          value={chromaKeyEdgeSmoothing}
                          onChange={(e, value) => setChromaKeyEdgeSmoothing(value)}
                          min={0}
                          max={0.5}
                          step={0.01}
                          color="primary"
                        />
                      </Grid>

                      <Grid item xs={12}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={chromaKeyYuv}
                              onChange={(e) => setChromaKeyYuv(e.target.checked)}
                              color="primary"
                            />
                          }
                          label="Forçar modo YUV"
                        />
                      </Grid>
                    </Grid>
                  </Paper>
                )}
              </>
            )}
          </Paper>

          <Preview
            imageContainerRef={imageContainerRef}
            bgImageDimsRef={bgImageDimsRef}
            generatedImages={generatedImages}
            generationMode={generationMode}
            currentImageIndex={currentImageIndex}
            narrationVideoData={narrationVideoData}
            normalizedVideoPosition={normalizedVideoPosition}
            setNormalizedVideoPosition={setNormalizedVideoPosition}
            videoScale={videoScale}
            useChromaKey={useChromaKey}
            chromaKeyColor={chromaKeyColor}
            chromaKeySimilarity={chromaKeySimilarity}
            chromaKeyBlend={chromaKeyBlend}
            chromaKeySpillSuppress={chromaKeySpillSuppress}
            chromaKeyEdgeSmoothing={chromaKeyEdgeSmoothing}
            chromaKeyYuv={chromaKeyYuv}
            chromaKeyColorspace={chromaKeyColorspace}
            displayedImageSize={displayedImageSize}
          />
          
          {video && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" sx={{ mb: 1, color: 'text.primary' }}>
                Vídeo Final {compatibilityMode && '(WebM)'}
              </Typography>
              <Box
                sx={{
                  width: '100%',
                  aspectRatio: '16/9',
                  backgroundColor: 'background.default',
                  position: 'relative',
                  borderRadius: 2,
                  overflow: 'hidden',
                  border: 1,
                  borderColor: 'divider',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  maxHeight: '500px',
                }}
              >
                <video
                  src={video}
                  autoPlay
                  loop
                  controls
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                  }}
                />
              </Box>
            </Box>
          )}

          {videos.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" sx={{ mb: 1, color: 'text.primary' }}>
                Vídeos Gerados
              </Typography>
              {videos.map((v, index) => (
                <Paper
                  key={index}
                  elevation={1}
                  sx={{
                    p: 2,
                    mb: 2,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: 'background.paper',
                    borderRadius: 2,
                    border: 1,
                    borderColor: 'divider'
                  }}
                >
                  <Typography sx={{ color: 'text.primary' }}>{v.name}</Typography>
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
              color="primary"
              onClick={handleGenerateFinalVideo}
              disabled={isLoading || generatedImages.length === 0}
              startIcon={<Movie />}
              sx={{
                flex: 1,
                minWidth: 200,
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
                fontWeight: 'bold'
              }}
              color="warning"
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
                  fontWeight: 'bold'
                }}
                color="success"
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

export default VideoGenerator2;

