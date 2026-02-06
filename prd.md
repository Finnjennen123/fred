# Product Requirements Document
# PRD: AI Mentor — Adaptive Learning Platform

## Google DeepMind Hackathon | Continual Learning Track

---

## The Problem

Current learning tools fall into two broken categories:

1. **Pre-AI courses (Coursera, Khan Academy)** — Great structure, zero personalization. Everyone gets the same content regardless of who they are.
2. **Raw LLMs (ChatGPT, etc.)** — Fully personalized, but zero structure. Users go down endless rabbit holes, lose sight of the big picture, and never reach a clear finish line.

**We're building what sits in between: personalized AND structured.**

---

## What We're Building

An AI-powered learning platform that creates a **personalized, adaptive course** on any subject — guided by an agentic AI mentor that acts as a "second brain" of the learner.

### The Core Concept: The Second Brain

- The system creates a **digital twin of the learner's mind** — a "second brain" that starts empty and grows smarter with every interaction.
- This second brain collects data about the user: what they know, how they think, where they struggle, what motivates them.
- It then **takes on the identity of a mentor** — essentially, it becomes a smarter version of *you* teaching *you*.
- The more you use it, the better it gets. **This is the continual learning angle.**

---

## How It Works

### Phase 1: Voice Onboarding
- User tells the AI (via voice, powered by **Plivo Voice API + ASR**) **what they want to learn** and the AI figures out **why they want to learn it**.
- These two inputs — the *what* and the *why* — kick off the mentor.

### Phase 2: Identity Profiling — The Mentor Figures Out What It Needs
The mentor now knows *what* you want to learn and *why*. Before creating any content, it needs to understand *you*.

1. **The mentor decides what data it needs.** Based on the subject and the user's reason for learning, the AI determines what it needs to know about the student to create a truly personalized course. This includes things like:
   - Where does the user currently stand on this subject?
   - What's their technical level / vocabulary?
   - What can be skipped vs. what needs to be taught from scratch?
   - How deep should the course go?
   - What tone and language style fits this person?

2. **The mentor proactively collects this data.** Through targeted questions, quick quizzes, and assessments, the AI extracts exactly the information it decided it needs. If answers are unclear or incomplete, the mentor **digs deeper — asking follow-ups, probing further, going another level down** — until it fully understands what it needs to know. It doesn't move on until it's satisfied.

The result: the mentor now has a complete learner profile — enough to decide what the content should look like, how it should be delivered, and what level to pitch it at.

### Phase 3: Full Course Generation — The Mentor Builds Your Course
- With the learner profile complete, the mentor **generates the entire course in one shot** — the phases (sections), the parts within each phase (chapters), how deep each goes, and all the content.
- Course content is sourced and grounded using **You.com Web Search API**, ensuring accuracy and real-time relevance rather than relying purely on LLM training data.
- Everything is fully personalized: the language, depth, examples, focus areas, and what to skip are all shaped by what the mentor learned about you in Phase 2.
- Each part has **clear mastery criteria** — the mentor defines what it means for the user to have "gotten it" for every part.

### Phase 4: Teaching & Mastery Loop
As the user works through the course, the mentor runs a continuous loop for each part:

1. **Teach** — deliver the personalized content for this part.
2. **Test** — assess whether the user has met the mastery criteria.
3. **Identify gaps** — pinpoint exactly where understanding falls short.
4. **Go deeper** — if gaps exist, the mentor teaches deeper on those specific areas and retests.
5. **Repeat until mastery** — the user only progresses when all gaps are closed and mastery criteria are met.

The course content itself doesn't change — but the mentor **adds depth on the fly** wherever the user struggles. Think of it like a textbook that's already written, but your mentor is sitting next to you ready to explain any chapter in five different ways until you get it.

### The Key: Truly Agentic Behavior
This is NOT a chatbot waiting for prompts. The mentor is **proactive at every stage:**

| Stage | The Mentor Proactively... |
|-------|--------------------------|
| Onboarding | Figures out what you want to learn and why |
| Profiling | Decides what data it needs about you, then extracts it |
| Course generation | Creates the full course at once — phases, parts, depth, language, content — all personalized |
| Teaching | Delivers content tailored to the learner |
| Testing | Defines mastery criteria and assesses against them |
| Gap closing | Goes deeper on weak areas, retests until gaps are closed |
| Gating | Only allows progression when mastery is proven |

