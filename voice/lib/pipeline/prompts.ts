// Prompt templates for the game generation pipeline
// Four prompts: Spec (A), Build (B), Critic (C), Revision (D)

import type { DigitalCloneProfile, GameSpec, RendererType, CriticResult, ArticleContext } from './types'
import { getRendererCatalog, getRendererSchema } from './renderer-schemas'

function buildArticleSection(articleContext?: ArticleContext): string {
  if (!articleContext) return ''

  let section = `\n\n## Lesson Content the Student Just Read
Title: ${articleContext.title}
Mastery Criteria: ${articleContext.masteryCriteria}

Article (excerpt):
${articleContext.content.slice(0, 3000)}`

  if (articleContext.searchResults && articleContext.searchResults.length > 0) {
    section += `\n\n## Supplementary Web Sources
${articleContext.searchResults.map(r => `- ${r.title}: ${r.snippet}`).join('\n')}`
  }

  section += `\n\n## IMPORTANT
- The game MUST test understanding of THIS specific article content
- Target the mastery criteria — verify the student meets them
- Do not test tangential knowledge outside the article`

  return section
}

// ═══════════════════════════════════════════
//   Prompt A: Game Spec Generator
// ═══════════════════════════════════════════

export function buildSpecPrompt(profile: DigitalCloneProfile, topic?: string, articleContext?: ArticleContext): {
  system: string
  user: string
} {
  const catalog = getRendererCatalog()

  const articleSystemNote = articleContext
    ? '\n5. **Article alignment**: If lesson article content is provided, design the game to test the specific concepts from that article.'
    : ''

  const system = `You are an expert educational game designer. Your job is to design a specific, targeted learning game for a student based on their digital profile.

## Design Principles — REAL GAMES, Not Worksheets
1. **Think like a game designer, not a teacher**: Design games people would ACTUALLY PLAY for fun. Think tower defense, puzzle games, resource management, factory builders, survival challenges, real-time strategy. Then embed the educational content INTO that mechanic. The learning should emerge from gameplay, not be bolted on.
2. **BANNED formats**: Multiple choice, pick-from-a-list, click-to-reveal, simple drag-to-reorder, flashcards, fill-in-the-blank. These are worksheets, not games. If a player wouldn't choose to play it for fun, redesign it.
3. **Real game mechanics to use**:
   - **Tower defense / placement strategy**: Place defenses on a grid, enemies (wrong answers, bugs, threats) move through — student must position knowledge strategically
   - **Factory / pipeline builder**: Connect processing nodes, feed inputs through, watch outputs — student builds working systems
   - **Survival / resource management**: Limited resources (time, energy, budget), must allocate wisely across competing priorities while a system runs
   - **Puzzle / Tetris-style**: Pieces fall or appear, student must categorize/place them under time pressure before they stack up
   - **Investigation / detective**: Explore a scene, collect clues, build a case — student pieces together understanding from evidence
   - **Simulation sandbox**: Tweak parameters of a live system (economy, ecosystem, physics), watch it evolve in real-time, try to reach a target state
   - **Timed arcade**: Elements spawn and move on screen, student must react — catch correct items, deflect wrong ones, maintain a system under pressure
   - **Strategy / territory**: Claim territory on a map by answering domain questions, defend against counter-attacks
4. **Continuous state, not round-by-round**: Prefer games with persistent state that evolves (health bars, resource pools, growing systems, score multipliers, combo chains) over isolated rounds. Each action should affect what comes next.
5. **Frontier testing**: Target the edge of what the student knows. Probe where understanding breaks down.
6. **Misconception targeting**: If the profile lists misconceptions, design the game to make those misconceptions COSTLY — the student naturally discovers why they're wrong through gameplay consequences.${articleSystemNote}

## Available Game Templates

${catalog}

IMPORTANT: STRONGLY prefer 'custom' gameType. The templates above are simple formats. You should almost ALWAYS choose 'custom' and invent a real game mechanic. Only fall back to templates if the topic genuinely fits a simple format.

## Output Format

Respond with ONLY valid JSON matching this schema:
{
  "id": "unique-kebab-case-id",
  "title": "Creative Game Title",
  "gameType": "one of the template types above, or 'custom'",
  "concept": "1-2 sentence description of the game idea",
  "pedagogicalGoal": "What understanding does this game test?",
  "whyThisGame": "Why is this mechanic the best choice for this student and topic? (chain of thought)",
  "difficulty": 1-5,
  "rounds": [
    {
      "roundNumber": 1,
      "focus": "What this round specifically tests",
      "contentSeed": "Brief description of the content for this round"
    }
  ],
  "completionRequirements": [
    {
      "id": "req-1",
      "description": "What constitutes success",
      "pseudocode": "score >= 3 out of 5"
    }
  ],
  "customRendererDescription": "ONLY if gameType is 'custom': detailed description of UI, interactions, state transitions"
}

## Few-Shot Examples

### Example 1
**Input profile**: Python beginner who struggles with mutable vs immutable types. Misconception: "lists and tuples are the same thing."
**Input topic**: Python data structures

**Output**:
{
  "id": "reference-trap-python",
  "title": "Reference Trap",
  "gameType": "predictionBet",
  "concept": "Present Python code snippets that exploit reference semantics and mutability. Student predicts output, revealing whether they understand aliasing vs copying.",
  "pedagogicalGoal": "Test whether the student understands that assignment creates references (not copies) for mutable objects, and that mutable/immutable types behave differently.",
  "whyThisGame": "Prediction Bet is ideal here because the student has a specific misconception about mutability. By asking them to predict output of reference-heavy code, we force them to use (and expose) their mental model. The confidence bet reveals how sure they are of their wrong model.",
  "difficulty": 2,
  "rounds": [
    { "roundNumber": 1, "focus": "List aliasing via assignment", "contentSeed": "x = [1,2,3]; y = x; y.append(4); print(x)" },
    { "roundNumber": 2, "focus": "Tuple immutability", "contentSeed": "t = (1,2,3); t[0] = 99" },
    { "roundNumber": 3, "focus": "String immutability vs list mutability", "contentSeed": "s = 'hello'; s[0] = 'H' vs l = list('hello'); l[0] = 'H'" }
  ],
  "completionRequirements": [
    { "id": "req-1", "description": "Student correctly predicts at least 2 of 3 outcomes", "pseudocode": "correctPredictions >= 2" },
    { "id": "req-2", "description": "Student shows calibration improvement", "pseudocode": "later confidence ratings more accurate than earlier ones" }
  ]
}

### Example 2
**Input profile**: WW2 history intermediate learner. Knows broad events but lacks understanding of strategic decision-making.
**Input topic**: Eastern Front strategy

**Output**:
{
  "id": "barbarossa-decision-tree",
  "title": "The Führer's Gambit",
  "gameType": "flowDiagram",
  "concept": "Step through Hitler's key strategic decisions during Operation Barbarossa. At each decision node, choose what happened historically and understand why.",
  "pedagogicalGoal": "Understand that WW2 outcomes were shaped by specific strategic decisions, not just inevitable forces. Grasp why the Eastern Front campaign failed.",
  "whyThisGame": "Flow Diagram lets the student literally walk through the decision tree, experiencing the strategic tradeoffs. This is better than a simple quiz because it shows how earlier decisions constrained later options.",
  "difficulty": 3,
  "rounds": [
    { "roundNumber": 1, "focus": "The decision to divert from Moscow to Kiev", "contentSeed": "Initial advance, Army Group Center vs Ukraine diversion" },
    { "roundNumber": 2, "focus": "Pushing toward Moscow in winter", "contentSeed": "October 1941 decision to continue despite weather" }
  ],
  "completionRequirements": [
    { "id": "req-1", "description": "Student correctly identifies historical decisions at each node", "pseudocode": "correctDecisions >= 3 out of 4" }
  ]
}

### Example 3
**Input profile**: ML intermediate who understands supervised learning but is fuzzy on when models overfit vs underfit.
**Input topic**: Model evaluation and selection

**Output**:
{
  "id": "ml-diagnostic-sort",
  "title": "Model Doctor",
  "gameType": "sortBattle",
  "concept": "Given descriptions of model behaviors and training outcomes, sort them into diagnostic categories: overfitting, underfitting, or good fit.",
  "pedagogicalGoal": "Test whether the student can distinguish overfitting from underfitting based on symptoms, not just definitions.",
  "whyThisGame": "Sort Battle works well because the student needs to CLASSIFY symptoms, which is exactly the skill gap. Many of the symptoms are subtle (e.g., 'training loss still decreasing but validation loss increasing' could be misclassified by someone who only knows the textbook definition).",
  "difficulty": 3,
  "rounds": [
    { "roundNumber": 1, "focus": "Classic overfitting vs underfitting symptoms", "contentSeed": "Training/test accuracy gaps, model complexity indicators" },
    { "roundNumber": 2, "focus": "Subtle cases and remedies", "contentSeed": "Sort remedies (more data, regularization, simpler model) into which problem they fix" },
    { "roundNumber": 3, "focus": "Real-world scenarios", "contentSeed": "Given a description of a model's behavior on a dataset, diagnose the issue" }
  ],
  "completionRequirements": [
    { "id": "req-1", "description": "Student correctly sorts at least 70% of items", "pseudocode": "correctPlacements / totalItems >= 0.7" }
  ]
}`

  const performanceSection = profile.recentPerformance.length > 0
    ? `\n\nRecent game performance:\n${profile.recentPerformance.map(p =>
        `- ${p.game}: ${p.score}/${p.maxScore}${p.notableErrors.length > 0 ? ` (errors: ${p.notableErrors.join(', ')})` : ''}`
      ).join('\n')}`
    : ''

  const topicInstruction = topic
    ? `\n\nThe teacher has specifically requested a game about: "${topic}"`
    : `\n\nChoose the most impactful topic based on the student's gaps and upcoming modules.`

  const user = `Design a game for this student:

Name: ${profile.name}
Subject: ${profile.subject}
Level: ${profile.level}
Context: ${profile.context}

Known strengths: ${profile.knownStrengths.join(', ')}
Known gaps: ${profile.knownGaps.join(', ')}
Misconceptions: ${profile.misconceptions.join(', ') || 'None identified yet'}

Learning style: ${profile.preferredModalities.join(', ')}
Response to challenge: ${profile.responseToChallenge}
Engagement triggers: ${profile.engagementTriggers.join(', ')}

Current module: ${profile.currentModule}
Completed modules: ${profile.modulesCompleted.join(', ')}
Upcoming topics: ${profile.upcomingTopics.join(', ')}${performanceSection}${topicInstruction}${buildArticleSection(articleContext)}`

  return { system, user }
}

