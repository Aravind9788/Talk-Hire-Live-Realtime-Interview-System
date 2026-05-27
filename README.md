# 🎙️ TalkHire — Real-Time AI Interview Agent

> AI-powered real-time technical interview simulator with live voice conversations, adaptive questioning, candidate evaluation, and personalized feedback.

![Python](https://img.shields.io/badge/Python-3.10+-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-Backend-green)
![OpenAI](https://img.shields.io/badge/OpenAI-Realtime-orange)
![LiveKit](https://img.shields.io/badge/LiveKit-Voice-purple)
![License](https://img.shields.io/badge/License-MIT-yellow)

---

## 🚀 Overview

**TalkHire** is a production-grade AI interview agent that simulates realistic technical interviews through live voice conversations.

It conducts adaptive mock interviews across multiple interview rounds including:

- Technical Screening
- Coding Interviews
- System Design
- Debugging / Code Review
- Behavioral Interviews
- Resume Screening
- Role-Specific Technical Evaluation
- Final Debrief & Feedback

The system dynamically adapts interview difficulty based on:

- Candidate resume
- Job role
- Interview round
- Candidate performance
- Previous session history

TalkHire provides a realistic interview environment with instant evaluation, rubric-based scoring, and structured feedback.

---

## ✨ Features

### 🎙 Real-Time Voice AI Interviewing
- Live low-latency voice conversations
- Human-like AI interviewer interactions
- Natural speech flow
- Voice activity detection for smart turn handling

---

### 🧠 Adaptive Interview Intelligence
- Dynamic interview question generation
- Difficulty adjustment (Easy / Medium / Hard)
- Resume-aware personalization
- Role-specific technical questioning
- Context-aware follow-up questions

---

### 📄 Resume Parsing
Supports:

- PDF resumes
- DOCX resumes
- TXT resumes

Extracts:

- Skills
- Experience
- Education
- Technical background

---

### 📊 Candidate Evaluation Engine
Rubric-based assessment for:

- Problem solving
- Code fluency
- System design thinking
- Communication
- Technical fundamentals
- Debugging capability
- Collaboration
- Leadership
- Decision making

---

### 🔁 Multi-Round Interview Simulation
Supported interview rounds:

- Resume Screening
- Technical Fundamentals
- Coding Interview
- System Design
- Role-Specific Deep Dive
- Behavioral / HR Interview
- Targeted Debrief

---

### 💾 Session Persistence
- Resume previous sessions
- Store candidate progress
- Historical interview tracking
- Session continuity support

---

### ⚡ Low-Latency Realtime Architecture
Built for sub-second responsiveness using:

- OpenAI Realtime API
- LiveKit
- FastAPI
- Async Python architecture
- Silero Voice Activity Detection

---

## 🏗 Architecture

```text
Candidate Voice Input
        │
        ▼
Voice Activity Detection (Silero)
        │
        ▼
LiveKit Realtime Audio Transport
        │
        ▼
OpenAI Realtime Interview Agent
        │
        ├── Resume Parser
        ├── Session State Manager
        ├── Adaptive Question Engine
        ├── Candidate Evaluation Engine
        └── Rubric Scoring System
        │
        ▼
Live Voice Response + Feedback
```

---

## 🛠 Tech Stack

### Backend
- Python
- FastAPI
- AsyncIO

### AI / LLM
- OpenAI Realtime API
- GPT-4o Realtime
- GPT-4o Mini

### Voice Infrastructure
- LiveKit
- Silero VAD
- Text-to-Speech
- Speech-to-Text

### Resume Processing
- PyPDF2
- python-docx

### State Management
- JSON-based session persistence

### Deployment Ready
- Docker
- Environment-based config
- CORS support
- Production API architecture

---

## 📂 Project Structure

```bash
talkhire/
├── backend/
│   ├── bot/
│   │   ├── agent.py
│   │   ├── voice.py
│   │   ├── resume_parser.py
│   │   ├── sessions.py
│   │   ├── silero_vad.py
│   │   ├── prompts/
│   │   └── audio/
│   ├── main.py
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
│
├── docs/
├── docker/
└── README.md
```

---

## ⚙ Installation

### Clone Repository

```bash
git clone https://github.com/yourusername/talkhire.git
cd talkhire
```

---

### Create Virtual Environment

```bash
python -m venv venv
```

Linux/macOS:

```bash
source venv/bin/activate
```

Windows:

```bash
venv\Scripts\activate
```

---

### Install Dependencies

```bash
pip install -r requirements.txt
```

---

## 🔐 Environment Variables

Create `.env`

```env
OPENAI_API_KEY=
AZURE_OPENAI_API_KEY=
AZURE_OPENAI_ENDPOINT=
AZURE_OPENAI_API_VERSION=
AZURE_OPENAI_REALTIME_DEPLOYMENT=
AZURE_OPENAI_TEXT_DEPLOYMENT=

LIVEKIT_URL=
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=

OPENAI_VOICE=alloy
SESSION_PERSIST_DIR=.sessions
MAX_CALL_DURATION_SECS=1200
USER_IDLE_TIMEOUT_SECS=300
```

---

## ▶ Running Locally

```bash
uvicorn main:app --reload
```

Server:

```bash
http://localhost:8000
```

---

## API Endpoints

### Start Interview Session
```http
POST /session/create
```

### Upload Resume
```http
POST /resume/upload
```

### Generate Token
```http
POST /token
```

### Session Summary
```http
GET /session/summary
```

---

## Example Workflow

1. Upload resume
2. Select target role
3. Choose interview round
4. Start live voice interview
5. Answer AI-generated questions
6. Receive evaluation report
7. Review improvement areas

---

## Production Deployment

Recommended deployment stack:

- Docker
- Nginx
- Gunicorn / Uvicorn Workers
- LiveKit Cloud / Self-hosted LiveKit
- Azure OpenAI / OpenAI API

Example:

```bash
docker compose up --build
```

---

## Performance Goals

- Sub-second AI response latency
- Real-time voice streaming
- Multi-session concurrency
- Persistent session recovery
- Production-grade async handling

---

## Use Cases

- Interview preparation
- Engineering candidate assessment
- AI interview simulation
- HR tech platforms
- EdTech interview training
- Developer coaching

---

## GitHub Topics

```txt
ai
artificial-intelligence
voice-ai
realtime-ai
interview-agent
mock-interview
technical-interview
openai
livekit
fastapi
python
llm
generative-ai
resume-parser
candidate-evaluation
system-design
coding-interview
behavioral-interview
```

---

## Future Improvements

- Multi-language interviews
- Code editor integration
- Video interview mode
- Emotion analysis
- Interview analytics dashboard
- SaaS multi-tenant support
- Team recruiter dashboard
- ATS integration

---

## Contributing

Contributions are welcome.

```bash
fork → branch → commit → PR
```

---

## License

MIT License

---

## Author

**Aravind**

AI/ML Engineer | Full Stack Developer

---



## Star the Repository ⭐

If this project helps you, consider starring the repository.
