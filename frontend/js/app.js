// ==========================================
// GLOBAL STATE
// ==========================================
let simulationInterval = null;
let backendInterval = null;
let isSimulating = false;
let canvas, ctx, video;

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('overlay');
    ctx = canvas.getContext('2d');
    video = document.getElementById('webcam');

    document.getElementById('connectBtn').addEventListener('click', connectToBackend);
    document.getElementById('simulateBtn').addEventListener('click', startSimulation);

    // Start simulation by default
    startSimulation();
});

// ==========================================
// BACKEND CONNECTION (Flask API)
// ==========================================
function connectToBackend() {
    const apiUrl = document.getElementById('apiUrl').value;

    stopSimulation();
    updateConnectionStatus('connected', 'Connecting to Backend...');

    if (backendInterval) clearInterval(backendInterval);

    backendInterval = setInterval(async () => {
        try {
            const response = await fetch(apiUrl + "/api/metrics");
            if (!response.ok) throw new Error("Backend not responding");

            const data = await response.json();

            updateMetrics(data);
            drawOverlay(data);

            updateConnectionStatus('connected', 'Backend Connected');
        } catch (error) {
            console.error("Backend disconnected:", error);

            clearInterval(backendInterval);
            backendInterval = null;

            updateConnectionStatus('error', 'Backend Disconnected');
            startSimulation();
        }
    }, 500); // 500ms polling
}

// ==========================================
// SIMULATION MODE (Fallback ONLY)
// ==========================================
function startSimulation() {
    if (isSimulating || backendInterval) return;

    isSimulating = true;
    updateConnectionStatus('simulated', 'Simulation Mode');

    simulationInterval = setInterval(() => {
        const data = generateSimulatedData();
        updateMetrics(data);
        drawOverlay(data);
    }, 1000);
}

function stopSimulation() {
    if (simulationInterval) {
        clearInterval(simulationInterval);
        simulationInterval = null;
    }
    isSimulating = false;
}

function generateSimulatedData() {
    const drowsy = Math.random() < 0.3;

    return {
        ear: drowsy ? 0.17 : 0.28,
        blinkRate: drowsy ? 3 : 14,
        yawnCount: drowsy ? 1 : 0,
        headTilt: drowsy ? 18 : 2,
        state: drowsy ? "drowsy" : "alert",
        eyesOpen: !drowsy,
        yawning: drowsy,
        serialConnected: true,
        buzzerActive: drowsy,
        faceBox: { x: 200, y: 100, w: 300, h: 350 }
    };
}

// ==========================================
// UPDATE UI METRICS
// ==========================================
function updateMetrics(data) {
    document.getElementById('earValue').textContent = data.ear ?? '--';
    document.getElementById('blinkValue').innerHTML =
        (data.blinkRate ?? '--') + '<span class="metric-unit">/min</span>';
    document.getElementById('yawnValue').textContent = data.yawnCount ?? 0;
    document.getElementById('tiltValue').innerHTML =
        (data.headTilt ?? '--') + '<span class="metric-unit">°</span>';

    const earCard = document.getElementById('earCard');
    earCard.className = 'metric-card';
    if (data.ear < 0.2) earCard.classList.add('danger');
    else if (data.ear < 0.25) earCard.classList.add('warning');

    const tiltCard = document.getElementById('tiltCard');
    tiltCard.className = 'metric-card';
    if (Math.abs(data.headTilt) > 15) tiltCard.classList.add('danger');
    else if (Math.abs(data.headTilt) > 10) tiltCard.classList.add('warning');

    const stateElement = document.getElementById('driverState');
    const alertOverlay = document.getElementById('alertOverlay');

    if (data.state === "drowsy") {
        stateElement.className = 'driver-state drowsy';
        stateElement.innerHTML = '<span class="state-dot"></span><span>Drowsy</span>';
        alertOverlay.classList.add('active');
    } else {
        stateElement.className = 'driver-state alert';
        stateElement.innerHTML = '<span class="state-dot"></span><span>Alert</span>';
        alertOverlay.classList.remove('active');
    }

    updateHardwareStatus(data);
}

function updateHardwareStatus(data) {
    setStatus('serialStatus', data.serialConnected);
    setStatus('buzzerStatus', data.buzzerActive);
    setStatus('vibrationStatus', data.buzzerActive);
}

function setStatus(id, active) {
    const el = document.getElementById(id);
    el.textContent = active ? 'Active' : 'Inactive';
    el.className = 'hardware-status ' + (active ? 'active' : 'inactive');
}

// ==========================================
// DRAW OVERLAY
// ==========================================
function drawOverlay(data) {
    if (!canvas || !ctx || !data.faceBox) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const { x, y, w, h } = data.faceBox;

    ctx.strokeStyle = data.state === 'drowsy' ? '#ea4335' : '#4285f4';
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);

    ctx.fillStyle = ctx.strokeStyle;
    ctx.fillRect(x, y - 30, w, 30);

    ctx.fillStyle = '#fff';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(data.state.toUpperCase(), x + w / 2, y - 10);
}

// ==========================================
// CONNECTION STATUS
// ==========================================
function updateConnectionStatus(type, message) {
    const badge = document.getElementById('connectionStatus');
    badge.className = `status-badge ${type}`;
    badge.innerHTML = message;
}