// ═══════════════════════════════════════════
//   Prompt B: Config Builder
// ═══════════════════════════════════════════

export function buildConfigPrompt(spec: GameSpec, articleContext?: ArticleContext): {
  system: string
  user: string
} {
  if (spec.gameType === 'custom') {
    return buildCustomCodePrompt(spec, articleContext)
  }

  const schema = getRendererSchema(spec.gameType as RendererType)

  const system = `You are a game content builder. Given a game specification, produce a valid JSON config array that can be directly rendered by the game engine.

## Rules
1. Output ONLY a valid JSON array matching the config schema below. No markdown, no explanation.
2. Every field must be populated. No nulls or empty strings.
3. Content must be factually accurate and educationally sound.
4. Difficulty should match the spec's difficulty level (1=easy, 5=hard).
5. Create exactly ${spec.rounds.length} round(s) in the array.
6. For reference-based fields (IDs, indices), ensure all cross-references are valid.

## Config Schema

${schema}`

  const articleSection = buildArticleSection(articleContext)

  const user = `Build the config for this game:

Title: ${spec.title}
Type: ${spec.gameType}
Concept: ${spec.concept}
Pedagogical goal: ${spec.pedagogicalGoal}
Difficulty: ${spec.difficulty}/5

Rounds:
${spec.rounds.map(r => `- Round ${r.roundNumber}: ${r.focus}\n  Content seed: ${r.contentSeed}`).join('\n')}${articleSection}`

  return { system, user }
}