---

## The "Brain Per Course" Architecture

- Each course has its own **mini-brain** — a context-rich model of the user specific to that subject.
- This brain lives for the duration of the course. It grows as the user progresses and stops when the course ends.
- **Future scope (out of hackathon scope):** These per-course brains can be mapped as nodes in a network, connecting knowledge across multiple courses the user has taken.

---

## What Makes a Great Mentor (And What Our AI Must Do)

A great mentor doesn't wait — it leads. Our AI mentor must:

1. **Understand the goal** — figure out what the student wants to learn and why
2. **Decide what it needs to know** — determine what information about the student is required to create a personalized course on this specific topic
3. **Proactively collect that data** — extract it through questions and quizzes, not wait for the student to volunteer it
4. **Build a fully personalized course** — use everything it learned to decide the language, depth, focus, and content
5. **Define mastery and enforce it** — set clear criteria for each part, test the student, identify gaps, go deeper, and only allow progression when mastery is proven

---

## Technical Architecture

### Tech Stack

- **LLM:** Google Gemini (DeepMind) — powers all agent reasoning, course generation, and evaluation
- **Voice:** Plivo Voice API + ASR — handles the voice onboarding conversation (speech-to-text in 27 languages)
- **Content sourcing:** You.com Web Search API — feeds real-time, cited information into course generation so content is accurate and grounded, not hallucinated from training data
- **Agent tooling (optional):** Composio — a tool management layer that can handle the wiring between the LLM and its tools (routing tool calls, execution, error handling) instead of building that plumbing from scratch
- **Hosting:** Vercel

### Core Principle

The "second brain" is a **structured, growing data object** — not a separate AI. It's a rich context store (learner profile + course data) that gets fed into every LLM call so the model always has full context about the learner. Every interaction updates it, which is what makes it "get smarter."

### System Components

The full system consists of five pieces:

#### 1. The Agent (Orchestrator)

The central intelligence that runs the entire experience. It is:

- **An LLM** — Google Gemini (DeepMind) — that does the thinking
- **A system prompt** that defines the mentor's mission, personality, and boundaries
- **A set of tools** that let the LLM take actions (not just generate text)
- **A loop** — after every action, the agent observes the result and decides what to do next

The agent operates in a continuous cycle: **Think → Pick a tool → Use it → Observe result → Think again → Pick next tool → ...** until the current mission (profiling, course generation, teaching, testing) is complete.

This agent is **fully autonomous within its mission boundaries.** It decides what to ask, when to quiz, when to go deeper, and when to let the user progress. It is not following a script — it's making decisions.

#### 2. The Tool Set

The agent can only think (generate text) on its own. Tools give it the ability to *act*. These are functions the agent can call:

**Profiling tools:**
- `ask_question` — ask the student a targeted question
- `run_assessment` — deliver a quiz or knowledge check
- `update_learner_profile` — save new information about the student to the learner profile

**Course generation tools:**
- `generate_course` — create the full course structure and content based on the learner profile
- `define_mastery_criteria` — set what "mastery" means for each part

**Teaching tools:**
- `deliver_lesson` — present the content for the current part
- `quiz_student` — test the student on the current part
- `evaluate_response` — analyze the student's answer and identify gaps
- `go_deeper` — generate additional content on a specific gap area
- `advance_to_next_part` — move the student to the next part (only when mastery is proven)

**State tools:**
- `read_learner_profile` — access the current state of the learner profile
- `read_course` — access the current course structure and content
- `update_progress` — record mastery status, quiz results, gap history

> Note: The exact tool set will be refined during development. Some tools may be combined or split. The key principle is that the agent should have the tools it needs to operate autonomously through all four phases.

#### 3. The Learner Profile (Data Structure)

A structured JSON object that starts nearly empty and grows throughout the experience. This is the "second brain" in data form.

