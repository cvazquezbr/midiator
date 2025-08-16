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
