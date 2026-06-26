import pymongo
import pandas as pd
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
import onnx
import onnxruntime
import json
import os

# Connect to MongoDB
client = pymongo.MongoClient("mongodb://mongodb:27017/")
db = client["fraudDB"]
transactions_col = db["transactions"]

print("Fetching cleared transactions from MongoDB...")
# Only train on transactions explicitly cleared by analysts to learn normal behavior
cursor = transactions_col.find({"status": "CLEARED"})
df = pd.DataFrame(list(cursor))

if len(df) < 100:
    print("Not enough cleared transactions to retrain (need at least 100). Exiting.")
    exit(0)

print(f"Retraining on {len(df)} cleared transactions...")

# Re-engineer features to match what the consumer does
df['timestamp'] = pd.to_datetime(df['timestamp'])
df['hour'] = df['timestamp'].dt.hour
df['dayofweek'] = df['timestamp'].dt.dayofweek

df['time_of_day_sin'] = np.sin(df['hour'] * (2. * np.pi / 24))
df['time_of_day_cos'] = np.cos(df['hour'] * (2. * np.pi / 24))
df['day_of_week_sin'] = np.sin(df['dayofweek'] * (2. * np.pi / 7))
df['day_of_week_cos'] = np.cos(df['dayofweek'] * (2. * np.pi / 7))
df['amt_log'] = np.log(df['amount'] + 1)
df['is_weekend'] = (df['dayofweek'] >= 5).astype(float)

# Simplified z-scores since we don't have full rolling windows here easily
df['amt_zscore_10'] = 0.0 # Mocking for retrain script brevity
df['amt_zscore_50'] = 0.0

# In a full production script, we would fetch the user's history from MongoDB 
# to calculate exact rolling windows. For Phase 1 prototype, we'll zero these out 
# or use approximate values if history isn't fetched.

feature_cols = [
    'distance_from_home', 'distance_from_last_transaction', 'ratio_to_median_purchase_price',
    'repeat_retailer', 'used_chip', 'used_pin_number', 'online_order',
    'ratio_zscore', 'ratio_log', 'ratio_squared', 'ratio_sqrt', 'distance_ratio', 'distance_sum',
    'chip_and_pin', 'online_and_repeat', 'high_ratio_flag', 'high_distance_flag',
    'rolling_ratio_mean_10', 'rolling_ratio_std_10', 'rolling_ratio_mean_50', 'rolling_ratio_std_50',
    'time_of_day_sin', 'time_of_day_cos', 'day_of_week_sin', 'day_of_week_cos',
    'amt_log', 'is_weekend', 'amt_zscore_10', 'amt_zscore_50'
]

# Ensure all columns exist (some might be missing if MongoDB didn't have them)
for col in feature_cols:
    if col not in df.columns:
        df[col] = 0.0

X = df[feature_cols].values

# Load existing scaler
scaler_path = "/app/models/scaler.json" if os.path.exists("/app/models/scaler.json") else "../models/scaler.json"
with open(scaler_path, "r") as f:
    scaler_data = json.load(f)

mean = np.array(scaler_data["mean"])
scale = np.array(scaler_data["scale"])

# Scale features
X_scaled = (X - mean) / scale
X_train = torch.tensor(X_scaled, dtype=torch.float32)

class FraudAutoencoder(nn.Module):
    def __init__(self, input_dim=29):
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

model = FraudAutoencoder(input_dim=29)

# In a real system, we'd load the existing weights and fine-tune.
# For this prototype, we'll just train a few epochs.
criterion = nn.MSELoss()
optimizer = optim.Adam(model.parameters(), lr=0.001)

epochs = 5
batch_size = 32

model.train()
for epoch in range(epochs):
    permutation = torch.randperm(X_train.size()[0])
    epoch_loss = 0.0
    for i in range(0, X_train.size()[0], batch_size):
        indices = permutation[i:i+batch_size]
        batch_x = X_train[indices]
        
        reconstructed = model(batch_x)
        loss = criterion(reconstructed, batch_x)
        
        optimizer.zero_grad()
        loss.backward()
        optimizer.step()
        epoch_loss += loss.item()
    print(f"Epoch {epoch+1}/{epochs}, Loss: {epoch_loss/len(X_train):.6f}")

print("Retraining complete. Exporting model...")
model.eval()
dummy_input = torch.randn(1, 29)
onnx_path = "/app/models/autoencoder.onnx" if os.path.exists("/app/models/autoencoder.onnx") else "../models/autoencoder.onnx"
torch.onnx.export(
    model, 
    dummy_input, 
    onnx_path,
    export_params=True,
    opset_version=14,
    do_constant_folding=True,
    input_names=['input'],
    output_names=['output'],
    dynamic_axes={'input': {0: 'batch_size'}, 'output': {0: 'batch_size'}}
)
print("Model updated successfully!")
