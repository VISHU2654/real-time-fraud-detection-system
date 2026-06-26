"""
Evaluate Autoencoder for Fraud Detection

Loads the trained autoencoder and evaluates it on the test dataset.
Uses batch inference for 100x+ speedup over the original row-by-row approach.

Improvements over original:
- Uses shared feature engineering module (DRY)
- Batch inference instead of row-by-row (100x+ speedup)
- Additional metrics: ROC-AUC
- Threshold sweep analysis
"""
import argparse
import json
import os
import sys

import numpy as np
import pandas as pd
import onnxruntime as ort
from sklearn.metrics import (
    classification_report, confusion_matrix,
    precision_score, recall_score, f1_score, roc_auc_score
)

# Add project root to path for shared module
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ml.feature_engineering import engineer_features, FEATURE_COLS


def parse_args():
    parser = argparse.ArgumentParser(description='Evaluate fraud detection autoencoder')
    parser.add_argument('--threshold', type=float, default=1.5, help='MSE threshold for fraud classification')
    parser.add_argument('--model-dir', type=str, default='models', help='Directory containing model artifacts')
    parser.add_argument('--test-data', type=str, default='datasets/fraudTest.csv', help='Path to test dataset')
    return parser.parse_args()


def main():
    args = parse_args()

    print("Loading test dataset...")
    df = pd.read_csv(args.test_data)

    print("Engineering features...")
    df = engineer_features(df)

    X = df[FEATURE_COLS].values
    y_true = df['is_fraud'].values

    print("Loading scaler...")
    with open(os.path.join(args.model_dir, "scaler.json"), "r") as f:
        scaler_data = json.load(f)

    mean = np.array(scaler_data["mean"])
    scale = np.array(scaler_data["scale"])

    X_scaled = (X - mean) / scale

    print("Loading ONNX model...")
    sess = ort.InferenceSession(os.path.join(args.model_dir, "autoencoder.onnx"))

    # Batch inference — 100x+ faster than row-by-row
    print(f"Running batch inference on {len(X_scaled)} samples...")
    X_scaled_f32 = X_scaled.astype(np.float32)
    reconstructed = sess.run(None, {'input': X_scaled_f32})[0]

    print("Calculating MSE...")
    mse = np.mean(np.power(X_scaled_f32 - reconstructed, 2), axis=1)

    # Classification with given threshold
    y_pred = (mse > args.threshold).astype(int)

    print("\n" + "=" * 60)
    print("EVALUATION RESULTS")
    print("=" * 60)
    print(f"Threshold: {args.threshold}")
    print(f"\nConfusion Matrix:")
    print(confusion_matrix(y_true, y_pred))
    print(f"\nClassification Report:")
    print(classification_report(y_true, y_pred))
    print(f"Precision: {precision_score(y_true, y_pred):.4f}")
    print(f"Recall:    {recall_score(y_true, y_pred):.4f}")
    print(f"F1-Score:  {f1_score(y_true, y_pred):.4f}")

    # ROC-AUC using continuous MSE scores
    try:
        auc_score = roc_auc_score(y_true, mse)
        print(f"ROC-AUC:   {auc_score:.4f}")
    except ValueError as e:
        print(f"ROC-AUC:   Could not compute ({e})")

    # Threshold sweep analysis
    print(f"\n{'=' * 60}")
    print("THRESHOLD SWEEP ANALYSIS")
    print(f"{'=' * 60}")
    print(f"{'Threshold':<12} {'Precision':<12} {'Recall':<12} {'F1':<12}")
    print("-" * 48)
    for t in [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 5.0]:
        y_t = (mse > t).astype(int)
        if y_t.sum() > 0:
            p = precision_score(y_true, y_t, zero_division=0)
            r = recall_score(y_true, y_t, zero_division=0)
            f = f1_score(y_true, y_t, zero_division=0)
            print(f"{t:<12.1f} {p:<12.4f} {r:<12.4f} {f:<12.4f}")
        else:
            print(f"{t:<12.1f} {'N/A':<12} {'N/A':<12} {'N/A':<12}")


if __name__ == '__main__':
    main()
