import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';

// Set up the worker source for pdf.js to use the local file
pdfjsLib.GlobalWorkerOptions.workerSrc = `/pdf.worker.mjs`;

export const parseWordDocument = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const arrayBuffer = event.target.result;
        const result = await mammoth.convertToHtml({ arrayBuffer });
        resolve(result.value); // The result.value is the HTML content
      } catch (error) {
        console.error('Error parsing Word document:', error);
        reject('Não foi possível ler o arquivo Word. Verifique se o arquivo não está corrompido.');
      }
    };
    reader.onerror = (error) => {
        console.error('FileReader error:', error);
        reject('Ocorreu um erro ao ler o arquivo.');
    };
    reader.readAsArrayBuffer(file);
  });
};

export const parsePdfDocument = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const arrayBuffer = event.target.result;
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          let textContent = '';
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const text = await page.getTextContent();
            textContent += text.items.map(s => s.str).join(' ') + '\n\n';
          }
          // Convert simple newlines to <p> tags for better HTML rendering
          const htmlContent = textContent.split('\n').map(p => `<p>${p}</p>`).join('');
          resolve(htmlContent);
        } catch (error) {
          console.error('Error parsing PDF document:', error);
          reject('Não foi possível processar o arquivo PDF. O arquivo pode estar corrompido ou em um formato não suportado.');
        }
      };
      reader.onerror = (error) => {
          console.error('FileReader error:', error);
          reject('Ocorreu um erro ao ler o arquivo.');
      };
      reader.readAsArrayBuffer(file);
    });
};