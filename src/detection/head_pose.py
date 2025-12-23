import cv2
import numpy as np

class HeadPoseEstimator:
    def __init__(self, frame_width, frame_height):
        self.size = (frame_width, frame_height)

        # 3D model points (approximate human face)
        self.model_points = np.array([
            (0.0, 0.0, 0.0),        # Nose tip
            (0.0, -330.0, -65.0),  # Chin
            (-225.0, 170.0, -135.0),  # Left eye corner
            (225.0, 170.0, -135.0),   # Right eye corner
            (-150.0, -150.0, -125.0), # Left mouth corner
            (150.0, -150.0, -125.0)   # Right mouth corner
        ])

        focal_length = self.size[1]
        center = (self.size[1] / 2, self.size[0] / 2)

        self.camera_matrix = np.array([
            [focal_length, 0, center[0]],
            [0, focal_length, center[1]],
            [0, 0, 1]
        ], dtype="double")

        self.dist_coeffs = np.zeros((4, 1))

    def get_head_pose(self, landmarks):
        image_points = np.array([
            (landmarks[1].x * self.size[1], landmarks[1].y * self.size[0]),   # Nose
            (landmarks[152].x * self.size[1], landmarks[152].y * self.size[0]), # Chin
            (landmarks[263].x * self.size[1], landmarks[263].y * self.size[0]), # Left eye
            (landmarks[33].x * self.size[1], landmarks[33].y * self.size[0]),  # Right eye
            (landmarks[291].x * self.size[1], landmarks[291].y * self.size[0]), # Mouth left
            (landmarks[61].x * self.size[1], landmarks[61].y * self.size[0])   # Mouth right
        ], dtype="double")

        success, rotation_vector, translation_vector = cv2.solvePnP(
            self.model_points,
            image_points,
            self.camera_matrix,
            self.dist_coeffs,
            flags=cv2.SOLVEPNP_ITERATIVE
        )

        if not success:
            return None, None

        rmat, _ = cv2.Rodrigues(rotation_vector)
        angles, _, _, _, _, _ = cv2.RQDecomp3x3(rmat)

        pitch = angles[0] * 360
        yaw = angles[1] * 360

        return pitch, yaw
