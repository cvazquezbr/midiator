import React, { useState, useRef, useEffect, useCallback } from 'react';
import Papa from 'papaparse';
import ColorThief from 'colorthief';

import {
  Upload,
  Image as ImageIconLucide,
  Type,
  Move,
  Download,
  Play,
  FileText,
  Palette,
  Settings, // Importado
  Eye,
  Grid as GridIcon,
  Layers,
  Zap,
  Cloud,
  ChevronRight,
  ChevronLeft,
  Check,
  Plus,
  X as XIcon
} from 'lucide-react';

import { Button } from "@/components/ui/button";
// O SidebarProvider e Sidebar do ui/sidebar.jsx podem precisar de ajuste se o controle de open/close for totalmente manual como na referência
// Por agora, vamos tentar usar o estado `sidebarOpen` para controlar o `className` ou uma prop `open` se disponível.
import { SidebarProvider, Sidebar, SidebarContent, SidebarTrigger } from '@/components/ui/sidebar';


import FieldPositioner from './components/FieldPositioner';

const appSteps = [
  { id: 0, title: 'Dados', icon: FileText, description: 'Carregar CSV ou criar manualmente' },
  { id: 1, title: 'Template', icon: ImageIconLucide, description: 'Configurar background e layout' },
  { id: 2, title: 'Design', icon: Palette, description: 'Posicionar campos e estilizar' },
  { id: 3, title: 'Geração', icon: Zap, description: 'Gerar e exportar imagens' },
  { id: 4, title: 'Publicação', icon: Cloud, description: 'Upload e automação' }
];

const mockData = [
  { id: 1, titulo: 'Oferta Especial', subtitulo: 'Até 50% OFF', cta: 'Comprar Agora' },
  { id: 2, titulo: 'Novo Produto', subtitulo: 'Lançamento', cta: 'Saber Mais' },
  { id: 3, titulo: 'Black Friday', subtitulo: 'Descontos incríveis', cta: 'Ver Ofertas' }
];

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

// --- COMPONENTES DE ETAPA (Com ajustes de estilo conforme referência) ---

