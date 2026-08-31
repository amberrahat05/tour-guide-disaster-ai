import pandas as pd
import joblib

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.neural_network import MLPClassifier
from sklearn.metrics import accuracy_score, classification_report


# Load dataset
data = pd.read_csv("data/weather_data.csv")

print("Dataset loaded successfully!")
print(data.head())


# Input features
X = data[
    [
        "temperature",
        "humidity",
        "rainfall",
        "wind_speed",
        "snowfall",
        "visibility"
    ]
]

# Target
y = data["risk"]


# Split data
X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42,
    stratify=y
)


# Scale the features
scaler = StandardScaler()

X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)


# Create ANN
model = MLPClassifier(
    hidden_layer_sizes=(32, 16),
    activation="relu",
    solver="adam",
    max_iter=1000,
    random_state=42
)


# Train ANN
print("\nTraining ANN...")

model.fit(X_train_scaled, y_train)

print("Training completed!")


# Test ANN
predictions = model.predict(X_test_scaled)

accuracy = accuracy_score(y_test, predictions)

print("\nModel Accuracy:", accuracy)

print("\nClassification Report:")
print(classification_report(y_test, predictions))


# Save model
joblib.dump(model, "model/risk_model.pkl")
joblib.dump(scaler, "model/scaler.pkl")

print("\nModel saved successfully!")
print("risk_model.pkl")
print("scaler.pkl")