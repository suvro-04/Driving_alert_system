class AlertSignal:
    def __init__(self):
        pass

    def send(self, drowsy=False, yawn=False, distracted=False):
        """
        This method will later be connected to:
        - Serial (Arduino)
        - GPIO (Raspberry Pi)
        """
        if drowsy:
            return "DROWSY"
        if yawn:
            return "YAWN"
        if distracted:
            return "DISTRACTED"
        return "NORMAL"
