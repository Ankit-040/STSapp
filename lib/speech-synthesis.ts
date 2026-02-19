/**
 * Speech synthesis manager using Web Speech API
 */
export class SpeechSynthesisManager {
  private synth: SpeechSynthesis;
  private lastSpeechTime: number = 0;
  private readonly throttleMs: number = 1000; // Minimum time between speeches

  constructor() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      this.synth = window.speechSynthesis;
    } else {
      throw new Error("Speech synthesis not supported in this browser");
    }
  }

  /**
   * Speak text with throttling to prevent rapid repetition
   */
  speak(text: string, options?: {
    rate?: number;
    pitch?: number;
    volume?: number;
  }): void {
    const now = Date.now();
    
    // Throttle to prevent rapid speech
    if (now - this.lastSpeechTime < this.throttleMs) {
      return;
    }

    // Cancel any ongoing speech
    this.synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options?.rate ?? 0.9;
    utterance.pitch = options?.pitch ?? 1.0;
    utterance.volume = options?.volume ?? 1.0;

    utterance.onend = () => {
      this.lastSpeechTime = Date.now();
    };

    utterance.onerror = (error) => {
      console.error("Speech synthesis error:", error);
    };

    this.synth.speak(utterance);
  }

  /**
   * Stop current speech
   */
  stop(): void {
    this.synth.cancel();
  }

  /**
   * Check if speech is supported
   */
  static isSupported(): boolean {
    if (typeof window === "undefined") {
      return false;
    }
    return "speechSynthesis" in window;
  }
}
