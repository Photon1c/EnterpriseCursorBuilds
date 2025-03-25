# ar_wireframe_app.py
# Python-powered AR app with Tron and Escape From NY themes

import cv2
import numpy as np
import matplotlib.pyplot as plt
import os

# === CONFIG ===
THEME = "tron"  # Options: "tron", "escape"
LINE_COLOR = (0, 255, 255) if THEME == "tron" else (0, 255, 0)
HEADLESS = False

# === FUNCTION TO CHECK GUI SUPPORT ===
def check_gui_support():
    try:
        cv2.namedWindow("Test")
        cv2.imshow("Test", np.zeros((10, 10, 3), dtype=np.uint8))
        cv2.waitKey(1)
        cv2.destroyAllWindows()
        return True
    except cv2.error:
        return False

HEADLESS = not check_gui_support()

# === INITIALIZE CAMERA ===
cap = cv2.VideoCapture(0)
if not cap.isOpened():
    raise RuntimeError("Could not open camera")

# === MAIN LOOP ===
frame_count = 0
while True:
    ret, frame = cap.read()
    if not ret:
        break

    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 50, 150)
    wireframe = np.zeros_like(frame)
    wireframe[edges != 0] = LINE_COLOR
    overlay = cv2.addWeighted(frame, 0.5, wireframe, 0.8, 0)

    if not HEADLESS:
        cv2.putText(overlay, f"Theme: {THEME.upper()}", (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 1, LINE_COLOR, 2)
        cv2.imshow('AR Wireframe Overlay', overlay)
        key = cv2.waitKey(1) & 0xFF
        if key == ord('q'):
            break
        elif key == ord('t'):
            THEME = "escape" if THEME == "tron" else "tron"
            LINE_COLOR = (0, 255, 255) if THEME == "tron" else (0, 255, 0)
    else:
        # Save frame every 10 iterations and break after one
        frame_count += 1
        if frame_count == 1:
            save_path = "overlay_frame.jpg"
            cv2.imwrite(save_path, overlay)
            print(f"Headless mode: Frame saved to {save_path}")
            # Optionally show with matplotlib
            plt.imshow(cv2.cvtColor(overlay, cv2.COLOR_BGR2RGB))
            plt.title("Wireframe Overlay")
            plt.axis("off")
            plt.show()
            break

cap.release()
cv2.destroyAllWindows()
