// ============================================================
// Maestro Frontend (Phase 7: Stabilization & UX Refinement)
// ============================================================
// Handles real-time WebSocket events from backend.
//
// EVENT PROTOCOL (matches backend)
// ================================
// 1. pipeline_start
//    Payload: agents (list), agents_metadata (dict), max_rounds (int),
//             routing_strategy (str), mode (str)
//    Action: Initialize UI, clear conversation, show progress bar
//
// 2. agent_turn_start
//    Payload: round (int), agent (str), agent_role (str), model (str)
//    Action: Update agent indicator, show active status
//
// 3. agent_message
//    Payload: round (int), agent (str), agent_role (str), model (str), content (str)
//    Action: Add message to conversation, extract code if present
//
// 4. agent_turn_end
//    Payload: round (int), agent (str), agent_role (str), model (str)
//    Action: Update agent indicator to idle
//
// 5. pipeline_complete
//    Payload: rounds (int), final_response (str or null)
//    Action: Update status to "Completed", finalize progress, enable start button
//
// 6. pipeline_error
//    Payload: error (str), rounds (int)
//    Action: Update status to "Error", display error message, enable start button
//
// 7. heartbeat
//    Payload: (empty)
//    Action: Ignore (connection keep-alive only)
// ============================================================

// -------- Debug logger --------
function debug(msg) {
    const log = document.getElementById("debug-log");
    const timestamp = new Date().toLocaleTimeString();
    log.textContent += `[${timestamp}] ${msg}\n`;
    log.scrollTop = log.scrollHeight;
}

// -------- UI Elements --------
const conversationEl = document.getElementById("conversation");
const codeOutputEl = document.getElementById("code-output");
const taskInputEl = document.getElementById("task-input");
const startBtn = document.getElementById("start-btn");
const extractBtn = document.getElementById("extract-btn");
const saveBtn = document.getElementById("save-btn");
const statusEl = document.getElementById("status");
const progressEl = document.getElementById("progress");

// -------- State tracking --------
let pipelineState = {
    running: false,
    currentAgent: null,
    round: 0,
    agents: [],
    agentsMetadata: {},
    lastConversationLength: 0
};

// -------- WebSocket Connection --------
let ws = null;

function connectWebSocket() {
    debug("Attempting WebSocket connection...");
    ws = new WebSocket("ws://localhost:8000/ws");

    ws.onopen = () => {
        debug("WebSocket connected ✓");
        updateStatus("Connected", "ready");
    };

    ws.onclose = () => {
        debug("WebSocket disconnected; reconnecting in 1s...");
        updateStatus("Disconnected", "error");
        setTimeout(connectWebSocket, 1000);
    };

    ws.onerror = (err) => {
        debug("WebSocket error");
        console.error(err);
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            handleBackendEvent(data);
        } catch (e) {
            debug("Error parsing message: " + e);
        }
    };
}

connectWebSocket();

// -------- Event Handler (dispatches to specific handlers) --------
function handleBackendEvent(data) {
    // Always reconcile from full state snapshots first, because last_event can
    // advance quickly (e.g., agent_message -> agent_turn_end) between polls.
    if (data.conversation !== undefined) {
        renderState(data);
    }

    // Handle both direct events and state objects with last_event
    const event = data.type ? data : (data.last_event || {});

    if (!event.type) return;

    switch (event.type) {
        case "pipeline_start":
            handlePipelineStart(event);
            break;
        case "agent_turn_start":
            handleAgentTurnStart(event);
            break;
        case "agent_message":
            handleAgentMessage(event);
            break;
        case "agent_turn_end":
            handleAgentTurnEnd(event);
            break;
        case "pipeline_complete":
            handlePipelineComplete(event);
            break;
        case "pipeline_error":
            handlePipelineError(event);
            break;
        case "heartbeat":
            // Ignore heartbeats for now
            break;
        default:
            // Fallback: render full state if it looks like a state object
            if (data.conversation !== undefined) {
                renderState(data);
            }
    }
}

