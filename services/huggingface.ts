import axios from "axios";

const HUGGINGFACE_API_URL =
  "https://api-inference.huggingface.co/models/openai/whisper-tiny";

export const transcribeAudio = async (audioBlob: Blob) => {
  const response = await axios.post(HUGGINGFACE_API_URL, audioBlob, {
    headers: {
      Authorization: `Bearer ${process.env.HF_TOKEN}`,
      "Content-Type": "audio/wav",
    },
  });

  return response.data;
};

export const summarizeText = async (text: string) => {
  const response = await axios.post(
    "https://api-inference.huggingface.co/models/meta-llama/Meta-Llama-3-8B-Instruct",
    { inputs: text },
    {
      headers: {
        Authorization: `Bearer ${process.env.HF_TOKEN}`,
      },
    }
  );

  return response.data;
};
