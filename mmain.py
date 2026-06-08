import cv2
import numpy as np
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Conv2D, Flatten, Dense

# --- Model ---
def create_model():
    model = Sequential([
        Conv2D(24, (5,5), strides=(2,2), activation='relu', input_shape=(66,200,1)),
        Conv2D(36, (5,5), strides=(2,2), activation='relu'),
        Conv2D(48, (5,5), strides=(2,2), activation='relu'),
        Flatten(),
        Dense(100, activation='relu'),
        Dense(50, activation='relu'),
        Dense(10, activation='relu'),
        Dense(1)
    ])
    
    model.compile(optimizer='adam', loss='mse')
    return model


# --- Preprocessing ---
def preprocess(image):
    image = cv2.resize(image, (200, 66))
    image = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    image = image / 255.0
    return image.reshape(66, 200, 1)


# --- Prediction ---
def predict(image_path, model):
    img = cv2.imread(image_path)

    if img is None:
        print("❌ Image not found")
        return None

    img = preprocess(img)
    img = np.expand_dims(img, axis=0)
    
    angle = model.predict(img)[0][0]

    # ✅ Convert to degrees
    angle = angle * 180

    # ✅ Clamp between -180 and 180
    angle = max(min(angle, 180), -180)

    return angle


# --- Run ---
model = create_model()
print("Model initialized")

angle = predict("image.png", model)

if angle is not None:
    print(f">>>>>>> Predicted Steering Angle: {angle:.2f}°")