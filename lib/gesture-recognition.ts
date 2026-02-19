import { NormalizedLandmark } from "@mediapipe/tasks-vision";

export type GestureLetter = 'A' | 'B' | 'C' | 'L' | 'V' | 'I' | 'Y' | null;

export interface GestureState {
  currentLetter: GestureLetter;
  confidence: number;
  duration: number; // milliseconds
}

/**
 * Recognizes hand gestures from MediaPipe hand landmarks
 * Uses heuristic-based detection with finger position analysis
 */
export function recognizeGesture(landmarks: NormalizedLandmark[]): GestureLetter {
  if (!landmarks || landmarks.length < 21) {
    return null;
  }

  // Key landmark indices
  const WRIST = 0;
  const THUMB_CMC = 1;
  const THUMB_MCP = 2;
  const THUMB_IP = 3;
  const THUMB_TIP = 4;
  const INDEX_MCP = 5;
  const INDEX_PIP = 6;
  const INDEX_DIP = 7;
  const INDEX_TIP = 8;
  const MIDDLE_MCP = 9;
  const MIDDLE_PIP = 10;
  const MIDDLE_DIP = 11;
  const MIDDLE_TIP = 12;
  const RING_MCP = 13;
  const RING_PIP = 14;
  const RING_DIP = 15;
  const RING_TIP = 16;
  const PINKY_MCP = 17;
  const PINKY_PIP = 18;
  const PINKY_DIP = 19;
  const PINKY_TIP = 20;

  // Helper: Check if finger is extended (tip is above PIP joint)
  const isFingerExtended = (tip: NormalizedLandmark, pip: NormalizedLandmark, mcp: NormalizedLandmark): boolean => {
    return tip.y < pip.y && pip.y < mcp.y;
  };

  // Check finger states
  const indexExtended = isFingerExtended(
    landmarks[INDEX_TIP],
    landmarks[INDEX_PIP],
    landmarks[INDEX_MCP]
  );
  
  const middleExtended = isFingerExtended(
    landmarks[MIDDLE_TIP],
    landmarks[MIDDLE_PIP],
    landmarks[MIDDLE_MCP]
  );
  
  const ringExtended = isFingerExtended(
    landmarks[RING_TIP],
    landmarks[RING_PIP],
    landmarks[RING_MCP]
  );
  
  const pinkyExtended = isFingerExtended(
    landmarks[PINKY_TIP],
    landmarks[PINKY_PIP],
    landmarks[PINKY_MCP]
  );

  // Thumb extension check (different logic - check x position)
  const thumbTip = landmarks[THUMB_TIP];
  const thumbIP = landmarks[THUMB_IP];
  const thumbMCP = landmarks[THUMB_MCP];
  const thumbExtended = Math.abs(thumbTip.x - thumbIP.x) > 0.05 || 
                        (thumbTip.y < thumbIP.y && thumbIP.y < thumbMCP.y);

  // Letter A: Fist (all fingers closed)
  if (!indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
    return 'A';
  }

  // Letter B: All four fingers extended, thumb may be closed
  if (indexExtended && middleExtended && ringExtended && pinkyExtended) {
    return 'B';
  }

  // Letter L: Index and thumb extended, others closed
  if (indexExtended && thumbExtended && !middleExtended && !ringExtended && !pinkyExtended) {
    return 'L';
  }

  // Letter V: Victory sign (index and middle extended, others closed)
  if (indexExtended && middleExtended && !ringExtended && !pinkyExtended && !thumbExtended) {
    return 'V';
  }

  // Letter I: Pinky extended, others closed
  if (!indexExtended && !middleExtended && !ringExtended && pinkyExtended && !thumbExtended) {
    return 'I';
  }

  // Letter Y: Thumb and pinky extended, others closed
  if (thumbExtended && !indexExtended && !middleExtended && !ringExtended && pinkyExtended) {
    return 'Y';
  }

  // Letter C: Curved hand (thumb and fingers curved)
  const thumbIndexDistance = Math.abs(thumbTip.x - landmarks[INDEX_TIP].x);
  const thumbMiddleDistance = Math.abs(thumbTip.x - landmarks[MIDDLE_TIP].x);
  const indexMiddleDistance = Math.abs(landmarks[INDEX_TIP].y - landmarks[MIDDLE_TIP].y);
  
  if (thumbExtended && indexExtended && middleExtended && 
      thumbIndexDistance > 0.08 && thumbMiddleDistance > 0.08 &&
      indexMiddleDistance < 0.1) {
    return 'C';
  }

  return null;
}

/**
 * Gesture debouncer to prevent flickering
 * Only confirms a gesture if it's held for a minimum duration
 */
export class GestureDebouncer {
  private currentGesture: GestureLetter = null;
  private startTime: number = 0;
  private readonly minDuration: number; // milliseconds

  constructor(minDurationMs: number = 1000) {
    this.minDuration = minDurationMs;
  }

  /**
   * Process a new gesture detection
   * Returns the confirmed gesture if held long enough, null otherwise
   */
  process(newGesture: GestureLetter): GestureLetter | null {
    const now = Date.now();

    if (newGesture === this.currentGesture) {
      // Same gesture continues
      const duration = now - this.startTime;
      if (duration >= this.minDuration) {
        return this.currentGesture;
      }
      return null;
    } else {
      // Gesture changed
      this.currentGesture = newGesture;
      this.startTime = now;
      return null;
    }
  }

  /**
   * Reset the debouncer
   */
  reset(): void {
    this.currentGesture = null;
    this.startTime = 0;
  }

  /**
   * Get current gesture state
   */
  getState(): GestureState {
    return {
      currentLetter: this.currentGesture,
      confidence: this.currentGesture ? 1.0 : 0.0,
      duration: this.currentGesture ? Date.now() - this.startTime : 0,
    };
  }
}