// -------- Event Handlers --------

function handlePipelineStart(event) {
    debug(`Pipeline started: ${event.agents?.length || 0} agents`);
    pipelineState.running = true;
    pipelineState.agents = event.agents || [];
    pipelineState.agentsMetadata = event.agents_metadata || {};
    pipelineState.round = 0;
    pipelineState.lastConversationLength = 0;

    conversationEl.innerHTML = "";
    codeOutputEl.textContent = "";
    extractBtn.disabled = true; // Disable extract button at start
    saveBtn.disabled = true; // Disable save button at start
    taskInputEl.value = ""; // Clear input after starting

    updateStatus("Running", "running");
    updateProgress(0, event.max_rounds || 12);

    addSystemMessage("▶ Pipeline Started", `${event.agents?.length || 0} agents, max ${event.max_rounds || 12} rounds, strategy: ${event.routing_strategy || "round_robin"}`);
}

function handleAgentTurnStart(event) {
    debug(`Agent turn start: ${event.agent} (round ${event.round})`);
    pipelineState.currentAgent = event.agent;
    pipelineState.round = event.round;

    updateProgress(event.round, 12); // Assume max 12 for UI
    addAgentIndicator(event.agent, event.agent_role, "active");
}

function handleAgentMessage(event) {
    debug(`Message from ${event.agent}: ${event.content?.substring(0, 50) || "..."}...`);
    // Conversation and code capture are handled via renderState() snapshot
    // reconciliation to avoid missing coder output due to event timing.
}

function handleAgentTurnEnd(event) {
    debug(`Agent turn end: ${event.agent}`);
    addAgentIndicator(event.agent, event.agent_role, "idle");
}

function handlePipelineComplete(event) {
    debug(`Pipeline completed after ${event.rounds || 0} rounds`);
    pipelineState.running = false;
    updateStatus("Completed", "success");
    updateProgress(event.rounds || 0, event.rounds || 12);
    addSystemMessage("✓ Pipeline Complete", `Finished after ${event.rounds || 0} rounds`);
    startBtn.disabled = false;
    taskInputEl.disabled = false;
    extractBtn.disabled = false; // Enable extract button when pipeline completes
}

function handlePipelineError(event) {
    debug(`Pipeline error: ${event.error || "Unknown error"}`);
    pipelineState.running = false;
    updateStatus("Error", "error");
    addSystemMessage("❌ Error", event.error || "Pipeline execution failed");
    startBtn.disabled = false;
    taskInputEl.disabled = false;
}

// -------- UI Update Functions --------

function updateStatus(text, state) {
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.className = `status status-${state}`;
}

function updateProgress(current, max) {
    if (!progressEl) return;
    const percent = max > 0 ? Math.round((current / max) * 100) : 0;
    progressEl.style.width = percent + "%";
    progressEl.textContent = `${current}/${max}`;
}

function addConversationMessage(agent, role, model, content) {
    const div = document.createElement("div");
    div.className = `message agent-${sanitizeClass(agent)}`;

    const timestamp = new Date().toLocaleTimeString();

    div.innerHTML = `
        <div class="message-header">
            <span class="agent-badge" style="background-color: ${getAgentColor(agent)}">${role}</span>
            <span class="agent-name">${agent}</span>
            <span class="model">${model}</span>
            <span class="timestamp">${timestamp}</span>
        </div>
        <div class="message-content">${escapeHtml(content).replace(/\n/g, "<br>")}</div>
    `;

    conversationEl.appendChild(div);
    conversationEl.scrollTop = conversationEl.scrollHeight;
}

function addAgentIndicator(agent, role, state) {
    const existing = document.querySelector(`.agent-row[data-agent="${agent}"]`);
    if (existing) {
        existing.className = `agent-row agent-${state}`;
    }
}

