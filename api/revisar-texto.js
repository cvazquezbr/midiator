import { parseBody } from './utils.js';

export default async function handler(req, res) {
    const body = await parseBody(req);

    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { texto } = body;

    if (!texto) {
        return res.status(400).json({ message: 'O texto é obrigatório.' });
    }

    try {
        // TODO: Substituir esta simulação por uma chamada real a um serviço de IA.
        // A lógica atual apenas inverte as palavras para fins de demonstração.
        const textoRevisado = texto.split(' ').reverse().join(' ');

        res.status(200).json({ textoRevisado });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao revisar o texto.', error: error.message });
    }
}
