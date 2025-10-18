# CollabCanvas

Building Real-Time Collaborative Design Tools with AI


## Background

Figma revolutionized design by making collaboration seamless. Multiple designers could work together in real time, seeing each other’s cursors and making edits simultaneously without merge conflicts.

This required solving complex technical challenges: real-time synchronization, conflict resolution, and 60 FPS performance while streaming data across the network.

Now imagine adding AI to this. What if you could tell an AI agent “create a login form” and watch it build the components on your canvas? Or say “arrange these elements in a grid” and see it happen automatically?

This project challenges you to build both the collaborative infrastructure and an AI agent that can manipulate the canvas through natural language.

### Why This Matters

The future of design tools isn’t just collaborative — it’s co-creative. You’ll be building the foundation for how humans and AI can design together, in real time.

You’ll build in two phases: first the core collaborative canvas with real-time sync, then an AI agent that manipulates the canvas through natural language.

## Core Collaborative Canvas

### Canvas Features

Your canvas needs a large workspace with a smooth pan and zoom. It doesn’t need to be truly infinite, but should feel spacious. Support basic shapes — rectangles, circles, and lines with solid colors. Add text layers with basic formatting.

Users should be able to transform objects (move, resize, rotate). Include selection for single and multiple objects (shift-click or drag-to-select). Add layer management and basic operations like delete and duplicate.

### Real-Time Collaboration

Every user should see multiplayer cursors with names moving in real time. When someone creates or modifies an object, it appears instantly for everyone. Show clear presence awareness of who’s currently editing.

Handle conflict resolution when multiple users edit simultaneously. (A “last write wins” approach is acceptable, but document your choice.)

Manage disconnects and reconnects without breaking the experience. Canvas state must persist — if all users leave and come back, their work should still be there.

### Testing Scenario

We’ll test with:

1. 2 users editing simultaneously in different browsers.
2. One user refreshing mid-edit to confirm state persistence.
3. Multiple shapes being created and moved rapidly to test sync performance.

## AI Canvas Agent

### The AI Feature

Build an AI agent that manipulates your canvas through natural language using function calling.

When a user types “Create a blue rectangle in the center,” the AI agent calls your canvas API functions, and the rectangle appears on everyone’s canvas via real-time sync.

### Required Capabilities

Your AI agent must support at least 6 distinct commands showing a range of creation, manipulation, and layout actions.

### Creation Commands:

- “Create a red circle at position 100, 200”
- “Add a text layer that says ‘Hello World’”
- “Make a 200x300 rectangle”

### Manipulation Commands:

- “Move the blue rectangle to the center”
- “Resize the circle to be twice as big”
- “Rotate the text 45 degrees”

### Layout Commands:

- “Arrange these shapes in a horizontal row”
- “Create a grid of 3x3 squares”
- “Space these elements evenly”

### Complex Commands:

- “Create a login form with username and password fields”
- “Build a navigation bar with 4 menu items”
- “Make a card layout with title, image, and description”

### Example Evaluation Criteria

When you say:

“Create a login form,” …We expect the AI to create at least three inputs (username, password, submit), arranged neatly, not just a text box.

### Technical Implementation

Define a tool schema that your AI can call, such as:

createShape(type, x, y, width, height, color)

moveShape(shapeId, x, y)

resizeShape(shapeId, width, height)

rotateShape(shapeId, degrees)

createText(text, x, y, fontSize, color)

getCanvasState() // returns current canvas objects for context

We recommend OpenAI’s function calling or LangChain tools for interpretation.

For complex operations (e.g. “create a login form”), your AI should plan steps upfront (create fields, align, group) and execute sequentially.

### Shared AI State

All users must see the same AI-generated results. If one user asks the AI to create something, everyone should see it. Multiple users should be able to use the AI simultaneously without conflict.

-----------
CollabCanvas Rubric

Total Points: 100

# Section 1: Core Collaborative Infrastructure (30 points)

## Real-Time Synchronization (12 points)
* Sub-100ms object sync
* Sub-50ms cursor sync
* Zero visible lag during rapid multi-user edits

## Conflict Resolution & State Management (9 points)
* Two users edit same object simultaneously → both see consistent final state
* Documented strategy (last-write-wins, CRDT, OT, etc.)
* No "ghost" objects or duplicates
* Rapid edits (10+ changes/sec) don't corrupt state
* Clear visual feedback on who last edited

Testing Scenarios for Conflict Resolution:
1. Simultaneous Move: User A and User B both drag the same rectangle at the same time
2. Rapid Edit Storm: User A resizes object while User B changes its color while User C moves it
3. Delete vs Edit: User A deletes an object while User B is actively editing it
4. Create Collision: Two users create objects at nearly identical timestamps

## Persistence & Reconnection (9 points)

* User refreshes mid-edit → returns to exact state
* All users disconnect → canvas persists fully
* Network drop (30s+) → auto-reconnects with complete state
* Operations during disconnect queue and sync on reconnect
* Clear UI indicator for connection status

