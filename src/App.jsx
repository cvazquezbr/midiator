import React, { useState, useRef, useEffect, useCallback } from 'react';
import Papa from 'papaparse';
import ColorThief from 'colorthief';

import {
  Upload,
  Image as ImageIconLucide, // Renomeado para evitar conflito com tag <Image>
  Type,
  Move,
  Download,
  Play,
  FileText,
  Palette,
  Settings,
  Eye,
  Grid as GridIcon, // Renomeado para evitar conflito
  Layers,
  Zap,
  Cloud,
  ChevronRight,
  ChevronLeft,
  Check,
  Plus,
  X as XIcon // Renomeado para evitar conflito
} from 'lucide-react';

// Componentes Shadcn/UI (assumindo que estão configurados e alguns serão usados)
import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
// import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";


// Importe a SidebarProvider e a Sidebar do seu arquivo ui/sidebar.jsx
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarTrigger } from '@/components/ui/sidebar';


// Componentes locais que serão refatorados ou mantidos (com adaptações)
import FieldPositioner from './components/FieldPositioner';
import ImageGeneratorFrontendOnly from './components/ImageGeneratorFrontendOnly';
// RecordManager será decomposto e sua lógica integrada em DataStep
// import RecordManager from './features/RecordManager/RecordManager';
import DeepSeekAuthSetup from './components/DeepSeekAuthSetup';
import GeminiAuthSetup from './components/GeminiAuthSetup';
import GoogleDriveAuthModal from './components/GoogleDriveAuthModal';

import { getDeepSeekApiKey } from './utils/deepSeekCredentials';
import { getGeminiApiKey } from './utils/geminiCredentials';
import { callDeepSeekApi } from './utils/deepSeekAPI';
import { callGeminiApi } from './utils/geminiAPI';

// import './App.css'; // Será gradualmente substituído por Tailwind

// Definição das etapas conforme a referência
const appSteps = [
  { id: 0, title: 'Dados', icon: FileText, description: 'Carregar CSV ou criar manualmente' },
  { id: 1, title: 'Template', icon: ImageIconLucide, description: 'Configurar background e layout' },
  { id: 2, title: 'Design', icon: Palette, description: 'Posicionar campos e estilizar' },
  { id: 3, title: 'Geração', icon: Zap, description: 'Gerar e exportar imagens' },
  { id: 4, title: 'Publicação', icon: Cloud, description: 'Upload e automação' }
];

// Mock data inicial (pode ser removido ou adaptado depois)
const mockData = [
  { id: 1, titulo: 'Oferta Especial', subtitulo: 'Até 50% OFF', cta: 'Comprar Agora' },
  { id: 2, titulo: 'Novo Produto', subtitulo: 'Lançamento', cta: 'Saber Mais' },
  { id: 3, titulo: 'Black Friday', subtitulo: 'Descontos incríveis', cta: 'Ver Ofertas' }
];


