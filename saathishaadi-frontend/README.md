# SaathiShaadi Frontend

Bihar ka Apna Vivah Portal - React Frontend

## Setup

```bash
npm install
cp .env.example .env
# Edit .env with your backend URL
npm start
```

## Build for Production
```bash
npm run build
```

## Features
- ✅ OTP Login/Register (Phone-based)
- ✅ Profile Creation with Photo
- ✅ Browse & Filter Profiles (Religion, Age, District)
- ✅ Marriage Proposal System
- ✅ Real-time Chat (Socket.io)
- ✅ Voice & Video Calls (WebRTC)
- ✅ Bihar-specific: All 38 districts, local castes
- ✅ Advertisement banners
- ✅ Hindi + English UI

## Pages
- `/` - Home
- `/login` - Login with OTP
- `/register` - Register with OTP
- `/browse` - Browse profiles
- `/profile` - My profile
- `/profile/:id` - Others profile
- `/proposals` - Manage proposals
- `/chats` - All conversations
- `/chat/:userId` - Chat with someone
- `/call/:userId?type=video` - Video/Voice call

## Test OTP
Use `123456` as OTP in development mode.

## Deployment (Vercel)
1. Push to GitHub
2. Import repo on Vercel
3. Set `REACT_APP_API_URL` in Vercel environment variables
4. Deploy!
