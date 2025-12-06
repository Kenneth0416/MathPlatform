This manual introduces how to use the Math Learning Platform (Intelligent Math Learning Platform). The platform provides AI-driven personalized math learning experiences for students from DSE Level, supporting Traditional Chinese, Simplified Chinese, and English. Platform version: 0.1.0.

#### 1. Registration and Login

- **Registration**: Visit the [/register] page and enter your email, username, and password. The platform uses NextAuth.js for secure authentication.
- **Login**: Go to [/login] and log in with your email and password. Supports third-party login (if enabled).
- **Language Switching**: After logging in, select zh-TW (Traditional Chinese), zh-CN (Simplified Chinese), or en (English) in the top-right settings.
- **Theme Mode**: Defaults to light mode; switch to dark mode in settings.

#### 2. Main Interface Navigation

The platform uses responsive design, supporting desktop and mobile (PWA).

- **Home (/)**: Displays community content, learning overview, and recommended tutorials. Browse the latest learning resources or share achievements.
- **Chatbot Main Interface (/chatbot)**: Core learning area to start AI conversations.
- **Tutorials Page (/tutorials)**: Browse structured math tutorials, categorized by difficulty and topic.
- **Profile (/profile)**: Manage avatar, bio, preferences (e.g., language, notifications), and achievement badges.
- **Analytics (/analytics)**: View learning progress and statistical charts (visualized with Recharts).
- **Logout**: Click the user icon in the top-right corner to select logout.

Mobile: Uses a bottom navigation bar with touch support.

#### 3. AI Intelligent Chat System

Start interactions with AI on the [/chatbot] page.

- **Start Conversation**: Input a math problem, such as "Solve x² + 3x - 4 = 0", and the AI will respond in streaming (real-time generation).
- **Learning Mode Selection**:
    - **Solve**: Directly solve the problem, providing steps and KaTeX-rendered formulas.
    - **Tutor**: Step-by-step guidance, explaining concepts and errors.
    - **Practice**: Generate practice problems and check answers.
    - **Check**: Verify user solutions, mark errors, and suggest improvements.
- **Difficulty Levels**: Select K-6 (Elementary), Middle (Middle School), High (High School), College (University), or Contest (Competition Level).
- **Language Support**: Automatically detects input language or specify in the conversation.
- **MathMCP Tool**: AI automatically invokes professional computations, such as symbolic simplification, equation solving, or geometric analysis. Results include Mermaid visualizations (e.g., flowcharts).
- **Context Management**: Conversation history is automatically saved; review previous questions. Click "New Conversation" to reset.
- **Tips**: Use natural language to describe problems; the platform supports multiple AI providers (Claude as primary) for stable responses.

#### 4. Intelligent Learning Management

- **Conversation History**: View past learning records in the sidebar, filtered by date or topic.
- **Progress Tracking**: In [/analytics], view:
    - Learning time, number of problems, and accuracy rate.
    - Error categorization (e.g., algebra vs. geometry).
    - Knowledge mastery (AI-assessed based on conversations).
    - Streak System: Tracks consecutive learning days to unlock achievements.
- **Learning Sessions**: At the end of each conversation, automatically records behaviors and insights (e.g., suggestions for weak areas).
- **Achievement System**: Earn badges and points for completing tasks, such as "Problem Solver Master" (50 correct problems).

#### 5. Tutorials and Community Features

- **Tutorials (/tutorials)**: Select a topic (e.g., linear algebra), read Markdown content with embedded formulas. Some tutorials include interactive exercises.
- **Community Sharing**: Upload learning achievements (e.g., solution screenshots) on the home page; browse others' shares (frontend implemented, backend social features planned).
- **Personalized Recommendations**: AI suggests tutorials or exercises based on progress.

#### 6. Settings and Privacy

- **Profile (/profile)**: Update avatar, bio, and preferences. Notification settings control learning reminders.
- **Data Privacy**: The platform complies with GDPR; conversation data is used only for personal learning and not shared with third parties. Content is filtered across languages for safety.
- **Export Data**: Download learning records (CSV or JSON) in settings.

#### 7. Frequently Asked Questions (FAQ)

- **AI responses slow?**: Check your network; the platform uses intelligent routing for optimization, averaging <5 seconds.
- **Formula display issues?**: Ensure browser supports KaTeX; reload the page.
- **Language switching ineffective?**: Clear cache or reselect in settings.
- **Forgot password?**: Click "Forgot Password" on the login page to reset via email.
- **Action Items**:
    - [ ] Explore different learning modes.
    - [ ] Set daily learning goals.
    - [ ] Share your first learning achievement.

#### 8. Support and Updates

- **Contact**: Use the built-in feedback form or check the internal admin backend (planned).
- **Updates**: The platform updates features regularly; check notifications in [/profile].
- **Last Updated**: December 2025. Version v1.0