function buildCustomCodePrompt(spec: GameSpec, articleContext?: ArticleContext): {
  system: string
  user: string
} {
  const system = `You are a React component builder for an educational game engine. Write a self-contained React functional component that implements the described game mechanic.

## Runtime Environment
Your code runs inside a sandboxed \`new Function()\` context. The following globals are injected automatically:
- **React** — the full React object (React.createElement is used by JSX)
- **THEME** — a color palette object, already injected as a global. See keys below. Do NOT redefine or redeclare THEME — it is already available.
- **Destructured hooks**: useState, useEffect, useRef, useCallback, useMemo, useReducer, useLayoutEffect, Fragment

You MAY write \`import\` statements for React — they are harmless and will be stripped. Do NOT import anything else; there are no other modules available. Do NOT write \`const THEME = ...\` or \`import { THEME } from ...\` — THEME is pre-injected and ready to use.

## THEME Keys (light cream/orange theme — pre-injected global, e.g. \`THEME.accent\`)
bg (#faf9f7), surface (#f5f3f0), surfaceLight (#ece9e4), border (#ece9e4),
borderHover (#d9d4cd), accent (#ff6b00 orange), accentHover (#e55a00),
text (#1a1a1a dark), textMuted (#999), correct (#00c864 green), correctBg (#ecfdf5),
incorrect (#f44336 red), incorrectBg (#ffebee), warning (#ff9800), warningBg (#fff5eb), white (#ffffff)

## Available CSS Classes (from games.css)
Layout: game-container, game-title, game-subtitle, game-stats, game-actions, round-indicator
Buttons: btn-primary, btn-secondary
Stats: stat, stat-value, stat-label
Feedback: prediction-result correct, prediction-result incorrect, diagram-feedback correct/incorrect/info
Inputs: teach-input, teach-submit, generate-input

## Constraints
1. The component must accept a single prop: \`{ rounds: any[] }\`
2. Use THEME for colors — reference it directly (e.g., \`THEME.accent\`), it is a global
3. NO fetch calls, NO external dependencies, NO network access
4. Maximum 500 lines of code
5. The component should hardcode its game content based on the round descriptions provided — do NOT rely on the rounds prop containing structured data
6. Include round navigation (next round, reset) following the same pattern as existing games
7. The component must be playable and have clear win/lose feedback
8. Use font-family: 'Inter', sans-serif
9. Use border-radius: 10-14px for cards, 10px for buttons
10. Use subtle borders (1px solid THEME.border) not heavy outlines
11. Use subtle shadows (0 1px 3px rgba(0,0,0,0.06)) for cards
12. Primary buttons: dark bg (#1a1a1a), white text. NOT orange bg.
13. Keep the design minimal and warm — this is a learning app, not a gaming app

## Common Pitfalls — AVOID These
- Use \`className\`, never \`class\`, for JSX attributes
- Return a single root element (wrap in \`<div>\` or \`<Fragment>\` if needed)
- Do NOT use \`window\`, \`document\`, or DOM APIs directly
- Do NOT import external libraries — only React is available
- Do NOT use TypeScript syntax (interfaces, type annotations) — write plain JavaScript
- Do NOT use optional chaining on potentially undefined arrays without fallback
- Do NOT declare \`const THEME = { ... }\` — THEME is already a global, just use it directly

## Output Format
Output ONLY the component code as a single default-exported React functional component. No markdown fences. Start with imports.

Example structure:
import React, { useState } from 'react'

export default function CustomGame({ rounds }) {
  // ... state, logic, render
}`

  const user = `Build a React component for this game:

Title: ${spec.title}
Concept: ${spec.concept}
Pedagogical goal: ${spec.pedagogicalGoal}
Difficulty: ${spec.difficulty}/5

Game mechanic description:
${spec.customRendererDescription}

Round content to hardcode into the component:
${spec.rounds.map(r => `- Round ${r.roundNumber}: ${r.focus}\n  Content: ${r.contentSeed}`).join('\n')}

IMPORTANT: Hardcode the round content directly into the component's state or constants. The \`rounds\` prop may be empty — do not depend on it for game data.${buildArticleSection(articleContext)}`

  return { system, user }
}

// ═══════════════════════════════════════════
//   Custom Game: Merged Design + Build Prompt
// ═══════════════════════════════════════════

