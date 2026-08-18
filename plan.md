# 🎙️ TalkHire — Complete Real-Time AI Interview Platform Plan

> **Next-Generation Real-Time AI Technical Interview Simulator** powered by **Azure OpenAI Realtime (`gpt-realtime-mini`)** and **LiveKit WebRTC Low-Latency Voice Engine**.

---

## 📌 1. Executive Summary & Core Objective

**TalkHire** simulates realistic, high-pressure technical interviews conducted by top-tier tech companies (Google, Meta, Amazon, Microsoft, High-Growth Startups).

Unlike standard text-based interview bots or delayed audio chatbots, TalkHire offers:
1. **Sub-Second Bi-Directional Voice Conversations** via Azure OpenAI Realtime WebSocket + LiveKit RTC.
2. **True Interactive Turn-Taking**: Natural speech flow, voice activity detection (VAD), and natural candidate interruption.
3. **Dual Ingestion Engine (Resume + Job Description)**: Probes both the candidate's past experience and the specific requirements/tech stack of the target **Job Description (JD)**.
4. **Multi-Round Technical Simulation**: Coding (DSA), System Design, Debugging, Behavioral, and Resume/JD Deep-Dives.
5. **Dual Technical + Communication Evaluation**: Scored on algorithmic accuracy, architectural depth, thought articulation, structured communication, and hint handling.

---

## 🔒 2. Port Configuration & Environment Constraints

### ⚠️ Prohibited Ports Rule
The following ports **MUST NOT BE USED** under any circumstance:
- `5432` (PostgreSQL)
- `6379` (Redis)
- `8000` (FastAPI / Django default)
- `8001` (Auxiliary backend)
- `8002` (Auxiliary backend)
- `8080` (HTTP alternate / Cloud Run local default)
- `7880` (LiveKit default local HTTP)

### ✅ Safe & Active Port Allocations

| Service | Configured Port | Purpose | Status |
| :--- | :--- | :--- | :--- |
| **FastAPI Core Backend** | **`7862`** | REST Endpoints, Resume/JD Parser, LiveKit Bot Runner | ✅ Safe & Configured |
| **Vite Frontend Dev** | **`3001`** (or `5173`) | React + Tailwind Studio UI | ✅ Safe & Configured |
| **LiveKit Signaling (Self-Hosted)** | **`7881`** | WebSocket + HTTP API (replaces prohibited 7880) | ✅ Safe & Configured |
| **LiveKit WebRTC Media (Self-Hosted)** | **`7882`** (UDP) | Real-time audio transport | ✅ Safe & Configured |
| **LiveKit Cloud (Alternate)** | Cloud / Remote URL | Real-time audio transport (no local port) | ✅ Safe & Isolated |

---

## 🏗️ 3. End-to-End System Architecture

```text
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                TALKHIRE RUNTIME ARCHITECTURE                            │
└─────────────────────────────────────────────────────────────────────────────────────────┘

   CANDIDATE CLIENT (Browser)                       TALKHIRE FASTAPI BACKEND (Port 7862)
 ┌────────────────────────────────────────┐       ┌──────────────────────────────────────┐
 │ • WebRTC Audio Stream (Mic / Speaker)  │ <===> │ • LiveKit Token Minting              │
 │ • Real-Time Audio Waveform Visualizer  │       │ • Prompt & Question Selection Engine │
 │ • In-Browser Live Code Editor          │       │ • Resume + JD Dual Analyzer          │
 │ • Streaming Live Transcript Feed       │       │ • Background Transcript Evaluator    │
 │ • "Ask for Hint" / "Repeat" Buttons    │       └──────────────────┬───────────────────┘
 └──────────────────┬─────────────────────┘                          │
                    │ (WebRTC Data Channel / Audio)                  │
                    ▼                                                ▼
 ┌────────────────────────────────────────┐       ┌──────────────────────────────────────┐
 │             LIVEKIT SERVER             │ <===> │         AZURE OPENAI REALTIME        │
 │ • Low-Latency Audio Mixer              │       │ • `gpt-realtime-mini` Deployment     │
 │ • Silero / Server VAD Turn Handling    │       │ • Direct Audio-to-Audio Reasoning    │
 │ • Multi-participant Data Topics        │       │ • Live Micro-Prompt Steering         │
 └────────────────────────────────────────┘       └──────────────────────────────────────┘
```

