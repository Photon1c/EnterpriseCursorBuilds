import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from scipy import stats
from datetime import datetime, timedelta
from sklearn.linear_model import LinearRegression

def calculate_rsi(data, periods=14):
    """Calculate Relative Strength Index"""
    delta = data.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=periods).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=periods).mean()
    rs = gain / loss
    return 100 - (100 / (1 + rs))

def calculate_macd(data, fast=12, slow=26, signal=9):
    """Calculate MACD (Moving Average Convergence Divergence)"""
    exp1 = data.ewm(span=fast, adjust=False).mean()
    exp2 = data.ewm(span=slow, adjust=False).mean()
    macd = exp1 - exp2
    signal_line = macd.ewm(span=signal, adjust=False).mean()
    return macd, signal_line

def calculate_bollinger_bands(data, window=20, num_std=2):
    """Calculate Bollinger Bands"""
    sma = data.rolling(window=window).mean()
    std = data.rolling(window=window).std()
    upper_band = sma + (std * num_std)
    lower_band = sma - (std * num_std)
    return upper_band, sma, lower_band

def calculate_sentiment(data):
    """Calculate overall sentiment score (-100 to 100)"""
    # RSI component (weight: 30%)
    rsi = calculate_rsi(data)
    rsi_score = (rsi - 50) * 0.6  # Convert to -30 to 30 range
    
    # MACD component (weight: 30%)
    macd, signal = calculate_macd(data)
    macd_score = np.sign(macd) * np.minimum(abs(macd), 30)  # Cap at ±30
    
    # Price momentum component (weight: 20%)
    returns = data.pct_change(periods=10)
    momentum_score = np.sign(returns) * np.minimum(abs(returns * 1000), 20)  # Cap at ±20
    
    # Volume trend component (weight: 20%)
    volume_trend = np.sign(data.diff(periods=5))
    volume_score = volume_trend * 20
    
    # Combine all components
    sentiment = rsi_score + macd_score + momentum_score + volume_score
    
    # Normalize to -100 to 100 range
    sentiment = np.clip(sentiment, -100, 100)
    
    return sentiment

def get_sentiment_label(score):
    """Convert numerical sentiment score to descriptive label"""
    if score >= 80:
        return "Extremely Bullish"
    elif score >= 40:
        return "Strongly Bullish"
    elif score >= 20:
        return "Moderately Bullish"
    elif score >= -20:
        return "Neutral"
    elif score >= -40:
        return "Moderately Bearish"
    elif score >= -80:
        return "Strongly Bearish"
    else:
        return "Extremely Bearish"

def calculate_projections(data, days_to_project=7):
    """Calculate projections for the next week using linear regression"""
    # Remove NaN values for projection calculation
    valid_data = data.dropna()
    if len(valid_data) < 2:
        return np.array([data.iloc[-1]] * days_to_project)
        
    X = np.arange(len(valid_data)).reshape(-1, 1)
    y = valid_data.values.reshape(-1, 1)
    
    model = LinearRegression()
    model.fit(X, y)
    
    # Project future dates starting from the last point of original data
    X_future = np.arange(len(data), len(data) + days_to_project).reshape(-1, 1)
    y_future = model.predict(X_future)
    
    # Ensure the projection starts from the last actual value
    y_future = y_future * (data.iloc[-1] / y_future[0])  # Scale to match the last actual value
    
    return y_future.flatten()

