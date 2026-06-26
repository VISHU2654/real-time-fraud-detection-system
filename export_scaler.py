"""
Export scaler parameters from training data.

NOTE: This script is now OPTIONAL — train_autoencoder.py saves the scaler
automatically during training. This script is kept for backward compatibility
and standalone scaler regeneration.
"""
import json
import os
import sys

import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler

# Add project root to path for shared module
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ml.feature_engineering import engineer_features, FEATURE_COLS


def main():
    print("Loading datasets to calculate scaler parameters...")
    df_train = pd.read_csv('datasets/credit_card_transactions.csv')
    df_test = pd.read_csv('datasets/fraudTest.csv')
    df = pd.concat([df_train, df_test], ignore_index=True)

    df = df[df['is_fraud'] == 0].copy()

    print("Engineering features...")
    df = engineer_features(df)

    X = df[FEATURE_COLS].values

    scaler = StandardScaler()
    scaler.fit(X)

    scaler_data = {
        "mean": scaler.mean_.tolist(),
        "scale": scaler.scale_.tolist(),
        "feature_names": FEATURE_COLS,
    }

    scaler_path = os.path.join("models", "scaler.json")
    with open(scaler_path, "w") as f:
        json.dump(scaler_data, f, indent=2)

    print(f"Successfully saved scaler parameters to {scaler_path}")


if __name__ == '__main__':
    main()