```
learner_profile: {
  // From onboarding
  subject: "...",
  reason: "...",

  // From profiling (AI decides what fields it needs)
  current_knowledge_level: "...",
  vocabulary_comfort: "...",
  learning_style: "...",
  relevant_background: "...",
  gaps_identified: [...],
  strengths: [...],
  preferred_depth: "...",
  preferred_tone: "...",
  // ...additional fields as determined by the agent

  // Updated during teaching
  quiz_history: [...],
  mastery_status: { part_id: true/false },
  struggle_areas: [...],
  total_interactions: 0
}
```

This profile is passed as context into every LLM call, ensuring the agent always has the full picture.

#### 4. The Course Object (Data Structure)

A structured object representing the full course. Generated in one shot after profiling.

```
course: {
  title: "...",
  phases: [
    {
      id: "phase_1",
      title: "...",
      parts: [
        {
          id: "part_1_1",
          title: "...",
          content: "...",           // The actual lesson content
          mastery_criteria: "...",   // What it means to "get it"
          status: "not_started"      // not_started | in_progress | mastered
        }
      ]
    }
  ]
}
```

#### 5. The Frontend

The user-facing interface. Core screens:

- **Voice onboarding screen** — speech-to-text conversation where the user shares what they want to learn and why
- **Profiling screen** — interactive Q&A / quiz interface where the mentor extracts what it needs
- **Course overview screen** — visual map of the full course (phases and parts) with progress tracking
- **Lesson screen** — where content is delivered, questions are asked, quizzes happen, and the mastery loop plays out

---

## Agent Flow (End to End)

```
USER OPENS APP
      │
      ▼
┌─────────────────────────────┐
│  PHASE 1: VOICE ONBOARDING  │
│  Agent extracts:             │
│  - What they want to learn   │
│  - Why they want to learn it │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────────┐
│  PHASE 2: IDENTITY PROFILING     │
│  Agent decides what data it      │
│  needs → asks questions, runs    │
│  quizzes, digs deeper until      │
│  satisfied → builds learner      │
│  profile                         │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│  PHASE 3: COURSE GENERATION      │
│  Agent generates full course:    │
│  phases, parts, content, mastery │
│  criteria — all personalized     │
│  based on learner profile        │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  PHASE 4: TEACHING & MASTERY LOOP   │
│                                     │
│  For each part:                     │
│  ┌──────────────────────────┐       │
│  │  Teach lesson             │       │
│  │         │                 │       │
│  │         ▼                 │       │
│  │  Test student             │       │
│  │         │                 │       │
│  │    ┌────┴─────┐          │       │
│  │    │          │          │       │
│  │  Gaps?     Mastered ──────┼─→ Next part
│  │    │                     │       │
│  │    ▼                     │       │
│  │  Go deeper + retest      │       │
│  │    │                     │       │
│  │    └──→ (back to test)   │       │
│  └──────────────────────────┘       │
│                                     │
│  Course complete when all parts     │
│  are mastered across all phases     │
└─────────────────────────────────────┘
```

---

## Key Technical Challenges

1. **Learner profile design** — What fields does the profile need? How do we let the agent dynamically decide what to collect while keeping the structure usable?
2. **Agent autonomy boundaries** — How much freedom does the agent get? What are the guardrails that prevent it from going off-mission?
3. **Course generation quality** — How do we ensure the one-shot course generation produces high-quality, well-structured content?
4. **Mastery evaluation** — How does the agent reliably determine if a student has mastered a concept vs. just memorized an answer?
5. **State management** — How do we persist and pass the growing learner profile + course object efficiently across interactions?
6. **Voice onboarding** — Speech-to-text integration and natural conversational flow for the opening phase.

---

## Hackathon Scope

**In scope:**
- Voice onboarding flow
- Agentic profiling (AI decides what to collect, then collects it)
- Single-course generation with full personalization
- Teaching & mastery loop with gap detection and depth expansion
- Learner profile that grows throughout the experience
- Demonstrable continual learning (system visibly improves with use)

**Out of scope (future):**
- Cross-course brain network
- Multi-user / enterprise features
- Long-term memory across separate courses

---

## One-Liner

> An agentic AI mentor that builds a second brain of you — then uses it to decide what to teach you, how to teach you, and when you're ready to move on.
