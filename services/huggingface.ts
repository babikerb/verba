import axios from "axios";

const HUGGINGFACE_API_URLS = {
  whisper: "https://api-inference.huggingface.co/models/openai/whisper-large-v3-turbo",
  llama: "https://api-inference.huggingface.co/models/meta-llama/Meta-Llama-3-8B-Instruct"
};

const axiosInstance = axios.create({
  timeout: 30000,
  timeoutErrorMessage: "Request timed out"
});

export const transcribeAudio = async (audioBlob: Blob): Promise<{text: string | null}> => {
  try {
    const response = await axios.post(
      "https://api-inference.huggingface.co/models/openai/whisper-large-v3-turbo",
      audioBlob,
      {
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_HF_TOKEN}`,
          "Content-Type": "audio/wav",
        },
        params: {
          language: "en",
          task: "transcribe"
        }
      }
    );

    return {
      text: response.data?.text || null
    };
  } catch (error: any) {
    console.error("Transcription error:", error);
    return { text: null };
  }
};

export const summarizeText = async (text: string): Promise<string> => {
  try {
    const response = await axiosInstance.post(
      HUGGINGFACE_API_URLS.llama,
      { inputs: text },
      {
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_HF_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (response.data.error) {
      throw new Error(response.data.error);
    }

    return response.data[0]?.generated_text || "[No summary generated]";
  } catch (error: any) {
    console.error("Summarization error:", error);
    throw new Error(`Summarization failed: ${error.response?.data?.error || error.message}`);
  }
};