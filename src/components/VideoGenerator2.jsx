import React, { useState, useRef, useEffect } from 'react';
import {
  Box, Button, Typography, Card, CardContent, Grid,
  Alert,
  Paper,
  Snackbar, CircularProgress, Tooltip, FormControlLabel,
  Switch, Slider, Select, MenuItem, FormControl, InputLabel,
  IconButton
} from '@mui/material';
import { Movie, GetApp, Info, ErrorOutline, Refresh, Download, Palette, Delete } from '@mui/icons-material';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import ProgressModal from './ProgressModal';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

import { getPlayableBlob, deleteBlob } from '../utils/fileUtils';
import { useCampaign } from '../context/CampaignContext';
import NarrationSettings from './VideoGenerator/NarrationSettings';
import Preview from './VideoGenerator/Preview';
import SlidesSettings from './VideoGenerator/SlidesSettings';
import EditableTypography from './EditableTypography';
import { toast } from 'sonner';

const VideoGenerator2 = ({ generatedPages: generatedImages, csvData }) => {
  const { campaignState, setCampaignState, pendingAssets, addPendingAsset, removePendingAsset } = useCampaign();
  const { generatedVideos = [] } = campaignState;
  const [video, setVideo] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [slideDuration, setSlideDuration] = useState(3);
  const [slideDelay, setSlideDelay] = useState(1);
  const [transitionSound, setTransitionSound] = useState('delay'); // 'delay' or audio file path
  const [transitionSoundDuration, setTransitionSoundDuration] = useState(0);
  const [finalSlideDelay, setFinalSlideDelay] = useState(0);
  const [fps, setFps] = useState(24);
  const [transition, setTransition] = useState('fade');
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

  const handleRenameVideo = (id, newName) => {
    const updatedVideos = generatedVideos.map(video =>
      (video.id === id || video.url === id) ? { ...video, name: newName } : video
    );
    setCampaignState({ generatedVideos: updatedVideos });
  };

  const handleDeleteVideo = async (id) => {
    const videoToDelete = generatedVideos.find(video => video.id === id || video.url === id);
    if (!videoToDelete) return;

    if (!window.confirm(`Tem certeza que deseja excluir o vídeo "${videoToDelete.name}"? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      // First, delete from blob storage if the URL is a vercel blob url
      if (videoToDelete.vercelBlobUrl && videoToDelete.vercelBlobUrl.includes('blob.vercel-storage.com')) {
        await deleteBlob(videoToDelete.vercelBlobUrl);
      }

      // Clean up local blob URLs from context
      if (videoToDelete.url && videoToDelete.url.startsWith('blob:')) {
        removePendingAsset(videoToDelete.url);
      }
      if (videoToDelete.thumbnailUrl && videoToDelete.thumbnailUrl.startsWith('blob:')) {
        removePendingAsset(videoToDelete.thumbnailUrl);
      }

      // Then, remove from the local state
      const updatedVideos = generatedVideos.filter(video => video.id !== id && video.url !== id);
      setCampaignState({ generatedVideos: updatedVideos });

      toast.success(`Vídeo "${videoToDelete.name}" excluído com sucesso.`);

    } catch (error) {
      console.error('Falha ao excluir o vídeo:', error);
      toast.error(`Falha ao excluir o vídeo: ${error.message}`);
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
    if (transitionSound !== 'delay') {
      const audio = new Audio(transitionSound);
      audio.addEventListener('loadedmetadata', () => {
        setTransitionSoundDuration(audio.duration);
      });
    }
  }, [transitionSound]);

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
    const colorHex = chromaKeyColor.startsWith('#') ? chromaKeyColor.substring(1) : chromaKeyColor;
    const colorForFilter = `0x${colorHex}`;

    let filter;

    // Choose between the more powerful 'chromakey' (YUV) and 'colorkey' (RGB)
    if (chromaKeyColorspace === 'yuv' || chromaKeyYuv) {
      filter = `chromakey=color=${colorForFilter}:similarity=${chromaKeySimilarity}:blend=${chromaKeyBlend}`;
      if (chromaKeyYuv) filter += ':yuv=1';
    } else {
      filter = `colorkey=color=${colorForFilter}:similarity=${chromaKeySimilarity}:blend=${chromaKeyBlend}`;
    }

    // Add spill suppression using the 'despill' filter
    if (chromaKeySpillSuppress > 0) {
      // Determine spill color automatically from the key color
      const r = parseInt(colorHex.substring(0, 2), 16);
      const g = parseInt(colorHex.substring(2, 4), 16);
      const b = parseInt(colorHex.substring(4, 6), 16);
      const spillType = g > r && g > b ? 'green' : b > r && b > g ? 'blue' : 'green'; // Default to green

      filter += `,despill=type=${spillType}:mix=${chromaKeySpillSuppress}:expand=0`;
    }

    // Add edge smoothing using a blur filter
    if (chromaKeyEdgeSmoothing > 0) {
      // Using a simple boxblur for softening edges
      const blurStrength = chromaKeyEdgeSmoothing.toFixed(2);
      filter += `,boxblur=${blurStrength}:${blurStrength}`;
    }

    return filter;
  };

  const generateThumbnail = async (ffmpegInstance, videoBlob) => {
    if (!ffmpegInstance || !ffmpegInstance.loaded) {
      console.warn('FFmpeg instance not provided or not loaded, skipping thumbnail generation.');
      return null;
    }

    const ffmpeg = ffmpegInstance;
    const inputFilename = `thumb-input-${Date.now()}.mp4`;
    const outputFilename = `thumb-output-${Date.now()}.jpg`;

    try {
      await ffmpeg.writeFile(inputFilename, await fetchFile(videoBlob));

      // Extract the first frame of the video
      const cmd = [
        '-i', inputFilename,
        '-ss', '00:00:00.1', // Seek to 0.1s to avoid potential black frames at the start
        '-vframes', '1',
        '-q:v', '2', // Quality level for JPG (2-5 is good)
        '-f', 'image2',
        outputFilename,
      ];

      console.log("⚙️ FFmpeg thumbnail cmd:", cmd.join(" "));
      await ffmpeg.exec(cmd);

      const data = await ffmpeg.readFile(outputFilename);
      const thumbnailBlob = new Blob([data.buffer], { type: 'image/jpeg' });

      // Cleanup files
      await ffmpeg.deleteFile(inputFilename);
      await ffmpeg.deleteFile(outputFilename);

      return thumbnailBlob;
    } catch (err) {
      console.error('Error generating thumbnail:', err);
      // Cleanup in case of error
      await ffmpeg.deleteFile(inputFilename).catch(() => {});
      await ffmpeg.deleteFile(outputFilename).catch(() => {});
      return null;
    }
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

    isCancelledRef.current = false;
    setVideo(null);
    setProgress(0);

    if (generationMode === 'narration') {
      await generateNarrationVideo();
    } else if (generatePerRecord) {
      await generateVideoPerRecord();
    } else {
      await generateVideoWithFFmpeg();
    }
  };

  const generateVideoWithFFmpeg = async () => {
    const totalVideoFrames = generatedImages.reduce((acc, _, i) => {
      const record = csvData[i];
      const duration = (record && record.audioDuration) ? record.audioDuration : slideDuration;
      return acc + Math.floor(duration * fps);
    }, 0);

    if (totalVideoFrames <= 0) {
      setError("A duração total do vídeo é zero ou inválida. Verifique a duração dos seus áudios ou a configuração de duração dos slides.");
      setSnackbarOpen(true);
      return;
    }

    setTotalFrames(totalVideoFrames);
    setIsLoading(true);
    setError(null);
    setVideo(null);
    setProgress(0);
    setShowProgressModal(true);
    startTimeRef.current = Date.now();
    clearInterval(progressIntervalRef.current);

    const fadeSeconds = (typeof transition === "number" && transition > 0)
      ? transition
      : 1;

    const firstImage = new Image();
    firstImage.src = generatedImages[0].url;
    await firstImage.decode();

    const outW = firstImage.width;
    const outH = firstImage.height;

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

      const hasAudio = csvData && csvData.length > 0 && csvData.some(rec => rec.audioUrl);
      if (hasAudio) {
        for (const [i, record] of csvData.entries()) {
          const audioBlob = getPlayableBlob({ url: record.audioUrl, source: record.audioSource }, pendingAssets);
          if (audioBlob) {
            const tempUrl = URL.createObjectURL(audioBlob);
            try {
              const audioSource = await fetchFile(tempUrl);
              await ffmpeg.writeFile(`audio${i}.mp3`, audioSource);
            } finally {
              URL.revokeObjectURL(tempUrl);
            }
          } else {
            console.warn(`Could not find a playable blob for audio slide ${i}. It will be silent.`);
          }
        }
      }

      const inputs = [];
      const effectiveSlideDelay = transition !== 'none'
        ? (transitionSound === 'delay' ? slideDelay : transitionSoundDuration)
        : 0;

      generatedImages.forEach((_, i) => {
        const record = csvData[i];
        let duration = (hasAudio && record && record.audioDuration ? record.audioDuration : slideDuration) + effectiveSlideDelay;
        if (i === generatedImages.length - 1) {
          duration += finalSlideDelay;
        }
        inputs.push("-loop", "1", "-t", duration.toString(), "-i", `img${i}.png`);
      });

      if (hasAudio) {
        if (effectiveSlideDelay > 0) {
          if (transitionSound === 'delay') {
            inputs.push("-f", "lavfi", "-t", effectiveSlideDelay.toString(), "-i", "anullsrc=channel_layout=stereo:sample_rate=44100");
          } else {
            const transitionAudioData = await fetchFile(transitionSound);
            await ffmpeg.writeFile("transition.mp3", transitionAudioData);
            inputs.push("-i", "transition.mp3");
          }
        }
        csvData.forEach((record, i) => {
          if (getPlayableBlob({ url: record.audioUrl, source: record.audioSource }, pendingAssets)) {
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

      // --- Video Filter Chain ---
      const transitionFilters = [];
      let previousVideo = "v0";
      let videoTime = 0;
      generatedImages.slice(1).forEach((_, idx) => {
        const record = csvData[idx];
        const nextVideo = `v${idx + 1}`;
        const label = `xf${idx}`;
        const duration = (hasAudio && record && record.audioDuration ? record.audioDuration : slideDuration) + effectiveSlideDelay;
        const offset = videoTime + duration - fadeSeconds;

        transitionFilters.push(`[${previousVideo}][${nextVideo}]xfade=transition=${transition}:duration=${fadeSeconds}:offset=${offset}[${label}]`);
        previousVideo = label;
        videoTime += duration - fadeSeconds;
      });

      const lastRecord = csvData[generatedImages.length - 1];
      const lastImageDuration = (hasAudio && lastRecord && lastRecord.audioDuration ? lastRecord.audioDuration : slideDuration) + effectiveSlideDelay + finalSlideDelay;
      totalDuration = videoTime + lastImageDuration;
      lastVideoLabel = `[${previousVideo}]`;

      // --- Audio Filter Chain ---
      if (hasAudio) {
        const audioPreProcessingFilters = [];
        const slideAudioStreams = [];
        const transitionAudioInputIndex = generatedImages.length;
        let firstNarrationInputIndex = transitionAudioInputIndex;
        if (effectiveSlideDelay > 0 && transitionSound !== 'delay') {
            firstNarrationInputIndex++;
        }

        let narrationBlobCounter = 0;

        for (let i = 0; i < generatedImages.length; i++) {
          const record = csvData[i];
          const hasNarration = !!getPlayableBlob({ url: record.audioUrl, source: record.audioSource }, pendingAssets);
          const isLastSlide = i === generatedImages.length - 1;

          let slideContentAudio;
          
          if (hasNarration) {
            slideContentAudio = `[${firstNarrationInputIndex + narrationBlobCounter}:a]`;
            narrationBlobCounter++;
          } else {
            const silenceLabel = `silence${i}`;
            audioPreProcessingFilters.push(`anullsrc=channel_layout=stereo:sample_rate=44100:d=${slideDuration}[${silenceLabel}]`);
            slideContentAudio = `[${silenceLabel}]`;
          }

          if (!isLastSlide && effectiveSlideDelay > 0) {
            let transitionAudio;
            if (transitionSound === 'delay') {
                const delayLabel = `delay${i}`;
                audioPreProcessingFilters.push(`anullsrc=channel_layout=stereo:sample_rate=44100:d=${slideDelay}[${delayLabel}]`);
                transitionAudio = `[${delayLabel}]`;
            } else {
                transitionAudio = `[${transitionAudioInputIndex}:a]`;
            }
            const combinedLabel = `ca${i}`;
            audioPreProcessingFilters.push(`${slideContentAudio}${transitionAudio}concat=n=2:v=0:a=1[${combinedLabel}]`);
            slideAudioStreams.push(`[${combinedLabel}]`);
          } else {
            slideAudioStreams.push(slideContentAudio);
          }
        }
        
        if (slideAudioStreams.length > 0) {
          let audioChain = slideAudioStreams[0];
          const acrossfadeFilters = [];
          if (slideAudioStreams.length > 1) {
              for (let i = 1; i < slideAudioStreams.length; i++) {
                  const nextAudio = slideAudioStreams[i];
                  const outLabel = `aout${i-1}`;
                  acrossfadeFilters.push(`${audioChain}${nextAudio}acrossfade=d=${fadeSeconds}[${outLabel}]`);
                  audioChain = `[${outLabel}]`;
              }
          }
          
          if (finalSlideDelay > 0) {
            const finalSilenceLabel = 'final_silence';
            const finalAudioOut = 'final_audio';
            const finalSilenceFilter = `anullsrc=d=${finalSlideDelay}:r=44100:cl=stereo[${finalSilenceLabel}]`;
            const concatFilter = `${audioChain}[${finalSilenceLabel}]concat=n=2:v=0:a=1[${finalAudioOut}]`;
            
            audioPreProcessingFilters.push(finalSilenceFilter);
            acrossfadeFilters.push(concatFilter);
            audioChain = `[${finalAudioOut}]`;
          }
          
          lastAudioLabel = audioChain;
          const allAudioFilters = [...audioPreProcessingFilters, ...acrossfadeFilters];
          filterComplex = [...filterParts, ...transitionFilters, ...allAudioFilters].join(";");
        } else {
          filterComplex = [...filterParts, ...transitionFilters].join(";");
        }

      } else {
        filterComplex = [...filterParts, ...transitionFilters].join(";");
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

      ffmpeg.on('progress', ({ time, frame }) => {
        const framesProcessed = frame || Math.round((time || 0) / 1000000 * fps) || 0;
        setProgress(Math.max(0, framesProcessed));
      });

      console.log("⚙️ FFmpeg cmd:", cmd.join(" "));
      await ffmpeg.exec(cmd);

      const data = await ffmpeg.readFile("output.mp4");
      const blob = new Blob([data.buffer], { type: 'video/mp4' });
      const url = addPendingAsset(blob);
      if (!url) {
        throw new Error('Failed to create a managed URL for the generated video.');
      }
      setVideo(url);

      // --- Thumbnail Generation ---
      const thumbnailBlob = await generateThumbnail(ffmpeg, blob);
      const thumbnailUrl = thumbnailBlob ? addPendingAsset(thumbnailBlob) : null;
      // --------------------------

      const videoAsset = {
        id: crypto.randomUUID(),
        type: 'video',
        url: url,
        // blob property is removed, context handles it
        name: `video-${Date.now()}.mp4`,
        vercelBlobId: null,
        vercelBlobUrl: url, // This will be replaced by the real one on save
        mimeType: blob.type,
        size: blob.size,
        linkedinVideoUrn: null,
        thumbnailUrl: thumbnailUrl,
        // thumbnailBlob property is removed
      };

      setCampaignState(prev => ({
        generatedVideos: [...(prev.generatedVideos || []), videoAsset]
      }));
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
    setVideo(null);
    startTimeRef.current = Date.now();

    const totalDurationAllVideos = generatedImages.reduce((acc, _, i) => {
      const record = csvData[i];
      const duration = record && record.audioDuration ? record.audioDuration : slideDuration;
      return acc + duration;
    }, 0);

    const totalFramesAllVideos = Math.floor(totalDurationAllVideos * fps);
    if (totalFramesAllVideos <= 0) {
      setError("A duração total para os vídeos é zero. Verifique os dados de áudio ou a duração do slide.");
      setSnackbarOpen(true);
      setIsLoading(false);
      return;
    }

    setTotalFrames(totalFramesAllVideos);
    setProgress(0);
    setShowProgressModal(true);

    const allGeneratedVideoAssets = [];
    try {
      let framesCompletedSoFar = 0;
      for (let i = 0; i < generatedImages.length; i++) {
        if (isCancelledRef.current) {
          console.log('Video generation cancelled by user.');
          break;
        }

        const imageData = [generatedImages[i]];
        const record = csvData[i];
        const audioData = (record && record.audioUrl) ? [{ url: record.audioUrl, source: record.audioSource, duration: record.audioDuration }] : null;
        const framesForThisVideo = Math.floor((record?.audioDuration || slideDuration) * fps);

        const handleSubProgress = ({ time, frame }) => {
          const framesProcessed = frame || Math.round((time || 0) / 1000000 * fps) || 0;
          const currentTotalProgress = framesCompletedSoFar + framesProcessed;
          setProgress(Math.min(totalFramesAllVideos, currentTotalProgress));
        };

        const ffmpeg = new FFmpeg();
        try {
          await ffmpeg.load();
          const videoBlob = await generateSingleVideo(ffmpeg, imageData, audioData, i, pendingAssets, handleSubProgress);
          const thumbnailBlob = await generateThumbnail(ffmpeg, videoBlob);

          framesCompletedSoFar += framesForThisVideo;
          // This line was causing the progress to "jump". The handleSubProgress is now solely responsible for updates.
          // setProgress(framesCompletedSoFar); // This line is now removed to allow for smooth progress.

          const videoUrl = addPendingAsset(videoBlob);
          const thumbnailUrl = thumbnailBlob ? addPendingAsset(thumbnailBlob) : null;

          const videoAsset = {
            id: crypto.randomUUID(),
            type: 'video',
            url: videoUrl,
            name: `video_${i + 1}.mp4`,
            vercelBlobId: null,
            vercelBlobUrl: videoUrl,
            mimeType: videoBlob.type,
            size: videoBlob.size,
            linkedinVideoUrn: null,
            thumbnailUrl: thumbnailUrl,
          };

          allGeneratedVideoAssets.push(videoAsset);

        } catch (err) {
          setError(`Erro ao gerar vídeo para o registro ${i + 1}: ${err.message || 'Erro desconhecido'}`);
          setSnackbarOpen(true);
          break;
        } finally {
          if (ffmpeg.loaded) {
            await ffmpeg.terminate();
          }
        }
      }
      if (allGeneratedVideoAssets.length > 0) {
        setCampaignState(prev => ({
          generatedVideos: [...(prev.generatedVideos || []), ...allGeneratedVideoAssets]
        }));
      }
    } finally {
      setIsLoading(false);
      clearInterval(progressIntervalRef.current);
      startTimeRef.current = null;
      setShowProgressModal(false);
    }
  };

  const generateSingleVideo = async (ffmpeg, imageData, audioData, index, pendingAssets, onProgress) => {
    const audioObject = audioData && audioData.length > 0 ? audioData[0] : null;
    const audioBlob = getPlayableBlob(audioObject, pendingAssets);
    const hasAudio = !!audioBlob;
    const outputFilename = `output_${index}.mp4`;

    await ffmpeg.deleteFile(outputFilename).catch(() => {});

    const imgFile = `img_${index}.png`;
    const audioFile = `audio_${index}.mp3`;

    const fileData = await fetchFile(imageData[0].url);
    await ffmpeg.writeFile(imgFile, fileData);

    const inputs = ["-loop", "1", "-i", imgFile];
    if (hasAudio) {
      const tempUrl = URL.createObjectURL(audioBlob);
      try {
        const audioSource = await fetchFile(tempUrl);
        await ffmpeg.writeFile(audioFile, audioSource);
        inputs.push("-i", audioFile);
      } finally {
        URL.revokeObjectURL(tempUrl);
      }
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
      cmd.push("-shortest");
    } else {
      cmd.push("-t", slideDuration.toString());
    }

    cmd.push(
      "-c:v", "libx264",
      "-r", fps.toString(),
      "-pix_fmt", "yuv420p",
      "-preset", "ultrafast",
      outputFilename
    );

    if (onProgress) {
      ffmpeg.on('progress', onProgress);
    }

    console.log(`⚙️ FFmpeg cmd for video ${index}:`, cmd.join(" "));
    await ffmpeg.exec(cmd);

    const data = await ffmpeg.readFile(outputFilename);

    // Cleanup
    ffmpeg.on('progress', () => {}); // Detach listener
    await ffmpeg.deleteFile(imgFile);
    if (hasAudio) {
      await ffmpeg.deleteFile(audioFile);
    }
    // Don't delete the output file yet, it's needed to create the blob
    // await ffmpeg.deleteFile(outputFilename);

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
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const videoUrl = addPendingAsset(blob);
        setVideo(videoUrl);
        const videoData = {
          id: crypto.randomUUID(),
          type: 'video',
          url: videoUrl,
          name: `video-compat-${Date.now()}.webm`,
          mimeType: blob.type,
          size: blob.size,
        };
        setCampaignState(prev => ({
          generatedVideos: [...(prev.generatedVideos || []), videoData]
        }));
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
      const blob = new Blob([data.buffer], { type: 'video/mp4' });
      const url = addPendingAsset(blob);
      if (!url) {
        throw new Error('Failed to create a managed URL for the narrated video.');
      }
      setVideo(url);

      const thumbnailBlob = await generateThumbnail(ffmpeg, blob);
      const thumbnailUrl = thumbnailBlob ? addPendingAsset(thumbnailBlob) : null;

      const videoAsset = {
        id: crypto.randomUUID(),
        type: 'video',
        url: url,
        name: `video-narrado-${Date.now()}.mp4`,
        vercelBlobId: null,
        vercelBlobUrl: url,
        mimeType: blob.type,
        size: blob.size,
        linkedinVideoUrn: null,
        thumbnailUrl: thumbnailUrl,
      };
      setCampaignState(prev => ({
        generatedVideos: [...(prev.generatedVideos || []), videoAsset]
      }));

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
      // 'video' is a blob URL. We need the actual blob from pendingAssets.
      const blob = pendingAssets[video] || (await fetch(video).then(r => r.blob()));
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `video-${Date.now()}.mp4`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        setError('Não foi possível encontrar os dados do vídeo para exportar.');
        setSnackbarOpen(true);
      }
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  const handleVideoError = (e) => {
    const error = e.target.error;
    let errorMessage = 'Ocorreu um erro desconhecido no player de vídeo.';
    if (error) {
        switch (error.code) {
            case error.MEDIA_ERR_ABORTED:
                errorMessage = 'A reprodução do vídeo foi abortada.';
                break;
            case error.MEDIA_ERR_NETWORK:
                errorMessage = 'Ocorreu um erro de rede ao carregar o vídeo.';
                break;
            case error.MEDIA_ERR_DECODE:
                errorMessage = 'Ocorreu um erro ao decodificar o vídeo. O arquivo pode estar corrompido.';
                break;
            case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
                errorMessage = 'O formato do vídeo não é suportado por este navegador.';
                break;
            default:
                errorMessage = `Erro no player de vídeo: ${error.message} (Código: ${error.code})`;
                break;
        }
    }
    console.error('Video Player Error:', errorMessage, e);
    setError(errorMessage);
    setSnackbarOpen(true);
  };

  const handleReload = () => {
    window.location.reload();
  };

  const handleCancel = () => {
    isCancelledRef.current = true;
  };

  const handleNarrationVideoUpload = (event) => {
    const file = event.target.files[0];
    if (file && (file.type === 'video/mp4' || file.type === 'video/webm' || file.type === 'video/quicktime')) {
      const videoUrl = addPendingAsset(file);
      if (!videoUrl) {
        setError('Não foi possível criar uma URL local para o vídeo de narração.');
        setSnackbarOpen(true);
        return;
      }
      const videoElement = document.createElement('video');
      videoElement.src = videoUrl;
      videoElement.onloadedmetadata = () => {
        setNarrationVideoData({
          file: file, // Keep file for potential re-use if needed, though blob in context is primary
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
        progress={
          generatePerRecord
            ? (progress / (totalFrames || 1)) * 100
            : generationMode === 'narration'
              ? Math.min(100, Math.max(0, progress || 0))
              : totalFrames > 0
                ? Math.min(100, Math.max(0, ((progress || 0) / totalFrames) * 100))
                : 0
        }
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

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
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
                    slideDelay={slideDelay}
                    setSlideDelay={setSlideDelay}
                    finalSlideDelay={finalSlideDelay}
                    setFinalSlideDelay={setFinalSlideDelay}
                    fps={fps}
                    setFps={setFps}
                    transition={transition}
                    setTransition={setTransition}
                    transitionOptions={transitionOptions}
                    compatibilityMode={compatibilityMode}
                    generatePerRecord={generatePerRecord}
                    setGeneratePerRecord={setGeneratePerRecord}
                    transitionSound={transitionSound}
                    setTransitionSound={setTransitionSound}
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
            </Grid>
            <Grid item xs={12} md={6}>
              <Preview
                imageContainerRef={imageContainerRef}
                bgImageDimsRef={bgImageDimsRef}
                generatedImages={generatedImages}
                generationMode={generationMode}
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
                onVideoError={handleVideoError}
              />
            </Grid>
          </Grid>
          
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
                  onError={handleVideoError}
                  onStalled={handleVideoError}
                  onSuspend={handleVideoError}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                  }}
                />
              </Box>
            </Box>
          )}

          {generatedVideos.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" sx={{ mb: 1, color: 'text.primary' }}>
                Vídeos Gerados
              </Typography>
              {generatedVideos.filter(Boolean).map((video) => (
                <Card key={video.id || video.url} sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                  {video.thumbnailUrl && (
                    <Box sx={{ width: 150, height: 84, flexShrink: 0 }}>
                      <img
                        src={video.thumbnailUrl}
                        alt={`Thumbnail for ${video.name}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </Box>
                  )}
                  <CardContent sx={{ flexGrow: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <EditableTypography
                        initialValue={video.name}
                        onSave={(newName) => handleRenameVideo(video.id || video.url, newName)}
                      />
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {video.size ? `${(video.size / 1024 / 1024).toFixed(2)} MB` : 'Tamanho desconhecido'}
                      </Typography>
                    </Box>
                    <Box>
                      <Button
                        variant="contained"
                        color="secondary"
                        startIcon={<Download />}
                        onClick={() => {
                          const a = document.createElement('a');
                          a.href = video.url || video.vercelBlobUrl;
                          a.download = video.name;
                          a.click();
                        }}
                      >
                        Baixar
                      </Button>
                      <IconButton
                        aria-label="delete"
                        onClick={() => handleDeleteVideo(video.id || video.url)}
                        sx={{ ml: 1 }}
                      >
                        <Delete />
                      </IconButton>
                    </Box>
                  </CardContent>
                </Card>
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
