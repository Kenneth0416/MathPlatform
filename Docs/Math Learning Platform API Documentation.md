## Overview

The Math Learning Platform is a modern, AI-powered educational platform built with Next.js 15 that provides intelligent mathematics tutoring, conversation management, user management, and analytics. The platform integrates multiple AI providers (POE, DeepSeek, OpenAI) and includes LangSmith performance monitoring and LangChain MCP mathematical tools.


**Base URL**: `https://your-domain.com/api`

**API Version**: v1

**Authentication**: JWT (via NextAuth.js)

**Content-Type**: `application/json`

  

---

  

## Table of Contents

  

1. [Authentication](#authentication)

2. [Chat System APIs](#chat-system-apis)

3. [Conversation Management APIs](#conversation-management-apis)

4. [User Management APIs](#user-management-apis)

5. [Analytics APIs](#analytics-apis)

6. [Mathematical Tools APIs](#mathematical-tools-apis)

7. [Development & Testing APIs](#development--testing-apis)

8. [Data Models & Types](#data-models--types)

9. [Error Handling](#error-handling)

10. [Rate Limiting](#rate-limiting)

11. [Examples](#examples)

  

---

  

## Authentication

  

### Authentication Method

  

The platform uses **NextAuth.js** with **JWT tokens** for authentication. Most endpoints require authentication via session cookies or bearer tokens.

  

### Getting Authenticated

  

1. **Register**: Create a new user account

2. **Sign In**: Obtain authentication session

3. **Session Management**: Use session cookies for API calls

  

### Auth Headers (Optional)

  

```http

Authorization: Bearer <jwt_token>

```

  

**Note**: When using the web interface, authentication is handled automatically via NextAuth.js session management.

  

---

  

## Chat System APIs

  

### POST /api/chat - Standard Chat

  

Send a message to the AI tutor for mathematical assistance.

  

**Authentication**: Not required (but needs AI configuration)

**Rate Limit**: 100 requests per hour per IP

  

#### Request Body

  

```typescript

interface ChatRequest {

messages: Array<{

role: 'user' | 'assistant' | 'system'

content: string

}>

mode: 'solve' | 'tutor' | 'practice' | 'check'

difficulty: 'K-6' | 'Middle' | 'High' | 'College' | 'Contest'

language: 'zh-TW' | 'zh-CN' | 'en'

bot?: string // Optional: specify bot name

}

```

  

#### Example Request

  

```json

{

"messages": [

{

"role": "user",

"content": "Solve the equation: 2x² + 5x - 3 = 0"

}

],

"mode": "solve",

"difficulty": "High",

"language": "zh-TW"

}

```

  

#### Response Body

  

```typescript

interface ChatResponse {

text: string // AI response content

steps?: Array<{ // Step-by-step solution

id: string

title: string

content: string

explanation?: string

formula?: string

}>

knowledgePoints?: string[] // Related knowledge points

visualizations?: Array<{ // Visual aids

id: string

type: 'mermaid' | 'chart' | 'graph'

code: string

title?: string

description?: string

}>

error?: string // Error message

provider?: string // AI provider used

model?: string // AI model used

tokensUsed?: number // Tokens consumed

responseTime?: number // Response time in ms

}

```

  

#### Example Response

  

```json

{

"text": "The equation 2x² + 5x - 3 = 0 has solutions x = 0.5 and x = -3",

"steps": [

{

"id": "step-1",

"title": "Step 1",

"content": "Use the quadratic formula: x = (-b ± √(b² - 4ac)) / (2a)",

"explanation": "Where a=2, b=5, c=-3",

"formula": "$$x = \\frac{-5 \\pm \\sqrt{5^2 - 4 \\cdot 2 \\cdot (-3)}}{2 \\cdot 2}$$"

}

],

"knowledgePoints": ["Quadratic Equations", "Quadratic Formula", "Discriminant"],

"visualizations": [

{

"id": "mermaid-1-1234567890",

"type": "mermaid",

"code": "graph LR\n A[Discriminant Δ=25+24=49] --> B[Δ>0 Two real solutions]\n B --> C[x₁=0.5]\n B --> D[x₂=-3]",

"title": "Quadratic Equation Solution Flow"

}

],

"provider": "openai",

"model": "gpt-4",

"tokensUsed": 256,

"responseTime": 1234

}

```

  

#### Status Codes

  

- `200 OK`: Successful response

- `400 Bad Request`: Invalid parameters

- `502 Bad Gateway`: AI API error

- `503 Service Unavailable`: AI service unavailable

- `500 Internal Server Error`: Server error

  

---

  

### POST /api/chat/stream - Streaming Chat

  

Send a message and receive real-time streaming responses.

  

**Authentication**: Not required

**Rate Limit**: 100 requests per hour per IP

**Response Format**: Server-Sent Events (SSE)

  

#### Request Body

  

Same as `/api/chat`

  

#### Response Format

  

```typescript

// Server-Sent Events format

data: {"choices": [{"delta": {"content": "This"}}]}

  

data: {"choices": [{"delta": {"content": " is"}}]}

  

data: {"choices": [{"delta": {"content": " streaming"}}]}

  

data: [DONE]

```

  

#### Example Usage (JavaScript)

  

```javascript

const response = await fetch('/api/chat/stream', {

method: 'POST',

headers: { 'Content-Type': 'application/json' },

body: JSON.stringify(requestBody)

});

  

const reader = response.body.getReader();

const decoder = new TextDecoder();

  

while (true) {

const { done, value } = await reader.read();

if (done) break;

  

const chunk = decoder.decode(value);

const lines = chunk.split('\n');

  

for (const line of lines) {

if (line.startsWith('data: ')) {

const data = line.slice(6);

if (data === '[DONE]') return;

  

try {

const parsed = JSON.parse(data);

const content = parsed.choices[0]?.delta?.content;

if (content) {

console.log(content);

}

} catch (e) {

// Handle parsing error

}

}

}

}

```

  

---

  

## Conversation Management APIs

  

All conversation endpoints require authentication.

  

### GET /api/conversations - Get Conversations List

  

Retrieve user's conversation history with pagination and filtering.

  

**Authentication**: Required

**Rate Limit**: 60 requests per minute per user

  

#### Query Parameters

  

| Parameter | Type | Default | Description |

|-----------|------|---------|-------------|

| `page` | number | 1 | Page number |

| `limit` | number | 10 | Items per page (max 50) |

| `mode` | string | - | Filter by mode (`solve`, `tutor`, `practice`, `check`) |

| `difficulty` | string | - | Filter by difficulty |

| `search` | string | - | Search in conversation titles |

  

#### Response Body

  

```typescript

interface ConversationsResponse {

conversations: Array<{

id: string

title: string

mode: string

difficulty: string

language: string

createdAt: string

updatedAt: string

messageCount: number

messages: Array<{

content: string

timestamp: string

}>

}>

pagination: {

page: number

limit: number

total: number

pages: number

}

}

```

  

#### Example Request

  

```http

GET /api/conversations?page=1&limit=10&mode=solve&search=quadratic

```

  

#### Example Response

  

```json

{

"conversations": [

{

"id": "conv_1234567890",

"title": "Quadratic Equations Practice",

"mode": "solve",

"difficulty": "High",

"language": "zh-TW",

"createdAt": "2024-01-15T10:30:00Z",

"updatedAt": "2024-01-15T11:45:00Z",

"messageCount": 8,

"messages": [

{

"content": "Solve: x² - 5x + 6 = 0",

"timestamp": "2024-01-15T10:30:00Z"

},

{

"content": "The solutions are x = 2 and x = 3",

"timestamp": "2024-01-15T10:31:00Z"

}

]

}

],

"pagination": {

"page": 1,

"limit": 10,

"total": 25,

"pages": 3

}

}

```

  

---

  

### POST /api/conversations - Create Conversation

  

Create a new conversation session.

  

**Authentication**: Required

**Rate Limit**: 30 requests per minute per user

  

#### Request Body

  

```typescript

interface CreateConversationRequest {

title: string

mode: 'solve' | 'tutor' | 'practice' | 'check' | 'board'

difficulty: 'K-6' | 'Middle' | 'High' | 'College' | 'Contest'

language: 'zh-TW' | 'zh-CN' | 'en'

}

```

  

#### Example Request

  

```json

{

"title": "Calculus Integration Practice",

"mode": "practice",

"difficulty": "College",

"language": "en"

}

```

  

#### Response Body

  

```typescript

interface ConversationResponse {

conversation: {

id: string

title: string

mode: string

difficulty: string

language: string

userId: string

createdAt: string

updatedAt: string

messageCount: 0

}

}

```

  

---

  

### GET /api/conversations/[id] - Get Single Conversation

  

Retrieve detailed conversation with all messages.

  

**Authentication**: Required

**Rate Limit**: 60 requests per minute per user

  

#### Path Parameters

  

| Parameter | Type | Description |

|-----------|------|-------------|

| `id` | string | Conversation ID |

  

#### Response Body

  

```typescript

interface ConversationDetail {

id: string

title: string

mode: string

difficulty: string

language: string

createdAt: string

updatedAt: string

messageCount: number

messages: Array<{

id: string

role: 'user' | 'assistant'

content: string

timestamp: string

steps?: any

knowledgePoints?: string[]

visualizations?: Array<{

id: string

type: string

code: string

title?: string

description?: string

}>

}>

}

```

  

---

  

### PUT /api/conversations/[id] - Update Conversation

  

Update conversation title or metadata.

  

**Authentication**: Required

**Rate Limit**: 30 requests per minute per user

  

#### Path Parameters

  

| Parameter | Type | Description |

|-----------|------|-------------|

| `id` | string | Conversation ID |

  

#### Request Body

  

```typescript

interface UpdateConversationRequest {

title?: string

}

```

  

---

  

### DELETE /api/conversations/[id] - Delete Conversation

  

Delete a conversation and all its messages.

  

**Authentication**: Required

**Rate Limit**: 10 requests per minute per user

  

#### Path Parameters

  

| Parameter | Type | Description |

|-----------|------|-------------|

| `id` | string | Conversation ID |

  

#### Response Body

  

```json

{

"message": "Conversation deleted successfully"

}

```

  

---

  

### POST /api/conversations/[id] - Add Message

  

Add a new message to existing conversation.

  

**Authentication**: Required

**Rate Limit**: 60 requests per minute per user

  

#### Path Parameters

  

| Parameter | Type | Description |

|-----------|------|-------------|

| `id` | string | Conversation ID |

  

#### Request Body

  

```typescript

interface AddMessageRequest {

role: 'user' | 'assistant'

content: string

steps?: string // JSON string of steps

knowledgePoints?: string // JSON string of knowledge points

visualizations?: string // JSON string of visualizations

}

```

  

---

  

## User Management APIs

  

### POST /api/auth/register - User Registration

  

Create a new user account.

  

**Authentication**: Not required

**Rate Limit**: 5 requests per minute per IP

  

#### Request Body

  

```typescript

interface RegisterRequest {

email: string

username: string

password: string

}

```

  

#### Validation Rules

  

- `email`: Valid email format, max 255 characters

- `username`: 3-30 characters, alphanumeric + underscores

- `password`: Min 8 characters, max 128 characters

  

#### Example Request

  

```json

{

"email": "student@example.com",

"username": "math_student",

"password": "securePassword123"

}

```

  

#### Response Body

  

```typescript

interface RegisterResponse {

message: string

user: {

id: string

email: string

username: string

createdAt: string

}

}

```

  

---

  

### POST /api/auth/signin - User Sign In

  

Authenticate user and create session.

  

**Authentication**: Not required

**Rate Limit**: 10 requests per minute per IP

  

#### Request Body

  

```typescript

interface SignInRequest {

email: string

password: string

}

```

  

#### Response Body

  

```typescript

interface SignInResponse {

user: {

id: string

email: string

username: string

avatar?: string

}

token?: string // For API access

}

```

  

---

  

### GET /api/users/profile - Get User Profile

  

Retrieve current user's profile information.

  

**Authentication**: Required

**Rate Limit**: 60 requests per minute per user

  

#### Response Body

  

```typescript

interface UserProfile {

id: string

email: string

username: string

avatar?: string

bio?: string

language: 'zh-TW' | 'zh-CN' | 'en'

notifications: boolean

darkMode: boolean

createdAt: string

totalStudyTime: number // in minutes

totalMessages: number

streak: number // consecutive days

_count: {

conversations: number

achievements: number

}

}

```

  

---

  

### PUT /api/users/profile - Update User Profile

  

Update current user's profile information.

  

**Authentication**: Required

**Rate Limit**: 30 requests per minute per user

  

#### Request Body

  

```typescript

interface UpdateProfileRequest {

username?: string

avatar?: string

bio?: string

language?: 'zh-TW' | 'zh-CN' | 'en'

notifications?: boolean

darkMode?: boolean

}

```

  

---

  

### POST /api/users/avatar - Upload Avatar

  

Upload user profile picture.

  

**Authentication**: Required

**Rate Limit**: 5 requests per minute per user

**Content-Type**: `multipart/form-data`

  

#### Request Body

  

| Field | Type | Description |

|-------|------|-------------|

| `avatar` | File | Image file (JPEG, PNG, GIF, WebP, max 5MB) |

  

#### Response Body

  

```typescript

interface AvatarUploadResponse {

message: string

user: {

id: string

username: string

avatar: string

updatedAt: string

}

avatarUrl: string

}

```

  

---

  

### DELETE /api/users/avatar - Remove Avatar

  

Remove user's profile picture.

  

**Authentication**: Required

**Rate Limit**: 5 requests per minute per user

  

#### Response Body

  

```json

{

"message": "Avatar removed successfully"

}

```

  

---

  

### GET /api/users/achievements - Get User Achievements

  

Retrieve user's achievements and progress.

  

**Authentication**: Required

**Rate Limit**: 30 requests per minute per user

  

#### Response Body

  

```typescript

interface AchievementsResponse {

achievements: Array<{

id: string

title: string

description: string

icon: string

category: 'learning' | 'social' | 'streak' | 'mastery'

points: number

unlocked: boolean

unlockedAt?: string

}>

stats: {

totalUnlocked: number

totalAvailable: number

totalPoints: number

recentUnlocks: Array<{

id: string

title: string

icon: string

unlockedAt: string

}>

}

}

```

  

---

  

### GET /api/users/progress - Get Learning Progress

  

Retrieve user's tutorial progress and learning statistics.

  

**Authentication**: Required

**Rate Limit**: 30 requests per minute per user

  

#### Response Body

  

```typescript

interface ProgressResponse {

progress: Array<{

id: string

tutorial: {

id: string

title: string

description: string

category: string

difficulty: string

duration: number // in minutes

lessons: number

rating: number

imageUrl: string

}

completed: number

total: number

percentage: number

lastAccess: string

completedAt?: string

isCompleted: boolean

}>

stats: {

totalTutorials: number

completedTutorials: number

inProgressTutorials: number

averageProgress: number

totalLessonsCompleted: number

totalLessons: number

}

recentTutorials: Array<{

id: string

title: string

lastAccess: string

progress: number

}>

}

```

  

---

  

## Analytics APIs

  

### GET /api/analytics - Get Learning Analytics

  

Retrieve detailed learning analytics and insights.

  

**Authentication**: Required

**Rate Limit**: 20 requests per minute per user

  

#### Query Parameters

  

| Parameter | Type | Default | Description |

|-----------|------|---------|-------------|

| `period` | string | `month` | Time period (`week`, `month`, `year`) |

  

#### Response Body

  

```typescript

interface AnalyticsResponse {

userStats: {

joinDate: string

studyTimeMinutes: number

studyTimeHours: number

totalQuestions: number

totalStudyTime: number

totalMessages: number

streak: number

}

conversationsByMode: Array<{

mode: string

count: number

percentage: number

}>

conversationsByDifficulty: Array<{

difficulty: string

count: number

percentage: number

}>

recentActivity: Array<{

createdAt: string

mode: string

difficulty: string

messageCount: number

}>

studyStreak: {

current: number

longest: number

lastStudyDate?: string

}

dailyActivity: Array<{

date: string

count: number

}>

hourlyActivity: Array<{

hour: string

count: number

}>

learningSessions: Array<{

date: string

duration: number

mode: string

difficulty: string

}>

insights: string[]

period: string

generatedAt: string

}

```

  

#### Example Request

  

```http

GET /api/analytics?period=week

```

  

---

  

## Mathematical Tools APIs (MathMCP)

  

### POST /api/mathmcp - Execute Mathematical Calculation

  

Perform advanced mathematical computations using specialized tools.

  

**Authentication**: Not required

**Rate Limit**: 120 requests per minute per IP

  

#### Request Body

  

```typescript

interface MathMCPRequest {

tool: string // Tool name

params: Record<string, any> // Parameters

options?: {

detail?: 'short' | 'full'

exact?: boolean

decimals?: number

language?: 'zh' | 'en'

angle_mode?: 'deg' | 'rad'

method?: 'auto' | 'quadratic_formula' | 'factoring'

}

}

```

  

#### Available Tools

  

| Tool Name | Description | Parameters |

|-----------|-------------|------------|

| `algebra_solve` | Solve equations | `equation: string`, `variable?: string` |

| `algebra_simplify` | Simplify expressions | `expression: string` |

| `algebra_expand` | Expand expressions | `expression: string` |

| `algebra_factor` | Factor expressions | `expression: string` |

| `arithmetic_fraction` | Fraction operations | `operation: string`, `a: number`, `b: number`, `c?: number`, `d?: number` |

| `arithmetic_percent` | Percentage calculations | `operation: string`, `a: number`, `b?: number` |

| `geometry_pythagoras` | Pythagorean theorem | `a: number`, `b?: number`, `c?: number` |

| `geometry_similar` | Similar triangles | `operation: string`, `a: number`, `b: number`, `c?: number` |

| `combinatorics_ncr` | Combinations | `n: number`, `r: number` |

| `combinatorics_npr` | Permutations | `n: number`, `r: number` |

| `eval_numeric` | Numeric evaluation | `expression: string` |

  

#### Example Requests

  

**Solve Quadratic Equation**:

```json

{

"tool": "algebra_solve",

"params": {

"equation": "2x^2 + 5x - 3 = 0",

"variable": "x"

},

"options": {

"detail": "full",

"exact": true,

"language": "zh"

}

}

```

  

**Calculate Combinations**:

```json

{

"tool": "combinatorics_ncr",

"params": {

"n": 10,

"r": 3

}

}

```

  

**Simplify Expression**:

```json

{

"tool": "algebra_simplify",

"params": {

"expression": "2x^2 + 4x + 2"

},

"options": {

"detail": "full"

}

}

```

  

#### Response Body

  

```typescript

interface MathMCPResponse {

success: boolean

data?: {

ok: boolean

task: string

result: {

exact?: string

approx?: number | null

solutions?: string[]

value?: number | string

}

steps?: Array<{

op: string

in: string

out: string

note: string

latex?: string | null

}>

display?: {

latex?: string

latex_steps?: string[]

}

meta?: {

method?: string

strategy_hints?: string[]

angle_mode?: string

trace_id?: string

version?: string

warnings?: string[]

}

}

error?: string

tool?: string

executionTime?: number // in milliseconds

}

```

  

#### Example Response

  

```json

{

"success": true,

"data": {

"ok": true,

"task": "algebra_solve",

"result": {

"solutions": ["1/2", "-3"],

"exact": "x = 1/2 或 x = -3"

},

"steps": [

{

"op": "Discriminant",

"in": "Δ = b² - 4ac",

"out": "Δ = 25 + 24 = 49",

"note": "Discriminant is positive, two real solutions"

},

{

"op": "Quadratic Formula",

"in": "x = (-b ± √Δ) / 2a",

"out": "x = (-5 ± 7) / 4",

"note": "Using quadratic formula"

}

],

"display": {

"latex": "x = \\frac{1}{2} \\text{ or } x = -3"

},

"meta": {

"method": "quadratic_formula",

"angle_mode": "deg"

}

},

"tool": "algebra_solve",

"executionTime": 150

}

```

  

---

  

### GET /api/mathmcp - Health Check

  

Check the availability and status of mathematical tools service.

  

**Authentication**: Not required

**Rate Limit**: 30 requests per minute per IP

  

#### Response Body

  

```typescript

interface MathMCPHealthResponse {

success: boolean

service: string

status: string

availableTools: string[]

version?: string

}

```

  

#### Example Response

  

```json

{

"success": true,

"service": "MathMCP Service",

"status": "healthy",

"availableTools": [

"algebra_solve",

"algebra_simplify",

"combinatorics_ncr",

"geometry_pythagoras"

],

"version": "1.0.0"

}

```

  

---

  

## Development & Testing APIs

  

These endpoints are only available in development environment.

  

### POST /api/test/tracing - LangSmith Tracing Test

  

Test LangSmith integration and tracing functionality.

  

**Authentication**: Not required

**Environment**: Development only

  

#### Request Body

  

```json

{

"testType": "direct_client"

}

```

  

#### Response Body

  

```typescript

interface TracingTestResponse {

success: boolean

message: string

results: {

directClientRunId: string

langchainResponseReceived: boolean

langchainResponseText: string

}

instructions: {

checkLangsmith: string

projectName: string

}

}

```

  

---

  

### POST /api/test/auto-tracing - Automatic Tracing Test

  

Test automatic tracing configuration.

  

**Authentication**: Not required

**Environment**: Development only

  

#### Request Body

  

```json

{

"testMode": "comprehensive"

}

```

  

#### Response Body

  

```json

{

"success": boolean,

"message": string,

"traceId": string,

"configuration": {

autoTracing: boolean,

projectName: string,

tracingEnabled: boolean

}

}

```

  

---

  

## Data Models & Types

  

### Core Types

  

```typescript

// User

interface User {

id: string

email: string

username: string

avatar?: string

bio?: string

language: 'zh-TW' | 'zh-CN' | 'en'

notifications: boolean

darkMode: boolean

totalStudyTime: number

totalMessages: number

streak: number

createdAt: Date

updatedAt: Date

}

  

// Conversation

interface Conversation {

id: string

title: string

mode: 'solve' | 'tutor' | 'practice' | 'check' | 'board'

difficulty: 'K-6' | 'Middle' | 'High' | 'College' | 'Contest'

language: 'zh-TW' | 'zh-CN' | 'en'

userId: string

messageCount: number

createdAt: Date

updatedAt: Date

}

  

// Message

interface Message {

id: string

conversationId: string

role: 'user' | 'assistant'

content: string

timestamp: Date

steps?: string // JSON string

knowledgePoints?: string // JSON array string

visualizations?: string // JSON string

}

  

// Tutorial

interface Tutorial {

id: string

title: string

description: string

category: string

difficulty: string

duration: number

lessons: number

rating: number

imageUrl?: string

isPublished: boolean

createdAt: Date

updatedAt: Date

}

  

// Achievement

interface Achievement {

id: string

title: string

description: string

icon: string

category: 'learning' | 'social' | 'streak' | 'mastery'

points: number

unlockedAt?: Date

createdAt: Date

}

```

  

### AI Message Types

  

```typescript

interface AIMessage {

role: 'user' | 'assistant' | 'system'

content: string

timestamp?: Date

}

  

interface SolutionStep {

id: string

title: string

content: string

explanation?: string

formula?: string

}

  

interface Visualization {

id: string

type: 'mermaid' | 'chart' | 'graph'

code: string

title?: string

description?: string

}

```

  

---

  

## Error Handling

  

### Standard Error Response Format

  

```json

{

"error": "Error description",

"details": "Detailed error information (optional)",

"code": "ERROR_CODE",

"timestamp": "2024-01-15T10:30:00Z"

}

```

  

### HTTP Status Codes

  

| Code | Description | When Used |

|------|-------------|-----------|

| `200` | OK | Successful request |

| `201` | Created | Resource created successfully |

| `400` | Bad Request | Invalid request parameters |

| `401` | Unauthorized | Authentication required |

| `403` | Forbidden | Access denied |

| `404` | Not Found | Resource not found |

| `429` | Too Many Requests | Rate limit exceeded |

| `500` | Internal Server Error | Server error |

| `502` | Bad Gateway | External service error |

| `503` | Service Unavailable | Service temporarily unavailable |

  

### Common Error Codes

  

| Code | Description |

|------|-------------|

| `INVALID_REQUEST` | Request parameters are invalid |

| `UNAUTHORIZED` | Authentication required or invalid |

| `FORBIDDEN` | Access denied to resource |

| `RESOURCE_NOT_FOUND` | Requested resource does not exist |

| `RATE_LIMIT_EXCEEDED` | Too many requests |

| `AI_SERVICE_UNAVAILABLE` | AI service is unavailable |

| `CONTENT_BLOCKED` | Content blocked by filter |

| `INTERNAL_ERROR` | Internal server error |

| `VALIDATION_ERROR` | Input validation failed |

| `FILE_TOO_LARGE` | Uploaded file exceeds size limit |

| `INVALID_FILE_TYPE` | Uploaded file type not supported |

  

---

  

## Rate Limiting

  

### Rate Limit Rules

  

| Endpoint | Rate Limit | Scope |

|----------|------------|-------|

| `/api/chat` | 100 req/hour | IP address |

| `/api/chat/stream` | 100 req/hour | IP address |

| `/api/mathmcp` | 120 req/min | IP address |

| Authenticated endpoints | 60 req/min | User |

| File upload endpoints | 5 req/min | User |

| Registration | 5 req/min | IP |

  

### Rate Limit Headers

  

```http

X-RateLimit-Limit: 100

X-RateLimit-Remaining: 95

X-RateLimit-Reset: 1705310400

```

  

### Exceeded Rate Limit Response

  

```json

{

"error": "Rate limit exceeded",

"details": "Too many requests. Please try again later.",

"code": "RATE_LIMIT_EXCEEDED",

"retryAfter": 3600

}

```

  

---

  

## Examples

  

### Complete User Flow

  

```javascript

// 1. Register new user

async function registerUser() {

const response = await fetch('/api/auth/register', {

method: 'POST',

headers: { 'Content-Type': 'application/json' },

body: JSON.stringify({

email: 'student@example.com',

username: 'math_student',

password: 'securePassword123'

})

});

  

const data = await response.json();

console.log('Registered:', data);

}

  

// 2. Sign in

async function signIn() {

const response = await fetch('/api/auth/signin', {

method: 'POST',

headers: { 'Content-Type': 'application/json' },

body: JSON.stringify({

email: 'student@example.com',

password: 'securePassword123'

})

});

  

return await response.json();

}

  

// 3. Create conversation

async function createConversation() {

const response = await fetch('/api/conversations', {

method: 'POST',

headers: { 'Content-Type': 'application/json' },

body: JSON.stringify({

title: 'Calculus Practice',

mode: 'practice',

difficulty: 'College',

language: 'en'

})

});

  

return await response.json();

}

  

// 4. Send math problem

async function solveMathProblem() {

const response = await fetch('/api/chat', {

method: 'POST',

headers: { 'Content-Type': 'application/json' },

body: JSON.stringify({

messages: [{

role: 'user',

content: 'Find the derivative of f(x) = x³ + 2x² - 5x + 1'

}],

mode: 'solve',

difficulty: 'College',

language: 'en'

})

});

  

const data = await response.json();

console.log('Solution:', data);

return data;

}

  

// 5. Get analytics

async function getAnalytics() {

const response = await fetch('/api/analytics?period=week');

const data = await response.json();

console.log('Analytics:', data);

return data;

}

  

// Execute complete flow

async function completeFlow() {

await registerUser();

await signIn();

await createConversation();

await solveMathProblem();

await getAnalytics();

}

```

  

### Mathematical Tools Usage

  

```javascript

// Solve quadratic equation

async function solveQuadratic() {

const response = await fetch('/api/mathmcp', {

method: 'POST',

headers: { 'Content-Type': 'application/json' },

body: JSON.stringify({

tool: 'algebra_solve',

params: {

equation: 'x^2 - 5x + 6 = 0'

},

options: {

detail: 'full',

exact: true,

language: 'en'

}

})

});

  

const data = await response.json();

console.log('Solutions:', data.data.result.solutions);

return data;

}

  

// Calculate combinations

async function calculateCombinations() {

const response = await fetch('/api/mathmcp', {

method: 'POST',

headers: { 'Content-Type': 'application/json' },

body: JSON.stringify({

tool: 'combinatorics_ncr',

params: {

n: 10,

r: 3

}

})

});

  

const data = await response.json();

console.log('C(10,3) =', data.data.result.value);

return data;

}

  

// Simplify expression

async function simplifyExpression() {

const response = await fetch('/api/mathmcp', {

method: 'POST',

headers: { 'Content-Type': 'application/json' },

body: JSON.stringify({

tool: 'algebra_simplify',

params: {

expression: '2x^2 + 4x + 2'

}

})

});

  

const data = await response.json();

console.log('Simplified:', data.data.result.exact);

return data;

}

```

  

### Streaming Chat Example

  

```javascript

async function streamingChat() {

const response = await fetch('/api/chat/stream', {

method: 'POST',

headers: { 'Content-Type': 'application/json' },

body: JSON.stringify({

messages: [{

role: 'user',

content: 'Explain the concept of limits in calculus step by step'

}],

mode: 'tutor',

difficulty: 'College',

language: 'en'

})

});

  

const reader = response.body.getReader();

const decoder = new TextDecoder();

let fullResponse = '';

  

while (true) {

const { done, value } = await reader.read();

if (done) break;

  

const chunk = decoder.decode(value);

const lines = chunk.split('\n');

  

for (const line of lines) {

if (line.startsWith('data: ')) {

const data = line.slice(6);

if (data === '[DONE]') {

console.log('Complete response:', fullResponse);

return fullResponse;

}

  

try {

const parsed = JSON.parse(data);

const content = parsed.choices[0]?.delta?.content;

if (content) {

fullResponse += content;

console.log('Streaming:', content);

}

} catch (e) {

// Handle parsing error

}

}

}

}

}

```

  

---

  

## Support & Contact

  

For API support and questions:

  

- **Documentation**: This document is regularly updated

- **Issues**: Report bugs via the project repository

- **Feature Requests**: Submit enhancement requests

- **Security**: Report security concerns privately

  

---

  

**Last Updated**: January 2025

**API Version**: v1.0

**Compatibility**: Modern browsers with ES2020+ support