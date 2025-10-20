# CollabCanvas Task List

Building Real-Time Collaborative Design Tools with AI

## Core Areas (100 points total)

### 1. Core Collaborative Infrastructure (30 points)

#### Real-Time Synchronization (12 points)
- [ ] Implement sub-50ms cursor sync
- [ ] Implement sub-100ms object sync
- [ ] Achieve zero visible lag during rapid multi-user edits
- [ ] Show multiplayer cursors with names moving in real time
- [ ] Instant object creation/modification sync for all users
- [ ] Clear presence awareness of who's currently editing

#### Conflict Resolution & State Management (9 points)
- [ ] Handle simultaneous edits with consistent final state
- [ ] Document strategy (last-write-wins, CRDT, OT, etc.)
- [ ] Prevent "ghost" objects or duplicates
- [ ] Handle rapid edits (10+ changes/sec) without corruption
- [ ] Clear visual feedback on who last edited

**Testing Scenarios:**
- [ ] Simultaneous Move: User A and User B both drag the same rectangle
- [ ] Rapid Edit Storm: User A resizes while User B changes color while User C moves
- [ ] Delete vs Edit: User A deletes while User B is actively editing
- [ ] Create Collision: Two users create objects at nearly identical timestamps

#### Persistence & Reconnection (9 points)
- [ ] User refreshes mid-edit → returns to exact state
- [ ] All users disconnect → canvas persists fully
- [ ] Network drop (30s+) → auto-reconnects with complete state
- [ ] Operations during disconnect queue and sync on reconnect
- [ ] Clear UI indicator for connection status

**Testing Scenarios:**
- [ ] Mid-Operation Refresh: User drags object, refreshes browser mid-drag
- [ ] Total Disconnect: All users close browsers, wait 2 minutes, return
- [ ] Network Simulation: Throttle network to 0 for 30 seconds, restore
- [ ] Rapid Disconnect: User makes 5 rapid edits, immediately closes tab

### 2. Canvas Features & Performance (20 points)

#### Canvas Functionality (8 points)
- [ ] Smooth pan/zoom
- [ ] 3+ shape types (rectangles, circles, lines)
- [ ] Text with basic formatting
- [ ] Multi-select (shift-click or drag-to-select)
- [ ] Layer management
- [ ] Transform operations (move/resize/rotate)
- [ ] Duplicate/delete operations
- [ ] Selection for single and multiple objects

#### Performance & Scalability (12 points)
- [ ] Consistent performance with 500+ objects
- [ ] Supports 5+ concurrent users
- [ ] No degradation under load
- [ ] Smooth interactions at scale

### 3. Advanced Figma-Inspired Features (15 points)

#### Tier 1 Features (2 points each, max 3 features = 6 points)
- [ ] Color picker
- [ ] Undo/redo with keyboard shortcuts (Cmd+Z/Cmd+Shift+Z)
- [ ] Keyboard shortcuts for common operations (Delete, Duplicate, Arrow keys to move)
- [ ] Export canvas or objects as PNG/SVG
- [ ] Snap-to-grid or smart guides when moving objects
- [ ] Object grouping/ungrouping
- [ ] Copy/paste functionality

#### Tier 2 Features (3 points each, max 2 features = 6 points)
- [ ] Component system (create reusable components/symbols)
- [ ] Layers panel with drag-to-reorder and hierarchy
- [ ] Alignment tools (align left/right/center, distribute evenly)
- [ ] Z-index management (bring to front, send to back)
- [ ] Selection tools (lasso select, select all of type)
- [ ] Styles/design tokens (save and reuse colors, text styles)
- [ ] Canvas frames/artboards for organizing work

#### Tier 3 Features (3 points each, max 1 feature = 3 points)
- [ ] Auto-layout (flexbox-like automatic spacing and sizing)
- [ ] Collaborative comments/annotations on objects
- [ ] Version history with restore capability
- [ ] Plugins or extensions system
- [ ] Vector path editing (pen tool with bezier curves)
- [ ] Advanced blend modes and opacity
- [ ] Prototyping/interaction modes (clickable links between frames)

