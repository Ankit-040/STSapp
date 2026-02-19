# Sign Language to Speech Video Call

A production-ready real-time sign language to speech video calling application built with Next.js, Agora RTC, and MediaPipe Hands.

## Features

- **Video Calling**: WebRTC-based peer-to-peer video communication using Agora RTC SDK
- **Real-time Gesture Detection**: MediaPipe Hands integration for hand tracking
- **Alphabet Recognition**: Heuristic-based recognition of basic hand gestures (A, B, C, L, V, I, Y)
- **Gesture Debouncing**: 1-second hold requirement to prevent flickering
- **Text-to-Speech**: Automatic speech synthesis on the receiver's end using Web Speech API
- **Real-time Messaging**: Agora RTM for low-latency text transmission
- **Modern UI**: Clean, responsive interface built with Tailwind CSS and Shadcn UI
- **Client-side Processing**: All AI processing happens locally for minimal latency

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn UI
- **Video Calling**: Agora RTC SDK (`agora-rtc-react`)
- **Messaging**: Agora RTM SDK (`agora-rtm-react`)
- **Hand Tracking**: MediaPipe Hands (`@mediapipe/tasks-vision`)

## Prerequisites

- Node.js 18+ and npm
- Agora account (free tier available)
- Modern web browser with camera and microphone access
- HTTPS connection (required for WebRTC and MediaPipe in production)

## Setup

1. **Clone and install dependencies**:
   ```bash
   npm install
   ```

2. **Get Agora App ID**:
   - Sign up at [Agora Console](https://console.agora.io/)
   - Create a new project
   - Copy your App ID

3. **Configure environment variables**:
   ```bash
   cp .env.local.example .env.local
   ```
   
   Edit `.env.local` and add your Agora App ID:
   ```env
   NEXT_PUBLIC_AGORA_APP_ID=your_agora_app_id_here
   NEXT_PUBLIC_AGORA_RTM_APP_ID=your_agora_app_id_here
   ```

4. **Run the development server**:
   ```bash
   npm run dev
   ```

5. **Open your browser**:
   Navigate to `http://localhost:3000`

## How to Use

1. **Start the Application**: Run `npm run dev` and open the app in your browser
2. **Join a Channel**: Enter a channel name (e.g., "room-123") and click "Join Call"
3. **Share Channel Name**: Share the same channel name with the person you want to call
4. **Make Gestures**: Show hand gestures to your camera:
   - **A**: Fist (all fingers closed)
   - **B**: All fingers extended
   - **L**: Index finger and thumb extended
   - **V**: Victory sign (index and middle fingers extended)
   - **I**: Pinky extended
   - **Y**: Thumb and pinky extended
   - **C**: Curved hand shape
5. **Hold Gesture**: Hold the gesture for 1 second to confirm detection
6. **Receive Speech**: When gestures are detected, they will be automatically spoken on the remote side

## Deployment

### Deploy to Vercel

1. **Push to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin your-repo-url
   git push -u origin main
   ```

2. **Deploy on Vercel**:
   - Go to [Vercel](https://vercel.com/)
   - Import your GitHub repository
   - Add environment variables:
     - `NEXT_PUBLIC_AGORA_APP_ID`
     - `NEXT_PUBLIC_AGORA_RTM_APP_ID`
   - Deploy

### Environment Variables for Production

Make sure to set these in your Vercel project settings:
- `NEXT_PUBLIC_AGORA_APP_ID`: Your Agora App ID
- `NEXT_PUBLIC_AGORA_RTM_APP_ID`: Your Agora RTM App ID (can be same as RTC App ID)

## Project Structure

```
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Main page
│   └── globals.css         # Global styles
├── components/
│   ├── ui/                 # Shadcn UI components
│   └── video-call.tsx      # Main video call component
├── lib/
│   ├── agora-config.ts     # Agora configuration
│   ├── gesture-recognition.ts  # Gesture recognition logic
│   ├── mediapipe-hands.ts # MediaPipe Hands manager
│   ├── speech-synthesis.ts    # Speech synthesis manager
│   └── utils.ts           # Utility functions
└── public/                 # Static assets
```

## Technical Details

### Gesture Recognition

The application uses heuristic-based gesture recognition that analyzes finger positions relative to hand landmarks. The recognition logic checks:
- Finger extension states (tip position relative to PIP joints)
- Thumb position
- Relative distances between landmarks

### Debouncing

A `GestureDebouncer` class ensures gestures are only confirmed if held for at least 1 second, preventing flickering and false positives.

### Data Flow

1. MediaPipe Hands processes local video stream
2. Gesture recognition analyzes hand landmarks
3. Confirmed gestures are sent via Agora RTM
4. Remote side receives message and triggers speech synthesis

## Browser Compatibility

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: May require additional configuration for WebRTC

## Limitations

- Gesture recognition is heuristic-based and may not be 100% accurate
- Requires good lighting and clear hand visibility
- Works best with one hand in frame
- Some gestures may be confused with similar hand shapes
- Testing mode (without tokens) has limitations on concurrent users

## Future Improvements

- Machine learning model for more accurate gesture recognition
- Support for more sign language letters and words
- Better error handling and connection management
- Mobile device optimization
- Recording and playback features
- Multi-hand gesture support

## License

MIT

## Support

For issues related to:
- **Agora SDK**: Check [Agora Documentation](https://docs.agora.io/)
- **MediaPipe**: Check [MediaPipe Documentation](https://developers.google.com/mediapipe)
- **Next.js**: Check [Next.js Documentation](https://nextjs.org/docs)
