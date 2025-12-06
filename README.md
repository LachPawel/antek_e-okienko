# Antek E-Okienko (formerly ZANT)

**HackNation 2025 Hackathon Project**

A dual-interface mobile and web application for streamlining workplace accident reporting for Polish entrepreneurs and ZUS officials.

## Architecture

- **Mobile App** (Expo React Native): Voice-first accident reporting for injured persons using Eleven Labs Conversational AI
- **Backend** (Node.js + Express): REST API with OpenAI for legal analysis
- **Dashboard** (React + Vite): ZUS Official Panel for reviewing and processing claims
- **Dashboard** (Vite React): Web interface for ZUS officials to review and approve/reject accident reports with AI recommendations
- **Shared** (TypeScript): Common types and utilities

## Tech Stack

- **Mobile**: Expo, React Native, Eleven Labs SDK, NativeWind
- **Backend**: Node.js, Express, TypeScript, Prisma, SQLite, HuggingFace API (PLLuM-12B-instruct)
- **Dashboard**: Vite, React, TypeScript, Tailwind CSS, TanStack Table
- **Package Manager**: pnpm (monorepo with workspaces)

## Quick Start

### Prerequisites

- Node.js v18+
- pnpm v8+
- iOS device or Android device for mobile testing (Expo Go not supported due to native modules)

### Installation

```bash
# Install root dependencies and all workspace dependencies
pnpm install:all

# Or manually install each workspace
pnpm install
pnpm mobile:install
pnpm backend:install
pnpm dashboard:install
pnpm shared:install
```

### Development

```bash
# Start backend + dashboard concurrently
pnpm dev

# Mobile app (requires separate terminal)
pnpm mobile:start --tunnel
# Then in another terminal:
pnpm mobile:prebuild --clean
pnpm mobile:ios --device
# or
pnpm mobile:android --device
```

### Environment Variables

Create `.env` files in each workspace:

**mobile/.env**
```
EXPO_PUBLIC_AGENT_ID=your_elevenlabs_agent_id
EXPO_PUBLIC_API_URL=http://localhost:3000/api
```

**backend/.env**
```
PORT=3000
DATABASE_URL="file:./dev.db"
HF_API_KEY=your_huggingface_api_key
HF_MODEL=CYFRAGOVPL/PLLuM-12B-instruct
AI_PROVIDER=huggingface
```

**dashboard/.env**
```
VITE_API_URL=http://localhost:3000/api
```

## Project Structure

```
antek/
├── mobile/           # Expo React Native app (citizen interface)
├── backend/          # Node.js Express API
├── dashboard/        # Vite React app (official interface)
├── shared/           # Shared TypeScript types
└── pnpm-workspace.yaml
```

## Features

### Mobile App (Mode A - Citizen)
- Voice conversation with empathetic AI assistant (Eleven Labs)
- Real-time transcription and clarifying questions
- Auto-filled "Karta Wypadku" (Accident Card)
- Submit accident reports to backend

### Dashboard (Mode B - Official)
- View pending accident reports
- AI-powered legal analysis using PLLuM (Polish LLM)
- Decision support with confidence scores
- Approve/Reject with reasoning

### Backend
- REST API for accident management
- Integration with HuggingFace PLLuM-12B-instruct
- RAG-based legal criteria verification
- Swappable AI provider architecture (HF API ↔ Local Ollama)

## Legal Criteria (ZUS Articles 12-18)

The AI analyzes three key criteria:
1. **Nagłość** (Sudden Event): Was it a sudden, unexpected incident?
2. **Przyczyna zewnętrzna** (External Cause): Was the cause external to the body?
3. **Związek z działalnością** (Business Connection): Was it related to business activity?

## Authors

- Paweł Lach
- Bartosz Idzik

## License

Proprietary - HackNation 2025 Project