export function buildCustomGamePrompt(profile: DigitalCloneProfile, topic?: string, articleContext?: ArticleContext): {
  system: string
  user: string
} {
  const system = `You are an expert educational game designer AND React developer. Your job is to design AND build a complete, novel, interactive learning game as a single React component.

## CRITICAL: Build a REAL GAME — Not an Educational Activity
You are building something people would play for FUN. The educational content is embedded inside a genuinely engaging game mechanic. If someone wouldn't voluntarily play this outside of school, it's not good enough.

**BANNED**: Multiple choice, click-to-reveal, simple drag-to-reorder, matching pairs, flashcard formats, fill-in-the-blank. These are digital worksheets.

**THINK LIKE THIS**: What real game genre fits this topic?
- **Tower defense**: Place knowledge-nodes to intercept waves of problems/misconceptions flowing across the screen
- **Factory builder**: Wire together processing stages, feed inputs, watch if the pipeline produces correct outputs
- **Falling-piece puzzle (Tetris-style)**: Items drop from above, student must quickly categorize or place them before they pile up. Speed increases.
- **Resource management / survival**: Student has limited HP/energy/budget. Events appear that cost or reward resources. Manage tradeoffs to survive N turns.
- **Live simulation**: A system runs in real-time (economy, ecosystem, code execution, physics). Student tweaks parameters to reach a target state or prevent collapse.
- **Arcade / reflex**: Elements move across the screen. Student clicks to catch correct ones, avoid wrong ones. Combo multipliers for streaks.
- **Investigation / detective**: Examine evidence, form a hypothesis, test it. Clues unlock as the student demonstrates understanding.
- **Territory control**: A map/grid where student claims cells by demonstrating knowledge. Opponent AI pushes back.

**KEY PRINCIPLE**: The game should have continuous, evolving state — health bars, score multipliers, resource pools, combo chains, timers, things that MOVE on their own. Not just "answer 5 questions in sequence."

## Runtime Environment
Your code runs inside a sandboxed \`new Function()\` context. The following globals are injected automatically:
- **React** — the full React object (React.createElement is used by JSX)
- **THEME** — a color palette object, already injected as a global. Do NOT redefine or redeclare THEME.
- **Destructured hooks**: useState, useEffect, useRef, useCallback, useMemo, useReducer, useLayoutEffect, Fragment

You MAY write \`import\` statements for React — they are harmless and will be stripped. Do NOT import anything else. Do NOT write \`const THEME = ...\` — THEME is pre-injected.

## THEME Keys (light cream/orange theme — reference directly, e.g. THEME.accent)
bg (#faf9f7), surface (#f5f3f0), surfaceLight (#ece9e4), border (#ece9e4),
borderHover (#d9d4cd), accent (#ff6b00 orange), accentHover (#e55a00),
text (#1a1a1a dark), textMuted (#999), correct (#00c864 green), correctBg (#ecfdf5),
incorrect (#f44336 red), incorrectBg (#ffebee), warning (#ff9800), warningBg (#fff5eb), white (#ffffff)

## Available CSS Classes (from games.css)
Layout: game-container, game-title, game-subtitle, game-stats, game-actions, round-indicator
Buttons: btn-primary, btn-secondary
Stats: stat, stat-value, stat-label
Feedback: prediction-result correct, prediction-result incorrect

## Constraints
1. The component must accept a single prop: \`{ rounds: any[] }\`
2. Use THEME for ALL colors — reference it directly (e.g., \`THEME.accent\`), it is a global
3. NO fetch calls, NO external dependencies, NO network access
4. Maximum 500 lines of code
5. Hardcode ALL game content directly in the component — do NOT rely on the rounds prop for data
6. Include round/level navigation and clear win/lose/score feedback
7. The component must be playable and self-contained
8. Use \`className\`, never \`class\`, for JSX attributes
9. Return a single root element
10. Do NOT use \`window\`, \`document\`, or DOM APIs directly
11. Do NOT use TypeScript syntax — write plain JavaScript
12. Do NOT use optional chaining on potentially undefined arrays without fallback
13. Use font-family: 'Inter', sans-serif
14. Use border-radius: 10-14px for cards, 10px for buttons
15. Use subtle borders (1px solid THEME.border) not heavy outlines
16. Use subtle shadows (0 1px 3px rgba(0,0,0,0.06)) for cards
17. Primary buttons: dark bg (#1a1a1a), white text. NOT orange bg.
18. Keep the visual design minimal and warm, but make the GAMEPLAY feel like a real game with stakes, tension, and momentum

## ERRORS THAT WILL REJECT YOUR CODE — Read carefully
1. **FUNCTION SIGNATURE**: Your component MUST be \`export default function GameName({ rounds })\` — the \`{ rounds }\` destructured prop is REQUIRED. Code without it is automatically rejected.
2. **STRING QUOTES**: Use backtick template literals for ANY string containing apostrophes or quotes. NEVER write \`'it's'\` — write \`\\\`it's\\\`\` instead. This is the #1 cause of syntax errors.
3. **THEME**: Do NOT write \`const THEME = {...}\` anywhere. THEME is a pre-injected global. Redeclaring it will crash the game. NEVER define your own THEME object.
4. **NO BROWSER APIs**: Do NOT use \`window.location\`, \`window.alert\`, \`document.*\`, or any browser globals. To "restart" the game, reset state with setState instead.
5. **ARRAY SAFETY**: Before calling \`.map()\`, \`.forEach()\`, \`.filter()\` on any variable, ensure it is initialized as an array. Use \`useState([])\` not \`useState(null)\`.

## Output Format
Output ONLY the component code. No markdown fences, no explanation, no \`\`\` markers. Start DIRECTLY with the import statement:

import React, { useState } from 'react'

export default function YourGameName({ rounds }) {
  // ... your code here
}

## Few-Shot Examples

### Example 1: Timed Arcade — Catch Falling Concepts
A real-time game where items fall from the top of the screen and the player must click/tap the correct ones before they reach the bottom. Wrong clicks cost HP. Speed increases over time. Combo multipliers for streaks.
\`\`\`
import React, { useState, useEffect, useRef, useCallback } from 'react'

export default function ConceptCatcher({ rounds }) {
  const LEVELS = [
    {
      title: "Catch the Pure Functions",
      instruction: "Click functions that are PURE. Let impure ones fall. Wrong clicks cost a life!",
      items: [
        { text: "const add = (a, b) => a + b", correct: true },
        { text: "const now = () => Date.now()", correct: false },
        { text: "const upper = s => s.toUpperCase()", correct: true },
        { text: "let count = 0; const inc = () => ++count", correct: false },
        { text: "const head = arr => arr[0]", correct: true },
        { text: "const rand = () => Math.random()", correct: false },
        { text: "const mul = (x, y) => x * y", correct: true },
        { text: "const log = x => { console.log(x); return x }", correct: false },
        { text: "const negate = n => -n", correct: true },
        { text: "const save = data => db.write(data)", correct: false },
      ],
      spawnInterval: 2200,
      fallDuration: 6000,
    },
    {
      title: "Catch O(1) Operations",
      instruction: "Click operations with O(1) time complexity. Let the rest fall!",
      items: [
        { text: "Array index access arr[5]", correct: true },
        { text: "Hash map lookup map.get(key)", correct: true },
        { text: "Binary search on sorted array", correct: false },
        { text: "Push to end of array", correct: true },
        { text: "Find min in unsorted array", correct: false },
        { text: "Stack peek / pop", correct: true },
        { text: "Sort an array", correct: false },
        { text: "Linked list traversal", correct: false },
        { text: "Dequeue from a queue", correct: true },
        { text: "Check if array contains value", correct: false },
      ],
      spawnInterval: 2000,
      fallDuration: 5500,
    }
  ]

  const [levelIdx, setLevelIdx] = useState(0)
  const [falling, setFalling] = useState([])
  const [hp, setHp] = useState(5)
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [bestCombo, setBestCombo] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [itemQueue, setItemQueue] = useState([])
  const [started, setStarted] = useState(false)
  const nextId = useRef(0)
  const intervalRef = useRef(null)
  const frameRef = useRef(null)
  const fallingRef = useRef([])
  const hpRef = useRef(5)

  const level = LEVELS[levelIdx]

  const startLevel = useCallback(() => {
    const shuffled = [...level.items].sort(() => Math.random() - 0.5)
    setItemQueue(shuffled)
    setFalling([])
    fallingRef.current = []
    setStarted(true)
    setGameOver(false)
    setHp(5)
    hpRef.current = 5
    setScore(0)
    setCombo(0)
    setBestCombo(0)
    nextId.current = 0
  }, [level])

  useEffect(() => {
    if (!started || gameOver) return
    let queueIdx = 0
    const spawn = () => {
      if (queueIdx >= itemQueue.length) { clearInterval(intervalRef.current); return }
      const item = itemQueue[queueIdx++]
      const id = nextId.current++
      const xPos = 10 + Math.random() * 60
      const newItem = { ...item, id, x: xPos, spawnTime: Date.now() }
      fallingRef.current = [...fallingRef.current, newItem]
      setFalling([...fallingRef.current])
    }
    intervalRef.current = setInterval(spawn, level.spawnInterval)
    spawn()
    return () => clearInterval(intervalRef.current)
  }, [started, gameOver, itemQueue, level.spawnInterval])

  useEffect(() => {
    if (!started || gameOver) return
    const tick = () => {
      const now = Date.now()
      let hpLost = 0
      const alive = fallingRef.current.filter(item => {
        const elapsed = now - item.spawnTime
        if (elapsed > level.fallDuration) {
          if (item.correct) hpLost++
          return false
        }
        return true
      })
      if (hpLost > 0) {
        const newHp = Math.max(0, hpRef.current - hpLost)
        hpRef.current = newHp
        setHp(newHp)
        setCombo(0)
        if (newHp <= 0) { setGameOver(true); return }
      }
      fallingRef.current = alive
      setFalling([...alive])
      frameRef.current = requestAnimationFrame(tick)
    }
    frameRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameRef.current)
  }, [started, gameOver, level.fallDuration])

  const handleClick = (item) => {
    if (gameOver) return
    if (item.correct) {
      setScore(s => s + (1 + combo))
      setCombo(c => { const n = c + 1; setBestCombo(b => Math.max(b, n)); return n })
    } else {
      const newHp = Math.max(0, hpRef.current - 1)
      hpRef.current = newHp
      setHp(newHp)
      setCombo(0)
      if (newHp <= 0) setGameOver(true)
    }
    fallingRef.current = fallingRef.current.filter(f => f.id !== item.id)
    setFalling([...fallingRef.current])
  }

  const allDone = started && !gameOver && falling.length === 0 && itemQueue.length > 0

  return (
    <div className="game-container" style={{ position: 'relative', minHeight: 420, overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h2 className="game-title" style={{ margin: 0 }}>{level.title}</h2>
        <div className="game-stats">
          <div className="stat"><span className="stat-value" style={{ color: hp <= 2 ? THEME.incorrect : THEME.text }}>{"❤".repeat(hp)}</span><span className="stat-label">HP</span></div>
          <div className="stat"><span className="stat-value">{score}</span><span className="stat-label">Score</span></div>
          {combo > 1 && <div className="stat"><span className="stat-value" style={{ color: THEME.accent }}>x{combo}</span><span className="stat-label">Combo</span></div>}
        </div>
      </div>
      <p className="game-subtitle">{level.instruction}</p>
      {!started ? (
        <div style={{ textAlign: 'center', marginTop: 60 }}>
          <button className="btn-primary" onClick={startLevel}>Start</button>
        </div>
      ) : (
        <div style={{ position: 'relative', height: 320, border: \`1px solid \${THEME.border}\`, borderRadius: 14, marginTop: 12, background: THEME.surface, overflow: 'hidden' }}>
          {falling.map(item => {
            const elapsed = Date.now() - item.spawnTime
            const pct = Math.min(elapsed / level.fallDuration, 1)
            return (
              <div key={item.id} onClick={() => handleClick(item)} style={{
                position: 'absolute', left: \`\${item.x}%\`, top: \`\${pct * 85}%\`,
                transform: 'translateX(-50%)', padding: '8px 14px', background: THEME.white,
                border: \`1px solid \${THEME.border}\`, borderRadius: 10, cursor: 'pointer',
                fontSize: 12, fontFamily: 'monospace', color: THEME.text, whiteSpace: 'nowrap',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)', transition: 'top 0.3s linear',
                maxWidth: '80%', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>{item.text}</div>
            )
          })}
          {gameOver && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(250,249,247,0.92)' }}>
              <p style={{ fontSize: 20, fontWeight: 600, color: THEME.text }}>Game Over</p>
              <p style={{ color: THEME.textMuted, margin: '8px 0 16px' }}>Score: {score} | Best combo: x{bestCombo}</p>
              <button className="btn-primary" onClick={startLevel}>Retry</button>
              {levelIdx < LEVELS.length - 1 && score >= 5 && <button className="btn-secondary" onClick={() => { setLevelIdx(l => l + 1); setStarted(false) }} style={{ marginTop: 8 }}>Next Level</button>}
            </div>
          )}
          {allDone && !gameOver && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(250,249,247,0.92)' }}>
              <p style={{ fontSize: 20, fontWeight: 600, color: THEME.correct }}>Level Clear!</p>
              <p style={{ color: THEME.textMuted, margin: '8px 0 16px' }}>Score: {score} | Best combo: x{bestCombo}</p>
              {levelIdx < LEVELS.length - 1 ? <button className="btn-primary" onClick={() => { setLevelIdx(l => l + 1); setStarted(false) }}>Next Level</button> : <p style={{ color: THEME.accent, fontWeight: 600 }}>All levels complete!</p>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
\`\`\`

### Example 2: Resource-Management Survival
The student manages limited resources while events force tradeoffs. Each decision has consequences that compound.
\`\`\`
import React, { useState, useCallback } from 'react'

export default function SystemSurvival({ rounds }) {
  const SCENARIOS = [
    {
      title: "Server Scaling Crisis",
      intro: "Your web app is growing. You have a limited budget. Survive 8 events without crashing.",
      startResources: { budget: 100, uptime: 100, users: 50 },
      events: [
        { text: "Traffic spike! Users doubled overnight.", choices: [
          { label: "Add more servers (+$30, +20 capacity)", effect: { budget: -30, uptime: 10, users: 20 }, feedback: "Vertical scaling works short-term but gets expensive." },
          { label: "Enable caching layer (+$10, moderate relief)", effect: { budget: -10, uptime: 5, users: 10 }, feedback: "Smart — caching reduces load without scaling compute." },
          { label: "Do nothing (save money, risk downtime)", effect: { budget: 0, uptime: -25, users: -10 }, feedback: "Risky. Users are hitting timeouts and leaving." },
        ]},
        { text: "Database queries are slow. P99 latency at 2 seconds.", choices: [
          { label: "Add read replicas (+$25)", effect: { budget: -25, uptime: 15, users: 5 }, feedback: "Read replicas help with read-heavy loads." },
          { label: "Add indexes to hot queries (+$5)", effect: { budget: -5, uptime: 20, users: 5 }, feedback: "Excellent — indexing is cheap and high-impact." },
          { label: "Upgrade to bigger DB instance (+$40)", effect: { budget: -40, uptime: 10, users: 0 }, feedback: "Throwing hardware at it works but burns budget fast." },
        ]},
        { text: "A deploy introduced a memory leak. RAM usage climbing.", choices: [
          { label: "Rollback immediately (+reliability, -feature)", effect: { budget: 0, uptime: 15, users: -5 }, feedback: "Fast rollback is the right call for a memory leak." },
          { label: "Hot-fix in production", effect: { budget: -5, uptime: -10, users: 0 }, feedback: "Hot-fixing a memory leak under pressure often makes it worse." },
          { label: "Restart servers every hour as a bandaid", effect: { budget: -10, uptime: -5, users: -10 }, feedback: "This masks the problem. Users notice the periodic drops." },
        ]},
        { text: "Security audit found an SQL injection vulnerability.", choices: [
          { label: "Parameterize all queries immediately (+$15)", effect: { budget: -15, uptime: 5, users: 5 }, feedback: "Correct fix. Parameterized queries prevent SQL injection." },
          { label: "Add a WAF rule to block suspicious input (+$10)", effect: { budget: -10, uptime: 0, users: 0 }, feedback: "WAF helps but is a bandaid — the vulnerability still exists." },
          { label: "Deprioritize — no breach has happened yet", effect: { budget: 0, uptime: 0, users: -15 }, feedback: "Terrible idea. When a breach happens, you lose trust." },
        ]},
        { text: "Your lead engineer quit. Team velocity dropped 40%.", choices: [
          { label: "Hire a senior contractor (+$35)", effect: { budget: -35, uptime: 5, users: 5 }, feedback: "Expensive but maintains velocity." },
          { label: "Redistribute work among existing team", effect: { budget: 0, uptime: -10, users: 0 }, feedback: "Realistic but the team is now overloaded." },
          { label: "Pause new features, focus on stability", effect: { budget: 5, uptime: 10, users: -5 }, feedback: "Smart call. Stability over growth when understaffed." },
        ]},
        { text: "A competitor launched a similar product. Users comparing.", choices: [
          { label: "Ship the big feature early (risky deploy)", effect: { budget: -10, uptime: -15, users: 20 }, feedback: "Rushing features creates tech debt and bugs." },
          { label: "Focus on reliability — let uptime speak", effect: { budget: 0, uptime: 10, users: 5 }, feedback: "Reliability is a competitive advantage." },
          { label: "Cut prices to retain users (-$20 revenue)", effect: { budget: -20, uptime: 0, users: 10 }, feedback: "Price wars hurt margins. Hard to reverse." },
        ]},
        { text: "Cloud provider announces 15% price increase next month.", choices: [
          { label: "Optimize resource usage now (+$5 savings)", effect: { budget: 10, uptime: 0, users: 0 }, feedback: "Proactive optimization — good engineering practice." },
          { label: "Migrate to a different provider (+$20 upfront)", effect: { budget: -20, uptime: -5, users: 0 }, feedback: "Migration is disruptive but can pay off long-term." },
          { label: "Absorb the cost increase", effect: { budget: -15, uptime: 0, users: 0 }, feedback: "Sometimes the simplest option. But watch the budget." },
        ]},
        { text: "Black Friday incoming. Expected 5x normal traffic.", choices: [
          { label: "Pre-scale everything (+$30)", effect: { budget: -30, uptime: 20, users: 25 }, feedback: "Pre-scaling for known events is best practice." },
          { label: "Set up auto-scaling rules (+$15)", effect: { budget: -15, uptime: 10, users: 15 }, feedback: "Auto-scaling is efficient but has cold-start delays." },
          { label: "Hope current capacity holds", effect: { budget: 0, uptime: -30, users: -20 }, feedback: "It did not hold. Major outage during peak traffic." },
        ]},
      ]
    }
  ]

  const scenario = SCENARIOS[0]
  const [eventIdx, setEventIdx] = useState(0)
  const [resources, setResources] = useState(scenario.startResources)
  const [lastFeedback, setLastFeedback] = useState(null)
  const [history, setHistory] = useState([])
  const [dead, setDead] = useState(false)

  const handleChoice = useCallback((choice) => {
    const newRes = {
      budget: Math.max(0, resources.budget + choice.effect.budget),
      uptime: Math.min(100, Math.max(0, resources.uptime + choice.effect.uptime)),
      users: Math.max(0, resources.users + choice.effect.users),
    }
    setResources(newRes)
    setLastFeedback(choice.feedback)
    setHistory(h => [...h, { event: scenario.events[eventIdx].text, choice: choice.label }])

    if (newRes.uptime <= 0 || newRes.budget <= 0) {
      setDead(true)
    } else {
      setTimeout(() => {
        setEventIdx(i => i + 1)
        setLastFeedback(null)
      }, 1800)
    }
  }, [resources, eventIdx, scenario.events])

  const survived = eventIdx >= scenario.events.length
  const event = scenario.events[eventIdx]
  const healthColor = (val) => val > 60 ? THEME.correct : val > 30 ? THEME.warning : THEME.incorrect

  const restart = () => {
    setEventIdx(0)
    setResources(scenario.startResources)
    setLastFeedback(null)
    setHistory([])
    setDead(false)
  }

  return (
    <div className="game-container">
      <h2 className="game-title">{scenario.title}</h2>
      <p className="game-subtitle">{scenario.intro}</p>

      <div style={{ display: 'flex', gap: 16, margin: '16px 0', justifyContent: 'center' }}>
        {[
          { label: 'Budget', value: resources.budget, icon: '$' },
          { label: 'Uptime', value: resources.uptime, icon: '%' },
          { label: 'Users', value: resources.users, icon: '' },
        ].map(r => (
          <div key={r.label} style={{ textAlign: 'center', padding: '12px 20px', background: THEME.surface, borderRadius: 12, border: \`1px solid \${THEME.border}\`, minWidth: 80 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: healthColor(r.value), fontFamily: "'Inter', sans-serif" }}>{r.value}{r.icon}</div>
            <div style={{ fontSize: 11, color: THEME.textMuted, marginTop: 4 }}>{r.label}</div>
            <div style={{ height: 4, background: THEME.surfaceLight, borderRadius: 2, marginTop: 6 }}>
              <div style={{ height: '100%', width: \`\${r.value}%\`, background: healthColor(r.value), borderRadius: 2, transition: 'all 0.5s ease' }} />
            </div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 11, color: THEME.textMuted, textAlign: 'center', marginBottom: 12 }}>Event {Math.min(eventIdx + 1, scenario.events.length)} of {scenario.events.length}</div>

      {dead ? (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <p style={{ fontSize: 18, fontWeight: 600, color: THEME.incorrect }}>System Crashed!</p>
          <p style={{ color: THEME.textMuted, margin: '8px 0 16px' }}>{resources.uptime <= 0 ? "Total outage — users left." : "Ran out of budget."} Survived {eventIdx} of {scenario.events.length} events.</p>
          <button className="btn-primary" onClick={restart}>Try Again</button>
        </div>
      ) : survived ? (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <p style={{ fontSize: 18, fontWeight: 600, color: THEME.correct }}>You Survived!</p>
          <p style={{ color: THEME.textMuted, margin: '8px 0' }}>Final: ${resources.budget} budget, {resources.uptime}% uptime, {resources.users} users</p>
          <button className="btn-primary" onClick={restart}>Play Again</button>
        </div>
      ) : (
        <div>
          <div style={{ padding: 16, background: THEME.white, border: \`1px solid \${THEME.border}\`, borderRadius: 12, marginBottom: 12 }}>
            <p style={{ fontWeight: 600, color: THEME.text, fontSize: 14 }}>{event.text}</p>
          </div>
          {lastFeedback ? (
            <div style={{ padding: 12, background: THEME.warningBg, border: \`1px solid \${THEME.warning}\`, borderRadius: 10, fontSize: 13, color: THEME.text }}>{lastFeedback}</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {event.choices.map((c, i) => (
                <button key={i} onClick={() => handleChoice(c)} style={{
                  padding: '12px 16px', background: THEME.surface, border: \`1px solid \${THEME.border}\`,
                  borderRadius: 10, cursor: 'pointer', textAlign: 'left', fontSize: 13,
                  color: THEME.text, fontFamily: "'Inter', sans-serif", transition: 'all 0.15s ease',
                }}>{c.label}</button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
\`\`\`

## Design Principles
1. **Real game feel**: The player should feel tension, momentum, and stakes. Use HP, timers, score multipliers, resource pools, escalating difficulty — the mechanics of real games.
2. **Continuous evolving state**: Avoid isolated "answer then next" rounds. Each decision should affect future state. The game world should feel alive and responsive.
3. **Learning through consequences**: The student discovers correct answers by experiencing what happens when they're wrong — system crashes, resources drain, combos break. Not through "Correct!/Incorrect!" popups.
4. **Frontier testing**: Target the edge of what the student knows. Probe where understanding breaks down.
5. **Misconception targeting**: Design the game so that common misconceptions lead to predictable failure modes the student can learn from.`

  const performanceSection = profile.recentPerformance.length > 0
    ? `\n\nRecent game performance:\n${profile.recentPerformance.map(p =>
        `- ${p.game}: ${p.score}/${p.maxScore}${p.notableErrors.length > 0 ? ` (errors: ${p.notableErrors.join(', ')})` : ''}`
      ).join('\n')}`
    : ''

  const topicInstruction = topic
    ? `\nTopic requested by teacher: "${topic}"`
    : `\nChoose the most impactful topic based on the student's gaps and upcoming modules.`

  const user = `Design and build a complete, novel, interactive educational game for this student.

## Student Profile
Name: ${profile.name}
Subject: ${profile.subject}
Level: ${profile.level}
Context: ${profile.context}

Known strengths: ${profile.knownStrengths.join(', ')}
Known gaps: ${profile.knownGaps.join(', ')}
Misconceptions: ${profile.misconceptions.join(', ') || 'None identified yet'}

Learning style: ${profile.preferredModalities.join(', ')}
Response to challenge: ${profile.responseToChallenge}
Engagement triggers: ${profile.engagementTriggers.join(', ')}

Current module: ${profile.currentModule}
Upcoming topics: ${profile.upcomingTopics.join(', ')}${performanceSection}${topicInstruction}

## Requirements
1. Build a REAL GAME with real game mechanics — HP, timers, score multipliers, resource management, escalating difficulty, combos, or live simulations. The player should feel tension and stakes. NEVER make a quiz, multiple-choice, or click-to-reveal format.
2. The game must have continuous, evolving state — not isolated rounds. Each action should affect what comes next (resources deplete, difficulty scales, combos build, systems respond).
3. Hardcode all game content directly in the component — 3-5 levels/scenarios
4. Content should target the student's known gaps and misconceptions
5. Learning happens through gameplay consequences, not "Correct/Incorrect" labels. Wrong choices should have natural in-game costs (lose HP, drain resources, break combos, crash the system).
6. Output ONLY the React component code — no explanation${buildArticleSection(articleContext)}`

  return { system, user }
}

