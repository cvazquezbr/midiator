export const markdownToLinkedinText = (markdown) => {
    if (!markdown) return '';
    let text = markdown;
    text = text.replace(/<[^>]*>/g, '');
    text = text.replace(/\*\*(.*?)\*\*|\*(.*?)\*/g, '$1$2');
    text = text.replace(/^#+\s/gm, '');
    text = text.replace(/^>\s/gm, '');
    text = text.replace(/\[(.*?)\]\((.*?)\)/g, '$1 ($2)');
    text = text.replace(/^\s*[-*]\s/gm, '');
    text = text.trim().replace(/\n{3,}/g, '\n\n');
    return text;
};

export const escapeLinkedinText = (text) => {
    if (!text) return '';
    // Escapa caracteres especiais que o LinkedIn pode interpretar como formatação.
    // A lista de caracteres é baseada em documentação e testes da comunidade.
    // A barra invertida '\' precisa ser escapada na regex e na string de substituição.
    return text.replace(/([|{}@[\]()<>#*_~\\])/g, '\\$1');
};