function addSystemMessage(title, content) {
    const div = document.createElement("div");
    div.className = "message system-message";

    div.innerHTML = `
        <div class="message-header">
            <span class="agent-badge" style="background-color: #666;">SYSTEM</span>
            <span class="agent-name">${title}</span>
        </div>
        <div class="message-content">${escapeHtml(content).replace(/\n/g, "<br>")}</div>
    `;

    conversationEl.appendChild(div);
    conversationEl.scrollTop = conversationEl.scrollHeight;
}

// -------- Utility Functions --------

function getAgentColor(agent) {
    const colors = {
        composer: "#4A90E2",
        coder: "#7ED321",
        critic: "#F5A623",
        archivist: "#BD10E0"
    };
    return colors[agent] || "#999";
}

function sanitizeClass(str) {
    return str.replace(/[^a-z0-9-]/gi, "-").toLowerCase();
}

function extractLatestCodeBlock(text) {
    debug(`Attempting code extraction from: ${text.substring(0, 100)}...`);

    // First try: standard fenced code blocks
    const fencedMatches = [...text.matchAll(/```[\s\S]*?```/g)];
    if (fencedMatches.length > 0) {
        const last = fencedMatches[fencedMatches.length - 1][0];
        const extracted = last.replace(/```[\w]*\n?/, "").replace(/```$/, "").trim();
        debug(`Found fenced code block, extracted ${extracted.length} characters`);
        return extracted;
    }

    // Second try: indented code blocks (common in some model outputs)
    const indentedMatches = text.match(/^ {4,}.*$/gm);
    if (indentedMatches && indentedMatches.length > 0) {
        const extracted = indentedMatches.join('\n').trim();
        debug(`Found indented code block, extracted ${extracted.length} characters`);
        return extracted;
    }

    // Third try: look for Python function/class definitions
    const pythonPatterns = [
        /(?:def|class)\s+\w+.*?(?=\n\n|\n(?:def|class)|\Z)/gs,
        /import\s+.*?(?=\n\n|\Z)/gs,
        /from\s+.*?(?=\n\n|\Z)/gs
    ];

    for (const pattern of pythonPatterns) {
        const matches = text.match(pattern);
        if (matches && matches.length > 0) {
            const extracted = matches.join('\n\n').trim();
            debug(`Found Python pattern match, extracted ${extracted.length} characters`);
            return extracted;
        }
    }

    // Fourth try: look for any line that looks like Python code
    const lines = text.split('\n');
    const codeLines = lines.filter(line =>
        line.trim() &&
        !line.match(/^[A-Z]/) && // Not starting with capital (likely prose)
        (line.includes('=') || line.includes('def ') || line.includes('class ') ||
         line.includes('import ') || line.includes('return ') || line.includes('print('))
    );

    if (codeLines.length > 0) {
        const extracted = codeLines.join('\n').trim();
        debug(`Found heuristic code lines, extracted ${extracted.length} characters`);
        return extracted;
    }

    debug(`No code found in message`);
    return "";
}

