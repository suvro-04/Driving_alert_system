import cv2
import threading
from flask import Flask, jsonify, Response
from flask_cors import CORS
from src.camera.camera_manager import CameraManager
from src.detection.face_landmarks import FaceLandmarkDetector
from src.detection.drowsiness_metrics import compute_ear, compute_mar
from src.detection.drowsiness_logic import DrowsinessDetector
from src.detection.head_pose import HeadPoseEstimator
from src.interface.alert_signal import AlertSignal

# FLASK APP
app = Flask(__name__)
CORS(app)

# SHARED METRICS (Frontend reads this)
latest_metrics = {
    "ear": 0.0,
    "blinkRate": 0,
    "yawnCount": 0,
    "headTilt": 0.0,
    "state": "alert",
    "eyesOpen": True,
    "yawning": False,
    "serialConnected": True,
    "buzzerActive": False,
    "faceBox": None
}

# MEDIAPIPE INDICES
LEFT_EYE = [33, 160, 158, 133, 153, 144]
MOUTH = [61, 13, 14, 291]

# MAIN DETECTION LOOP
def detection_loop():
    global latest_metrics

    camera = CameraManager()
    camera.start_camera()

    frame = camera.get_frame()
    if frame is None:
        print("Camera not available")
        return

    h, w, _ = frame.shape

    landmark_detector = FaceLandmarkDetector()
    head_pose = HeadPoseEstimator(h, w)
    drowsy_detector = DrowsinessDetector()
    alert = AlertSignal()

    while True:
        frame = camera.get_frame()
        if frame is None:
            continue

        landmarks = landmark_detector.get_landmarks(frame)

        if landmarks:
            ear = compute_ear(landmarks, LEFT_EYE)
            mar = compute_mar(landmarks, MOUTH)
            pitch, yaw = head_pose.get_head_pose(landmarks)

            if yaw is not None:
                drowsy, yawn, distracted = drowsy_detector.update(
                    ear=ear,
                    mar=mar,
                    yaw=yaw
                )

                alert.send(
                    drowsy=drowsy,
                    yawn=yawn,
                    distracted=distracted
                )
                # UPDATE SHARED METRICS
                latest_metrics.update({
                    "ear": round(ear, 2),
                    "blinkRate": getattr(drowsy_detector, "blink_rate", 0),
                    "yawnCount": int(yawn),
                    "headTilt": round(yaw, 1),
                    "state": "drowsy" if drowsy else "alert",
                    "eyesOpen": not drowsy,
                    "yawning": yawn,
                    "serialConnected": True,
                    "buzzerActive": drowsy,
                    # TEMP face box for frontend overlay
                    "faceBox": {"x": 200, "y": 100, "w": 300, "h": 350}
                })

        # Optional local debug window (you can remove later)
        cv2.imshow("Drive Alert System (Backend)", frame)
        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

    camera.stop_camera()
    cv2.destroyAllWindows()
# API ENDPOINT (Frontend uses this)

@app.route("/api/metrics")
def api_metrics():
    return jsonify(latest_metrics)
# ENTRY POINT
if __name__ == "__main__":
    # Run detection in background
    threading.Thread(target=detection_loop, daemon=True).start()

    # Run Flask server
    app.run(host="0.0.0.0", port=5000, debug=False)
