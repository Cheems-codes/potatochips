const CLIENT_SCRIPT = String.raw`(() => {
  function initPortfolioChat() {
    const input = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-btn');
    const messages = document.getElementById('chat-messages');
    const box = document.getElementById('chat-box');
    if (!input || !sendButton || !messages) return;

    document.getElementById('chat-toggle-btn')?.addEventListener('click', () => {
      box?.classList.toggle('hidden');
      box?.classList.toggle('flex');
    });
    document.getElementById('chat-close-btn')?.addEventListener('click', () => {
      box?.classList.add('hidden');
      box?.classList.remove('flex');
    });

    function appendMessage(text, sender) {
      const item = document.createElement('div');
      item.className = sender === 'user'
        ? 'p-2 rounded-lg bg-sageAccent text-white self-end max-w-[80%] text-xs ml-auto'
        : 'p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 self-start max-w-[80%] text-xs';
      item.textContent = text;
      messages.appendChild(item);
      messages.scrollTop = messages.scrollHeight;
      return item;
    }

    async function sendMessage() {
      const text = input.value.trim();
      if (!text || sendButton.disabled) return;
      appendMessage(text, 'user');
      input.value = '';
      const pending = appendMessage('Thinking…', 'bot');
      sendButton.disabled = true;
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text })
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || ('Request failed (' + response.status + ').'));
        pending.textContent = result.reply || 'Gemini returned an empty response.';
      } catch (error) {
        console.error('Portfolio chat error:', error);
        pending.textContent = error.message || 'Could not reach the chat service. Please try again.';
      } finally {
        sendButton.disabled = false;
        input.focus();
      }
    }

    sendButton.addEventListener('click', sendMessage);
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        sendMessage();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPortfolioChat, { once: true });
  } else {
    initPortfolioChat();
  }
})();`;

module.exports = async function handler(req, res) {
  if (req.method === 'GET' && req.query?.client === '1') {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.status(200).send(CLIENT_SCRIPT);
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Use GET with ?client=1 to load the chat script, or POST to send a chat message.' });
  }

  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
  if (!message) return res.status(400).json({ error: 'Please enter a message.' });
  if (message.length > 2000) {
    return res.status(413).json({ error: 'Message is too long. Please keep it under 2,000 characters.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'Gemini is not configured. Add GEMINI_API_KEY to Vercel environment variables.' });
  }

  const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: `You are the AI assistant for Lovely Rose Sagaysay's portfolio. Use the resume facts below as your knowledge base. Answer politely, accurately, and concisely. Do not invent details or imply skills/experience beyond those listed. If asked something not covered, say you don't have that information and suggest contacting Lovely Rose.

RESUME KNOWLEDGE BASE
Name: Lovely Rose R. Sagaysay (also referred to as Lovely Rose Sagaysay).
Role/profile: Bachelor of Science in Information Technology student; interested in UI/UX.
Current education: Bachelor of Science in Information Technology, Philippine Christian University Manila, 2026–present.
Previous education: Camotes National High School, Cebu; Science, Technology, Engineering, and Mathematics (STEM) strand, 2021–2023.
Summary: College IT student with fundamental knowledge of HTML, CSS, and graphic design. Motivated to learn new techniques, ideas, and technologies, and develop expertise in UI/UX.
Listed skills: Graphic design; prototyping with Figma; basic HTML.
Achievements/certificates: I.T.E Living in the 1st Era Outstanding Performance Certificate; Object-Oriented Programming (OOP) Outstanding Performance Certificate; 3rd Year College Dean's Lister; 2nd Year College Dean's Lister; 1st Year College Dean's Lister; Grade 12 Senior High School graduate with honors.
Languages: Tagalog, English, and Cebuano.
Contact details shown on the resume: +63 991 067 3075; lovely.sagaysay.coi@pcu.edu.ph; Balagtas St., Pasay City.

If a question asks for contact information, provide the relevant resume contact. Treat the resume as the source of truth for resume-specific questions. Do not claim work experience, proficiency levels, dates, or credentials that are not listed here.` }]
        },
        contents: [{ role: 'user', parts: [{ text: message }] }],
        generationConfig: { temperature: 0.5, maxOutputTokens: 512 }
      }),
      signal: AbortSignal.timeout(25000)
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const googleMessage = data.error?.message || 'No error message returned.';
      console.error('Gemini API returned status:', response.status, 'message:', googleMessage);
      const errorMessage = response.status === 404
        ? `Gemini model "${model}" was not found or is unavailable to this API key.`
        : 'Gemini could not complete the request. Please try again.';
      return res.status(502).json({ error: errorMessage });
    }
    const reply = data.candidates?.[0]?.content?.parts
      ?.map(part => part.text || '')
      .join('')
      .trim();
    if (!reply) return res.status(502).json({ error: 'Gemini returned an empty response. Please try again.' });
    return res.status(200).json({ reply });
  } catch (error) {
    console.error('Gemini request failed:', error.message);
    return res.status(502).json({ error: 'Unable to reach Gemini. Please try again in a moment.' });
  }
};