---

## 📄 4. Dual Ingestion: Resume + Job Description (JD) Alignment Engine

In a real technical interview, hiring managers do not just read the resume; they compare the **Candidate's Background** against the **Job Description's Required Tech Stack & Responsibilities**.

```text
┌───────────────────────────┐      ┌───────────────────────────┐
│     CANDIDATE RESUME      │      │      JOB DESCRIPTION      │
│  (Skills, Past Projects)  │      │  (Must-haves, Tech Stack) │
└─────────────┬─────────────┘      └─────────────┬─────────────┘
              │                                  │
              └─────────────────┬────────────────┘
                                ▼
         ┌──────────────────────────────────────────────┐
         │     AI RESUME ↔ JD MATCH & GAP ENGINE        │
         ├──────────────────────────────────────────────┤
         │ 1. Match Score (%)                           │
         │ 2. Core Overlaps (Strengths)                 │
         │ 3. Missing / Weak JD Requirements (Gaps)    │
         │ 4. Tailored Probe Questions Generated        │
         └──────────────────────────────────────────────┘
```

### How Resume + JD Powers the Interview:
1. **Targeted JD Probing**: If the JD asks for *Distributed Caching with Redis* and *Kafka Event Streaming*, but the resume only lists *REST APIs*, the AI interviewer actively questions the candidate on event-driven architecture and cache invalidation strategies to test if they can fulfill the role.
2. **Realistic Scenario Setup**: The problem statements are framed in the context of the target job (e.g. for an E-commerce JD: *"At our company, flash sales cause 100x traffic spikes. How would you design the checkout queue?"*).

---

## 🔁 5. Total Interview Rounds Catalog

TalkHire supports 6 distinct, customizable interview rounds:

### Round 1: 📄 Resume & JD Alignment Deep-Dive
* **Goal**: Cross-examine past projects and evaluate candidate fit against the target Job Description.
* **Format**: AI tests candidate's real engineering experience (e.g. *"In your resume you built a microservice with FastAPI, but this JD requires handling 50k RPS with Go/gRPC. How would you architect this system to meet our concurrency SLAs?"*).
* **Skills Tested**: Technical depth, handling trade-offs, architecture decisions, honesty.

### Round 2: 💻 Coding & Data Structures (DSA)
* **Goal**: Algorithmic problem solving with live coding and thought articulation.
* **Format**:
  1. AI presents problem statement vocally + displays it on screen.
  2. Candidate asks clarifying questions (constraints, negative numbers, edge cases).
  3. Candidate explains brute-force vs. optimal approach (Time/Space Big-O).
  4. Candidate writes code in the live in-browser editor.
  5. AI prompts candidate to trace a dry run and probes boundary conditions (e.g., empty inputs, overflow).

### Round 3: 🏛️ System Design & Distributed Architecture
* **Goal**: Evaluate high-level architecture, scalability, trade-offs, and failure recovery.
* **Format**:
  - Open-ended prompt based on JD domain (e.g., *"Design a Real-Time Notification Engine"* or *"Design an Order Processing System with Idempotency"*).
  - 4-Step Structure: Functional/Non-functional Requirements -> Capacity Estimation -> High-Level Architecture -> Deep Dive on Bottlenecks (Caching, DB Sharding, Replicas).

### Round 4: 🐛 Live Code Review & Bug Hunting
* **Goal**: Test attention to detail, concurrency traps, and code quality.
* **Format**:
  - Candidate is given a short snippet of code containing subtle bugs (e.g., race condition in async code, SQL injection, memory leak in event listeners).
  - Candidate analyzes the code and explains the bug and the fix aloud to the AI.

### Round 5: 🤝 Behavioral & Leadership (STAR Method)
* **Goal**: Assess communication, teamwork, handling conflicts, and cultural alignment.
* **Format**:
  - Questions modeled after Google Googliness and Amazon Leadership Principles (e.g., *"Tell me about a time you disagreed with a senior engineer on a technical decision"*).
  - Candidate answers using **STAR** (Situation, Task, Action, Result). AI detects if any STAR component is missing and prompts for it.

