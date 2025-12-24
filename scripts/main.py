import cv2

from src.camera.camera_manager import CameraManager
from src.detection.face_landmarks import FaceLandmarkDetector
from src.detection.drowsiness_metrics import compute_ear, compute_mar
from src.detection.drowsiness_logic import DrowsinessDetector
from src.detection.head_pose import HeadPoseEstimator
from src.interface.alert_signal import AlertSignal


# MediaPipe landmark indices
LEFT_EYE = [33, 160, 158, 133, 153, 144]
MOUTH = [61, 13, 14, 291]


def main():
    # Initialize camera
    camera = CameraManager()
    camera.start_camera()

    # Get one frame to initialize head pose estimator
    frame = camera.get_frame()
    if frame is None:
        print("Failed to read from camera")
        return

    h, w, _ = frame.shape

    # Initialize modules
    landmark_detector = FaceLandmarkDetector()
    head_pose = HeadPoseEstimator(h, w)
    drowsy_detector = DrowsinessDetector()
    alert = AlertSignal()

    while True:
        frame = camera.get_frame()
        if frame is None:
            break

        landmarks = landmark_detector.get_landmarks(frame)

        status = "NO FACE"

        if landmarks:
            # Compute metrics
            ear = compute_ear(landmarks, LEFT_EYE)
            mar = compute_mar(landmarks, MOUTH)
            pitch, yaw = head_pose.get_head_pose(landmarks)

            if yaw is not None:
                # Decision logic
                drowsy, yawn, distracted = drowsy_detector.update(
                    ear=ear,
                    mar=mar,
                    yaw=yaw
                )

                # Alert signal (for Arduino / GPIO / Serial later)
                status = alert.send(
                    drowsy=drowsy,
                    yawn=yawn,
                    distracted=distracted
                )

                # Display metrics
                cv2.putText(frame, f"EAR: {ear:.2f}", (30, 30),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)

                cv2.putText(frame, f"MAR: {mar:.2f}", (30, 60),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 0), 2)

                cv2.putText(frame, f"Yaw: {yaw:.1f}", (30, 90),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 0, 0), 2)

                # Visual alerts
                if yawn:
                    cv2.putText(frame, "YAWNING", (30, 130),
                                cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 255), 3)

                if distracted:
                    cv2.putText(frame, "DISTRACTED", (30, 170),
                                cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 0, 0), 3)

                if drowsy:
                    cv2.putText(frame, "DROWSY", (30, 210),
                                cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 3)

        # Status line (THIS is what Arduino cares about)
        cv2.putText(frame, f"STATUS: {status}", (30, 260),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255, 255, 255), 2)

        cv2.imshow("Drive Alert System", frame)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    camera.stop_camera()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
