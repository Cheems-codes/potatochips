const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Serves static portfolio files

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Teach the AI who you are so it answers questions about your portfolio correctly
const SYSTEM_PROMPT = `
You are an AI assistant for a portfolio website.
Answer questions politely and concisely regarding the portfolio owner's work, 
skills, certifications, and background.
`;

app.post('/api/chat', async (req, res) => {
    try {
        const { message } = req.body;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: message,
            config: {
                systemInstruction: SYSTEM_PROMPT,
            }
        });

        res.json({ reply: response.text });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error processing chat request' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));