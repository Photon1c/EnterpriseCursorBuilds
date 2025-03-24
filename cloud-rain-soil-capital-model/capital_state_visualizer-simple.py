import pandas as pd
import plotly.express as px

# --- Load CSV Data ---
def load_data(filepath):
    """Load capital asset data from CSV."""
    return pd.read_csv(filepath)

# --- Map State to Color for Plotly ---
def assign_colors(df):
    """Map each capital state to a unique color."""
    color_map = {
        'Solid': 'brown',
        'Liquid': 'blue',
        'Gas': 'gray',
        'Plasma': 'purple'
    }
    df['Color'] = df['State'].map(color_map)
    return df

# --- Generate Interactive Bubble Chart ---
def generate_bubble_chart(df):
    """Create an interactive bubble chart showing Liquidity vs Volatility."""
    fig = px.scatter(
        df,
        x="Liquidity",
        y="Volatility",
        size=[10]*len(df),  # Static size for now, or make dynamic later
        color="State",
        hover_name="Asset",
        hover_data=["Category", "Catalyst"],
        color_discrete_map={
            'Solid': 'brown',
            'Liquid': 'blue',
            'Gas': 'gray',
            'Plasma': 'purple'
        },
        title="Capital State Framework: Liquidity vs Volatility",
        labels={"Liquidity": "Liquidity (0-10)", "Volatility": "Volatility (0-10)"}
    )
    fig.update_layout(height=600)
    fig.show()

# --- Main Runner ---
def main():
    filepath = "capital_states.csv"  # Path to your CSV
    df = load_data(filepath)
    df = assign_colors(df)
    generate_bubble_chart(df)

if __name__ == "__main__":
    main()
