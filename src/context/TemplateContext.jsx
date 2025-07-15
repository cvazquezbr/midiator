import React, { createContext, useContext, useState } from 'react';

const TemplateContext = createContext();

export const useTemplate = () => useContext(TemplateContext);

const initialTemplate = {
  name: '',
  background: null,
  fields: [],
};

export function TemplateProvider({ children }) {
  const [template, setTemplate] = useState(initialTemplate);
  const [selectedFieldId, setSelectedFieldId] = useState(null);

  const addField = (field) => {
    const newField = {
      ...field,
      // Novo formato com propriedades WYSIWYG
      rect: {
        x: 50,
        y: 50,
        width: 200,
        height: 100
      },
      content: '',
      styles: {
        ...field.styles,
        // Propriedades de texto adicionadas
        fontSize: 16,
        fontFamily: 'Arial',
        fontWeight: 'normal',
        color: '#000000',
        textAlign: 'left'
      }
    };

    setTemplate(prev => ({
      ...prev,
      fields: [...prev.fields, newField]
    }));
    setSelectedFieldId(newField.id);
  };

  const updateField = (id, updates) => {
    setTemplate(prev => ({
      ...prev,
      fields: prev.fields.map(field => 
        field.id === id ? { 
          ...field, 
          ...updates,
          // Atualização profunda do retângulo
          rect: updates.rect ? { ...field.rect, ...updates.rect } : field.rect,
          // Atualização profunda dos estilos
          styles: updates.styles ? { ...field.styles, ...updates.styles } : field.styles
        } : field
      )
    }));
  };

  const removeField = (id) => {
    setTemplate(prev => ({
      ...prev,
      fields: prev.fields.filter(field => field.id !== id)
    }));
    if (selectedFieldId === id) {
      setSelectedFieldId(null);
    }
  };

  const resetTemplate = () => {
    setTemplate(initialTemplate);
    setSelectedFieldId(null);
  };

  const value = {
    template,
    setTemplate,
    selectedFieldId,
    setSelectedFieldId,
    addField,
    updateField,
    removeField,
    resetTemplate
  };

  return (
    <TemplateContext.Provider value={value}>
      {children}
    </TemplateContext.Provider>
  );
};