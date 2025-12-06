## Math Learning Platform

An **AI-powered math learning platform** designed for middle-school and high-school students.  
It combines an AI tutor chat interface, step-by-step explanations, practice generation, and learning analytics to help students systematically master math concepts.

The frontend is built with **Next.js 15 + React 19**, the backend uses **Prisma + SQLite**, and the system integrates multiple LLM providers with **LangChain / LangSmith** for tracing and optimization.  
Optionally, it can connect to the local math tool service in this repo: `MathMCP`.

---

### Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [MathMCP Subproject (Optional, Local Math Service)](#mathmcp-subproject-optional-local-math-service)
- [Project Structure](#project-structure)
- [Deployment Notes](#deployment-notes)
- [How to Publish to GitHub](#how-to-publish-to-github)
- [License](#license)

---

### Features

- **AI Math Tutor Chat Interface**
  - Multiple modes: solving (`solve`), tutoring (`tutor`), practice (`practice`), and answer checking (`check`)
  - Streaming responses with Markdown / LaTeX rendering for math formulas
  - One-click: regenerate answer, provide an alternative method, generate practice questions, or create a Mermaid flowchart to visualize the solution steps

- **Learning Community Feed**
  - Card-style posts for study notes, tips, and solution ideas
  - Likes, bookmarks, and topic tags (algebra, geometry, calculus, contests, etc.)

- **Learning Analytics & Error Tracking**
  - Tracks conversations and problems solved, including total practice count, accuracy rate, and study time
  - Analyzes mistakes and related knowledge points to generate learning suggestions

- **Multi-language & UX Optimized Interface**
  - Built-in language options: `Traditional Chinese / Simplified Chinese / English`
  - Mobile-first design with bottom navigation, fixed input bar, and side learning center

- **AI Backend & Tooling Integration**
  - Supports multiple LLM providers: Poe, DeepSeek, OpenAI, with automatic fallback
  - Integrated **LangChain + LangSmith** for request and performance tracing
  - Optional integration with `MathMCP` as a local math reasoning tool (FastAPI + SymPy)

---

### Tech Stack

- **Frontend**
  - Next.js 15 (App Router)
  - React 19
  - Tailwind CSS 4 + custom animations
  - Radix UI / shadcn UI components

- **Backend & Database**
  - Next.js Route Handlers (API routes)
  - Prisma ORM
  - SQLite (local development via `prisma/dev.db`)

- **AI & Tooling**
  - Custom `AIAPIManager` with support for Poe / DeepSeek / OpenAI (with automatic fallback)
  - LangChain (chat and tool calls)
  - LangSmith (tracing and experiments)
  - MCP (Model Context Protocol) integration with the local math tool project `MathMCP`

---

### Getting Started

#### 1. Prerequisites

- Node.js (recommended: 20+)
- `pnpm` (recommended for this project)

Install `pnpm` (if you don’t have it):

```bash
npm install -g pnpm
```

#### 2. Install dependencies

```bash
pnpm install
```

#### 3. Configure environment variables

Create or edit a `.env` file in the project root. Typical variables (adjust as needed):

```bash
# Database (SQLite by default)
DATABASE_URL="file:./prisma/dev.db"

# AI providers (configure at least one)
POE_API_KEY="your_poe_api_key"
POE_API_URL="https://api.poe.com/v1"
POE_BOT_NAME="Claude-Sonnet-4.5"

DEEPSEEK_API_KEY="your_deepseek_api_key"
DEEPSEEK_API_URL="https://api.deepseek.com/v1"
DEEPSEEK_MODEL="deepseek-chat"

OPENAI_API_KEY="your_openai_api_key"
OPENAI_API_URL="https://api.openai.com/v1"
OPENAI_MODEL="gpt-4"

# LangChain / LangSmith (optional)
LANGCHAIN_TRACING_V2="true"
LANGCHAIN_API_KEY="your_langchain_api_key"
LANGCHAIN_PROJECT="dse-math-tutoring"

LANGSMITH_API_KEY="your_langsmith_api_key"
LANGSMITH_PROJECT="dse-math-tutoring"
LANGSMITH_TRACING="true"
```

> **Note**: If **none** of `POE_API_KEY`, `DEEPSEEK_API_KEY`, or `OPENAI_API_KEY` is set, chat APIs will return an error. Configure at least one provider.

#### 4. Database & Prisma

Generate the Prisma Client:

```bash
pnpm prisma generate
```

Apply migrations (if there are any pending):

```bash
pnpm prisma migrate deploy
```

#### 5. Run the development server

```bash
pnpm dev
```

By default, the app runs at `http://localhost:3000`.

---

### MathMCP Subproject (Optional, Local Math Service)

The `MathMCP/` directory in this repo is a standalone **MCP-style math service**, built with FastAPI + SymPy.  
It exposes multiple math endpoints and can be used as a local tool server for this app or for other MCP hosts (such as Cherry Studio).

Quick start (inside the `MathMCP` folder):

```bash
cd MathMCP
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn mcp_math.app:app --reload --host 0.0.0.0 --port 8000
```

For full details, see `MathMCP/README.md`.

---

### Project Structure

```bash
.
├── app/                 # Next.js App Router pages & API routes
│   ├── page.tsx         # Home / community feed
│   ├── chatbot/         # AI math tutor main interface
│   ├── api/             # Backend APIs (chat, users, Poe proxy, etc.)
│   └── profile/ ...     # User profile and related pages
├── components/          # UI components, markdown / syntax highlighting, MCP UI, etc.
├── hooks/               # Custom hooks (streaming, toast, auth, etc.)
├── lib/                 # AI / LangChain / tracing / parsing logic
│   ├── ai-api.ts        # AIAPIManager for managing multiple LLM providers
│   ├── conversation-manager.ts
│   ├── error-tracker.ts
│   ├── progress-analyzer.ts
│   └── prompts/         # Math prompts and visualization prompts
├── prisma/              # Prisma schema and SQLite database
├── MathMCP/             # Local MCP math tool service (Python)
└── README.md
```

---

### Deployment Notes

- **Environment**: can be deployed on Vercel or any Node.js server.
- **Required environment variables**:
  - `DATABASE_URL`
  - At least one AI API key: `POE_API_KEY` / `DEEPSEEK_API_KEY` / `OPENAI_API_KEY`
  - (Optional) LangChain / LangSmith variables
- **Database**:
  - For demos and small projects, SQLite is fine.
  - For production, consider using PostgreSQL and updating `DATABASE_URL` and the Prisma configuration accordingly.

---

### How to Publish to GitHub

Assuming you have finished local development and this directory is the project you want to publish.

#### 1. Create a remote repository on GitHub

1. Log in to GitHub, click the top-right **“+” → “New repository”**.
2. Fill in:
   - **Repository name**: e.g. `math-learning-platform`
   - You can choose to add `.gitignore` and a license on GitHub, or manage them locally (this repo already includes `LICENSE`).
3. After creating, GitHub will show a section like:

```bash
git remote add origin https://github.com/<your-name>/math-learning-platform.git
```

#### 2. Connect your local repo and push

In the project root:

```bash
cd /Users/kenneth/Documents/Chatbot/MathPlatform/math-learning-platform

# Initialize git if needed (this project already has .git, so you can skip this)
git init

# Add the remote (only once, replace <your-name> with your GitHub username)
git remote add origin https://github.com/<your-name>/math-learning-platform.git

# Check current changes
git status

# Stage all files (including the README.md you just edited)
git add .

# Create a commit
git commit -m "chore: add project README and initial setup"

# Push to GitHub (master or main, depending on your default branch)
git push -u origin master   # or main
```

If the remote already exists, you only need:

```bash
git add .
git commit -m "update README"
git push
```

---

### License

This project is licensed under the **MIT License**.  
See the `LICENSE` file for the full license text.


