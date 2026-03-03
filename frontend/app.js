// ===============================
// WebSocket Setup
// ===============================

let ws = null;

function connectWS() {
    ws = new WebSocket("ws://127.0.0.1:8000/ws");

    ws.onopen = () => {
        console.log("WebSocket connected");
    };

    ws.onclose = () => {
        console.log("WebSocket closed, retrying in 1s...");
        setTimeout(connectWS, 1000);
    };

    ws.onerror = (err) => {
        console.log("WebSocket error:", err);
    };

    ws.onmessage = (event) => {
        console.log("WS message received:", event.data);
        try {
            const state = JSON.parse(event.data);
            updateUI(state);
        } catch (e) {
            console.error("Failed to parse WS message:", e);
        }
    };
}

connectWS();


// ===============================
// UI Update Logic
// ===============================

function updateUI(state) {
    // Running
    document.getElementById("isRunning").textContent = state.running;

    // Current Agent
    document.getElementById("currentAgent").textContent =
        state.current_agent || "None";

    // Current Model
    document.getElementById("currentModel").textContent =
        state.current_model || "None";

    // Conversation
    const convoDiv = document.getElementById("conversation");
    convoDiv.innerHTML = "";
    state.conversation.forEach(msg => {
        const div = document.createElement("div");
        div.className = "message";
        div.innerHTML = `<strong>${msg.agent} (${msg.model})</strong><br>${msg.content}`;
        convoDiv.appendChild(div);
    });

    // Code Output
    document.getElementById("codeOutput").textContent =
        state.current_code || "";
}


// ===============================
// Start / Stop Task
// ===============================

function startTask() {
    const task = document.getElementById("taskInput").value;

    fetch("http://127.0.0.1:8000/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task })
    })
        .then(r => r.json())
        .then(d => console.log("Start response:", d))
        .catch(err => console.error("Start error:", err));
}

function stopTask() {
    // Not implemented yet — placeholder
    console.log("Stop requested (not implemented)");
}