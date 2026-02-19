# Setup Guide

## Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Get Agora App ID**
   - Go to https://console.agora.io/
   - Sign up or log in
   - Create a new project
   - Copy your App ID

3. **Configure Environment**
   ```bash
   cp .env.local.example .env.local
   ```
   
   Edit `.env.local`:
   ```env
   NEXT_PUBLIC_AGORA_APP_ID=your_app_id_here
   NEXT_PUBLIC_AGORA_RTM_APP_ID=your_app_id_here
   ```

4. **Run Development Server**
   ```bash
   npm run dev
   ```

5. **Open Browser**
   Navigate to `http://localhost:3000`

## Testing the Application

1. **Open Two Browser Windows**
   - Window 1: `http://localhost:3000`
   - Window 2: `http://localhost:3000` (or use incognito mode)

2. **Join the Same Channel**
   - Both users enter the same channel name (e.g., "test-room")
   - Click "Join Call" on both windows
   - Allow camera and microphone permissions

3. **Test Gesture Recognition**
   - Show hand gestures to the camera
   - Hold gestures for 1 second to confirm
   - Check that letters appear on your screen
   - Verify that speech is heard on the remote side

## Troubleshooting

### MediaPipe Not Loading
- Ensure you're using HTTPS in production
- Check browser console for errors
- Try clearing browser cache

### Agora Connection Issues
- Verify your App ID is correct
- Check that you're not exceeding testing mode limits
- Ensure both users are using the same channel name

### Camera/Microphone Not Working
- Check browser permissions
- Try refreshing the page
- Ensure no other app is using the camera

### Gestures Not Detecting
- Ensure good lighting
- Keep hand clearly visible
- Hold gesture steady for 1 second
- Try different gestures (A, B, L, V, I, Y, C)

## Production Deployment

### Vercel Deployment

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin your-repo-url
   git push -u origin main
   ```

2. **Deploy on Vercel**
   - Go to https://vercel.com
   - Import your GitHub repository
   - Add environment variables:
     - `NEXT_PUBLIC_AGORA_APP_ID`
     - `NEXT_PUBLIC_AGORA_RTM_APP_ID`
   - Deploy

3. **Verify Deployment**
   - Test on two different devices
   - Ensure HTTPS is enabled
   - Check that gestures are detected

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_AGORA_APP_ID` | Agora RTC App ID | Yes |
| `NEXT_PUBLIC_AGORA_RTM_APP_ID` | Agora RTM App ID (can be same as RTC) | Yes |
| `NEXT_PUBLIC_AGORA_TOKEN` | RTC Token (optional for testing) | No |
| `NEXT_PUBLIC_AGORA_RTM_TOKEN` | RTM Token (optional for testing) | No |

## Supported Gestures

- **A**: Fist (all fingers closed)
- **B**: All fingers extended
- **L**: Index finger and thumb extended
- **V**: Victory sign (index and middle fingers)
- **I**: Pinky extended
- **Y**: Thumb and pinky extended
- **C**: Curved hand shape

## Browser Support

- ✅ Chrome/Edge (Recommended)
- ✅ Firefox
- ⚠️ Safari (May require additional configuration)

## Performance Tips

- Use good lighting for better gesture detection
- Keep hand steady while making gestures
- Close unnecessary browser tabs
- Use wired internet connection for better video quality
