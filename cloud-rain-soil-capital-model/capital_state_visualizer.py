import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from dash import Dash, dcc, html, Input, Output

# --- Load CSV Data ---
def load_data(filepath):
    """Load capital asset data from CSV."""
    return pd.read_csv(filepath)

# --- Generate Bubble Chart ---
def generate_bubble_chart(df):
    """Create a Plotly Express scatter bubble chart."""
    fig = px.scatter(
        df,
        x="Liquidity",
        y="Volatility",
        size=[10]*len(df),
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
    return fig

# --- Generate Sankey Diagram ---
def generate_sankey(df):
    """Create a Sankey diagram of asset transitions between states."""
    sources = []
    targets = []
    values = []

    # Simulate example transitions (for future: load historical CSVs)
    state_order = ['Solid', 'Liquid', 'Gas', 'Plasma']
    state_pairs = [(s1, s2) for s1 in state_order for s2 in state_order if s1 != s2]
    
    for s1, s2 in state_pairs:
        count = df[(df['State'] == s2)].shape[0]  # naive count (replace with real transitions)
        sources.append(state_order.index(s1))
        targets.append(state_order.index(s2))
        values.append(count)

    label_list = state_order
    link = dict(source=sources, target=targets, value=values)
    node = dict(label=label_list, pad=20, thickness=20)

    sankey = go.Figure(data=[go.Sankey(node=node, link=link)])
    sankey.update_layout(title_text="Hypothetical Transitions Between Capital States", font_size=12)
    return sankey

# --- Create Dash App ---
def run_dash_app(filepath):
    df = load_data(filepath)

    app = Dash(__name__)

    app.layout = html.Div([
        html.H1("Capital Transformation Framework"),

        html.Label("Filter by State:"),
        dcc.Dropdown(
            options=[{"label": s, "value": s} for s in df['State'].unique()],
            value=df['State'].unique().tolist(),
            multi=True,
            id='state-filter'
        ),

        html.Label("Filter by Category:"),
        dcc.Dropdown(
            options=[{"label": c, "value": c} for c in df['Category'].unique()],
            value=df['Category'].unique().tolist(),
            multi=True,
            id='category-filter'
        ),

        dcc.Graph(id='bubble-chart'),
        dcc.Graph(figure=generate_sankey(df))
    ])

    @app.callback(
        Output('bubble-chart', 'figure'),
        Input('state-filter', 'value'),
        Input('category-filter', 'value')
    )
    def update_bubble(selected_states, selected_categories):
        filtered_df = df[df['State'].isin(selected_states) & df['Category'].isin(selected_categories)]
        return generate_bubble_chart(filtered_df)

    app.run(debug=True)

# --- Main Entry Point ---
if __name__ == "__main__":
    run_dash_app("capital_states.csv")