Testing Scenarios for Persistence:
1. Mid-Operation Refresh: User drags object, refreshes browser mid-drag → object position preserved
2. Total Disconnect: All users close browsers, wait 2 minutes, return → full canvas state intact
3. Network Simulation: Throttle network to 0 for 30 seconds, restore → canvas syncs without data loss
4. Rapid Disconnect: User makes 5 rapid edits, immediately closes tab → edits persist for other users

# Section 2: Canvas Features & Performance (20 points)

## Canvas Functionality (8 points)
* Smooth pan/zoom
* 3+ shape types
* Text with formatting
* Multi-select (shift-click or drag)
* Layer management
* Transform operations (move/resize/rotate)
* Duplicate/delete

## Performance & Scalability (12 points)
* Consistent performance with 500+ objects
* Supports 5+ concurrent users
* No degradation under load
* Smooth interactions at scale

# Section 3: Advanced Figma-Inspired Features (15 points)
Overall Scoring
3 Tier 1 + 2 Tier 2 + 1 Tier 3 features, all working excellently

Feature Tiers
Tier 1 Features (2 points each, max 3 features = 6 points)
* Color picker with recent colors/saved palettes
* Undo/redo with keyboard shortcuts (Cmd+Z/Cmd+Shift+Z)
* Keyboard shortcuts for common operations (Delete, Duplicate, Arrow keys to move)
* Export canvas or objects as PNG/SVG
* Snap-to-grid or smart guides when moving objects
* Object grouping/ungrouping
* Copy/paste functionality
Tier 2 Features (3 points each, max 2 features = 6 points)
* Component system (create reusable components/symbols)
* Layers panel with drag-to-reorder and hierarchy
* Alignment tools (align left/right/center, distribute evenly)
* Z-index management (bring to front, send to back)
* Selection tools (lasso select, select all of type)
* Styles/design tokens (save and reuse colors, text styles)
* Canvas frames/artboards for organizing work
Tier 3 Features (3 points each, max 1 feature = 3 points)
* Auto-layout (flexbox-like automatic spacing and sizing)
* Collaborative comments/annotations on objects
* Version history with restore capability
* Plugins or extensions system
* Vector path editing (pen tool with bezier curves)
* Advanced blend modes and opacity
* Prototyping/interaction modes (clickable links between frames)

# Section 4: AI Canvas Agent (25 points)

## Command Breadth & Capability (10 points)
* 8+ distinct command types
* Covers all categories: creation, manipulation, layout, complex
* Commands are diverse and meaningful

AI Command Categories (must demonstrate variety):
Creation Commands (at least 2 required)
* "Create a red circle at position 100, 200"
* "Add a text layer that says 'Hello World'"
* "Make a 200x300 rectangle"
Manipulation Commands (at least 2 required)
* "Move the blue rectangle to the center"
* "Resize the circle to be twice as big"
* "Rotate the text 45 degrees"
Layout Commands (at least 1 required)
* "Arrange these shapes in a horizontal row"
* "Create a grid of 3x3 squares"
* "Space these elements evenly"
Complex Commands (at least 1 required)
* "Create a login form with username and password fields"
* "Build a navigation bar with 4 menu items"
* "Make a card layout with title, image, and description"
Complex Command Execution (8 points)

* "Create login form" produces 3+ properly arranged elements
* Complex layouts execute multi-step plans correctly
* Smart positioning and styling
* Handles ambiguity well

AI Performance & Reliability (7 points)
* Sub-2 second responses
* 90%+ accuracy
* Natural UX with feedback
* Shared state works flawlessly
* Multiple users can use AI simultaneously

# Section 5: Technical Implementation (10 points)

## Architecture Quality (5 points)
* Clean, well-organized code
* Clear separation of concerns
* Scalable architecture
* Proper error handling
* Modular components

## Authentication & Security (5 points)
* Robust auth system
* Secure user management
* Proper session handling
* Protected routes
* No exposed credentials

Section 6: Documentation & Submission Quality (5 points)
Repository & Setup (3 points)
* Clear README
* Detailed setup guide
* Architecture documentation
* Easy to run locally
* Dependencies listed

Deployment (2 points)
* Stable deployment
* Publicly accessible
* Supports 5+ users
* Fast load times

--------------------

### Technical Stack

Recommended (not required):

- Backend: Realtime DB, Auth
- Frontend: React, Vue, Svelte, or Vanilla JS with Konva.js
- AI Integration: OpenAI GPT5-mini (function calling support)

Use whatever stack helps you ship the best product.

## Build Strategy

### Start with the Hard Part

Multiplayer sync is the hardest and most important part.

Get two cursors syncing → objects syncing → handle conflicts → persist state.

Only after this is solid should you add shapes, transformations, and AI.

### Build Vertically

Finish one layer at a time:

1. Cursor sync
2. Object sync
3. Transformations
4. Basic AI commands
5. Complex AI commands

Avoid half-finished features. Multiplayer last = failure.

### Test Continuously

Use multiple browser windows, throttle network speed, test with 3–4 users, and run simultaneous AI commands. We’ll test under real conditions — test like we will.
