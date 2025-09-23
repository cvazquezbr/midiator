/**
 * Handles copying and pasting of styles for page templates.
 */
import { safeDeepClone } from '../lib/utils';
import { toast } from 'sonner';

/**
 * Copies the style and layout data to the clipboard.
 * It sanitizes the page template to remove content-specific data like image sources.
 *
 * @param {object} styles - The styles object for text fields.
 * @param {object} positions - The positions object for text fields.
 * @param {Array} brandElements - The array of brand elements.
 * @param {object} pageTemplate - The page template object, including images.
 */
export const copyStyleToClipboard = async (styles, positions, brandElements, pageTemplate) => {
  try {
    // Sanitize pageTemplate to remove content, keeping only style-related properties.
    const pageTemplateForClipboard = safeDeepClone(pageTemplate);
    if (pageTemplateForClipboard.images && Array.isArray(pageTemplateForClipboard.images)) {
      pageTemplateForClipboard.images = pageTemplateForClipboard.images.map(img => {
        // Omit 'id' and 'src' as they are content, not style.
        const { id, src, ...styleAttrs } = img;
        return styleAttrs;
      });
    }

    const styleData = {
      styles,
      positions,
      brandElements: brandElements || [],
      pageTemplate: pageTemplateForClipboard,
    };

    await navigator.clipboard.writeText(JSON.stringify(styleData, null, 2));
    toast.success('Estilo copiado para a área de transferência!');
  } catch (err) {
    console.error('Erro ao copiar estilo: ', err);
    toast.error('Erro ao copiar estilo. Verifique o console para mais detalhes.');
  }
};

/**
 * Pastes style and layout data from the clipboard, merging it with the current state.
 *
 * @param {Function} setStyles - State setter for text field styles.
 * @param {Function} setPositions - State setter for text field positions.
 * @param {Function} setBrandElements - State setter for brand elements.
 * @param {Function} setPageTemplate - State setter for the page template.
 */
export const pasteStyleFromClipboard = async (setStyles, setPositions, setBrandElements, setPageTemplate) => {
  try {
    const text = await navigator.clipboard.readText();
    const pastedData = JSON.parse(text);

    if (!pastedData || !pastedData.styles || !pastedData.positions) {
      toast.error('Os dados da área de transferência não parecem ser um estilo válido.');
      return;
    }

    // Merge text styles and positions field by field
    setStyles(prevStyles => {
      const newStyles = { ...prevStyles };
      for (const field in pastedData.styles) {
        if (Object.prototype.hasOwnProperty.call(newStyles, field)) {
          newStyles[field] = pastedData.styles[field];
        }
      }
      return newStyles;
    });

    setPositions(prevPositions => {
      const newPositions = { ...prevPositions };
      for (const field in pastedData.positions) {
        if (Object.prototype.hasOwnProperty.call(newPositions, field)) {
          newPositions[field] = pastedData.positions[field];
        }
      }
      return newPositions;
    });

    if (pastedData.brandElements) {
      setBrandElements(pastedData.brandElements);
    }

    // Deep merge page template styles
    if (pastedData.pageTemplate) {
      setPageTemplate(currentTemplate => {
        const newTemplate = safeDeepClone(currentTemplate);
        const sourceTemplate = pastedData.pageTemplate;

        // Merge background and gradient
        newTemplate.backgroundColor = sourceTemplate.backgroundColor;
        newTemplate.gradient = sourceTemplate.gradient;

        // Merge image styles, preserving destination content (src, id)
        if (newTemplate.images && sourceTemplate.images) {
          newTemplate.images = newTemplate.images.map((destImage, index) => {
            const sourceImageStyle = sourceTemplate.images[index];
            if (sourceImageStyle) {
              // Keep src and id from the destination, apply styles from source
              const { src, id } = destImage;
              return { ...sourceImageStyle, src, id };
            }
            return destImage; // Keep original if no corresponding source
          });
        }
        return newTemplate;
      });
    }

    toast.success('Estilo colado com sucesso!');
  } catch (err) {
    console.error('Erro ao colar estilo: ', err);
    if (err instanceof SyntaxError) {
      toast.error('O conteúdo da área de transferência não é um JSON de estilo válido.');
    } else {
      toast.error('Erro ao colar estilo. Verifique o console para mais detalhes.');
    }
  }
};