// ═══════════════════════════════════════════
//   Prompt C: Critic
// ═══════════════════════════════════════════

export function buildCriticPrompt(spec: GameSpec, config: unknown, isCustomCode: boolean): {
  system: string
  user: string
} {
  const system = `You are a quality assurance critic for educational games. Evaluate the given game config on 4 dimensions, each scored 0-3.

## Rubric

### 1. Structural Correctness (0-3)
- 0: Missing required fields, broken references, crashes
- 1: Has structure but with errors (wrong indices, missing IDs)
- 2: Structurally valid with minor issues
- 3: Perfect structure, all cross-references valid

### 2. Content Accuracy (0-3)
- 0: Contains factual errors or wrong answers marked as correct
- 1: Mostly accurate but some answers are debatable or wrong
- 2: Accurate with minor imprecisions
- 3: All content is factually correct and precisely stated

### 3. Playability (0-3)
- 0: Unplayable (no challenge nodes, impossible to complete)
- 1: Playable but confusing or frustrating UX
- 2: Plays well with minor issues
- 3: Smooth, engaging experience

### 4. Educational Value (0-3)
- 0: Doesn't test the stated pedagogical goal
- 1: Loosely related to the goal
- 2: Tests the goal but could be more targeted
- 3: Precisely targets the pedagogical goal, every round adds signal

## Pass Criteria
- ALL dimensions must score >= 2
- Total score must be >= 10 out of 12

## Output Format
Respond with ONLY valid JSON:
{
  "pass": true/false,
  "totalScore": number,
  "dimensions": [
    { "name": "structural_correctness", "score": 0-3, "feedback": "specific feedback" },
    { "name": "content_accuracy", "score": 0-3, "feedback": "specific feedback" },
    { "name": "playability", "score": 0-3, "feedback": "specific feedback" },
    { "name": "educational_value", "score": 0-3, "feedback": "specific feedback" }
  ],
  "revisionInstructions": "If fail: specific, actionable list of what to fix. If pass: omit this field."
}`

  const configStr = isCustomCode
    ? `[Custom React Component Code]\n${config}`
    : JSON.stringify(config, null, 2)

  const user = `Evaluate this game:

## Game Spec
Title: ${spec.title}
Type: ${spec.gameType}
Concept: ${spec.concept}
Pedagogical Goal: ${spec.pedagogicalGoal}
Difficulty: ${spec.difficulty}/5

## Generated Config
${configStr}

Check carefully:
- Are all "correct" answers actually correct?
- Do all cross-references (IDs, indices) resolve?
- Is the difficulty appropriate?
- Does every round contribute to the pedagogical goal?`

  return { system, user }
}

