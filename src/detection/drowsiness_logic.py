class DrowsinessDetector:
    def __init__(
        self,
        ear_threshold=0.25,
        ear_frame_limit=20,
        mar_threshold=0.6,
        yawn_frame_limit=15,
        yaw_threshold=25
    ):
        self.ear_threshold = ear_threshold
        self.ear_frame_limit = ear_frame_limit
        self.mar_threshold = mar_threshold
        self.yawn_frame_limit = yawn_frame_limit
        self.yaw_threshold = yaw_threshold

        self.closed_eye_frames = 0
        self.yawn_frames = 0

    def update(self, ear, mar, yaw):
        drowsy = False
        yawn = False
        distracted = False

        # Eye logic
        if ear < self.ear_threshold:
            self.closed_eye_frames += 1
        else:
            self.closed_eye_frames = 0

        if self.closed_eye_frames >= self.ear_frame_limit:
            drowsy = True

        # Yawn logic
        if mar > self.mar_threshold:
            self.yawn_frames += 1
        else:
            self.yawn_frames = 0

        if self.yawn_frames >= self.yawn_frame_limit:
            yawn = True

        # Head pose logic
        if abs(yaw) > self.yaw_threshold:
            distracted = True

        return drowsy, yawn, distracted
