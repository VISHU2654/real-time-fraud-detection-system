"""
Shared feature engineering module — Single Source of Truth.

This module contains all feature engineering logic used across:
- train_autoencoder.py (training)
- evaluate_autoencoder.py (evaluation)

Previously, this code was duplicated across 3 files (60+ lines each),
creating a maintenance nightmare and risk of train/serve skew.
"""
import numpy as np
import pandas as pd


# --- Feature Column Names (29 features) ---
FEATURE_COLS = [
    'distance_from_home', 'distance_from_last_transaction', 'ratio_to_median_purchase_price',
    'repeat_retailer', 'used_chip', 'used_pin_number', 'online_order',
    'ratio_zscore', 'ratio_log', 'ratio_squared', 'ratio_sqrt', 'distance_ratio', 'distance_sum',
    'chip_and_pin', 'online_and_repeat', 'high_ratio_flag', 'high_distance_flag',
    'rolling_ratio_mean_10', 'rolling_ratio_std_10', 'rolling_ratio_mean_50', 'rolling_ratio_std_50',
    'time_of_day_sin', 'time_of_day_cos', 'day_of_week_sin', 'day_of_week_cos',
    'amt_log', 'is_weekend', 'amt_zscore_10', 'amt_zscore_50'
]

INPUT_DIM = len(FEATURE_COLS)  # 29


def haversine_vectorize(lon1, lat1, lon2, lat2):
    """Compute haversine distance in kilometers (vectorized)."""
    lon1, lat1, lon2, lat2 = map(np.radians, [lon1, lat1, lon2, lat2])
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = np.sin(dlat / 2.0) ** 2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon / 2.0) ** 2
    c = 2 * np.arcsin(np.sqrt(a))
    km = 6371 * c
    return km


def engineer_features(df):
    """
    Apply all feature engineering transformations to a DataFrame.

    Expects columns: cc_num, trans_date_trans_time, amt, lat, long,
    merch_lat, merch_long, merchant, category, and optionally is_fraud.

    Returns the DataFrame with all 29 feature columns added.
    """
    df = df.sort_values(by=['cc_num', 'trans_date_trans_time']).reset_index(drop=True)

    # --- Distance Features ---
    df['distance_from_home'] = haversine_vectorize(
        df['long'], df['lat'], df['merch_long'], df['merch_lat']
    )

    df['prev_merch_lat'] = df.groupby('cc_num')['merch_lat'].shift(1)
    df['prev_merch_long'] = df.groupby('cc_num')['merch_long'].shift(1)
    df['distance_from_last_transaction'] = haversine_vectorize(
        df['merch_long'], df['merch_lat'], df['prev_merch_long'], df['prev_merch_lat']
    ).fillna(0)

    # --- Purchase Pattern Features ---
    df['median_purchase_price'] = df.groupby('cc_num')['amt'].transform(
        lambda x: x.expanding().median()
    )
    df['ratio_to_median_purchase_price'] = np.where(
        df['median_purchase_price'] > 0,
        df['amt'] / df['median_purchase_price'],
        df['amt']
    )
    df['ratio_to_median_purchase_price'] = df['ratio_to_median_purchase_price'].clip(upper=100)

    # --- Categorical Features ---
    df['repeat_retailer'] = (df.groupby(['cc_num', 'merchant']).cumcount() > 0).astype(float)
    df['used_chip'] = np.where(
        df['merchant'].str.contains('chip', case=False, na=False), 1.0, 0.0
    )
    df['used_pin_number'] = np.where(
        df['category'].str.contains('pos', case=False, na=False), 1.0, 0.0
    )
    df['online_order'] = np.where(
        df['category'].str.contains('net|online', case=False, na=False), 1.0, 0.0
    )

    # --- Derived Features ---
    # NOTE: ratio_zscore and distance_ratio are placeholder features (constant 0.1).
    # They were present in the original training data and must be kept for model compatibility.
    # Future model retraining should compute these properly or remove them.
    df['ratio_zscore'] = 0.1
    df['ratio_log'] = np.log(df['ratio_to_median_purchase_price'] + 1)
    df['ratio_squared'] = df['ratio_to_median_purchase_price'] ** 2
    df['ratio_sqrt'] = np.sqrt(df['ratio_to_median_purchase_price'])
    df['distance_ratio'] = 0.1
    df['distance_sum'] = df['distance_from_home'] + df['distance_from_last_transaction']

    # --- Interaction Features ---
    df['chip_and_pin'] = ((df['used_chip'] == 1) & (df['used_pin_number'] == 1)).astype(float)
    df['online_and_repeat'] = ((df['online_order'] == 1) & (df['repeat_retailer'] == 1)).astype(float)
    df['high_ratio_flag'] = (df['ratio_to_median_purchase_price'] > 5).astype(float)
    df['high_distance_flag'] = (df['distance_from_last_transaction'] > 1000).astype(float)

    # --- Rolling Statistics ---
    df['rolling_ratio_mean_10'] = df.groupby('cc_num')['amt'].transform(
        lambda x: x.rolling(10, min_periods=1).mean()
    )
    df['rolling_ratio_std_10'] = df.groupby('cc_num')['amt'].transform(
        lambda x: x.rolling(10, min_periods=1).std()
    ).fillna(0)
    df['rolling_ratio_mean_50'] = df.groupby('cc_num')['amt'].transform(
        lambda x: x.rolling(50, min_periods=1).mean()
    )
    df['rolling_ratio_std_50'] = df.groupby('cc_num')['amt'].transform(
        lambda x: x.rolling(50, min_periods=1).std()
    ).fillna(0)

    # --- Temporal Features ---
    df['trans_date_trans_time'] = pd.to_datetime(df['trans_date_trans_time'])
    df['hour'] = df['trans_date_trans_time'].dt.hour
    df['dayofweek'] = df['trans_date_trans_time'].dt.dayofweek

    df['time_of_day_sin'] = np.sin(df['hour'] * (2.0 * np.pi / 24))
    df['time_of_day_cos'] = np.cos(df['hour'] * (2.0 * np.pi / 24))
    df['day_of_week_sin'] = np.sin(df['dayofweek'] * (2.0 * np.pi / 7))
    df['day_of_week_cos'] = np.cos(df['dayofweek'] * (2.0 * np.pi / 7))
    df['amt_log'] = np.log(df['amt'] + 1)
    df['is_weekend'] = (df['dayofweek'] >= 5).astype(float)
    df['amt_zscore_10'] = (df['amt'] - df['rolling_ratio_mean_10']) / (df['rolling_ratio_std_10'] + 1e-6)
    df['amt_zscore_50'] = (df['amt'] - df['rolling_ratio_mean_50']) / (df['rolling_ratio_std_50'] + 1e-6)

    return df
