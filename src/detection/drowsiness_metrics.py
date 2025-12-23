import numpy as np

def euclidean_distance(p1, p2):
    return np.linalg.norm(np.array(p1) - np.array(p2))


def compute_ear(landmarks, eye_indices):
    # eye_indices: [p1, p2, p3, p4, p5, p6]
    p1 = landmarks[eye_indices[0]]
    p2 = landmarks[eye_indices[1]]
    p3 = landmarks[eye_indices[2]]
    p4 = landmarks[eye_indices[3]]
    p5 = landmarks[eye_indices[4]]
    p6 = landmarks[eye_indices[5]]

    vertical_1 = euclidean_distance((p2.x, p2.y), (p6.x, p6.y))
    vertical_2 = euclidean_distance((p3.x, p3.y), (p5.x, p5.y))
    horizontal = euclidean_distance((p1.x, p1.y), (p4.x, p4.y))

    ear = (vertical_1 + vertical_2) / (2.0 * horizontal)
    return ear


def compute_mar(landmarks, mouth_indices):
    p1 = landmarks[mouth_indices[0]]
    p2 = landmarks[mouth_indices[1]]
    p3 = landmarks[mouth_indices[2]]
    p4 = landmarks[mouth_indices[3]]

    vertical = euclidean_distance((p2.x, p2.y), (p3.x, p3.y))
    horizontal = euclidean_distance((p1.x, p1.y), (p4.x, p4.y))

    mar = vertical / horizontal
    return mar