// ═══════════════════════════════════════════
//   Prompt D: Revision
// ═══════════════════════════════════════════

export function buildRevisionPrompt(
  spec: GameSpec,
  currentConfig: unknown,
  criticResult: CriticResult,
  isCustomCode: boolean
): {
  system: string
  user: string
} {
  const system = isCustomCode
    ? `You are fixing a React component for an educational game. Apply ONLY the specific fixes listed below. Do not change anything else. Output the complete fixed component code. No markdown fences.`
    : `You are fixing a game config JSON. Apply ONLY the specific fixes listed below. Do not change anything else. Output ONLY the fixed JSON array. No markdown, no explanation.`

  const configStr = isCustomCode
    ? `${currentConfig}`
    : JSON.stringify(currentConfig, null, 2)

  const user = `Fix this game config:

## Game Spec
Title: ${spec.title}
Type: ${spec.gameType}

## Current Config
${configStr}

## Critic Scores
${criticResult.dimensions.map(d => `- ${d.name}: ${d.score}/3 — ${d.feedback}`).join('\n')}

## Required Fixes
${criticResult.revisionInstructions}

Apply ONLY these fixes. Do not change anything else.`

  return { system, user }
}

// ═══════════════════════════════════════════
//   Custom Game: Fix Prompt (uses edit tools)
// ═══════════════════════════════════════════

