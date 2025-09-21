import React, { createContext, useContext, useState, useMemo } from 'react';
import { createNewImageElement } from '../utils/elementFactory.js';

const defaultPageTemplate = {
    backgroundColor: '#FFFFFF',
    gradient: null,
    images: [],
};

export const CampaignContext = createContext(null);

export const useCampaign = () => {
  const context = useContext(CampaignContext);
  if (!context) {
    throw new Error('useCampaign must be used within a CampaignProvider');
  }
  return context;
};

export const CampaignProvider = ({ children }) => {
  // Estado da Campanha
  const [csvData, setCsvData] = useState([]);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [fieldPositions, setFieldPositions] = useState({});
  const [fieldStyles, setFieldStyles] = useState({});
  const [brandElements, setBrandElements] = useState([]);
  const [pageTemplate, setPageTemplate] = useState(defaultPageTemplate);
  const [selectedField, setSelectedField] = useState(null);
  const [currentCampaign, setCurrentCampaign] = useState(null);
  const [generatedPagesData, setGeneratedPagesData] = useState([]);
  const [generatedVideos, setGeneratedVideos] = useState([]);
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [pendingAssets, setPendingAssets] = useState({});
  const [colors, setColors] = useState([]);
  const [paletteId, setPaletteId] = useState(null);
  const [customPalette, setCustomPalette] = useState(null);


  const value = useMemo(() => ({
    // State
    csvData,
    csvHeaders,
    fieldPositions,
    fieldStyles,
    brandElements,
    pageTemplate,
    selectedField,
    currentCampaign,
    generatedPagesData,
    generatedVideos,
    aspectRatio,
    pendingAssets,
    colors,
    paletteId,
    customPalette,

    // Setters
    setCsvData,
    setCsvHeaders,
    setFieldPositions,
    setFieldStyles,
    setBrandElements,
    setPageTemplate,
    setSelectedField,
    setCurrentCampaign,
    setGeneratedPagesData,
    setGeneratedVideos,
    setAspectRatio,
    setPendingAssets,
    setColors,
    setPaletteId,
    setCustomPalette,

    // Constants
    defaultPageTemplate,
  }), [
    csvData,
    csvHeaders,
    fieldPositions,
    fieldStyles,
    brandElements,
    pageTemplate,
    selectedField,
    currentCampaign,
    generatedPagesData,
    generatedVideos,
    aspectRatio,
    pendingAssets,
    colors,
    paletteId,
    customPalette,
  ]);

  return (
    <CampaignContext.Provider value={value}>
      {children}
    </CampaignContext.Provider>
  );
};