### 4. AI Canvas Agent (25 points)

#### Command Breadth & Capability (10 points)
- [ ] 8+ distinct command types
- [ ] Covers all categories: creation, manipulation, layout, complex
- [ ] Commands are diverse and meaningful

**AI Command Categories:**

**Creation Commands (at least 2 required):**
- [ ] "Create a red circle at position 100, 200"
- [ ] "Add a text layer that says 'Hello World'"
- [ ] "Make a 200x300 rectangle"

**Manipulation Commands (at least 2 required):**
- [ ] "Move the blue rectangle to the center"
- [ ] "Resize the circle to be twice as big"
- [ ] "Rotate the text 45 degrees"

**Layout Commands (at least 1 required):**
- [ ] "Arrange these shapes in a horizontal row"
- [ ] "Space these elements evenly"

**Complex Commands (at least 1 required):**
- [ ] "Create a login form with username and password fields"
- [ ] "Build a navigation bar with 4 menu items"
- [ ] "Make a card layout with title, image, and description"
- [ ] "Create a grid of 3x3 squares"

#### Complex Command Execution (8 points)
- [ ] "Create login form" produces 3+ properly arranged elements
- [ ] Complex layouts execute multi-step plans correctly
- [ ] Smart positioning and styling
- [ ] Handles ambiguity well

#### AI Performance & Reliability (7 points)
- [ ] Sub-2 second responses
- [ ] 90%+ accuracy
- [ ] Natural UX with feedback
- [ ] Shared state works flawlessly
- [ ] Multiple users can use AI simultaneously

**Technical Implementation Requirements:**
- [ ] Define tool schema for AI function calling
- [ ] Implement createShape(type, x, y, width, height, color)
- [ ] Implement moveShape(shapeId, x, y)
- [ ] Implement resizeShape(shapeId, width, height)
- [ ] Implement rotateShape(shapeId, degrees)
- [ ] Implement createText(text, x, y, fontSize, color)
- [ ] Implement getCanvasState() for context
- [ ] Use OpenAI's function calling or LangChain tools
- [ ] Plan complex operations upfront and execute sequentially

### 5. Technical Implementation (10 points)

#### Architecture Quality (5 points)
- [ ] Clean, well-organized code
- [ ] Clear separation of concerns
- [ ] Scalable architecture
- [ ] Proper error handling
- [ ] Modular components

#### Authentication & Security (5 points)
- [ ] Robust auth system
- [ ] Secure user management
- [ ] Proper session handling
- [ ] Protected routes
- [ ] No exposed credentials

### 6. Documentation & Submission Quality (5 points)

#### Repository & Setup (3 points)
- [ ] Clear README
- [ ] Detailed setup guide
- [ ] Architecture documentation
- [ ] Easy to run locally
- [ ] Dependencies listed

#### Deployment (2 points)
- [ ] Stable deployment
- [ ] Publicly accessible
- [ ] Supports 5+ users
- [ ] Fast load times

## Build Strategy

### Start with the Hard Part
1. [ ] Get two cursors syncing
2. [ ] Get objects syncing
3. [ ] Handle conflicts
4. [ ] Persist state
5. [ ] Add shapes, transformations, and AI

### Build Vertically
1. [ ] Cursor sync
2. [ ] Object sync
3. [ ] Transformations
4. [ ] Basic AI commands
5. [ ] Complex AI commands

### Test Continuously
- [ ] Use multiple browser windows
- [ ] Throttle network speed
- [ ] Test with 3–4 users
- [ ] Run simultaneous AI commands

## Recommended Tech Stack
- Backend: Realtime DB, Auth
- Frontend: React, Vue, Svelte, or Vanilla JS with Konva.js
- AI Integration: OpenAI GPT-4-mini (function calling support)

## Testing Requirements
- [ ] 2 users editing simultaneously in different browsers
- [ ] One user refreshing mid-edit to confirm state persistence
- [ ] Multiple shapes being created and moved rapidly to test sync performance
- [ ] Real conditions testing under load