// Componente Indicador de Etapa (para a Sidebar)
const StepIndicator = ({ step, isActive, isCompleted, onClick }) => {
  const Icon = step.icon;
  return (
    <div
      onClick={onClick}
      className={`flex items-center space-x-4 p-4 rounded-lg transition-all duration-300 cursor-pointer ${
      isActive ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg' :
      isCompleted ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
    }`}>
      <div className={`p-2 rounded-full ${
        isActive ? 'bg-white/20' : isCompleted ? 'bg-green-200' : 'bg-white'
      }`}>
        {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
      </div>
      <div className="flex-1">
        <h3 className="font-semibold">{step.title}</h3>
        <p className="text-sm opacity-80">{step.description}</p>
      </div>
      {isActive && <ChevronRight className="w-5 h-5" />}
    </div>
  );
};


// Componentes de Etapa
// DataStep (já definido anteriormente)
// TemplateStep (já definido anteriormente)
// DesignStep (já definido anteriormente)

const GenerationStep = ({
  generationQuality,
  setGenerationQuality,
  generationNaming,
  setGenerationNaming,
  generatedImagesData,
  // csvData, backgroundImage, fieldPositions, fieldStyles, displayedImageSize, setGeneratedImagesData (para lógica real)
}) => {
  const qualityOptions = ['Alta (PNG)', 'Média (JPG 90%)', 'Baixa (JPG 70%)'];
  const handleGenerateAll = () => { console.log("Gerando todas as imagens com:", { generationQuality, generationNaming }); };
  const previewItems = generatedImagesData && generatedImagesData.length > 0
    ? generatedImagesData.slice(0, 4)
    : Array(4).fill(null).map((_, i) => ({ url: null, filename: `Preview Imagem ${i + 1}`, record: { titulo: `Item Mock ${i+1}` } }));

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Geração de Imagens</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <div className="bg-gray-50 rounded-lg p-4 mb-6 border">
              <h3 className="font-semibold text-gray-700 mb-3">Configurações de Geração</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Qualidade</label>
                  <select value={generationQuality} onChange={(e) => setGenerationQuality(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500">
                    {qualityOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Nomenclatura de Arquivo</label>
                  <input type="text" placeholder="ex: midiator_{index}_{titulo}" value={generationNaming} onChange={(e) => setGenerationNaming(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"/>
                  <p className="text-xs text-gray-500 mt-1">Use {`{index}`}, {`{titulo}`} ou outros cabeçalhos do CSV.</p>
                </div>
              </div>
            </div>
            <Button onClick={handleGenerateAll} className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition-all duration-300 flex items-center justify-center space-x-2 text-base">
              <Play className="w-5 h-5" />
              <span>Gerar Todas as Imagens</span>
            </Button>
          </div>
          <div>
            <div className="bg-gray-50 rounded-lg p-4 border">
              <h3 className="font-semibold text-gray-700 mb-3">Preview das Imagens Geradas</h3>
              {previewItems.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {previewItems.map((item, i) => (
                    <div key={i} className="bg-white rounded-lg p-3 border shadow-sm">
                      <div className="bg-gray-200 rounded h-24 mb-2 flex items-center justify-center">
                        {item.url ? <img src={item.url} alt={item.filename || `Preview ${i}`} className="max-h-full max-w-full object-contain rounded"/> : <ImageIconLucide className="w-8 h-8 text-gray-400" />}
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-gray-700 truncate" title={item.filename || `midiator_${i+1}_${item?.record?.titulo?.toLowerCase().replace(' ','_') || 'imagem'}.png`}>
                          {item.filename || `midiator_${i+1}_${item?.record?.titulo?.toLowerCase().replace(' ','_') || 'imagem'}.png`}
                        </span>
                        <Download className="w-4 h-4 text-gray-400 hover:text-purple-600 cursor-pointer" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-gray-500 text-center py-4">Nenhuma imagem gerada para preview.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const PublicationStep = ({ /* generatedImagesData, mockData */ }) => {
  const imagesForIndex = mockData.map((item, index) => ({
    id: item.id, thumbnailUrl: null, title: item.titulo,
    filename: `midiator_${item.id}_${item.titulo.toLowerCase().replace(/\s+/g, '_')}.png`,
    status: index % 2 === 0 ? 'Enviado' : 'Pendente',
  }));

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Publicação e Automação</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg p-6 mb-6 shadow-lg">
              <div className="flex items-center space-x-3 mb-3"><Cloud className="w-7 h-7" /><h3 className="text-xl font-semibold">Google Drive</h3></div>
              <p className="text-sm opacity-90 mb-4">Faça upload automático das imagens geradas para sua conta do Google Drive.</p>
              <Button className="bg-white text-purple-600 hover:bg-gray-100 font-medium">Conectar Drive</Button>
            </div>
            <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg p-6 shadow-lg">
              <div className="flex items-center space-x-3 mb-3"><Zap className="w-7 h-7" /><h3 className="text-xl font-semibold">Zapier Integration</h3></div>
              <p className="text-sm opacity-90 mb-4">Automatize publicações nas redes sociais e outros fluxos de trabalho com Zapier.</p>
              <Button className="bg-white text-orange-600 hover:bg-gray-100 font-medium">Configurar Zapier</Button>
            </div>
          </div>
          <div>
            <div className="bg-gray-50 rounded-lg p-4 border h-full">
              <h3 className="font-semibold text-gray-700 mb-3">Índice de Imagens Geradas</h3>
              {imagesForIndex.length > 0 ? (
                <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                  {imagesForIndex.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-white rounded-md border shadow-sm">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded flex items-center justify-center ${item.thumbnailUrl ? '' : 'bg-gray-200'}`}>
                          {item.thumbnailUrl ? <img src={item.thumbnailUrl} alt={item.title} className="w-full h-full object-cover rounded"/> : <ImageIconLucide className="w-5 h-5 text-gray-400" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800 truncate max-w-xs">{item.title}</p>
                          <p className="text-xs text-gray-500 truncate max-w-xs">{item.filename}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {item.status === 'Enviado' ? <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full font-medium">Enviado</span> : <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded-full font-medium">Pendente</span>}
                        <Download className="w-4 h-4 text-gray-400 hover:text-purple-600 cursor-pointer" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-gray-500 text-center py-4">Nenhuma imagem para listar.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


function App() {
  const [activeStep, setActiveStep] = useState(0);
  const [previewMode, setPreviewMode] = useState('single');

  // Estados principais da aplicação
  const [csvData, setCsvData] = useState([]);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [colorPalette, setColorPalette] = useState([]);
  const [fieldPositions, setFieldPositions] = useState({});
  const [fieldStyles, setFieldStyles] = useState({});
  const [displayedImageSize, setDisplayedImageSize] = useState({ width: 0, height: 0 });
  const [generatedImagesData, setGeneratedImagesData] = useState([]);

  // Estados específicos das etapas
  const [templateDimensions, setTemplateDimensions] = useState({ width: 1080, height: 1080 });
  const [templateFormat, setTemplateFormat] = useState('Instagram Post (1080x1080)');
  const [generationQuality, setGenerationQuality] = useState('Alta (PNG)');
  const [generationNaming, setGenerationNaming] = useState('midiator_{index}_{titulo}');

  // Refs
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const loadStateInputRef = useRef(null);

  // Funções de manipulação de dados
  const handleCSVUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.data && results.data.length > 0) {
            setCsvData(results.data);
            setCsvHeaders(Object.keys(results.data[0] || {}));
            // setActiveStep(1); // Ou a próxima etapa relevante no novo fluxo
          }
        },
        error: (error) => console.error('Erro ao ler CSV:', error),
      });
    }
  };

  const handleImageUpload = (event) => {
    // Lógica similar à original, mas usando setBackgroundImage
  };

  const handleNext = () => {
    setActiveStep((prev) => Math.min(appSteps.length - 1, prev + 1));
  };

  const handleBack = () => {
    setActiveStep((prev) => Math.max(0, prev - 1));
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0: return <DataStep
                      csvData={csvData}
                      setCsvData={setCsvData}
                      csvHeaders={csvHeaders}
                      setCsvHeaders={setCsvHeaders}
                      handleCSVUpload={handleCSVUpload}
                      fileInputRef={fileInputRef}
                    />;
      case 1: return <TemplateStep />;
      case 2: return <DesignStep />;
      case 3: return <GenerationStep />;
      case 4: return <PublicationStep />;
      default: return <DataStep
                        csvData={csvData}
                        setCsvData={setCsvData}
                        csvHeaders={csvHeaders}
                        setCsvHeaders={setCsvHeaders}
                        handleCSVUpload={handleCSVUpload}
                        fileInputRef={fileInputRef}
                      />;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 fixed top-0 left-0 right-0 z-10">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center space-x-4">
              <SidebarTrigger className="md:hidden"/> {/* Gatilho da Sidebar para mobile */}
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">M</span>
                </div>
                <h1 className="text-xl font-bold text-gray-800">Midiator</h1>
              </div>
              <span className="text-sm text-gray-500 hidden md:inline">Social Media Generator</span>
            </div>

            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPreviewMode(previewMode === 'single' ? 'grid' : 'single')}
                className="text-gray-600 hover:text-gray-800"
              >
                {previewMode === 'single' ? <GridIcon className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </Button>
              {/* O botão Settings agora é o SidebarTrigger no contexto do componente Sidebar */}
              {/* <Button
                variant="ghost"
                size="icon"
                // onClick={() => setSidebarOpen(!sidebarOpen)} // Será tratado pelo SidebarProvider
                className="text-gray-600 hover:text-gray-800"
              >
                <Settings className="w-5 h-5" />
              </Button> */}
            </div>
          </div>
        </header>

        <div className="flex pt-16"> {/* pt-16 para compensar altura do header fixo */}
          {/* Sidebar */}
          <Sidebar className="shadow-lg"> {/* Adiciona classes de estilização se necessário */}
            <SidebarContent className="p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Etapas do Processo</h2>
              <div className="space-y-2">
                {appSteps.map((step, index) => (
                  <StepIndicator
                    key={step.id}
                    step={step}
                    isActive={activeStep === index}
                    isCompleted={index < activeStep}
                    onClick={() => setActiveStep(index)}
                  />
                ))}
              </div>
            </SidebarContent>
          </Sidebar>

          {/* Main Content */}
          <main className="flex-1 p-6 overflow-auto"> {/* Garante que o conteúdo principal possa rolar */}
            {renderStepContent()}

            {/* Navigation */}
            <div className="flex justify-between items-center mt-8">
              <Button
                onClick={handleBack}
                disabled={activeStep === 0}
                variant="outline"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Anterior
              </Button>

              <div className="flex space-x-2">
                {appSteps.map((_, index) => (
                  <div
                    key={index}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      index === activeStep ? 'bg-purple-500' :
                      index < activeStep ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>

              <Button
                onClick={handleNext}
                disabled={activeStep === appSteps.length - 1}
              >
                Próximo
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

export default App;

