import pandas as pd
import numpy as np
from pathlib import Path

# ---------------------------------------------------
# PATHS
# ---------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent

INPUT_FILE = BASE_DIR / "data" / "Weather_Dataset.csv"
OUTPUT_FILE = BASE_DIR / "data" / "weather_data_cleaned.csv"


# ---------------------------------------------------
# LOAD DATA
# ---------------------------------------------------

print("Loading dataset...")

df = pd.read_csv(INPUT_FILE)

print("Original shape:", df.shape)
print("\nOriginal columns:")
print(df.columns.tolist())


# ---------------------------------------------------
# RENAME COLUMNS
# ---------------------------------------------------

df = df.rename(columns={
    "Date/Time": "date",
    "Temp_C": "temperature",
    "Rel Hum_%": "humidity",
    "Wind Speed_km/h": "wind_speed",
    "Visibility_km": "visibility",
    "Press_kPa": "pressure",
    "Weather": "weather"
})


# ---------------------------------------------------
# KEEP REQUIRED COLUMNS
# ---------------------------------------------------

df = df[
    [
        "date",
        "temperature",
        "humidity",
        "wind_speed",
        "visibility",
        "pressure",
        "weather"
    ]
]




df["date"] = pd.to_datetime(
    df["date"],
    errors="coerce"
)

df = df.dropna(subset=["date"])


# ---------------------------------------------------
# NUMERIC CLEANING
# ---------------------------------------------------

numeric_columns = [
    "temperature",
    "humidity",
    "wind_speed",
    "visibility",
    "pressure"
]

for column in numeric_columns:
    df[column] = pd.to_numeric(
        df[column],
        errors="coerce"
    )


# ---------------------------------------------------
# REMOVE DUPLICATES
# ---------------------------------------------------

before = len(df)

df = df.drop_duplicates()

after = len(df)

print(f"Removed duplicates: {before - after}")


# ---------------------------------------------------
# HANDLE MISSING VALUES
# ---------------------------------------------------

for column in numeric_columns:
    df[column] = df[column].fillna(
        df[column].median()
    )

df["weather"] = df["weather"].fillna("Unknown")


# ---------------------------------------------------
# REMOVE IMPOSSIBLE VALUES
# ---------------------------------------------------

df = df[
    (df["humidity"] >= 0) &
    (df["humidity"] <= 100) &
    (df["wind_speed"] >= 0) &
    (df["visibility"] >= 0) &
    (df["pressure"] > 0)
]


# ---------------------------------------------------
# CREATE RAINFALL FEATURE
# ---------------------------------------------------

rain_conditions = [
    "Rain",
    "Rain Showers",
    "Drizzle",
    "Freezing Rain",
    "Freezing Drizzle",
    "Thunderstorms"
]

df["rainfall"] = 0.0

for condition in rain_conditions:
    mask = df["weather"].str.contains(
        condition,
        case=False,
        na=False
    )

    df.loc[mask, "rainfall"] = 1.0


# ---------------------------------------------------
# CREATE SNOWFALL FEATURE
# ---------------------------------------------------

snow_conditions = [
    "Snow",
    "Snow Showers",
    "Blowing Snow",
    "Freezing"
]

df["snowfall"] = 0.0

for condition in snow_conditions:
    mask = df["weather"].str.contains(
        condition,
        case=False,
        na=False
    )

    df.loc[mask, "snowfall"] = 1.0


# ---------------------------------------------------
# CREATE RISK SCORE
#
# 0 = LOW
# 1 = MEDIUM
# 2 = HIGH
# ---------------------------------------------------

def calculate_risk(row):

    score = 0

    # Very poor visibility
    if row["visibility"] < 2:
        score += 3

    elif row["visibility"] < 5:
        score += 1

    # Strong wind
    if row["wind_speed"] >= 60:
        score += 3

    elif row["wind_speed"] >= 40:
        score += 2

    elif row["wind_speed"] >= 30:
        score += 1

    # Snow
    if row["snowfall"] > 0:
        score += 2

    # Rain
    if row["rainfall"] > 0:
        score += 1

    # Extreme cold
    if row["temperature"] <= -15:
        score += 2

    elif row["temperature"] <= -5:
        score += 1

    # Convert score to class

    if score >= 4:
        return 2       # HIGH

    elif score >= 2:
        return 1       # MEDIUM

    else:
        return 0       # LOW


df["risk"] = df.apply(
    calculate_risk,
    axis=1
)


# ---------------------------------------------------
# ADD RISK LABEL
# ---------------------------------------------------

df["risk_label"] = df["risk"].map({
    0: "LOW",
    1: "MEDIUM",
    2: "HIGH"
})


# ---------------------------------------------------
# SORT BY DATE
# ---------------------------------------------------

df = df.sort_values("date")


# ---------------------------------------------------
# FINAL COLUMN ORDER
# ---------------------------------------------------

df = df[
    [
        "date",
        "temperature",
        "humidity",
        "rainfall",
        "wind_speed",
        "snowfall",
        "visibility",
        "pressure",
        "weather",
        "risk",
        "risk_label"
    ]
]


# ---------------------------------------------------
# SAVE
# ---------------------------------------------------

df.to_csv(
    OUTPUT_FILE,
    index=False
)


# ---------------------------------------------------
# INFORMATION
# ---------------------------------------------------

print("\n-----------------------------------")
print("DATA CLEANING COMPLETE")
print("-----------------------------------")

print("Final shape:", df.shape)

print("\nRisk distribution:")
print(df["risk_label"].value_counts())

print("\nMissing values:")
print(df.isnull().sum())

print("\nFirst 10 rows:")
print(df.head(10))

print("\nSaved to:")
print(OUTPUT_FILE)