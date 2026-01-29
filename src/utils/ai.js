const Groq = require('groq-sdk');

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

module.exports = {
    generateResponse: async (query, context = "") => {
        try {
            const chatCompletion = await groq.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: "You are Supreme AI, a helpful support assistant. Use the provided context to answer the user's question. If you don't know the answer, be polite and suggest they wait for a human staff member."
                    },
                    {
                        role: "user",
                        content: `Context: ${context}\n\nQuestion: ${query}`
                    }
                ],
                model: "llama3-8b-8192",
                temperature: 0.7,
                max_tokens: 500
            });

            return chatCompletion.choices[0].message.content;
        } catch (error) {
            console.error('Groq AI Error:', error);
            return null;
        }
    },
    checkHealth: async () => {
        try {
            await groq.models.list();
            return true;
        } catch (error) {
            return false;
        }
    }
};