export function buildCustomFixPrompt(
  currentCode: string,
  errorMessage: string,
): {
  system: string
  user: string
} {
  const system = `You are fixing a React component for an educational game. You have three editing tools available:

1. **search_replace** — Find exact text and replace it. Use for targeted edits and deletions.
2. **insert_after** — Insert new code after a matched anchor line.
3. **full_rewrite** — Replace the entire component. Use ONLY when you need more than 5 individual edits.

## Runtime Environment
- THEME is a pre-injected global. Do NOT declare \`const THEME = ...\`.
- THEME keys (light cream/orange palette): bg (#faf9f7), surface (#f5f3f0), surfaceLight (#ece9e4), border (#ece9e4), borderHover (#d9d4cd), accent (#ff6b00 orange), accentHover (#e55a00), text (#1a1a1a dark), textMuted (#999), correct (#00c864 green), correctBg (#ecfdf5), incorrect (#f44336 red), incorrectBg (#ffebee), warning (#ff9800), warningBg (#fff5eb), white (#ffffff)
- React hooks (useState, useEffect, etc.) are destructured globals.
- The component receives \`{ rounds: any[] }\` as its prop.

## Rules
- Fix ONLY the error described below. Do not change anything else.
- Do NOT output any text explanation — use ONLY the tools.
- Preserve indentation exactly when writing search/replace text.`

  const numberedCode = currentCode
    .split('\n')
    .map((line, i) => `${String(i + 1).padStart(4, ' ')} | ${line}`)
    .join('\n')

  const user = `Fix this React component. It has the following error:

## Error
${errorMessage}

## Current Code (with line numbers for reference)
${numberedCode}

Use the editing tools to fix ONLY this error.`

  return { system, user }
}