### Round 6: 🎯 JD-Specific Technical Deep-Dive
* **Goal**: Niche questions tailored to the exact requirements in the uploaded Job Description.
  - **Frontend JD**: DOM rendering pipeline, Web Workers, React 19 concurrent features, SSR hydration.
  - **Backend JD**: Concurrency models (Goroutines/AsyncIO), ACID vs. BASE, Database indexing internals.
  - **AI / ML JD**: Attention mechanism, vector embeddings, RAG optimization, model quantization.
  - **DevOps / Cloud JD**: Kubernetes controllers, Terraform state locking, zero-downtime deployments.

---

## 🗣️ 6. Communication Skills Evaluation Engine

Communication is scored as a first-class metric alongside technical correctness:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                    COMMUNICATION SCORING FRAMEWORK                          │
├───────────────────────────────┬───────┬─────────────────────────────────────┤
│ Dimension                     │ Weight│ What the AI Evaluates               │
├───────────────────────────────┼───────┼─────────────────────────────────────┤
│ 1. Structured Thinking (STAR) │ 35%   │ Clear problem definition, structured│
│                               │       │ roadmap before answering.           │
├───────────────────────────────┼───────┼─────────────────────────────────────┤
│ 2. "Thinking Out Loud"        │ 25%   │ Explaining rationale continuously   │
│                               │       │ instead of awkward dead silence.    │
├───────────────────────────────┼───────┼─────────────────────────────────────┤
│ 3. Active Listening & Hints   │ 20%   │ Absorbing interviewer clues and     │
│                               │       │ adapting approach without defense.  │
├───────────────────────────────┼───────┼─────────────────────────────────────┤
│ 4. Precision & Terminology    │ 20%   │ Crisp explanations, using accurate  │
│                               │       │ CS terms, avoiding filler rambling. │
└───────────────────────────────┴───────┴─────────────────────────────────────┘
```

---

## 🎨 7. UI / UX Redesign Specification

### Aesthetic Rules:
- **Theme**: Ultra-clean Dark Studio Mode (Deep slate `#090d16` with crisp emerald/indigo accents).
- **Typography**: Inter (UI text) + JetBrains Mono (Code & Transcripts).
- **No Cliché Tropes**: Zero tacky purple glowing borders, zero cluttered icon bento boxes.

### Screens & Components:
1. **Onboarding / Prep Screen**:
   - Role & Experience Level Selector (Junior, Mid, Senior, Staff).
   - Track Preset & Target Company Selector (Google, Meta, Amazon, Startup).
   - Interviewer Persona Selector (Friendly & Encouraging vs. Strict Bar Raiser).
   - **Dual Ingestion**:
     * Resume Upload (PDF / DOCX / TXT)
     * Job Description (JD) Paste / File Upload
     * Instant Match Score & Skill Gap Preview card
   - **Interactive 5-Second Mic Test** (Ensures browser audio input works before connecting).
2. **Live Interview Studio**:
   - Real-time WebRTC Audio Spectrum Visualizer (animated directly from audio levels).
   - Real-time Transcription Stream with speaker badges.
   - Interactive Live Code & Architecture Scratchpad.
   - Quick Action Bar:
     - 💡 *Request a Hint*
     - 🔄 *Repeat Question*
     - ⏸️ *Give me a moment to think*
     - 🎙️ *Mute / Unmute Mic*
     - 🛑 *End Interview*
3. **Post-Interview Debrief Modal & Report**:
   - Google-style 1.0 - 4.0 Rubric Scorecard.
   - Overall Verdict (`Strong Hire`, `Hire`, `Leaning No Hire`, `No Hire`).
   - Detailed Strengths vs. Improvement Areas Breakdown.
   - JD Fit Analysis: How well the candidate proved capability for the target JD.
   - Personalized Gap-Closing Study Roadmap.
   - One-Click PDF / Markdown / JSON Scorecard Export.

---

## 🧪 8. Step-by-Step Implementation & Verification Roadmap

Each feature is built and validated with dedicated test files:

```text
Phase 1: Backend Config & Azure OpenAI Realtime Connection           ✅ DONE (5 tests)
         ├── tests/test_phase1_config.py
         └── Verified: .env loading, deployment name, port 7862 binding,
             prohibited port safety, token minting, health endpoint.

Phase 2: Resume + JD Dual Ingestion & Gap Analysis Engine            ✅ DONE (4 tests)
         ├── tests/test_phase2_resume_jd.py
         └── Verified: text extraction, skill matching, gap detection,
             probe question generation, /api/resume/analyze endpoint.

Phase 3: Evaluator, Communication Scoring & Action Plans             ✅ DONE (3 tests)
         ├── tests/test_phase3_evaluator.py
         └── Verified: rubric grading, communication score, auto_grade_transcript
             with strengths, blindspots, and action plan generation.

Phase 4: LiteParse Resume Parser + LiveKit Self-Hosted Docker        ✅ DONE (13 tests)
         ├── tests/test_phase4_liteparse_livekit.py
         ├── bot/resume_parser.py — Rewritten with LiteParse primary + PyPDF2 fallback
         ├── livekit_infra/livekit.yaml — Safe port 7881 (not prohibited 7880)
         ├── livekit_infra/docker-compose.livekit.yml — Full Docker Compose stack
         ├── livekit_infra/Dockerfile.backend — Python 3.12 slim container
         └── livekit_infra/config.py — Python key generator & port validator

Phase 5: Frontend UI/UX Studio Redesign (Vite + React)              ✅ DONE (build passes)
         ├── frontend/src/components/home/Onboarding.tsx — Full redesign
         ├── frontend/src/components/CandidateMonitor.tsx — Full redesign
         ├── frontend/src/App.tsx — Updated to pass JD, company style, persona
         └── Verified: `pnpm run build` compiles zero errors.

Core:    Question Engine, Session Lifecycle, Audio Transport         ✅ DONE (10 tests)
         ├── tests/test_core.py (7 tests)
         └── tests/test_audio_transport.py (3 tests)
```

### Total Test Results: **35 / 35 PASSED** ✅

---

## 🐳 9. LiveKit Self-Hosted Docker Deployment

### Architecture
```text
┌──────────────────────────────────────────────────────────────────────┐
│                    DOCKER COMPOSE STACK                               │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────────────────┐  ┌────────────────────────────────┐  │
│  │   livekit/livekit-server   │  │      talkhire-backend          │  │
│  │   (Self-Hosted SFU)        │  │      (FastAPI + Frontend)      │  │
│  │                            │  │                                │  │
│  │   Port 7881 (Signaling)    │  │   Port 7862 (API + Static)    │  │
│  │   Port 7882 (WebRTC UDP)   │  │                                │  │
│  │   Host Networking Mode     │  │   Depends on: livekit-server   │  │
│  └────────────────────────────┘  └────────────────────────────────┘  │
│                                                                      │
│  PROHIBITED PORTS NEVER USED: 5432, 6379, 8000, 8001, 8002, 8080, 7880  │
└──────────────────────────────────────────────────────────────────────┘
```

### Commands
```bash
# Check LiveKit port safety and unique API credentials
python -m livekit_infra.config

# Launch LiveKit SFU + TalkHire Backend via Docker Compose
docker compose -f livekit_infra/docker-compose.livekit.yml up -d

# View live container logs
docker compose -f livekit_infra/docker-compose.livekit.yml logs -f

# Stop and clean up containers
docker compose -f livekit_infra/docker-compose.livekit.yml down
```

---

## 📦 10. Resume Parser Stack (LiteParse)

**Primary**: `liteparse` (by LlamaIndex) — Fast, local-first, Rust-native PDF extraction.
**Fallback**: `PyPDF2` for PDFs, `python-docx` for DOCX, raw UTF-8 decode for TXT.

```python
# Extraction priority chain:
# 1. LiteParse (liteparse.LiteParse().parse(path).text) → PDF/DOCX
# 2. PyPDF2 (PdfReader) → PDF fallback
# 3. python-docx (Document) → DOCX fallback
# 4. bytes.decode("utf-8") → Plain text / last resort
```

---
*Created for TalkHire Real-Time Technical Interview Platform.*

