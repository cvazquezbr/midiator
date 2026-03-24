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

export function escapeLinkedinText(text) {
    if (text === null || text === undefined) return '';
    if (typeof text !== 'string') {
        try { text = String(text); } catch (e) { return ''; }
    }
    return text.replace(/([|{}@[\]()<>#*_~\\])/g, '\\$1');
}
