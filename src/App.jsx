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
  Settings,
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
import { SidebarProvider, Sidebar, SidebarContent, SidebarTrigger } from '@/components/ui/sidebar';

// Componentes locais
import FieldPositioner from './components/FieldPositioner';
// ImageGeneratorFrontendOnly, DeepSeekAuthSetup, etc., serão reintegrados/recriados conforme necessário em etapas futuras.

// Definição das etapas
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

// Componente Indicador de Etapa (Sidebar)
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

// --- COMPONENTES DE ETAPA ---

const DataStep = ({ csvData, setCsvData, csvHeaders, setCsvHeaders, handleCSVUpload, fileInputRef }) => {
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
            <h3 className="text-lg font-semibold mb-2">Upload CSV</h3>
            <p className="text-gray-600 mb-4">Carregue um arquivo CSV com seus dados</p>
            <Button onClick={() => fileInputRef.current?.click()}>Selecionar Arquivo</Button>
            <input type="file" accept=".csv" hidden ref={fileInputRef} onChange={handleCSVUpload} />
          </div>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-purple-400 transition-colors">
            <Plus className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Criar Manualmente</h3>
            <p className="text-gray-600 mb-4">Adicione registros um por um</p>
            <Button>Novo Registro</Button>
          </div>
        </div>
      </div>
      {csvData.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Preview dos Dados ({csvData.length} registros)</h3>
          <div className="overflow-x-auto"><table className="w-full">
            <thead><tr className="border-b border-gray-200">
              {csvHeaders.map(h=><th key={h} className="text-left py-3 px-4 font-medium text-gray-600">{h}</th>)}
              <th className="text-left py-3 px-4 font-medium text-gray-600">Ações</th>
            </tr></thead>
            <tbody>{csvData.map((item, index) => (
              <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                {csvHeaders.map(h=><td key={h} className="py-3 px-4 whitespace-nowrap">{String(item[h])}</td>)}
                <td className="py-3 px-4">
                  <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700" onClick={() => handleRemoveRow(index)}>
                    <XIcon className="w-4 h-4" />
                  </Button>
                </td>
              </tr>))}
            </tbody>
          </table></div>
        </div>)}
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
              <ImageIconLucide className="w-12 h-12 text-gray-400 mx-auto mb-4" /><h3 className="text-lg font-semibold mb-2">Upload Background</h3>
              <p className="text-gray-600 mb-4">PNG, JPG ou JPEG</p><Button>Selecionar Imagem</Button>
              <input type="file" accept=".png,.jpg,.jpeg" hidden ref={imageInputRef} onChange={handleImageUpload} />
            </div>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-2">Formato</label>
                <select value={templateFormat} onChange={(e) => handleFormatChange(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                  {formatOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-2">Dimensões</label>
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" placeholder="Largura (px)" value={templateDimensions.width} onChange={(e) => setTemplateDimensions(d=>({...d, width: parseInt(e.target.value)||''}))} className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent" disabled={templateFormat !== 'Custom'} />
                  <input type="number" placeholder="Altura (px)" value={templateDimensions.height} onChange={(e) => setTemplateDimensions(d=>({...d, height: parseInt(e.target.value)||''}))} className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent" disabled={templateFormat !== 'Custom'} />
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-100 rounded-lg min-h-[300px] flex items-center justify-center p-4 border border-gray-200">
            {backgroundImage ? <img src={backgroundImage} alt="Preview Template" className="max-w-full max-h-[400px] object-contain rounded-md shadow-md"/>
              : <div className="text-center text-gray-500"><Eye className="w-12 h-12 text-gray-400 mx-auto mb-2" /><p>Preview do Template</p><p className="text-sm">Faça upload de uma imagem para visualizar</p></div>}
          </div>
        </div>
      </div>
    </div>
  );
};

const DesignStep = ({ backgroundImage, csvHeaders, fieldPositions, setFieldPositions, fieldStyles, setFieldStyles, csvData, onImageDisplayedSizeChange, colorPalette, onCsvDataUpdate }) => {
  const [selectedFieldForStyling, setSelectedFieldForStyling] = useState(null);
  const handleFieldSelect = (fieldName) => setSelectedFieldForStyling(fieldName);

  const PropertiesPanel = ({ selectedField, currentStyles, onStyleChange }) => {
    if (!selectedField || !currentStyles) return <div className="text-sm text-gray-500">Selecione um campo para ver as propriedades.</div>;
    const handleGeneric = (p, v) => onStyleChange({...currentStyles, [p]: v});
    const handleNumber = (p, v) => onStyleChange({...currentStyles, [p]: parseInt(v,10)||0});
    const handleToggle = (p) => onStyleChange({...currentStyles, [p]: !currentStyles[p]});
    const fonts = ['Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Verdana', 'Courier New', 'Lucida Console'];
    return (
      <div className="space-y-4 text-sm"><h4 className="font-medium text-gray-800 mb-2 border-b pb-1">Propriedades de: <span className="font-bold text-purple-600">{selectedField}</span></h4>
        <div><label className="block text-xs font-medium text-gray-600 mb-1">Fonte</label><select value={currentStyles.fontFamily||'Arial'} onChange={e=>handleGeneric('fontFamily',e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm bg-white focus:ring-purple-500 focus:border-purple-500">{fonts.map(f=><option key={f} value={f}>{f}</option>)}</select></div>
        <div><label className="block text-xs font-medium text-gray-600 mb-1">Tamanho ({currentStyles.fontSize||24}px)</label><input type="range" min="8" max="128" value={currentStyles.fontSize||24} onChange={e=>handleNumber('fontSize',e.target.value)} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-500"/></div>
        <div><label className="block text-xs font-medium text-gray-600 mb-1">Cor Texto</label><input type="color" value={currentStyles.color||'#000000'} onChange={e=>handleGeneric('color',e.target.value)} className="w-full h-8 px-1 py-0.5 border border-gray-300 rounded-md"/></div>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex items-center space-x-2 p-2 border rounded-md hover:bg-gray-50 cursor-pointer"><input type="checkbox" checked={currentStyles.fontWeight==='bold'} onChange={()=>handleGeneric('fontWeight',currentStyles.fontWeight==='bold'?'normal':'bold')} className="rounded text-purple-500 focus:ring-purple-500"/><span className="text-xs">Negrito</span></label>
          <label className="flex items-center space-x-2 p-2 border rounded-md hover:bg-gray-50 cursor-pointer"><input type="checkbox" checked={currentStyles.fontStyle==='italic'} onChange={()=>handleGeneric('fontStyle',currentStyles.fontStyle==='italic'?'normal':'italic')} className="rounded text-purple-500 focus:ring-purple-500"/><span className="text-xs">Itálico</span></label>
        </div>
        <div><label className="block text-xs font-medium text-gray-600 mb-1">Alinh. Horizontal</label><select value={currentStyles.textAlign||'left'} onChange={e=>handleGeneric('textAlign',e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm bg-white focus:ring-purple-500 focus:border-purple-500"><option value="left">Esquerda</option><option value="center">Centro</option><option value="right">Direita</option></select></div>
        <div className="pt-2 mt-2 border-t"><label className="flex items-center space-x-2 cursor-pointer mb-2"><input type="checkbox" checked={!!currentStyles.textStroke} onChange={()=>handleToggle('textStroke')} className="rounded text-purple-500 focus:ring-purple-500"/><span className="text-xs font-medium text-gray-600">Contorno</span></label>
          {currentStyles.textStroke && <div className="space-y-2 pl-4">
            <div><label className="block text-xs text-gray-500 mb-0.5">Cor</label><input type="color" value={currentStyles.strokeColor||'#ffffff'} onChange={e=>handleGeneric('strokeColor',e.target.value)} className="w-full h-7 px-1 py-0.5 border border-gray-300 rounded-md"/></div>
            <div><label className="block text-xs text-gray-500 mb-0.5">Largura ({currentStyles.strokeWidth||1}px)</label><input type="range" min="1" max="10" value={currentStyles.strokeWidth||1} onChange={e=>handleNumber('strokeWidth',e.target.value)} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-500"/></div>
          </div>}
        </div>
        <div className="pt-2 mt-2 border-t"><label className="flex items-center space-x-2 cursor-pointer mb-2"><input type="checkbox" checked={!!currentStyles.textShadow} onChange={()=>handleToggle('textShadow')} className="rounded text-purple-500 focus:ring-purple-500"/><span className="text-xs font-medium text-gray-600">Sombra</span></label>
          {currentStyles.textShadow && <div className="space-y-2 pl-4">
            <div><label className="block text-xs text-gray-500 mb-0.5">Cor</label><input type="color" value={currentStyles.shadowColor||'#000000'} onChange={e=>handleGeneric('shadowColor',e.target.value)} className="w-full h-7 px-1 py-0.5 border border-gray-300 rounded-md"/></div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="block text-xs text-gray-500 mb-0.5">Desloc. X ({currentStyles.shadowOffsetX||0}px)</label><input type="range" min="-10" max="10" value={currentStyles.shadowOffsetX||0} onChange={e=>handleNumber('shadowOffsetX',e.target.value)} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-500"/></div>
              <div><label className="block text-xs text-gray-500 mb-0.5">Desloc. Y ({currentStyles.shadowOffsetY||0}px)</label><input type="range" min="-10" max="10" value={currentStyles.shadowOffsetY||0} onChange={e=>handleNumber('shadowOffsetY',e.target.value)} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-500"/></div>
            </div>
            <div><label className="block text-xs text-gray-500 mb-0.5">Borrão ({currentStyles.shadowBlur||0}px)</label><input type="range" min="0" max="20" value={currentStyles.shadowBlur||0} onChange={e=>handleNumber('shadowBlur',e.target.value)} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-500"/></div>
          </div>}
        </div>
      </div>);
  };
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Design e Posicionamento</h2>
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          <div className="xl:col-span-3 bg-gray-50 rounded-lg p-2">
            {backgroundImage ? <FieldPositioner {...{backgroundImage, csvHeaders, fieldPositions, setFieldPositions, fieldStyles, setFieldStyles, csvData, onImageDisplayedSizeChange, colorPalette, onFieldSelect: handleFieldSelect, selectedField: selectedFieldForStyling, onCsvDataUpdate}}/>
              : <div className="bg-gray-100 rounded-lg h-96 flex items-center justify-center text-center text-gray-500"><div><Layers className="w-12 h-12 text-gray-400 mx-auto mb-2"/><p>Canvas de Design</p><p className="text-sm">Faça upload de uma imagem de template na etapa anterior.</p></div></div>}
          </div>
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-4 border"><h3 className="font-semibold text-gray-700 mb-3">Campos Disponíveis</h3><div className="space-y-2">{csvHeaders.length > 0 ? csvHeaders.map(h=>(<div key={h} className="flex items-center justify-between p-2.5 bg-white rounded-md border shadow-sm"><span className="text-sm text-gray-700">{h}</span><Move className="w-4 h-4 text-gray-400 cursor-grab"/></div>)) : <p className="text-sm text-gray-500">Nenhum campo de dados carregado.</p>}</div></div>
            <div className="bg-gray-50 rounded-lg p-4 border"><h3 className="font-semibold text-gray-700 mb-3">Propriedades</h3><PropertiesPanel selectedField={selectedFieldForStyling} currentStyles={fieldStyles[selectedFieldForStyling]} onStyleChange={newSty => {if(selectedFieldForStyling)setFieldStyles(prev=>({...prev,[selectedFieldForStyling]:newSty}))}}/></div>
          </div>
        </div>
      </div>
    </div>);
};

const GenerationStep = ({ generationQuality, setGenerationQuality, generationNaming, setGenerationNaming, generatedImagesData }) => {
  const qualityOptions = ['Alta (PNG)', 'Média (JPG 90%)', 'Baixa (JPG 70%)'];
  const handleGenerateAll = () => console.log("Gerando...", { generationQuality, generationNaming });
  const previewItems = generatedImagesData?.length>0 ? generatedImagesData.slice(0,4) : Array(4).fill(null).map((_,i)=>({url:null,filename:`Preview ${i+1}`,record:{titulo:`Mock ${i+1}`}}));
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Geração de Imagens</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <div className="bg-gray-50 rounded-lg p-4 mb-6 border"><h3 className="font-semibold text-gray-700 mb-3">Configurações</h3><div className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-600 mb-1">Qualidade</label><select value={generationQuality} onChange={e=>setGenerationQuality(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-purple-500">{qualityOptions.map(o=><option key={o} value={o}>{o}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-gray-600 mb-1">Nomenclatura</label><input type="text" placeholder="midiator_{index}_{titulo}" value={generationNaming} onChange={e=>setGenerationNaming(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-purple-500"/><p className="text-xs text-gray-500 mt-1">Use {`{index}`}, {`{titulo}`}, etc.</p></div>
            </div></div>
            <Button onClick={handleGenerateAll} className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 font-semibold hover:from-purple-600 hover:to-pink-600 flex items-center justify-center space-x-2 text-base"><Play className="w-5 h-5"/><span>Gerar Todas</span></Button>
          </div>
          <div><div className="bg-gray-50 rounded-lg p-4 border"><h3 className="font-semibold text-gray-700 mb-3">Preview</h3>
            {previewItems.length>0 ? <div className="grid grid-cols-2 gap-3">{previewItems.map((item,i)=>(
              <div key={i} className="bg-white rounded-lg p-3 border shadow-sm">
                <div className="bg-gray-200 rounded h-24 mb-2 flex items-center justify-center">{item.url ? <img src={item.url} alt={item.filename||`Preview ${i}`} className="max-h-full max-w-full object-contain"/> : <ImageIconLucide className="w-8 h-8 text-gray-400"/>}</div>
                <div className="flex justify-between items-center"><span className="text-xs font-medium truncate" title={item.filename||`file_${i}.png`}>{item.filename||`file_${i}.png`}</span><Download className="w-4 h-4 text-gray-400 hover:text-purple-600 cursor-pointer"/></div>
              </div>))}</div>
            : <p className="text-sm text-gray-500 text-center py-4">Nenhuma imagem gerada.</p>}
          </div></div>
        </div>
      </div>
    </div>);
};

const PublicationStep = ({}) => {
  const imagesForIndex = mockData.map((item, index) => ({id:item.id, thumbnailUrl:null, title:item.titulo, filename:`midiator_${item.id}_${item.titulo.toLowerCase().replace(/\s+/g,'_')}.png`, status:index%2===0?'Enviado':'Pendente'}));
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Publicação e Automação</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg p-6 mb-6 shadow-lg"><div className="flex items-center space-x-3 mb-3"><Cloud className="w-7 h-7"/><h3 className="text-xl font-semibold">Google Drive</h3></div><p className="text-sm opacity-90 mb-4">Upload automático para Google Drive.</p><Button className="bg-white text-purple-600 hover:bg-gray-100 font-medium">Conectar Drive</Button></div>
            <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg p-6 shadow-lg"><div className="flex items-center space-x-3 mb-3"><Zap className="w-7 h-7"/><h3 className="text-xl font-semibold">Zapier</h3></div><p className="text-sm opacity-90 mb-4">Automatize publicações com Zapier.</p><Button className="bg-white text-orange-600 hover:bg-gray-100 font-medium">Configurar Zapier</Button></div>
          </div>
          <div><div className="bg-gray-50 rounded-lg p-4 border h-full"><h3 className="font-semibold text-gray-700 mb-3">Índice de Imagens</h3>
            {imagesForIndex.length>0 ? <div className="space-y-2 max-h-96 overflow-y-auto pr-2">{imagesForIndex.map(item=>(
              <div key={item.id} className="flex items-center justify-between p-3 bg-white rounded-md border shadow-sm">
                <div className="flex items-center space-x-3"><div className={`w-10 h-10 rounded flex items-center justify-center ${item.thumbnailUrl?'':'bg-gray-200'}`}>{item.thumbnailUrl?<img src={item.thumbnailUrl} alt={item.title} className="w-full h-full object-cover rounded"/>:<ImageIconLucide className="w-5 h-5 text-gray-400"/>}</div>
                  <div><p className="text-sm font-medium text-gray-800 truncate max-w-xs">{item.title}</p><p className="text-xs text-gray-500 truncate max-w-xs">{item.filename}</p></div>
                </div>
                <div className="flex items-center space-x-2">{item.status==='Enviado'?<span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full font-medium">Enviado</span>:<span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded-full font-medium">Pendente</span>}<Download className="w-4 h-4 text-gray-400 hover:text-purple-600 cursor-pointer"/></div>
              </div>))}</div>
            : <p className="text-sm text-gray-500 text-center py-4">Nenhuma imagem para listar.</p>}
          </div></div>
        </div>
      </div>
    </div>);
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
            const headers = Object.keys(results.data[0] || {});
            setCsvHeaders(headers);
            // Inicializar fieldPositions e fieldStyles para novos headers
            const newPositions = {...fieldPositions};
            const newStyles = {...fieldStyles};
            headers.forEach((header, index) => {
              if (!newPositions[header]) {
                newPositions[header] = { x: 10 + (index % 3) * 30, y: 10 + Math.floor(index / 3) * 25, width: 25, height: 15, visible: true };
              }
              if (!newStyles[header]) {
                // Supondo que COMPLETE_DEFAULT_STYLE_FOR_FIELD_POSITIONER está acessível ou definido aqui
                // Para simplificar, vamos usar um default básico por enquanto se não estiver
                newStyles[header] = { fontFamily: 'Arial', fontSize: 24, color: '#000000', textAlign: 'left', verticalAlign: 'top', lineHeightMultiplier: 1.2 };
              }
            });
            setFieldPositions(newPositions);
            setFieldStyles(newStyles);
          }
        },
        error: (error) => console.error('Erro ao ler CSV:', error),
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
        const img = new window.Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
          try {
            const colorThief = new ColorThief();
            setColorPalette(colorThief.getPalette(img, 5).map(rgb => `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`));
          } catch (error) {
            console.error("Error extracting color palette:", error);
            setColorPalette([]);
          }
        };
        img.src = imageUrl;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCsvDataUpdate = useCallback((updatedCsvData) => {
    setCsvData(updatedCsvData);
  }, []);

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
                      setCsvHeaders={setCsvHeaders} // Passando setCsvHeaders
                      handleCSVUpload={handleCSVUpload}
                      fileInputRef={fileInputRef}
                    />;
      case 1: return <TemplateStep
                      backgroundImage={backgroundImage}
                      handleImageUpload={handleImageUpload}
                      imageInputRef={imageInputRef}
                      templateDimensions={templateDimensions}
                      setTemplateDimensions={setTemplateDimensions}
                      templateFormat={templateFormat}
                      setTemplateFormat={setTemplateFormat}
                    />;
      case 2: return <DesignStep
                      backgroundImage={backgroundImage}
                      csvHeaders={csvHeaders}
                      fieldPositions={fieldPositions}
                      setFieldPositions={setFieldPositions}
                      fieldStyles={fieldStyles}
                      setFieldStyles={setFieldStyles}
                      csvData={csvData}
                      onImageDisplayedSizeChange={setDisplayedImageSize}
                      colorPalette={colorPalette}
                      onCsvDataUpdate={handleCsvDataUpdate}
                    />;
      case 3: return <GenerationStep
                      generationQuality={generationQuality}
                      setGenerationQuality={setGenerationQuality}
                      generationNaming={generationNaming}
                      setGenerationNaming={setGenerationNaming}
                      generatedImagesData={generatedImagesData}
                    />;
      case 4: return <PublicationStep /* generatedImagesData={generatedImagesData} mockData={mockData} */ />;
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
              <SidebarTrigger className="md:hidden"/>
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
              {/* Adicionar botão de Settings/Configurações globais se necessário no futuro */}
            </div>
          </div>
        </header>

        <div className="flex pt-16"> {/* pt-16 para compensar altura do header fixo */}
          <Sidebar className="shadow-lg">
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

          <main className="flex-1 p-6 overflow-auto">
            {renderStepContent()}
            <div className="flex justify-between items-center mt-8">
              <Button onClick={handleBack} disabled={activeStep === 0} variant="outline">
                <ChevronLeft className="w-4 h-4 mr-2" /> Anterior
              </Button>
              <div className="flex space-x-2">
                {appSteps.map((_, index) => (
                  <div key={index} className={`w-2 h-2 rounded-full transition-colors ${index === activeStep ? 'bg-purple-500' : index < activeStep ? 'bg-green-500' : 'bg-gray-300'}`}/>
                ))}
              </div>
              <Button onClick={handleNext} disabled={activeStep === appSteps.length - 1}>
                Próximo <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

export default App;