const DataStep = ({ csvData, setCsvData, csvHeaders, handleCSVUpload, fileInputRef }) => {
  const handleRemoveRow = (indexToRemove) => {
    setCsvData(prevData => prevData.filter((_, index) => index !== indexToRemove));
  };
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Carregar Dados</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-purple-400 transition-colors">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2 text-gray-800">Upload CSV</h3>
            <p className="text-gray-600 mb-4">Carregue um arquivo CSV com seus dados</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors"
            >
              Selecionar Arquivo
            </button>
            <input type="file" accept=".csv" hidden ref={fileInputRef} onChange={handleCSVUpload} />
          </div>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-purple-400 transition-colors">
            <Plus className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2 text-gray-800">Criar Manualmente</h3>
            <p className="text-gray-600 mb-4">Adicione registros um por um</p>
            <button className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors">
              Novo Registro
            </button>
          </div>
        </div>
      </div>
      {csvData.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Preview dos Dados ({csvData.length} registros)</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  {csvHeaders.map(h=><th key={h} className="text-left py-3 px-4 font-medium text-gray-600">{h}</th>)}
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Ações</th>
                </tr>
              </thead>
              <tbody>
                {csvData.map((item, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    {csvHeaders.map(h=><td key={h} className="py-3 px-4 whitespace-nowrap text-gray-700">{String(item[h])}</td>)}
                    <td className="py-3 px-4">
                      <button className="text-red-500 hover:text-red-700" onClick={() => handleRemoveRow(index)}>
                        <XIcon className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

const TemplateStep = ({ backgroundImage, handleImageUpload, imageInputRef, templateDimensions, setTemplateDimensions, templateFormat, setTemplateFormat }) => {
  const formatOptions = ['Instagram Post (1080x1080)', 'Instagram Story (1080x1920)', 'Facebook Post (1200x630)', 'LinkedIn Post (1200x627)', 'Twitter Post (1024x512)', 'Custom'];
  const handleFormatChange = (value) => {
    setTemplateFormat(value);
    if (value !== 'Custom') {
      const dims = value.match(/\((\d+)x(\d+)\)/);
      if (dims) setTemplateDimensions({ width: parseInt(dims[1]), height: parseInt(dims[2]) });
    }
  };
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Template de Background</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <div>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-purple-400 transition-colors mb-6 cursor-pointer" onClick={() => imageInputRef.current?.click()}>
              <ImageIconLucide className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2 text-gray-800">Upload Background</h3>
              <p className="text-gray-600 mb-4">PNG, JPG ou JPEG</p>
              <button className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors">
                Selecionar Imagem
              </button>
              <input type="file" accept=".png,.jpg,.jpeg" hidden ref={imageInputRef} onChange={handleImageUpload} />
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Formato</label>
                <select value={templateFormat} onChange={(e) => handleFormatChange(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                  {formatOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Dimensões</label>
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" placeholder="Largura" value={templateDimensions.width} onChange={(e) => setTemplateDimensions(d=>({...d, width: parseInt(e.target.value)||''}))} className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent" disabled={templateFormat !== 'Custom'} />
                  <input type="number" placeholder="Altura" value={templateDimensions.height} onChange={(e) => setTemplateDimensions(d=>({...d, height: parseInt(e.target.value)||''}))} className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent" disabled={templateFormat !== 'Custom'} />
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-100 rounded-lg h-64 flex items-center justify-center p-4 border border-gray-200">
            {backgroundImage ? <img src={backgroundImage} alt="Preview Template" className="max-w-full max-h-full object-contain rounded-md shadow-md"/>
              : <div className="text-center text-gray-500"><Eye className="w-8 h-8 text-gray-400 mx-auto mb-2" /><p>Preview do Template</p></div>}
          </div>
        </div>
      </div>
    </div>
  );
};

const DesignStep = ({ backgroundImage, csvHeaders, fieldPositions, setFieldPositions, fieldStyles, setFieldStyles, csvData, onImageDisplayedSizeChange, colorPalette, onCsvDataUpdate }) => {
  const [selectedFieldForStyling, setSelectedFieldForStyling] = useState(null);
  const handleFieldSelect = (fieldName) => setSelectedFieldForStyling(fieldName);

  // PropertiesPanel adaptado para corresponder mais de perto aos estilos da referência
  const PropertiesPanel = ({ selectedField, currentStyles, onStyleChange }) => {
    if (!selectedField || !currentStyles) return <div className="text-sm text-gray-500 p-4">Selecione um campo para ver as propriedades.</div>; // Adicionado padding
    const handleGeneric = (p, v) => onStyleChange({...currentStyles, [p]: v});
    const handleNumber = (p, v) => onStyleChange({...currentStyles, [p]: parseInt(v,10)||0});
    // const handleToggle = (p) => onStyleChange({...currentStyles, [p]: !currentStyles[p]}); // Não usado diretamente na referência
    const fonts = ['Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Verdana', 'Courier New', 'Lucida Console']; // Simplificado, a referência não mostra todos.

    return (
      <div className="space-y-3"> {/* space-y-3 como na referência */}
        <h3 className="font-semibold mb-3 text-gray-800">Propriedades de: <span className="font-bold text-purple-600">{selectedField}</span></h3>
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">Fonte</label>
          <select value={currentStyles.fontFamily||'Arial'} onChange={e=>handleGeneric('fontFamily',e.target.value)} className="w-full px-2 py-1 border border-gray-300 rounded text-sm bg-white focus:ring-purple-500 focus:border-purple-500">
            {fonts.map(f=><option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">Tamanho</label>
          <input type="range" className="w-full accent-purple-500" min="12" max="72" value={currentStyles.fontSize||24} onChange={e=>handleNumber('fontSize',e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">Cor</label>
          <input type="color" className="w-full h-8 border border-gray-300 rounded" value={currentStyles.color||'#000000'} onChange={e=>handleGeneric('color',e.target.value)} />
        </div>
        {/* Outras propriedades como bold, italic, align, stroke, shadow podem ser adicionadas aqui se necessário, seguindo o padrão da referência */}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Design e Posicionamento</h2>
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          <div className="xl:col-span-3 bg-gray-100 rounded-lg h-96 flex items-center justify-center relative p-2">
            {backgroundImage ? <FieldPositioner {...{backgroundImage, csvHeaders, fieldPositions, setFieldPositions, fieldStyles, setFieldStyles, csvData, onImageDisplayedSizeChange, colorPalette, onFieldSelect: handleFieldSelect, selectedField: selectedFieldForStyling, onCsvDataUpdate}}/>
              : <div className="text-center text-gray-500">
                  <Layers className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">Canvas de Design</p>
                  <p className="text-sm">Faça upload de uma imagem de template na etapa anterior.</p>
                </div>
            }
            {/* Simulação de campos posicionados (para referência visual, FieldPositioner faz o real) */}
            {/* <div className="absolute top-8 left-8 bg-purple-500 text-white px-3 py-1 rounded text-sm">Título</div> */}
            {/* <div className="absolute top-20 left-8 bg-pink-500 text-white px-3 py-1 rounded text-sm">Subtítulo</div> */}
            {/* <div className="absolute bottom-8 right-8 bg-blue-500 text-white px-3 py-1 rounded text-sm">CTA</div> */}
          </div>
          <div className="space-y-4"> {/* space-y-4 como na referência */}
            <div className="bg-gray-50 rounded-lg p-4 border">
              <h3 className="font-semibold mb-3 text-gray-800">Campos Disponíveis</h3>
              <div className="space-y-2">
                {csvHeaders.length > 0 ? csvHeaders.map(h=>(
                  <div key={h} className="flex items-center justify-between p-2 bg-white rounded border">
                    <span className="text-sm text-gray-700">{h}</span>
                    <Move className="w-4 h-4 text-gray-400 cursor-grab" />
                  </div>
                )) : <p className="text-sm text-gray-500">Nenhum campo de dados carregado.</p>}
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 border">
              {/* <h3 className="font-semibold mb-3 text-gray-800">Propriedades</h3> */} {/* Título já está dentro do PropertiesPanel */}
              <PropertiesPanel
                selectedField={selectedFieldForStyling}
                currentStyles={fieldStyles[selectedFieldForStyling]}
                onStyleChange={newSty => {if(selectedFieldForStyling)setFieldStyles(prev=>({...prev,[selectedFieldForStyling]:newSty}))}}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const GenerationStep = ({ generationQuality, setGenerationQuality, generationNaming, setGenerationNaming, generatedImagesData }) => {
  const qualityOptions = ['Alta (PNG)', 'Média (JPG 90%)', 'Baixa (JPG 70%)'];
  const handleGenerateAll = () => console.log("Gerando...", { generationQuality, generationNaming });
  const previewItems = generatedImagesData?.length > 0
    ? generatedImagesData.slice(0, 4)
    : Array(4).fill(null).map((_,i)=>({url:null, filename:`Preview ${i+1}`, record:{titulo:`Mock ${i+1}`}}));

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Geração de Imagens</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <div className="bg-gray-50 rounded-lg p-4 mb-4 border"> {/* mb-4 em vez de mb-6 */}
              <h3 className="font-semibold mb-2 text-gray-800">Configurações de Geração</h3> {/* mb-2 em vez de mb-3 */}
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Qualidade</label>
                  <select value={generationQuality} onChange={e=>setGenerationQuality(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-purple-500 focus:border-transparent">
                    {qualityOptions.map(o=><option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Nomenclatura</label>
                  <input type="text" placeholder="midiator_{index}_{titulo}" value={generationNaming} onChange={e=>setGenerationNaming(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-transparent"/>
                  <p className="text-xs text-gray-500 mt-1">Use {`{index}`}, {`{titulo}`}, etc.</p>
                </div>
              </div>
            </div>
            <button
              onClick={handleGenerateAll}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition-all duration-300 flex items-center justify-center space-x-2"
            >
              <Play className="w-5 h-5" />
              <span>Gerar Todas as Imagens</span>
            </button>
          </div>
          <div>
            <div className="bg-gray-50 rounded-lg p-4 border">
              <h3 className="font-semibold mb-3 text-gray-800">Preview das Imagens</h3>
              <div className="grid grid-cols-2 gap-3">
                {previewItems.map((item, i) => (
                  <div key={i} className="bg-white rounded-lg p-3 border">
                    <div className="bg-gray-200 rounded h-20 mb-2 flex items-center justify-center">
                      {item.url ? <img src={item.url} alt={item.filename||`Preview ${i}`} className="max-h-full max-w-full object-contain"/>
                                 : <span className="text-xs text-gray-500">Preview {i+1}</span>}
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-gray-700 truncate" title={item.filename||`file_${i}.png`}>{item.filename||`Imagem ${i+1}`}</span>
                      <Download className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-pointer" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const PublicationStep = ({ generatedImagesData, mockData: propMockData }) => { // Renomeado mockData para evitar conflito
  // Usar generatedImagesData se disponível, senão o mockData de prop
  const currentData = generatedImagesData && generatedImagesData.length > 0 ? generatedImagesData.map(img => ({...img.record, id: img.index})) : propMockData;

  const imagesForIndex = currentData.map((item, index) => ({
    id: item.id || index,
    thumbnailUrl: generatedImagesData?.find(gi => gi.index === item.id)?.url || null, // Apenas para exemplo
    title: item.titulo || `Item ${item.id}`,
    filename: `midiator_${item.id || index}_${(item.titulo || `item_${item.id || index}`).toLowerCase().replace(/\s+/g,'_')}.png`,
    status: index % 2 === 0 ? 'Enviado' : 'Pendente' // Mock status
  }));

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Publicação e Automação</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg p-6 mb-4 shadow-lg"> {/* mb-4 como na ref */}
              <div className="flex items-center space-x-3 mb-3">
                <Cloud className="w-6 h-6" /> {/* w-6 h-6 como na ref */}
                <h3 className="font-semibold text-lg">Google Drive</h3> {/* text-lg, não xl */}
              </div>
              <p className="text-sm opacity-90 mb-4">Faça upload automático das imagens geradas</p>
              <button className="bg-white text-purple-600 px-4 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors">
                Conectar Drive
              </button>
            </div>
            <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg p-6 shadow-lg">
              <div className="flex items-center space-x-3 mb-3">
                <Zap className="w-6 h-6" /> {/* w-6 h-6 como na ref */}
                <h3 className="font-semibold text-lg">Zapier Integration</h3> {/* text-lg */}
              </div>
              <p className="text-sm opacity-90 mb-4">Automatize publicações nas redes sociais</p>
              <button className="bg-white text-orange-600 px-4 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors">
                Configurar Zapier
              </button>
            </div>
          </div>
          <div>
            <div className="bg-gray-50 rounded-lg p-4 border h-full">
              <h3 className="font-semibold mb-3 text-gray-800">Índice de Imagens</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                {imagesForIndex.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-white rounded border">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded flex items-center justify-center ${item.thumbnailUrl?'':'bg-gray-200'}`}>
                        {item.thumbnailUrl ? <img src={item.thumbnailUrl} alt={item.title} className="w-full h-full object-cover rounded"/>
                                           : <ImageIconLucide className="w-4 h-4 text-gray-400"/>}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800 truncate max-w-xs">{item.title}</p>
                        <p className="text-xs text-gray-500 truncate max-w-xs">{item.filename}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${item.status === 'Enviado' ? 'text-green-600 bg-green-100' : 'text-yellow-600 bg-yellow-100'}`}>
                        {item.status}
                      </span>
                      <Download className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-pointer" />
                    </div>
                  </div>
                ))}
              </div>
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
  const [sidebarOpen, setSidebarOpen] = useState(true); // Estado para a sidebar

  const [csvData, setCsvData] = useState([]);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [colorPalette, setColorPalette] = useState([]);
  const [fieldPositions, setFieldPositions] = useState({});
  const [fieldStyles, setFieldStyles] = useState({});
  const [displayedImageSize, setDisplayedImageSize] = useState({ width: 0, height: 0 });
  const [generatedImagesData, setGeneratedImagesData] = useState([]);

  const [templateDimensions, setTemplateDimensions] = useState({ width: 1080, height: 1080 });
  const [templateFormat, setTemplateFormat] = useState('Instagram Post (1080x1080)');
  const [generationQuality, setGenerationQuality] = useState('Alta (PNG)');
  const [generationNaming, setGenerationNaming] = useState('midiator_{index}_{titulo}');

  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  // const loadStateInputRef = useRef(null);

  const handleCSVUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      Papa.parse(file, {
        header: true, skipEmptyLines: true, complete: (results) => {
          if (results.data && results.data.length > 0) {
            setCsvData(results.data);
            const headers = Object.keys(results.data[0] || {});
            setCsvHeaders(headers);
            const newPositions = {}; const newStyles = {};
            headers.forEach((header, index) => {
              if (!newPositions[header]) newPositions[header] = { x: 10 + (index % 3) * 30, y: 10 + Math.floor(index / 3) * 25, width: 25, height: 15, visible: true };
              if (!newStyles[header]) newStyles[header] = { fontFamily: 'Arial', fontSize: 24, color: '#000000', textAlign: 'left', verticalAlign: 'top', lineHeightMultiplier: 1.2 };
            });
            setFieldPositions(newPositions); setFieldStyles(newStyles);
          }
        }, error: (error) => console.error('Erro ao ler CSV:', error),
      });
    }
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageUrl = e.target.result;
        setBackgroundImage(imageUrl);
        const img = new window.Image(); img.crossOrigin = 'Anonymous';
        img.onload = () => {
          try {
            const colorThief = new ColorThief();
            setColorPalette(colorThief.getPalette(img, 5).map(rgb => `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`));
          } catch (error) { console.error("Error extracting color palette:", error); setColorPalette([]); }
        };
        img.src = imageUrl;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCsvDataUpdate = useCallback((updatedCsvData) => { setCsvData(updatedCsvData); }, []);
  const handleNext = () => { setActiveStep((prev) => Math.min(appSteps.length - 1, prev + 1)); };
  const handleBack = () => { setActiveStep((prev) => Math.max(0, prev - 1)); };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0: return <DataStep csvData={csvData} setCsvData={setCsvData} csvHeaders={csvHeaders} handleCSVUpload={handleCSVUpload} fileInputRef={fileInputRef} />;
      case 1: return <TemplateStep backgroundImage={backgroundImage} handleImageUpload={handleImageUpload} imageInputRef={imageInputRef} templateDimensions={templateDimensions} setTemplateDimensions={setTemplateDimensions} templateFormat={templateFormat} setTemplateFormat={setTemplateFormat} />;
      case 2: return <DesignStep backgroundImage={backgroundImage} csvHeaders={csvHeaders} fieldPositions={fieldPositions} setFieldPositions={setFieldPositions} fieldStyles={fieldStyles} setFieldStyles={setFieldStyles} csvData={csvData} onImageDisplayedSizeChange={setDisplayedImageSize} colorPalette={colorPalette} onCsvDataUpdate={handleCsvDataUpdate} />;
      case 3: return <GenerationStep generationQuality={generationQuality} setGenerationQuality={setGenerationQuality} generationNaming={generationNaming} setGenerationNaming={setGenerationNaming} generatedImagesData={generatedImagesData} />;
      case 4: return <PublicationStep generatedImagesData={generatedImagesData} mockData={mockData} />;
      default: return <DataStep csvData={csvData} setCsvData={setCsvData} csvHeaders={csvHeaders} handleCSVUpload={handleCSVUpload} fileInputRef={fileInputRef} />;
    }
  };

  // Decidir se o header é fixo ou não. A referência não parece ter header fixo.
  const isHeaderFixed = false;

  return (
    // Removido defaultOpen e onOpenChange do SidebarProvider que estavam ligados ao sidebarOpen do App.
    // O SidebarProvider gerenciará o estado da sidebar mobile (Sheet) internamente.
    // O sidebarOpen do App agora controla apenas a div da sidebar desktop.
    <SidebarProvider>
      <div className="min-h-screen bg-gray-50">
        <header className={`bg-white shadow-sm border-b border-gray-200 ${isHeaderFixed ? 'fixed top-0 left-0 right-0 z-10' : ''}`}>
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center space-x-4">
              {/* SidebarTrigger usa o contexto do SidebarProvider para controlar o Sheet mobile */}
              <SidebarTrigger className="md:hidden p-2 text-gray-600 hover:text-gray-800" />
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">M</span>
                </div>
                <h1 className="text-xl font-bold text-gray-800">Midiator</h1>
              </div>
              <span className="text-sm text-gray-500">Social Media Generator</span>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setPreviewMode(previewMode === 'single' ? 'grid' : 'single')}
                className="p-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                {previewMode === 'single' ? <GridIcon className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
              <button // Botão Settings para desktop
                onClick={() => setSidebarOpen(!sidebarOpen)} // Controla a sidebarOpen do App (para a div desktop)
                className="p-2 text-gray-600 hover:text-gray-800 transition-colors hidden md:block"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        <div className={`flex ${isHeaderFixed ? 'pt-16' : ''}`}>
          {/* Sidebar: Controlada por sidebarOpen e classes Tailwind como na referência */}
          {/* A integração com o componente Sidebar de ui/sidebar.jsx precisa ser verificada.
              Se ui/sidebar.jsx já lida com animação e estado via context, podemos passar `open={sidebarOpen}`
              ou usar suas props. A referência usa classes Tailwind diretas para w-80/w-0.
              Vamos tentar uma abordagem mista: usar o componente Sidebar mas controlar sua visibilidade/largura
              baseado em `sidebarOpen` para desktop, e deixar o SidebarTrigger cuidar do mobile.
           */}
          <div className={`${sidebarOpen ? 'w-80' : 'w-0'} transition-all duration-300 overflow-hidden bg-white shadow-lg hidden md:block`}>
            <div className="p-6"> {/* Conteúdo da Sidebar como na referência */}
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
            </div>
          </div>
          {/* Sidebar para mobile (usando o componente ui/sidebar) */}
          <Sidebar className="md:hidden shadow-lg"> {/* Só para mobile */}
            <SidebarContent className="p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Etapas do Processo</h2>
              <div className="space-y-2">
                {appSteps.map((step, index) => (
                  <StepIndicator
                    key={step.id}
                    step={step}
                    isActive={activeStep === index}
                    isCompleted={index < activeStep}
                    onClick={() => {
                      setActiveStep(index);
                      // Fechar sidebar mobile ao clicar em um item (opcional, mas boa UX)
                      // Assumindo que setSidebarOpen do SidebarProvider controla o sheet mobile
                      // Se o SidebarProvider não estiver controlando o sheet, precisaremos de outra forma.
                      // Por agora, vamos focar no desktop.
                    }}
                  />
                ))}
              </div>
            </SidebarContent>
          </Sidebar>


          <main className="flex-1 p-6 overflow-auto">
            {renderStepContent()}
            <div className="flex justify-between items-center mt-8">
              <button
                onClick={handleBack}
                disabled={activeStep === 0}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
              >
                <ChevronLeft className="w-4 h-4 mr-2" /> Anterior
              </button>
              <div className="flex space-x-2">
                {appSteps.map((_, index) => (
                  <div key={index} className={`w-2 h-2 rounded-full transition-colors ${index === activeStep ? 'bg-purple-500' : index < activeStep ? 'bg-green-500' : 'bg-gray-300'}`}/>
                ))}
              </div>
              <button
                onClick={handleNext}
                disabled={activeStep === appSteps.length - 1}
                className="px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
              >
                Próximo <ChevronRight className="w-4 h-4 ml-2" />
              </button>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

export default App;
