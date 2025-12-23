import cv2
from src.camera.camera_manager import CameraManager

camera = CameraManager()

while True:
    frame = camera.read_frame()
    if frame is None:
        print("Failed to grab frame")
        break

    cv2.imshow("Camera Test", frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

camera.release()
