import React from 'react';
import {
  Container, Paper, Typography, Box, Button, Grid, Card, CardContent, Alert, Stepper, Step, StepLabel, StepContent, Chip, IconButton, Tooltip, ToggleButton, ToggleButtonGroup, TextField, Link as MuiLink, Fab, FormControl, InputLabel, Select, Accordion, AccordionSummary, AccordionDetails, Toolbar, MenuItem
} from '@mui/material';
import {
  CloudUpload, ExpandMore as ExpandMoreIcon, FileUpload, Settings, Image as ImageIcon, Movie, Audiotrack, Palette, ArrowBackIosNew, ArrowForwardIos, MoreVert, Brightness4, Brightness7, Edit, Download as DownloadIcon, CloudQueue, ChevronRight, ChevronLeft, Check, Add, InsertDriveFileOutlined, FormatBold, Visibility, Grid3x3, Campaign as CampaignIcon, AspectRatio, Language, Publish, SaveAlt as SaveAltIcon, FileUpload as FileUploadIcon, FolderOpen as FolderOpenIcon, BarChart
} from '@mui/icons-material';
import MyCampaignsStep from './MyCampaignsStep';
import Campaign from './Campaign';
import PostsCurtosStep from './PostsCurtosStep';
import ImageStep from './ImageStep';
import ImageGeneratorFrontendOnly from './ImageGeneratorFrontendOnly';
import AudioGenerator from './AudioGenerator';
import VideoGenerator2 from './VideoGenerator2';
import Publisher from './Publisher';
import Monitor from './Monitor';

