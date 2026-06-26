"""
Train Autoencoder for Fraud Detection

Trains an autoencoder on normal (non-fraudulent) transactions and exports
to ONNX format. Also exports the fitted scaler to prevent train/serve skew.

Improvements over original:
- Uses shared feature engineering module (DRY)
- Saves scaler at training time (fixes scaler mismatch bug)
- Reproducible training (manual seeds)
- Correct comment (StandardScaler, not MinMax)
- Dynamic input_dim from feature_cols
- Argparse for hyperparameters
"""
import argparse
import json
import os
import sys

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import torch.optim as optim
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

# Add project root to path for shared module
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ml.feature_engineering import engineer_features, FEATURE_COLS, INPUT_DIM


def parse_args():
    parser = argparse.ArgumentParser(description='Train fraud detection autoencoder')
    parser.add_argument('--epochs', type=int, default=15, help='Number of training epochs')
    parser.add_argument('--batch-size', type=int, default=256, help='Training batch size')
    parser.add_argument('--lr', type=float, default=0.001, help='Learning rate')
    parser.add_argument('--seed', type=int, default=42, help='Random seed for reproducibility')
    parser.add_argument('--model-dir', type=str, default='models', help='Output directory for model artifacts')
    return parser.parse_args()


class FraudAutoencoder(nn.Module):
    """Autoencoder for anomaly detection on transaction features."""

    def __init__(self, input_dim=INPUT_DIM):
        super(FraudAutoencoder, self).__init__()
        self.encoder = nn.Sequential(
            nn.Linear(input_dim, 16),
            nn.ReLU(),
            nn.Linear(16, 8),
            nn.ReLU()
        )
        self.decoder = nn.Sequential(
            nn.Linear(8, 16),
            nn.ReLU(),
            nn.Linear(16, input_dim),
        )

    def forward(self, x):
        encoded = self.encoder(x)
        decoded = self.decoder(encoded)
        return decoded


def main():
    args = parse_args()

    # Set random seeds for reproducibility
    torch.manual_seed(args.seed)
    np.random.seed(args.seed)

    print("Loading datasets...")
    df_train = pd.read_csv('datasets/credit_card_transactions.csv')
    df_test = pd.read_csv('datasets/fraudTest.csv')
    df = pd.concat([df_train, df_test], ignore_index=True)

    # Use all normal transactions for training
    df = df[df['is_fraud'] == 0].copy()

    print("Engineering features (this may take a few minutes on 2M+ rows)...")
    df = engineer_features(df)

    X = df[FEATURE_COLS].values

    # Scale data using StandardScaler
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # Save scaler at training time to prevent train/serve skew
    scaler_data = {
        "mean": scaler.mean_.tolist(),
        "scale": scaler.scale_.tolist(),
        "feature_names": FEATURE_COLS,
    }
    scaler_path = os.path.join(args.model_dir, "scaler.json")
    with open(scaler_path, "w") as f:
        json.dump(scaler_data, f, indent=2)
    print(f"Scaler saved to {scaler_path}")

    # 80/20 train/validation split
    X_train_np, X_val_np = train_test_split(X_scaled, test_size=0.2, random_state=args.seed)

    X_train = torch.tensor(X_train_np, dtype=torch.float32)
    X_val = torch.tensor(X_val_np, dtype=torch.float32)

    model = FraudAutoencoder(input_dim=INPUT_DIM)
    criterion = nn.MSELoss()
    optimizer = optim.Adam(model.parameters(), lr=args.lr)

    print(f"Training Autoencoder on {len(X_train)} rows, "
          f"Validating on {len(X_val)} rows for {args.epochs} epochs...")

    best_val_loss = float('inf')

    for epoch in range(args.epochs):
        model.train()
        permutation = torch.randperm(X_train.size()[0])
        epoch_loss = 0.0
        for i in range(0, X_train.size()[0], args.batch_size):
            indices = permutation[i:i + args.batch_size]
            batch_x = X_train[indices]

            reconstructed = model(batch_x)
            loss = criterion(reconstructed, batch_x)

            optimizer.zero_grad()
            loss.backward()
            optimizer.step()

            epoch_loss += loss.item()

        # Validation step
        model.eval()
        with torch.no_grad():
            val_reconstructed = model(X_val)
            val_loss = criterion(val_reconstructed, X_val)

        train_loss = epoch_loss / (len(X_train) / args.batch_size)
        print(f"Epoch [{epoch + 1}/{args.epochs}], "
              f"Train Loss: {train_loss:.6f}, "
              f"Validation Loss: {val_loss.item():.6f}")

        # Track best model
        if val_loss.item() < best_val_loss:
            best_val_loss = val_loss.item()

    print(f"Training complete! Best validation loss: {best_val_loss:.6f}")

    # Export to ONNX
    model.eval()
    model_path = os.path.join(args.model_dir, "autoencoder.onnx")

    dummy_input = torch.randn(1, INPUT_DIM, requires_grad=True)
    print(f"Exporting model to {model_path}...")
    torch.onnx.export(
        model,
        dummy_input,
        model_path,
        export_params=True,
        opset_version=14,
        do_constant_folding=True,
        input_names=['input'],
        output_names=['output'],
        dynamic_axes={'input': {0: 'batch_size'}, 'output': {0: 'batch_size'}}
    )

    print("ONNX export complete! Ready to be loaded in Node.js.")


if __name__ == '__main__':
    main()
