 // ==========================================
        // GLOBAL STATE
        // ==========================================
        let webcamStream = null;
        let websocket = null;
        let simulationInterval = null;
        let isSimulating = false;
        let canvas, ctx, video;
        let driverState = "ALERT";
        let stateTimer = 0;

        // ==========================================
        // INITIALIZATION
        // ==========================================
        document.addEventListener('DOMContentLoaded', () => {
            canvas = document.getElementById('overlay');
            ctx = canvas.getContext('2d');
            video = document.getElementById('webcam');

            // Event listeners
            document.getElementById('startBtn').addEventListener('click', startWebcam);
            document.getElementById('stopBtn').addEventListener('click', stopWebcam);
            document.getElementById('connectBtn').addEventListener('click', connectToBackend);
            document.getElementById('simulateBtn').addEventListener('click', startSimulation);

            // Auto-start simulation for demo
            startSimulation();
        });

        // ==========================================
        // WEBCAM CONTROL
        // ==========================================
        async function startWebcam() {
            try {
                webcamStream = await navigator.mediaDevices.getUserMedia({
                    video: { width: 1280, height: 720, facingMode: 'user' }
                });
                
                video.srcObject = webcamStream;
                
                video.addEventListener('loadedmetadata', () => {
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                });

                document.getElementById('startBtn').style.display = 'none';
                document.getElementById('stopBtn').style.display = 'inline-flex';
            } catch (error) {
                console.error('Camera access error:', error);
                alert('Unable to access camera. Please check permissions.');
            }
        }

        function stopWebcam() {
            if (webcamStream) {
                webcamStream.getTracks().forEach(track => track.stop());
                webcamStream = null;
            }
            
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            document.getElementById('startBtn').style.display = 'inline-flex';
            document.getElementById('stopBtn').style.display = 'none';
        }

        // ==========================================
        // BACKEND CONNECTION (WebSocket + REST Fallback)
        // ==========================================
        async function connectToBackend() {
            const wsUrl = document.getElementById('wsUrl').value;
            const apiUrl = document.getElementById('apiUrl').value;

            // Stop simulation when attempting real connection
            stopSimulation();

            // Try WebSocket first
            try {
                websocket = new WebSocket(wsUrl);

                websocket.onopen = () => {
                    updateConnectionStatus('connected', 'Connected via WebSocket');
                    console.log('WebSocket connected');
                };

                websocket.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        updateMetrics(data);
                        drawOverlay(data);
                    } catch (error) {
                        console.error('WebSocket message parse error:', error);
                    }
                };

                websocket.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    // Fallback to REST
                    startRestPolling(apiUrl);
                };

                websocket.onclose = () => {
                    console.log('WebSocket closed');
                    updateConnectionStatus('error', 'Backend Disconnected');
                    startSimulation();
                };
            } catch (error) {
                console.error('WebSocket connection failed:', error);
                startRestPolling(apiUrl);
            }
        }

        // REST API Fallback
        function startRestPolling(apiUrl) {
            let pollInterval = setInterval(async () => {
                try {
                    const response = await fetch(apiUrl);
                    if (!response.ok) throw new Error('API request failed');
                    
                    const data = await response.json();
                    updateMetrics(data);
                    drawOverlay(data);
                    updateConnectionStatus('connected', 'Connected via REST API');
                } catch (error) {
                    console.error('REST API error:', error);
                    clearInterval(pollInterval);
                    updateConnectionStatus('error', 'Backend Unavailable');
                    startSimulation();
                }
            }, 500); // Poll every 500ms
        }

        // ==========================================
        // SIMULATION MODE (State-based, NOT random)
        // ==========================================
        function startSimulation() {
            if (isSimulating) return;
            
            isSimulating = true;
            driverState = "ALERT";
            stateTimer = 0;
            updateConnectionStatus('simulated', 'Simulation Mode');

            if (simulationInterval) clearInterval(simulationInterval);

            simulationInterval = setInterval(() => {
                stateTimer++;

                // State transition logic (realistic timing)
                if (driverState === "ALERT" && stateTimer > 10) {
                    driverState = "DROWSY";
                    stateTimer = 0;
                } else if (driverState === "DROWSY" && stateTimer > 6) {
                    driverState = "ALERT";
                    stateTimer = 0;
                }

                const data = generateSimulatedData(driverState);
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

        function generateSimulatedData(state) {
            if (state === "DROWSY") {
                return {
                    ear: (0.16 + Math.random() * 0.04).toFixed(2),
                    blinkRate: Math.floor(3 + Math.random() * 4),
                    yawnCount: Math.random() < 0.3 ? 1 : 0,
                    headTilt: Math.floor(15 + Math.random() * 8),
                    state: "drowsy",
                    faceBox: { x: 200, y: 100, w: 300, h: 350 },
                    eyesOpen: false,
                    yawning: Math.random() < 0.3,
                    serialConnected: true,
                    buzzerActive: true
                };
            }

            return {
                ear: (0.26 + Math.random() * 0.04).toFixed(2),
                blinkRate: Math.floor(12 + Math.random() * 6),
                yawnCount: 0,
                headTilt: Math.floor(-2 + Math.random() * 4),
                state: "alert",
                faceBox: { x: 200, y: 100, w: 300, h: 350 },
                eyesOpen: true,
                yawning: false,
                serialConnected: true,
                buzzerActive: false
            };
        }

        // ==========================================
        // UPDATE UI METRICS
        // ==========================================
        function updateMetrics(data) {
            // Update metric values
            document.getElementById('earValue').textContent = data.ear || '--';
            document.getElementById('blinkValue').innerHTML = (data.blinkRate || '--') + '<span class="metric-unit">/min</span>';
            document.getElementById('yawnValue').textContent = data.yawnCount || 0;
            document.getElementById('tiltValue').innerHTML = (data.headTilt || '--') + '<span class="metric-unit">°</span>';

            // Update metric card colors based on thresholds
            const earCard = document.getElementById('earCard');
            earCard.className = 'metric-card';
            if (data.ear < 0.2) earCard.classList.add('danger');
            else if (data.ear < 0.25) earCard.classList.add('warning');

            const tiltCard = document.getElementById('tiltCard');
            tiltCard.className = 'metric-card';
            if (Math.abs(data.headTilt) > 15) tiltCard.classList.add('danger');
            else if (Math.abs(data.headTilt) > 10) tiltCard.classList.add('warning');

            // Update driver state
            const stateElement = document.getElementById('driverState');
            const alertOverlay = document.getElementById('alertOverlay');
            
            if (data.state === "drowsy" || data.state === "DROWSY") {
                stateElement.className = 'driver-state drowsy';
                stateElement.innerHTML = '<span class="state-dot"></span><span>Drowsy</span>';
                alertOverlay.classList.add('active');
            } else {
                stateElement.className = 'driver-state alert';
                stateElement.innerHTML = '<span class="state-dot"></span><span>Alert</span>';
                alertOverlay.classList.remove('active');
            }

            // Update hardware status
            updateHardwareStatus(data);
        }

        function updateHardwareStatus(data) {
            const serialStatus = document.getElementById('serialStatus');
            const buzzerStatus = document.getElementById('buzzerStatus');
            const vibrationStatus = document.getElementById('vibrationStatus');

            if (data.serialConnected) {
                serialStatus.textContent = 'Connected';
                serialStatus.className = 'hardware-status active';
            } else {
                serialStatus.textContent = 'Disconnected';
                serialStatus.className = 'hardware-status inactive';
            }

            if (data.buzzerActive) {
                buzzerStatus.textContent = 'Active';
                buzzerStatus.className = 'hardware-status active';
            } else {
                buzzerStatus.textContent = 'Inactive';
                buzzerStatus.className = 'hardware-status inactive';
            }

            // Vibration typically mirrors buzzer in this system
            if (data.buzzerActive) {
                vibrationStatus.textContent = 'Active';
                vibrationStatus.className = 'hardware-status active';
            } else {
                vibrationStatus.textContent = 'Inactive';
                vibrationStatus.className = 'hardware-status inactive';
            }
        }

        // ==========================================
        // DRAW DETECTION OVERLAY ON VIDEO
        // ==========================================
        function drawOverlay(data) {
            if (!canvas || !ctx) return;
            
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (!data.faceBox) return;

            const { x, y, w, h } = data.faceBox;

            // Draw face bounding box
            ctx.strokeStyle = data.state === 'drowsy' ? '#ea4335' : '#4285f4';
            ctx.lineWidth = 3;
            ctx.strokeRect(x, y, w, h);

            // Draw status label
            ctx.fillStyle = data.state === 'drowsy' ? '#ea4335' : '#4285f4';
            ctx.fillRect(x, y - 30, w, 30);
            
            ctx.fillStyle = '#ffffff';
            ctx.font = '16px Google Sans, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(
                data.state === 'drowsy' ? 'DROWSY' : 'ALERT',
                x + w / 2,
                y - 10
            );

            // Draw eye indicators
            if (data.eyesOpen !== undefined) {
                const eyeText = data.eyesOpen ? 'Eyes: Open' : 'Eyes: Closed';
                ctx.fillStyle = 'rgba(66, 133, 244, 0.8)';
                ctx.fillRect(x, y + h + 5, 120, 25);
                ctx.fillStyle = '#ffffff';
                ctx.font = '13px Roboto, sans-serif';
                ctx.textAlign = 'left';
                ctx.fillText(eyeText, x + 10, y + h + 20);
            }

            // Draw yawning indicator
            if (data.yawning) {
                ctx.fillStyle = 'rgba(251, 188, 4, 0.8)';
                ctx.fillRect(x + w - 120, y + h + 5, 120, 25);
                ctx.fillStyle = '#ffffff';
                ctx.font = '13px Roboto, sans-serif';
                ctx.textAlign = 'right';
                ctx.fillText('Yawning', x + w - 10, y + h + 20);
            }
        }

        // ==========================================
        // CONNECTION STATUS UPDATE
        // ==========================================
        function updateConnectionStatus(type, message) {
            const badge = document.getElementById('connectionStatus');
            badge.className = `status-badge ${type}`;
            
            let icon = 'info';
            if (type === 'connected') icon = 'check_circle';
            else if (type === 'error') icon = 'error';
            
            badge.innerHTML = `
                <span class="material-icons" style="font-size: 16px;">${icon}</span>
                <span>${message}</span>
            `;
        }