// This component now holds the entire UI for the campaign creation/management workflow.
// It receives a massive number of props from HomePage, which now acts as a controller.
const CampaignWorkflow = (props) => {
  const {
    activeStep,
    handleBack,
    handleNext,
    canProceedToStep,
    isGenerating,
    steps,
    // MyCampaignsStep props
    onLoadCampaign,
    onEditCampaign,
    handleCreateNewCampaign,
    // Campaign Step props
    selectedPersonaId,
    setSelectedPersonaId,
    personas,
    setPersona,
    navigate,
    campaignData,
    setProblema,
    setSolucao,
    isGeneratingCampaign,
    campaignGenerationFailed,
    generationError,
    handleGenerateCampaignContent,
    handleResetCampaign,
    exportHtml,
    editingField,
    setEditingField,
    setIsHtmlField,
    isGeneratingSummaryMedio,
    handleGenerateSummary,
    isGeneratingSummaryPequeno,
    isGeneratingConteudoFormatado,
    handleGenerateFormattedContent,
    isGeneratingFollowup,
    handleGenerateFollowupPosts,
    generatedImageUrl,
    isGeneratingImage,
    handleGenerateImage,
    setCampaignContent,
    onEditFollowup,
    followupPostsQuantity,
    setFollowupPostsQuantity,
    setAspectRatio,
    // PostsCurtosStep props
    inputMethod,
    setInputMethod,
    handleDrop,
    handleDragOver,
    fileInputRef,
    handleCSVUpload,
    downloadExampleCsv,
    setShowSetupModal,
    promptNumRecords,
    setPromptNumRecords,
    promptText,
    setPromptText,
    generateImagesAutomatically,
    setGenerateImagesAutomatically,
    handleGenerateIAContent,
    csvData,
    csvHeaders,
    onDadosAlterados,
    darkMode,
    exportCsv,
    // ImageStep props
    isDraggingOverImage,
    handleImageDrop,
    handleImageDragEnter,
    handleImageDragLeave,
    imageInputRef,
    handleImageUpload,
    backgroundImage,
    setShowBgSelector,
    fieldPositions,
    setFieldPositions,
    fieldStyles,
    initialFieldStyles,
    setFieldStyles,
    onImageDisplayedSizeChange,
    colorPalette,
    standardsColors,
    onCsvDataUpdate,
    originalImageSize,
    imageFilters,
    setImageFilters,
    brandElements,
    setBrandElements,
    onZIndexChange,
    isMobile,
    selectedField,
    setSelectedField,
    currentPreviewIndex,
    setCurrentPreviewIndex,
    onFontScaleChange,
    templateFieldStyles,
    // ImageGeneratorFrontendOnly props
    setGeneratedImagesData,
    generatedImagesData,
    onThumbnailRecordTextUpdate,
    fontScale,
    // AudioGenerator props
    setGeneratedAudioData,
    generatedAudioData,
    // VideoGenerator2 props
    setGeneratedVideosData,
    // Publisher props
    settings,
    followupPosts,
    isScheduled,
    setIsScheduled,
    scheduleDate,
    setScheduleDate,
    weeklySchedule,
    setWeeklySchedule,
    selectedProfile,
    setSelectedProfile,
    selectedImages,
    setSelectedImages,
    selectedVideos,
    setSelectedVideos,
    currentCampaign,
    // Monitor props
  } = props;

  return (
    <Box component="main" sx={{ flexGrow: 1, p: { xs: 1, sm: 2, md: 3 } }}>
        <Toolbar />
        <div hidden={activeStep !== 0}>
        <MyCampaignsStep
            onLoadCampaign={onLoadCampaign}
            onEditCampaign={onEditCampaign}
            onCreateNew={handleCreateNewCampaign}
        />
        </div>
        <div hidden={activeStep !== 1}>
        <Container maxWidth="lg">
            <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom>
                Seleção de Persona
            </Typography>
            {!selectedPersonaId && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                A qualidade da campanha depende de quão bem o destinatário de suas mensagens é definido. Selecione uma persona ou crie uma nova para continuar.
                </Alert>
            )}
            <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
                <InputLabel id="persona-select-label">Persona</InputLabel>
                <Select
                labelId="persona-select-label"
                value={selectedPersonaId}
                onChange={(e) => {
                    const id = e.target.value;
                    setSelectedPersonaId(id);
                    if (id) {
                    const selected = personas.find(p => p.id === id);
                    setPersona(selected.persona_data);
                    } else {
                    setPersona(null);
                    }
                }}
                label="Persona"
                >
                <MenuItem value="">
                    <em>Nenhuma</em>
                </MenuItem>
                {personas.map((p) => (
                    <MenuItem key={p.id} value={p.id}>
                    {p.name}
                    </MenuItem>
                ))}
                </Select>
            </FormControl>
            <Button
                variant="outlined"
                onClick={() => navigate('/personas')} // This will need to be changed
            >
                Gerenciar Personas
            </Button>
            </Box>
            <Campaign steps={steps} activeStep={activeStep} {...campaignData} setProblema={setProblema} setSolucao={setSolucao} isGeneratingCampaign={isGeneratingCampaign} campaignGenerationFailed={campaignGenerationFailed} generationError={generationError} handleGenerateCampaignContent={handleGenerateCampaignContent} handleResetCampaign={handleResetCampaign} handleExportHtml={() => exportHtml(campaignData)} editingField={editingField} setEditingField={setEditingField} isGeneratingSummaryMedio={isGeneratingSummaryMedio} handleGenerateSummary={handleGenerateSummary} isGeneratingSummaryPequeno={isGeneratingSummaryPeno} isGeneratingConteudoFormatado={isGeneratingConteudoFormatado} handleGenerateFormattedContent={handleGenerateFormattedContent} isGeneratingFollowup={isGeneratingFollowup} handleGenerateFollowupPosts={handleGenerateFollowupPosts} generatedImageUrl={generatedImageUrl} isGeneratingImage={isGeneratingImage} handleGenerateImage={handleGenerateImage} setCampaignContent={setCampaignContent} onEditFollowup={onEditFollowup} followupPostsQuantity={followupPostsQuantity} setFollowupPostsQuantity={setFollowupPostsQuantity} setAspectRatio={setAspectRatio} />
        </Container>
        </div>
        <div hidden={activeStep !== 2}><PostsCurtosStep steps={steps} inputMethod={inputMethod} setInputMethod={setInputMethod} handleDrop={handleDrop} handleDragOver={handleDragOver} fileInputRef={fileInputRef} handleCSVUpload={handleCSVUpload} downloadExampleCsv={downloadExampleCsv} setShowSetupModal={setShowSetupModal} promptNumRecords={promptNumRecords} setPromptNumRecords={setPromptNumRecords} promptText={promptText} setPromptText={setPromptText} generateImagesAutomatically={generateImagesAutomatically} setGenerateImagesAutomatically={setGenerateImagesAutomatically} handleGenerateIAContent={handleGenerateIAContent} isGenerating={isGenerating} csvData={csvData} csvHeaders={csvHeaders} onDadosAlterados={onDadosAlterados} darkMode={darkMode} exportCsv={exportCsv} /></div>
        <div hidden={activeStep !== 3}>
            <ImageStep
                steps={steps}
                isDraggingOverImage={isDraggingOverImage}
                handleImageDrop={handleImageDrop}
                handleImageDragOver={handleImageDragOver}
                handleImageDragEnter={handleImageDragEnter}
                handleImageDragLeave={handleImageDragLeave}
                imageInputRef={imageInputRef}
                handleImageUpload={handleImageUpload}
                backgroundImage={backgroundImage}
                onChangeBackgroundImage={() => setShowBgSelector(true)}
                csvHeaders={csvHeaders}
                fieldPositions={fieldPositions}
                setFieldPositions={setFieldPositions}
                fieldStyles={fieldStyles}
                initialFieldStyles={initialFieldStyles}
                setFieldStyles={setFieldStyles}
                csvData={csvData}
                onImageDisplayedSizeChange={onImageDisplayedSizeChange}
                colorPalette={colorPalette}
                standardsColors={standardsColors}
                onCsvDataUpdate={onCsvDataUpdate}
                originalImageSize={originalImageSize}
                imageFilters={imageFilters}
                setImageFilters={setImageFilters}
                brandElements={brandElements}
                setBrandElements={setBrandElements}
                onZIndexChange={onZIndexChange}
                isMobile={isMobile}
                selectedField={selectedField}
                setSelectedField={setSelectedField}
                onDeselectField={() => setSelectedField(null)}
                onOpenHtmlEditor={(fieldId) => setEditingField(fieldId)}
                currentPreviewIndex={currentPreviewIndex}
                setCurrentPreviewIndex={setCurrentPreviewIndex}
                onFontScaleChange={onFontScaleChange}
                templateFieldStyles={templateFieldStyles}
                activeStep={activeStep}
            />
        </div>
        <div hidden={activeStep !== 4}><ImageGeneratorFrontendOnly csvData={csvData} backgroundImage={backgroundImage} fieldPositions={fieldPositions} fieldStyles={fieldStyles} displayedImageSize={displayedImageSize} csvHeaders={csvHeaders} colorPalette={colorPalette} standardsColors={standardsColors} setGeneratedImagesData={setGeneratedImagesData} initialGeneratedImagesData={generatedImagesData} onThumbnailRecordTextUpdate={onThumbnailRecordTextUpdate} originalImageSize={originalImageSize} imageFilters={imageFilters} brandElements={brandElements} onBrandElementsChange={setBrandElements} fontScale={fontScale} /></div>
        <div hidden={activeStep !== 5}><AudioGenerator csvData={csvData} fieldPositions={fieldPositions} onAudiosGenerated={setGeneratedAudioData} initialAudioData={generatedAudioData} /></div>
        <div hidden={activeStep !== 6}><VideoGenerator2 generatedImages={generatedImagesData} generatedAudioData={generatedAudioData} onVideoGenerated={setGeneratedVideosData} /></div>
        <div hidden={activeStep !== 7}><Publisher settings={settings} campaignContent={campaignContent} generatedImagesData={generatedImagesData} generatedVideosData={generatedVideosData} followupPosts={followupPosts} isScheduled={isScheduled} setIsScheduled={setIsScheduled} scheduleDate={scheduleDate} setScheduleDate={setScheduleDate} weeklySchedule={weeklySchedule} setWeeklySchedule={setWeeklySchedule} selectedProfile={selectedProfile} setSelectedProfile={setSelectedProfile} selectedImages={selectedImages} setSelectedImages={setSelectedImages} selectedVideos={selectedVideos} setSelectedVideos={setSelectedVideos} currentCampaign={currentCampaign} /></div>
        <div hidden={activeStep !== 8}><Monitor currentCampaign={currentCampaign} /></div>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 4, px: 2 }} ><Button onClick={handleBack} disabled={activeStep === 0} variant="outlined" sx={{ borderRadius: 2, px: 3, py: 1.5 }} >Anterior</Button><Box sx={{ flexGrow: 1, display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center', mx: 2 }}>{steps.map((_, index) => (<Box key={index} sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: index === activeStep ? 'primary.main' : index < activeStep ? 'success.main' : 'grey.300', transition: 'all 0.3s ease' }} />))}</Box><Button onClick={handleNext} disabled={isGenerating || activeStep === steps.length - 1 || !canProceedToStep(activeStep + 1)} variant="contained" sx={{ borderRadius: 2, px: 3, py: 1.5 }} >Próximo</Button></Box>
    </Box>
  );
};

export default CampaignWorkflow;
