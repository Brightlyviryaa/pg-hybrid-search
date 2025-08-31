// Using built-in fetch API (Node.js 18+)

export async function embedTextOpenAI(text: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY tidak di-set");
  }

  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.EMBED_MODEL || "text-embedding-3-small",
      input: text
    })
  });

  if (!res.ok) {
    throw new Error(`Gagal ambil embedding: ${await res.text()}`);
  }
  
  const data = await res.json() as any;
  return data.data[0].embedding;
}