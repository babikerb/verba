class AudioProcessor extends AudioWorkletProcessor {
    process(inputs, outputs) {
      const input = inputs[0];
      if (input && input[0]) {
        this.port.postMessage({
          audioData: input[0].buffer,
          sampleRate: sampleRate
        });
      }
      return true;
    }
  }
  
  registerProcessor('audio-processor', AudioProcessor);