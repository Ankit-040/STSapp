import { HandLandmarker, FilesetResolver, HandLandmarkerResult } from "@mediapipe/tasks-vision";

export class MediaPipeHandsManager {
  private handLandmarker: HandLandmarker | null = null;
  private isInitialized: boolean = false;
  private videoElement: HTMLVideoElement | null = null;
  private onResultsCallback: ((results: HandLandmarkerResult) => void) | null = null;
  private animationFrameId: number | null = null;

  /**
   * Initialize MediaPipe Hands
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
      );

      this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numHands: 1,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      this.isInitialized = true;
    } catch (error) {
      console.error("Failed to initialize MediaPipe Hands:", error);
      throw error;
    }
  }

  /**
   * Start processing video stream
   */
  startProcessing(
    videoElement: HTMLVideoElement,
    onResults: (results: HandLandmarkerResult) => void
  ): void {
    if (!this.isInitialized || !this.handLandmarker) {
      throw new Error("MediaPipe Hands not initialized");
    }

    this.videoElement = videoElement;
    this.onResultsCallback = onResults;
    this.processFrame();
  }

  /**
   * Process a single video frame
   */
  private processFrame = (): void => {
    if (!this.videoElement || !this.handLandmarker || !this.onResultsCallback) {
      return;
    }

    const video = this.videoElement;
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      const startTimeMs = performance.now();
      const results = this.handLandmarker.detectForVideo(video, startTimeMs);
      this.onResultsCallback(results);
    }

    this.animationFrameId = requestAnimationFrame(this.processFrame);
  };

  /**
   * Stop processing
   */
  stopProcessing(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.videoElement = null;
    this.onResultsCallback = null;
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.stopProcessing();
    this.handLandmarker = null;
    this.isInitialized = false;
  }

  /**
   * Check if initialized
   */
  get initialized(): boolean {
    return this.isInitialized;
  }
}