def plot_momentum_analysis(csv_path, months_to_show=3):
    """Generate comprehensive momentum analysis plots"""
    # Read data
    df = pd.read_csv(csv_path)
    df['Date'] = pd.to_datetime(df['Date'])
    df.set_index('Date', inplace=True)
    df.sort_index(inplace=True)
    
    # Handle any missing values
    df = df.ffill().bfill()
    
    # Filter last 3 months
    start_date = df.index[-1] - pd.DateOffset(months=months_to_show)
    df = df[df.index >= start_date]
    
    # Calculate indicators
    rsi = calculate_rsi(df['Close/Last'])
    macd, signal = calculate_macd(df['Close/Last'])
    upper_band, sma, lower_band = calculate_bollinger_bands(df['Close/Last'])
    sentiment = calculate_sentiment(df['Close/Last'])
    
    # Calculate projections
    price_proj = calculate_projections(df['Close/Last'])
    volume_proj = calculate_projections(df['Volume'])
    rsi_proj = calculate_projections(rsi)
    macd_proj = calculate_projections(macd)
    signal_proj = calculate_projections(signal)
    sentiment_proj = calculate_projections(sentiment)
    
    # Create projection dates
    proj_dates = pd.date_range(start=df.index[-1] + pd.Timedelta(days=1), periods=7, freq='D')
    
    # Create figure with subplots
    fig, axes = plt.subplots(2, 2, figsize=(15, 12))
    fig.suptitle('SPY Momentum Analysis (Last 3 Months with 1-Week Projection)', fontsize=16)
    
    # Plot 1: Price and Bollinger Bands
    axes[0, 0].plot(df.index, df['Close/Last'], label='Price', color='blue')
    axes[0, 0].plot(df.index, upper_band, '--', label='Upper BB', color='gray', alpha=0.5)
    axes[0, 0].plot(df.index, sma, '--', label='SMA', color='orange', alpha=0.5)
    axes[0, 0].plot(df.index, lower_band, '--', label='Lower BB', color='gray', alpha=0.5)
    axes[0, 0].plot(proj_dates, price_proj, '--', label='Price Projection', color='red', alpha=0.7)
    axes[0, 0].set_title('Price and Bollinger Bands')
    axes[0, 0].legend()
    axes[0, 0].tick_params(axis='x', rotation=45)
    
    # Plot 2: RSI
    axes[0, 1].plot(df.index, rsi, color='purple', label='RSI')
    axes[0, 1].plot(proj_dates, rsi_proj, '--', label='RSI Projection', color='red', alpha=0.7)
    axes[0, 1].axhline(y=70, color='r', linestyle='--')
    axes[0, 1].axhline(y=30, color='g', linestyle='--')
    axes[0, 1].set_title('Relative Strength Index (RSI)')
    axes[0, 1].set_ylim(0, 100)
    axes[0, 1].legend()
    axes[0, 1].tick_params(axis='x', rotation=45)
    
    # Plot 3: MACD
    axes[1, 0].plot(df.index, macd, label='MACD', color='blue')
    axes[1, 0].plot(df.index, signal, label='Signal', color='orange')
    axes[1, 0].plot(proj_dates, macd_proj, '--', label='MACD Projection', color='red', alpha=0.7)
    axes[1, 0].plot(proj_dates, signal_proj, '--', label='Signal Projection', color='purple', alpha=0.7)
    axes[1, 0].set_title('MACD')
    axes[1, 0].legend()
    axes[1, 0].tick_params(axis='x', rotation=45)
    
    # Plot 4: Volume and Sentiment
    ax1 = axes[1, 1]
    ax2 = ax1.twinx()
    ax1.bar(df.index, df['Volume'], alpha=0.3, color='gray', label='Volume')
    ax2.plot(df.index, sentiment, color='blue', label='Sentiment')
    ax1.bar(proj_dates, volume_proj, alpha=0.3, color='lightcoral', label='Volume Projection')
    ax2.plot(proj_dates, sentiment_proj, '--', color='red', label='Sentiment Projection', alpha=0.7)
    ax1.set_title('Volume and Sentiment')
    ax1.legend(loc='upper left')
    ax2.legend(loc='upper right')
    ax2.set_ylim(-100, 100)
    ax1.tick_params(axis='x', rotation=45)
    
    # Adjust layout
    plt.tight_layout()
    
    # Print current sentiment and projected sentiment
    current_sentiment = sentiment.iloc[-1]
    projected_sentiment = sentiment_proj[-1]
    print(f"\nCurrent Sentiment Score: {current_sentiment:.2f}")
    print(f"Current Sentiment Label: {get_sentiment_label(current_sentiment)}")
    print(f"\nProjected Sentiment (1 week): {projected_sentiment:.2f}")
    print(f"Projected Sentiment Label: {get_sentiment_label(projected_sentiment)}")
    
    return fig

if __name__ == "__main__":
    try:
        print("Analyzing SPY data...")
        fig = plot_momentum_analysis('SPY.csv')
        plt.show()
    except Exception as e:
        print(f"Error: {str(e)}") 