function escapeHtml(str) {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// -------- Fallback: Render full state (for polling) --------

function renderState(state) {
    // Update running status
    if (state.running !== pipelineState.running) {
        pipelineState.running = state.running;
        updateStatus(state.running ? "Running" : "Idle", state.running ? "running" : "ready");
    }

    // Update current agent
    if (state.current_agent !== pipelineState.currentAgent) {
        pipelineState.currentAgent = state.current_agent;
    }

    // Append only new messages since the last snapshot.
    if (state.conversation && state.conversation.length > pipelineState.lastConversationLength) {
        const newMessages = state.conversation.slice(pipelineState.lastConversationLength);
        newMessages.forEach((msg) => {
            addConversationMessage(msg.agent, msg.agent, msg.model, msg.content);

            if (msg.agent === "coder") {
                const code = extractLatestCodeBlock(msg.content || "");
                if (code) {
                    codeOutputEl.textContent = code;
                    saveBtn.disabled = false;
                    debug(`Code captured from coder snapshot (${code.length} characters)`);
                }
            }
        });
        pipelineState.lastConversationLength = state.conversation.length;
    }

    // Recover from backend-provided current_code when available.
    if (state.current_code) {
        const recovered = extractLatestCodeBlock(state.current_code) || state.current_code;
        if (recovered && recovered.trim()) {
            codeOutputEl.textContent = recovered;
            saveBtn.disabled = false;
        }
    }

    // Update error display
    if (state.error) {
        addSystemMessage("Backend Error", state.error);
    }
}

// -------- Start Button Handler --------

startBtn.addEventListener("click", async () => {
    const task = taskInputEl.value.trim();
    if (!task) {
        debug("ERROR: No task entered");
        addSystemMessage("⚠ Input Error", "Please enter a task description");
        return;
    }

    if (task.length > 10000) {
        debug("ERROR: Task too long");
        addSystemMessage("⚠ Input Error", "Task is too long (max 10000 characters)");
        return;
    }

    debug(`Sending task to backend: "${task.substring(0, 50)}..."`);
    
    // Disable controls during execution
    startBtn.disabled = true;
    taskInputEl.disabled = true;
    updateStatus("Starting...", "running");

    try {
        const res = await fetch("http://localhost:8000/start", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ task }),
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            const errorMsg = errorData.error || `HTTP ${res.status}`;
            debug(`ERROR: Backend returned ${res.status}: ${errorMsg}`);
            addSystemMessage("❌ Backend Error", errorMsg);
            updateStatus("Error", "error");
            return;
        }

        const data = await res.json();
        debug(`Backend responded: ${data.status}`);
        addSystemMessage("✓ Task Started", "Pipeline is now executing...");
    } catch (e) {
        const errorMsg = `Failed to start pipeline: ${e.message}`;
        debug(`ERROR: ${errorMsg}`);
        addSystemMessage("❌ Connection Error", errorMsg);
        updateStatus("Error", "error");
    } finally {
        // Re-enable controls only if not running
        if (!pipelineState.running) {
            startBtn.disabled = false;
            taskInputEl.disabled = false;
        }
    }
});

// -------- Save Button Handler --------

saveBtn.addEventListener("click", () => {
    const code = codeOutputEl.textContent.trim();
    if (!code) {
        debug("ERROR: No code to save");
        addSystemMessage("⚠ Save Error", "No code available to save");
        return;
    }

    // Create a blob with the code
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    // Create a temporary download link
    const a = document.createElement("a");
    a.href = url;
    a.download = "generated_code.py"; // Default filename
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Clean up the URL object
    URL.revokeObjectURL(url);

    debug("Code saved to file");
    addSystemMessage("✓ Code Saved", "Generated code saved as 'generated_code.py'");
});

// -------- Extract Button Handler --------

extractBtn.addEventListener("click", () => {
    debug("Manually extracting code from conversation...");

    // Get all message elements from the conversation
    const messageElements = conversationEl.querySelectorAll('.message-content');
    let allCode = "";

    messageElements.forEach((element, index) => {
        const text = element.textContent || "";
        const code = extractLatestCodeBlock(text);
        if (code) {
            if (allCode) allCode += "\n\n# From another message:\n";
            allCode += code;
            debug(`Found code in message ${index + 1}`);
        }
    });

    if (allCode) {
        codeOutputEl.textContent = allCode;
        saveBtn.disabled = false;
        debug(`Manual extraction successful: ${allCode.length} characters`);
        addSystemMessage("✓ Code Extracted", `Found ${allCode.split('\n').length} lines of code from conversation`);
    } else {
        debug("Manual extraction found no code");
        addSystemMessage("⚠ No Code Found", "Could not extract any code from the conversation. The agents may not have generated code in the expected format.");
    }
});

