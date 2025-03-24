import numpy as np
import matplotlib.pyplot as plt
from matplotlib.animation import FuncAnimation
from datetime import datetime, timedelta
import matplotlib.dates as mdates
import os

def generate_fbm(n, H, dt=1):
    """
    Generate Fractional Brownian Motion
    n: number of points
    H: Hurst exponent (0 < H < 1)
    dt: time step
    """
    # Initialize arrays
    t = np.arange(n) * dt
    dB = np.random.normal(0, np.sqrt(dt), n)
    
    # Generate covariance matrix
    cov = np.zeros((n, n))
    for i in range(n):
        for j in range(n):
            cov[i,j] = 0.5 * (abs(i-j+1)**(2*H) + abs(i-j-1)**(2*H) - 2*abs(i-j)**(2*H))
    
    # Cholesky decomposition
    L = np.linalg.cholesky(cov)
    
    # Generate fBm
    fBm = L @ dB
    return t, fBm

def simulate_stock_price(initial_price, days=14, H=0.6, volatility=0.02):
    """
    Simulate stock price using fBm
    initial_price: starting price
    days: number of days to simulate
    H: Hurst exponent (0 < H < 1)
    volatility: price volatility
    """
    # Generate time points (daily)
    n_points = days * 24  # hourly points
    t, fBm = generate_fbm(n_points, H, dt=1/24)
    
    # Convert to price series
    price = initial_price * np.exp(volatility * fBm)
    
    # Generate dates
    dates = [datetime.now() + timedelta(hours=i) for i in range(n_points)]
    
    return dates, price

def animate_simulation(initial_price):
    # Create output directory if it doesn't exist
    output_dir = 'output'
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    # Generate timestamp for filename
    timestamp = datetime.now().strftime('%m_%d_%Y')
    output_file = os.path.join(output_dir, f'stock_simulation_{timestamp}.gif')
    
    # Create figure and axis
    fig, ax = plt.subplots(figsize=(12, 6))
    ax.set_title('Fractal Stock Price Simulation (2-Week Projection)')
    ax.set_xlabel('Date')
    ax.set_ylabel('Price ($)')
    
    # Generate initial data
    dates, prices = simulate_stock_price(initial_price)
    
    # Initialize line
    line, = ax.plot([], [], 'b-', label='Simulated Price')
    
    # Set axis limits
    ax.set_xlim(dates[0], dates[-1])
    ax.set_ylim(min(prices) * 0.95, max(prices) * 1.05)
    
    # Format x-axis
    ax.xaxis.set_major_formatter(mdates.DateFormatter('%Y-%m-%d'))
    plt.xticks(rotation=45)
    
    # Add grid
    ax.grid(True, linestyle='--', alpha=0.7)
    
    # Add legend
    ax.legend()
    
    def init():
        line.set_data([], [])
        return line,
    
    def animate(frame):
        line.set_data(dates[:frame+1], prices[:frame+1])
        return line,
    
    # Create animation
    anim = FuncAnimation(fig, animate, init_func=init,
                        frames=len(dates), interval=50, blit=True)
    
    plt.tight_layout()
    
    # Save the animation as GIF
    print(f"Saving animation to {output_file}...")
    anim.save(output_file, writer='pillow')
    print("Animation saved successfully!")
    
    # Show the plot
    plt.show()

def main():
    try:
        initial_price = float(input("Enter the initial stock price: $"))
        if initial_price <= 0:
            raise ValueError("Price must be positive")
        animate_simulation(initial_price)
    except ValueError as e:
        print(f"Error: {e}")
        print("Please enter a valid positive number.")

if __name__ == "__main__":
    main() 