// ============================================================
// Maestro 2.0 Frontend Logic (Drop‑in Replacement)
// ------------------------------------------------------------
// Responsibilities:
// - Connect to WebSocket backend
// - Receive STATE updates and render UI
// - Provide debug logging for all events
// - Send /start requests to backend
// ============================================================

// ------------------------------------------------------------
// Debug logger (writes to #debug-log panel)
// ------------------------------------------------------------
function debug(msg) {
    const log = document.getElementById("debug-log");
    const timestamp = new Date().toLocaleTimeString();
    log.textContent += `[${timestamp}] ${msg}\n`;
    log.scrollTop = log.scrollHeight;
}

// ------------------------------------------------------------
// UI Elements
// ------------------------------------------------------------
const conversationEl = document.getElementById("conversation");
const codeOutputEl = document.getElementById("code-output");
const taskInputEl = document.getElementById("task-input");
const startBtn = document.getElementById("start-btn");

// ------------------------------------------------------------
// WebSocket Connection
// ------------------------------------------------------------
let ws = null;

function connectWebSocket() {
    debug("Attempting WebSocket connection...");

    ws = new WebSocket(`ws://${window.location.host}/ws`);

    ws.onopen = () => {
        debug("WebSocket connected");
    };

    ws.onclose = () => {
        debug("WebSocket disconnected");
        // Optional: auto-reconnect
        setTimeout(connectWebSocket, 1000);
    };

    ws.onerror = (err) => {
        debug("WebSocket error: " + err);
    };

    ws.onmessage = (event) => {
        debug("WebSocket message received");
        try {
            const state = JSON.parse(event.data);
            renderState(state);
        } catch (e) {
            debug("Error parsing WS message: " + e);
        }
    };
}

connectWebSocket();

// ------------------------------------------------------------
// Render STATE from backend
// ------------------------------------------------------------
function renderState(state) {
    debug("Rendering state update");

    // -------------------------
    // Conversation timeline
    // -------------------------
    conversationEl.innerHTML = "";

    state.conversation.forEach((msg) => {
        const div = document.createElement("div");
        div.className = "message";

        div.innerHTML = `
            <div class="agent">${msg.agent} (${msg.model})</div>
            <div class="timestamp">${new Date(msg.timestamp * 1000).toLocaleTimeString()}</div>
            <div class="content">${escapeHtml(msg.content).replace(/\n/g, "<br>")}</div>
        `;

        conversationEl.appendChild(div);
    });

    conversationEl.scrollTop = conversationEl.scrollHeight;

    // -------------------------
    // Code output
    // -------------------------
    if (state.current_code) {
        const code = extractFencedCode(state.current_code);
        codeOutputEl.textContent = code || "";
    } else {
        codeOutputEl.textContent = "";
    }

    // -------------------------
    // Error display (if any)
    // -------------------------
    if (state.error) {
        debug("ERROR from backend: " + state.error);
    }
}

// ------------------------------------------------------------
// Extract fenced code block from a message
// ------------------------------------------------------------
function extractFencedCode(text) {
    const match = text.match(/```(?:\w+)?\n([\s\S]*?)```/);
    return match ? match[1].trim() : "";
}

// ------------------------------------------------------------
// Escape HTML for safe rendering
// ------------------------------------------------------------
function escapeHtml(str) {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

// ------------------------------------------------------------
// Start task button
// ------------------------------------------------------------
startBtn.addEventListener("click", async () => {
    const task = taskInputEl.value.trim();
    if (!task) {
        debug("No task entered");
        return;
    }

    debug("Sending /start request with task: " + task);

    try {
        const res = await fetch("/start", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ task }),
        });

        const data = await res.json();
        debug("Backend response: " + JSON.stringify(data));
    } catch (e) {
        debug("Error calling /start: " + e);
    }
});