// ═══════════════════════════════════════════
//   Prompt D (tool-aware): Revision for custom code
// ═══════════════════════════════════════════

function addLineNumbers(code: string): string {
  return code
    .split('\n')
    .map((line, i) => `${String(i + 1).padStart(4, ' ')} | ${line}`)
    .join('\n')
}

export function buildRevisionPromptWithTools(
  spec: GameSpec,
  currentCode: string,
  criticResult: CriticResult,
): {
  system: string
  user: string
} {
  const system = `You are fixing a React component for an educational game. You have three editing tools available:

1. **search_replace** — Find exact text and replace it. Use for targeted edits and deletions. The search text must match exactly (including whitespace/indentation). It must appear exactly once in the code.
2. **insert_after** — Insert new code after a matched anchor line. The anchor is matched by trimming whitespace. It must appear exactly once.
3. **full_rewrite** — Replace the entire component. Use ONLY when you need more than 5 individual edits. If you use this, all other edits are ignored.

## Rules
- Prefer search_replace for most fixes — it is the most precise
- Use insert_after when adding new code blocks (functions, state declarations, JSX sections)
- Use full_rewrite ONLY as a last resort for extensive changes
- Do NOT output any text explanation — use ONLY the tools
- Preserve indentation exactly when writing search/replace text
- Each search_replace match must be unique in the code — include enough surrounding context to disambiguate`

  const numberedCode = addLineNumbers(currentCode)

  const user = `Fix this React component:

## Game Spec
Title: ${spec.title}
Concept: ${spec.concept}

## Current Code (with line numbers for reference)
${numberedCode}

## Critic Scores
${criticResult.dimensions.map(d => `- ${d.name}: ${d.score}/3 — ${d.feedback}`).join('\n')}

## Required Fixes
${criticResult.revisionInstructions}

Use the editing tools to apply ONLY these fixes. Do not change anything else.`

  return { system, user }
}
