const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const logger = require('../utils/logger');

class GroqService {
    constructor() {
        this.apiKey = process.env.GROQ_API_KEY;
        // 🟢 AQUÍ ESTÁ EL CAMBIO: 'openai' en lugar de 'openapi'
        this.baseUrl = 'https://api.groq.com/openai/v1';
        this.chatModel = process.env.GROQ_MODEL || 'llama-3.3-70b-specdec';
        this.whisperModel = process.env.GROQ_WHISPER_MODEL || 'whisper-large-v3';

        if (!this.apiKey || this.apiKey.includes('TU_GROQ_API_KEY')) {
            logger.warn('GROQ_API_KEY no está configurado correctamente en el archivo .env');
        }
    }

    /**
     * Envía un prompt a la API de Groq para completar chat.
     * @param {Array} messages - Lista de mensajes de conversación.
     * @param {Object} options - Opciones adicionales (temperature, jsonMode, etc).
     */
    async getChatCompletion(messages, options = {}) {
        try {
            const url = `${this.baseUrl}/chat/completions`;
            const data = {
                model: this.chatModel,
                messages,
                temperature: options.temperature !== undefined ? options.temperature : 0.1,
                max_tokens: options.max_tokens || 1000,
            };

            if (options.jsonMode) {
                data.response_format = { type: 'json_object' };
            }

            logger.debug(`Enviando consulta a Groq con modelo: ${this.chatModel}`);

            const response = await axios.post(url, data, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            return response.data;
        } catch (error) {
            const errorMsg = error.response.data.error.message || error.message;
            logger.error('Error en la API de Groq Chat Completions:', error.response.data || error);
            throw new Error(`Error al conectar con la IA de Groq: ${errorMsg}`);
        }
    }

    /**
     * Transcribe un archivo de audio mediante la API de Whisper en Groq.
     * @param {string} filePath - Ruta absoluta del archivo de audio (.mp3, .wav, .m4a, etc).
     * @param {string} language - Idioma opcional (ej: 'es').
     */
    async transcribeAudio(filePath, language = 'es') {
        try {
            const url = `${this.baseUrl}/audio/transcriptions`;

            if (!fs.existsSync(filePath)) {
                throw new Error(`El archivo de audio no existe en la ruta: ${filePath}`);
            }

            const form = new FormData();
            form.append('file', fs.createReadStream(filePath));
            form.append('model', this.whisperModel);
            form.append('language', language);
            form.append('response_format', 'json');

            logger.debug(`Enviando audio para transcribir a Groq Whisper con modelo: ${this.whisperModel}`);

            const response = await axios.post(url, form, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    ...form.getHeaders()
                },
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            });

            return response.data; // { text: "..." }
        } catch (error) {
            const errorMsg = error.response.data.error.message || error.message;
            logger.error('Error en la API de Groq Whisper:', error.response.data || error);
            throw new Error(`Error en transcripción Whisper: ${errorMsg}`);
        }
    }
}

module.exports = new GroqService();