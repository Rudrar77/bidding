#!/usr/bin/env python3
"""
ML Training Script for Auction Price Prediction & Winning Probability
Converts Jupyter notebook to executable Python script
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.model_selection import train_test_split, cross_val_score, KFold
from sklearn.preprocessing import StandardScaler
from xgboost import XGBRegressor, XGBClassifier
from sklearn.metrics import (
    mean_squared_error, r2_score, mean_absolute_percentage_error,
    accuracy_score, precision_score, recall_score, f1_score,
    confusion_matrix, classification_report, roc_curve, auc
)
import joblib
import warnings
import os

warnings.filterwarnings('ignore')

# Set working directory
os.chdir(os.path.dirname(os.path.abspath(__file__)))

print("=" * 80)
print(" " * 20 + "AUCTION ML MODEL TRAINING PIPELINE")
print("=" * 80)

# ============================================================================
# 1. LOAD AND EXPLORE DATA
# ============================================================================
print("\n[1/8] Loading Dataset...")
df = pd.read_csv('auction_dataset.csv')

print(f"✓ Dataset loaded: {df.shape[0]} records, {df.shape[1]} features")
print(f"\nFirst few rows:")
print(df.head())
print(f"\nData Info:")
print(df.info())
print(f"\nMissing Values: {df.isnull().sum().sum()}")

# ============================================================================
# 2. EXPLORATORY DATA ANALYSIS
# ============================================================================
print("\n[2/8] Exploratory Data Analysis (EDA)...")

print("\nStatistical Summary:")
print(df.describe())

print(f"\nTarget Variable Distributions:")
print(f"  Final Price - Min: {df['final_price'].min()}, Max: {df['final_price'].max()}, Mean: {df['final_price'].mean():.2f}")
print(f"  Will Win Distribution:\n{df['will_win'].value_counts()}")
print(f"  Class Balance: {df['will_win'].mean()*100:.1f}% positive class")

# Create visualizations
fig, axes = plt.subplots(2, 2, figsize=(14, 10))

axes[0, 0].hist(df['final_price'], bins=20, edgecolor='black', color='steelblue')
axes[0, 0].set_title('Final Price Distribution', fontsize=12, fontweight='bold')
axes[0, 0].set_xlabel('Final Price')
axes[0, 0].set_ylabel('Frequency')

axes[0, 1].scatter(df['current_bid'], df['final_price'], alpha=0.6, color='green')
axes[0, 1].set_title('Current Bid vs Final Price', fontsize=12, fontweight='bold')
axes[0, 1].set_xlabel('Current Bid')
axes[0, 1].set_ylabel('Final Price')
axes[0, 1].plot([df['current_bid'].min(), df['current_bid'].max()], 
                 [df['current_bid'].min(), df['current_bid'].max()], 'r--', alpha=0.5)

axes[1, 0].hist(df['total_bids'], bins=15, edgecolor='black', color='orange')
axes[1, 0].set_title('Total Bids Distribution', fontsize=12, fontweight='bold')
axes[1, 0].set_xlabel('Total Bids')
axes[1, 0].set_ylabel('Frequency')

win_counts = df['will_win'].value_counts()
axes[1, 1].bar(['Lost (0)', 'Won (1)'], [win_counts[0], win_counts[1]], color=['red', 'green'], alpha=0.7)
axes[1, 1].set_title('Will Win Distribution', fontsize=12, fontweight='bold')
axes[1, 1].set_ylabel('Count')

plt.tight_layout()
plt.savefig('01_eda_distributions.png', dpi=300, bbox_inches='tight')
plt.close()
print("✓ Saved: 01_eda_distributions.png")

# Correlation matrix
plt.figure(figsize=(12, 8))
correlation_matrix = df.corr()
sns.heatmap(correlation_matrix, annot=True, cmap='coolwarm', center=0, fmt='.2f', 
            cbar_kws={'label': 'Correlation'}, square=True)
plt.title('Feature Correlation Matrix', fontsize=14, fontweight='bold')
plt.tight_layout()
plt.savefig('02_correlation_matrix.png', dpi=300, bbox_inches='tight')
plt.close()
print("✓ Saved: 02_correlation_matrix.png")

print("\nTop correlations with Final Price:")
print(correlation_matrix['final_price'].sort_values(ascending=False))

# ============================================================================
# 3. FEATURE ENGINEERING
# ============================================================================
print("\n[3/8] Feature Engineering...")

df_fe = df.copy()

# Price Ratio Features
df_fe['current_to_starting_ratio'] = df_fe['current_bid'] / (df_fe['starting_price'] + 1)
df_fe['current_to_final_ratio'] = df_fe['current_bid'] / (df_fe['final_price'] + 1)
df_fe['starting_to_final_ratio'] = df_fe['starting_price'] / (df_fe['final_price'] + 1)

# Bid-related features
df_fe['avg_bid_amount'] = df_fe['avg_increment']
df_fe['bid_per_bidder'] = df_fe['total_bids'] / (df_fe['bidders'] + 1)
df_fe['bidders_per_bid_ratio'] = df_fe['bidders'] / (df_fe['total_bids'] + 1)

# Time-based features
df_fe['elapsed_time'] = df_fe['auction_duration'] - df_fe['time_remaining']
df_fe['time_completion_ratio'] = df_fe['elapsed_time'] / (df_fe['auction_duration'] + 1)
df_fe['time_remaining_ratio'] = df_fe['time_remaining'] / (df_fe['auction_duration'] + 1)

# Bid velocity and momentum
df_fe['bid_momentum'] = df_fe['bid_velocity'] * df_fe['total_bids']

# Price increment features
df_fe['total_price_increase'] = df_fe['current_bid'] - df_fe['starting_price']
df_fe['expected_increment'] = (df_fe['final_price'] - df_fe['current_bid']) / (df_fe['time_remaining'] + 1)

# Competition features
df_fe['high_bidder_count'] = (df_fe['bidders'] > df_fe['bidders'].median()).astype(int)
df_fe['high_bid_velocity'] = (df_fe['bid_velocity'] > df_fe['bid_velocity'].median()).astype(int)

new_features = [col for col in df_fe.columns if col not in df.columns]
print(f"✓ Created {len(new_features)} new features")
print(f"✓ Total features now: {len(df_fe.columns)}")

# Check for data quality
print(f"\nNaN values: {df_fe.isnull().sum().sum()}")
inf_check = np.isinf(df_fe.select_dtypes(include=[np.number])).sum().sum()
print(f"Infinite values: {inf_check}")

# ============================================================================
# 4. TRAIN-TEST SPLIT & PREPARATION
# ============================================================================
print("\n[4/8] Preparing Data (Train-Test Split 80-20)...")

feature_cols = [col for col in df_fe.columns if col not in ['auction_id', 'final_price', 'winner_id', 'will_win']]
X = df_fe[feature_cols].copy()
y_price = df_fe['final_price'].copy()
y_win = df_fe['will_win'].copy()

print(f"Features shape: {X.shape}")
print(f"Target (Price) shape: {y_price.shape}")
print(f"Target (Win) shape: {y_win.shape}")

X_train, X_test, y_price_train, y_price_test, y_win_train, y_win_test = train_test_split(
    X, y_price, y_win, test_size=0.2, random_state=42
)

print(f"✓ Train set: {X_train.shape[0]} records ({X_train.shape[0]/len(X)*100:.1f}%)")
print(f"✓ Test set: {X_test.shape[0]} records ({X_test.shape[0]/len(X)*100:.1f}%)")
print(f"Class distribution - Train: {y_win_train.value_counts().to_dict()}")
print(f"Class distribution - Test: {y_win_test.value_counts().to_dict()}")

# ============================================================================
# 5. TRAIN XGBoost REGRESSION (Price Prediction)
# ============================================================================
print("\n[5/8] Training XGBoost Regression Model (Price Prediction)...")

xgb_reg = XGBRegressor(
    n_estimators=200,
    max_depth=5,
    learning_rate=0.05,
    subsample=0.8,
    colsample_bytree=0.8,
    reg_alpha=1.0,
    reg_lambda=1.0,
    min_child_weight=2,
    gamma=0.1,
    random_state=42,
    verbosity=0
)

X_train_split, X_val, y_train_split, y_val = train_test_split(
    X_train, y_price_train, test_size=0.2, random_state=42
)

xgb_reg.fit(
    X_train_split, y_train_split,
    eval_set=[(X_val, y_val)],
    early_stopping_rounds=30,
    verbose=False
)

print(f"✓ Regression model trained (best iteration: {xgb_reg.best_iteration})")

# Evaluate Regression
y_train_pred = xgb_reg.predict(X_train)
y_test_pred = xgb_reg.predict(X_test)

train_r2 = r2_score(y_price_train, y_train_pred)
test_r2 = r2_score(y_price_test, y_test_pred)
train_mape = mean_absolute_percentage_error(y_price_train, y_train_pred)
test_mape = mean_absolute_percentage_error(y_price_test, y_test_pred)
train_rmse = np.sqrt(mean_squared_error(y_price_train, y_train_pred))
test_rmse = np.sqrt(mean_squared_error(y_price_test, y_test_pred))

print(f"\n{'='*60}")
print("REGRESSION MODEL PERFORMANCE (Price Prediction)")
print(f"{'='*60}")
print(f"R² Score:")
print(f"  Train: {train_r2:.4f}")
print(f"  Test:  {test_r2:.4f}")
print(f"  Gap:   {abs(train_r2 - test_r2):.4f}")
print(f"\nMAPE (Mean Absolute Percentage Error):")
print(f"  Train: {train_mape:.4f} ({train_mape*100:.2f}%)")
print(f"  Test:  {test_mape:.4f} ({test_mape*100:.2f}%)")
print(f"\nRMSE (Root Mean Squared Error):")
print(f"  Train: {train_rmse:.2f}")
print(f"  Test:  {test_rmse:.2f}")

overfitting_status = "✓ PASS - No significant overfitting" if abs(train_r2 - test_r2) < 0.1 else "⚠ WARNING"
print(f"\nOverfitting Status: {overfitting_status}")

# Cross-validation
kfold = KFold(n_splits=5, shuffle=True, random_state=42)
cv_scores = cross_val_score(xgb_reg, X_train, y_price_train, cv=kfold, scoring='r2')
print(f"\n5-Fold Cross-Validation (Regression):")
print(f"  Scores: {[f'{s:.4f}' for s in cv_scores]}")
print(f"  Mean:   {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")

# Visualize Regression
fig, axes = plt.subplots(2, 2, figsize=(14, 10))

axes[0, 0].scatter(y_price_test, y_test_pred, alpha=0.6, color='blue')
axes[0, 0].plot([y_price_test.min(), y_price_test.max()], 
                 [y_price_test.min(), y_price_test.max()], 'r--', lw=2)
axes[0, 0].set_xlabel('Actual Final Price')
axes[0, 0].set_ylabel('Predicted Final Price')
axes[0, 0].set_title('Actual vs Predicted (Test Set)', fontweight='bold')
axes[0, 0].grid(True, alpha=0.3)

residuals = y_price_test - y_test_pred
axes[0, 1].scatter(y_test_pred, residuals, alpha=0.6, color='green')
axes[0, 1].axhline(y=0, color='r', linestyle='--', lw=2)
axes[0, 1].set_xlabel('Predicted Final Price')
axes[0, 1].set_ylabel('Residuals')
axes[0, 1].set_title('Residual Plot', fontweight='bold')
axes[0, 1].grid(True, alpha=0.3)

axes[1, 0].hist(residuals, bins=15, edgecolor='black', color='purple', alpha=0.7)
axes[1, 0].set_xlabel('Residuals')
axes[1, 0].set_ylabel('Frequency')
axes[1, 0].set_title('Residuals Distribution', fontweight='bold')
axes[1, 0].axvline(x=0, color='r', linestyle='--', lw=2)

# Learning curve
try:
    results = xgb_reg.evals_result()
    if results:
        epochs = len(results['validation_0']['rmse'])
        x_axis = range(0, epochs)
        axes[1, 1].plot(x_axis, results['validation_0']['rmse'])
        axes[1, 1].set_xlabel('Epoch')
        axes[1, 1].set_ylabel('RMSE')
        axes[1, 1].set_title('Learning Curve', fontweight='bold')
        axes[1, 1].grid(True, alpha=0.3)
except:
    pass

plt.tight_layout()
plt.savefig('03_regression_performance.png', dpi=300, bbox_inches='tight')
plt.close()
print("✓ Saved: 03_regression_performance.png")

# Feature importance
feature_importance_reg = pd.DataFrame({
    'Feature': feature_cols,
    'Importance': xgb_reg.feature_importances_
}).sort_values('Importance', ascending=False)

print("\nTop 10 Important Features (Regression):")
print(feature_importance_reg.head(10).to_string(index=False))

plt.figure(figsize=(10, 6))
top_features = feature_importance_reg.head(10)
plt.barh(range(len(top_features)), top_features['Importance'].values, color='steelblue')
plt.yticks(range(len(top_features)), top_features['Feature'].values)
plt.xlabel('Importance', fontweight='bold')
plt.title('Top 10 Feature Importance (Price Prediction)', fontweight='bold')
plt.tight_layout()
plt.savefig('04_feature_importance_regression.png', dpi=300, bbox_inches='tight')
plt.close()
print("✓ Saved: 04_feature_importance_regression.png")

# ============================================================================
# 6. TRAIN XGBoost CLASSIFICATION (Winning Probability)
# ============================================================================
print("\n[6/8] Training XGBoost Classification Model (Winning Probability)...")

class_weight = {0: 1.0, 1: (len(y_win) - y_win.sum()) / (y_win.sum() + 1)}
print(f"Class weights (for imbalance handling): {class_weight}")

xgb_clf = XGBClassifier(
    n_estimators=200,
    max_depth=5,
    learning_rate=0.05,
    subsample=0.8,
    colsample_bytree=0.8,
    reg_alpha=1.0,
    reg_lambda=1.0,
    min_child_weight=2,
    gamma=0.1,
    scale_pos_weight=(len(y_win) - y_win.sum()) / (y_win.sum() + 1),
    random_state=42,
    verbosity=0
)

X_train_split, X_val, y_train_split, y_val = train_test_split(
    X_train, y_win_train, test_size=0.2, random_state=42
)

xgb_clf.fit(
    X_train_split, y_train_split,
    eval_set=[(X_val, y_val)],
    early_stopping_rounds=30,
    verbose=False
)

print(f"✓ Classification model trained (best iteration: {xgb_clf.best_iteration})")

# Evaluate Classification
y_train_pred_clf = xgb_clf.predict(X_train)
y_test_pred_clf = xgb_clf.predict(X_test)
y_test_pred_proba = xgb_clf.predict_proba(X_test)[:, 1]

train_acc = accuracy_score(y_win_train, y_train_pred_clf)
test_acc = accuracy_score(y_win_test, y_test_pred_clf)
test_precision = precision_score(y_win_test, y_test_pred_clf, zero_division=0)
test_recall = recall_score(y_win_test, y_test_pred_clf, zero_division=0)
test_f1 = f1_score(y_win_test, y_test_pred_clf, zero_division=0)

print(f"\n{'='*60}")
print("CLASSIFICATION MODEL PERFORMANCE (Winning Probability)")
print(f"{'='*60}")
print(f"Accuracy:")
print(f"  Train: {train_acc:.4f}")
print(f"  Test:  {test_acc:.4f}")
print(f"  Gap:   {abs(train_acc - test_acc):.4f}")
print(f"\nTest Set Metrics:")
print(f"  Precision: {test_precision:.4f}")
print(f"  Recall:    {test_recall:.4f}")
print(f"  F1-Score:  {test_f1:.4f}")

overfitting_status = "✓ PASS - No significant overfitting" if abs(train_acc - test_acc) < 0.15 else "⚠ WARNING"
print(f"\nOverfitting Status: {overfitting_status}")

# Classification report
cm = confusion_matrix(y_win_test, y_test_pred_clf)
print("\nConfusion Matrix:")
print(f"  True Negatives:  {cm[0, 0]:2d}  | False Positives: {cm[0, 1]:2d}")
print(f"  False Negatives: {cm[1, 0]:2d}  | True Positives:  {cm[1, 1]:2d}")

print("\nDetailed Classification Report:")
print(classification_report(y_win_test, y_test_pred_clf, target_names=['Lost (0)', 'Won (1)']))

# Cross-validation
cv_scores = cross_val_score(xgb_clf, X_train, y_win_train, cv=kfold, scoring='accuracy')
print("\n5-Fold Cross-Validation (Classification):")
print(f"  Scores: {[f'{s:.4f}' for s in cv_scores]}")
print(f"  Mean:   {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")

# Visualize Classification
fpr, tpr, _ = roc_curve(y_win_test, y_test_pred_proba)
roc_auc = auc(fpr, tpr)

fig, axes = plt.subplots(2, 2, figsize=(14, 10))

sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', ax=axes[0, 0], 
            xticklabels=['Lost', 'Won'], yticklabels=['Lost', 'Won'])
axes[0, 0].set_title('Confusion Matrix (Test Set)', fontweight='bold')
axes[0, 0].set_ylabel('Actual')
axes[0, 0].set_xlabel('Predicted')

axes[0, 1].plot(fpr, tpr, color='blue', lw=2, label=f'ROC Curve (AUC = {roc_auc:.4f})')
axes[0, 1].plot([0, 1], [0, 1], color='red', lw=2, linestyle='--')
axes[0, 1].set_xlabel('False Positive Rate')
axes[0, 1].set_ylabel('True Positive Rate')
axes[0, 1].set_title('ROC Curve', fontweight='bold')
axes[0, 1].legend()
axes[0, 1].grid(True, alpha=0.3)

axes[1, 0].hist(y_test_pred_proba[y_win_test == 0], bins=15, alpha=0.5, label='Lost', color='red')
axes[1, 0].hist(y_test_pred_proba[y_win_test == 1], bins=15, alpha=0.5, label='Won', color='green')
axes[1, 0].set_xlabel('Predicted Probability')
axes[1, 0].set_ylabel('Frequency')
axes[1, 0].set_title('Probability Distribution', fontweight='bold')
axes[1, 0].legend()

metrics = ['Accuracy', 'Precision', 'Recall', 'F1-Score']
values = [test_acc, test_precision, test_recall, test_f1]
colors_bar = ['green' if v > 0.7 else 'orange' for v in values]
axes[1, 1].bar(metrics, values, color=colors_bar, alpha=0.7)
axes[1, 1].set_ylabel('Score')
axes[1, 1].set_title('Model Metrics Summary', fontweight='bold')
axes[1, 1].set_ylim([0, 1])
for i, v in enumerate(values):
    axes[1, 1].text(i, v + 0.02, f'{v:.3f}', ha='center', fontweight='bold')

plt.tight_layout()
plt.savefig('05_classification_performance.png', dpi=300, bbox_inches='tight')
plt.close()
print(f"✓ ROC AUC Score: {roc_auc:.4f}")
print("✓ Saved: 05_classification_performance.png")

# Feature importance
feature_importance_clf = pd.DataFrame({
    'Feature': feature_cols,
    'Importance': xgb_clf.feature_importances_
}).sort_values('Importance', ascending=False)

print("\nTop 10 Important Features (Classification):")
print(feature_importance_clf.head(10).to_string(index=False))

plt.figure(figsize=(10, 6))
top_features = feature_importance_clf.head(10)
plt.barh(range(len(top_features)), top_features['Importance'].values, color='coral')
plt.yticks(range(len(top_features)), top_features['Feature'].values)
plt.xlabel('Importance', fontweight='bold')
plt.title('Top 10 Feature Importance (Winning Probability)', fontweight='bold')
plt.tight_layout()
plt.savefig('06_feature_importance_classification.png', dpi=300, bbox_inches='tight')
plt.close()
print("✓ Saved: 06_feature_importance_classification.png")

# ============================================================================
# 7. SAVE MODELS
# ============================================================================
print("\n[7/8] Saving Models...")

joblib.dump(xgb_reg, 'xgb_price_predictor.pkl')
joblib.dump(xgb_clf, 'xgb_win_predictor.pkl')
joblib.dump(feature_cols, 'feature_columns.pkl')

print("✓ xgb_price_predictor.pkl")
print("✓ xgb_win_predictor.pkl")
print("✓ feature_columns.pkl")

# ============================================================================
# 8. FINAL SUMMARY
# ============================================================================
print("\n[8/8] Final Summary...")
print("\n" + "="*70)
print(" "*15 + "FINAL MODEL SUMMARY & VALIDATION")
print("="*70)

print("\n📊 REGRESSION MODEL (Price Prediction)")
print("-" * 70)
print(f"R² Score (Test):        {test_r2:.4f}")
print(f"MAPE (Test):            {test_mape:.4f} ({test_mape*100:.2f}%)")
print(f"RMSE (Test):            {test_rmse:.2f} credits")
print(f"Overfitting Gap (R²):   {abs(train_r2 - test_r2):.4f}")
print(f"CV Mean Score:          {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")

print("\n📈 CLASSIFICATION MODEL (Winning Probability)")
print("-" * 70)
print(f"Accuracy (Test):        {test_acc:.4f} ({test_acc*100:.2f}%)")
print(f"Precision:              {test_precision:.4f}")
print(f"Recall:                 {test_recall:.4f}")
print(f"F1-Score:               {test_f1:.4f}")
print(f"ROC AUC:                {roc_auc:.4f}")
print(f"Overfitting Gap (Acc):  {abs(train_acc - test_acc):.4f}")

print("\n🎯 REGULARIZATION APPLIED")
print("-" * 70)
print("✓ L1 Regularization (alpha):     1.0")
print("✓ L2 Regularization (lambda):    1.0")
print("✓ Subsample Rate:                80%")
print("✓ Colsample Rate:                80%")
print("✓ Max Depth:                     5")
print("✓ Early Stopping:                Enabled")
print("✓ Class Weights:                 Applied")

print("\n🔍 OVERFITTING CHECK")
print("-" * 70)
gap_reg = abs(train_r2 - test_r2)
gap_clf = abs(train_acc - test_acc)
status_reg = '✓ EXCELLENT' if gap_reg < 0.05 else '✓ GOOD' if gap_reg < 0.1 else '⚠ FAIR'
status_clf = '✓ EXCELLENT' if gap_clf < 0.1 else '✓ GOOD' if gap_clf < 0.15 else '⚠ FAIR'
print(f"Regression R² Gap:      {gap_reg:.4f} {status_reg}")
print(f"Classification Acc Gap: {gap_clf:.4f} {status_clf}")

if gap_reg < 0.1 and gap_clf < 0.15:
    print(f"Overall Status:         ✅ NO OVERFITTING DETECTED")
else:
    print(f"Overall Status:         ⚠️  MONITOR FOR OVERFITTING")

print("\n📁 OUTPUT FILES")
print("-" * 70)
print("Models:")
print("  ✓ xgb_price_predictor.pkl")
print("  ✓ xgb_win_predictor.pkl")
print("  ✓ feature_columns.pkl")
print("Visualizations:")
print("  ✓ 01_eda_distributions.png")
print("  ✓ 02_correlation_matrix.png")
print("  ✓ 03_regression_performance.png")
print("  ✓ 04_feature_importance_regression.png")
print("  ✓ 05_classification_performance.png")
print("  ✓ 06_feature_importance_classification.png")

print("\n" + "="*70)
print(" "*15 + "✅ MODEL TRAINING COMPLETE")
print("="*70 + "\n")
