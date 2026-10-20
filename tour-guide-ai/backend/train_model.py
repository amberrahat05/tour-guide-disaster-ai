import pandas as pd
import numpy as np
import joblib

from pathlib import Path

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.neural_network import MLPClassifier

from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix
)

# ============================================================
# PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parent

DATA_FILE = BASE_DIR / "data" / "processed" / "weather_data_cleaned.csv"
MODEL_DIR = BASE_DIR / "model"

MODEL_DIR.mkdir(exist_ok=True)

MODEL_FILE = MODEL_DIR / "risk_model.pkl"
SCALER_FILE = MODEL_DIR / "scaler.pkl"


# ============================================================
# LOAD DATASET
# ============================================================

print("\nLoading dataset...")

df = pd.read_csv(DATA_FILE)

print("Dataset shape:", df.shape)

print("\nColumns:")
print(df.columns.tolist())


# ============================================================
# SELECT FEATURES
# ============================================================

features = [
    "temperature",
    "humidity",
    "rainfall",
    "wind_speed",
    "snowfall",
    "visibility",
    "pressure"
]

target = "risk"


# ===========================================================
# CHECK REQUIRED COLUMNS  
# ===========================================================

missing_features = [
    column for column in features + [target]
    if column not in df.columns
]

if missing_features:

    print("\nERROR: Missing columns:")
    print(missing_features)

    raise SystemExit


# ============================================================
# REMOVE INVALID ROWS
# ============================================================

df = df.dropna(
    subset=features + [target]
)

print("\nDataset after cleaning:", df.shape)


# ============================================================
# INPUT AND OUTPUT
# ============================================================

X = df[features]

y = df[target].astype(int)


# ============================================================
# SHOW CLASS DISTRIBUTION
# ============================================================

print("\nRisk distribution:")

print(
    y.value_counts()
    .sort_index()
)


# ============================================================
# TRAIN / TEST SPLIT
# ============================================================

X_train, X_test, y_train, y_test = train_test_split(

    X,
    y,

    test_size=0.20,

    random_state=42,

    stratify=y
)


print("\nTraining samples:", len(X_train))
print("Testing samples:", len(X_test))


# ============================================================
# FEATURE SCALING
# ============================================================

scaler = StandardScaler()

X_train_scaled = scaler.fit_transform(X_train)

X_test_scaled = scaler.transform(X_test)


# ============================================================
# BUILD ARTIFICIAL NEURAL NETWORK
# ============================================================

model = MLPClassifier(

    hidden_layer_sizes=(32, 16),

    activation="relu",

    solver="adam",

    learning_rate_init=0.001,

    max_iter=500,

    random_state=42,

    early_stopping=True,

    validation_fraction=0.15,

    n_iter_no_change=20
)


# ============================================================
# TRAIN
# ============================================================

print("\nTraining ANN...")

model.fit(
    X_train_scaled,
    y_train
)


print("Training completed!")


# ============================================================
# PREDICTION
# ============================================================

y_pred = model.predict(
    X_test_scaled
)


# ============================================================
# ACCURACY
# ============================================================

accuracy = accuracy_score(
    y_test,
    y_pred
)

print("\n===================================")
print("MODEL PERFORMANCE")
print("===================================")

print(
    f"Accuracy: {accuracy * 100:.2f}%"
)


# ============================================================
# CLASSIFICATION REPORT
# ============================================================

print("\nClassification Report:")

print(
    classification_report(
        y_test,
        y_pred,
        target_names=[
            "LOW",
            "MEDIUM",
            "HIGH"
        ],
        zero_division=0
    )
)


# ============================================================
# CONFUSION MATRIX
# ============================================================

cm = confusion_matrix(
    y_test,
    y_pred
)

print("\nConfusion Matrix:")

print(cm)


# ============================================================
# SAVE MODEL
# ============================================================

joblib.dump(
    model,
    MODEL_FILE
)

joblib.dump(
    scaler,
    SCALER_FILE
)


print("\n===================================")
print("MODEL SAVED")
print("===================================")

print("Model:")
print(MODEL_FILE)

print("\nScaler:")
print(SCALER_FILE)

print("\nTraining finished successfully!")