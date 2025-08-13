export class LLMModelWithApiKey {
  private model: string;
  private url: string;
  private apiKey: string;

  constructor(model: string = "deepseek-r1", urlBase: string = "", apiKey: string = "") {
    /**
     * Initializes LLM client with API Key authentication.
     * @param model - Model name
     * @param urlBase - API Server Base URL
     * @param apiKey - API Key (Required)
     */
    if (!apiKey) throw new Error("API Key is required.");
    this.model = model;
    this.url = urlBase;
    this.apiKey = apiKey;
  }

  async *queryLLM(prompt: string): AsyncGenerator<string, void, unknown> {
    /**
     * Sends a streaming request to LLM and progressively yields response content.
     * @param prompt - User input query.
     * @returns AsyncGenerator<string>: Extracted model responses in real-time.
     */
    let isAnswering = false; // Indicates transition from reasoning to response

    const payload = {
      model: this.model,
      messages: [{ role: "user", content: prompt }],
      stream: true,
    };

    const headers = {
      "Authorization": `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    };

    try {
      const response = await fetch(this.url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        yield `Error: ${response.status}, ${await response.text()}`;
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        yield "Error: Unable to read response stream.";
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      // console.log("\n" + "=".repeat(20) + " Thinking Process " + "=".repeat(20) + "\n");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep last unfinished line

        for (const line of lines) {
          const cleanLine = line.trim();
          if (!cleanLine) continue; // Skip empty lines

          // Remove "data:" prefix if present
          const jsonString = cleanLine.startsWith("data:") ? cleanLine.slice(5).trim() : cleanLine;

          try {
            const data = JSON.parse(jsonString);
            const choices = data?.choices || [{}];

            if (!Array.isArray(choices) || choices.length === 0) continue;

            const delta = choices[0]?.delta || {};

            if (!delta.reasoning_content && !delta.content) continue;

            // Print separator when switching to final response
            if (!delta.reasoning_content && !isAnswering) {
              // console.log("\n" + "=".repeat(20) + " Final Answer " + "=".repeat(20) + "\n");
              isAnswering = true;
            }

            // Output reasoning process
            if (delta.reasoning_content) {
              // console.log(delta.reasoning_content, end="", flush=true);
              // reasoningContent += delta.reasoning_content;
              yield delta.reasoning_content;
            }
            // Output final response
            else if (delta.content) {
              // console.log(delta.content, end="", flush=true);
              // answerContent += delta.content;
              yield delta.content;
            }
          } catch (error) {
            console.warn("⚠️ JSON Parsing Failed:", error);
            console.warn("🚨 Raw Data:", jsonString);
            continue; // Skip malformed JSON
          }
        }
      }
    } catch (error) {
      yield `Connection error: ${error}`;
    }
  }
}
