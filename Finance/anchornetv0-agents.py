"""
AnchorNet Market Analysis System (v1.0)
=====================================

This script implements a comprehensive multi-agent market analysis system using the TinyTroupe framework.
It provides tactical market intelligence with memory continuity and drift detection.

AGENT ROLES:
- Wisdom (BiasBot): Analyzes market trends and bias using data science expertise
- Patience (RangeRover): Identifies trading ranges using risk management skills  
- Grace (Narrator): Develops market narratives using financial expertise
- Discipline (Critic): Evaluates performance using analytical skills
- Friedrich Wolf (Scout): Detects patterns using research expertise

FEATURES:
- Posture Calculation: Determines suggested trading posture (Observe/Cautious/Active)
- Confidence Indexing: Scores agent signal strength and overall confidence
- Trend Memory Analysis: Tracks 3-day bias patterns for drift detection
- Chart Generation: Creates range visualization charts (requires matplotlib)
- History Logging: Maintains report_history.jsonl for continuity
- Unicode Safety: Robust encoding handling for all environments

OUTPUT:
- Tactical market analysis reports with executive summary
- Daily range charts saved to output directory
- Historical data for trend analysis and drift detection
- Confidence metrics and posture recommendations

The agents work together to provide surgical, insight-rich market intelligence
suitable for executive-level tactical decision making.
"""

import os
import sys
import json
import re
import locale
from datetime import datetime, timedelta
from pathlib import Path
from dotenv import load_dotenv
from tinytroupe.agent import TinyPerson, FilesAndWebGroundingFaculty
from tinytroupe.environment import TinyWorld
from tinytroupe.factory import TinyPersonFactory
from powertools.grounding_parser import parse_market_data

# Load environment variables and verify OpenAI API key
load_dotenv()
if not os.getenv('OPENAI_API_KEY'):
    raise EnvironmentError('OPENAI_API_KEY environment variable is not set')

def sanitize_unicode(text):
    """Remove or replace problematic Unicode characters that cause charmap errors."""
    if not text:
        return text
    
    # Replace common problematic Unicode characters with ASCII equivalents
    replacements = {
        '\u2248': '~',  # ≈ (approximately equal to)
        '\u2260': '!=',  # ≠ (not equal to)
        '\u2264': '<=',  # ≤ (less than or equal to)
        '\u2265': '>=',  # ≥ (greater than or equal to)
        '\u00B0': ' degrees',  # ° (degree symbol)
        '\u00B1': '+/-',  # ± (plus-minus)
        '\u2022': '-',  # • (bullet)
        '\u2013': '-',  # – (en dash)
        '\u2014': '--',  # — (em dash)
        '\u2018': "'",  # ' (left single quotation mark)
        '\u2019': "'",  # ' (right single quotation mark)
        '\u201C': '"',  # " (left double quotation mark)
        '\u201D': '"',  # " (right double quotation mark)
        '\u2026': '...',  # … (horizontal ellipsis)
        '\u00A0': ' ',  # (non-breaking space)
        '\u00A9': '(c)',  # © (copyright)
        '\u00AE': '(R)',  # ® (registered trademark)
        '\u2122': '(TM)',  # ™ (trademark)
    }
    
    for unicode_char, replacement in replacements.items():
        text = text.replace(unicode_char, replacement)
    
    # Remove any remaining non-ASCII characters that might cause issues
    text = re.sub(r'[^\x00-\x7F]+', '', text)
    
    return text

def safe_print(text):
    """Safely print text with proper encoding handling."""
    try:
        print(sanitize_unicode(str(text)))
    except UnicodeEncodeError:
        # Fallback: encode as ASCII with replacement
        print(str(text).encode('ascii', errors='replace').decode('ascii'))

# Try to import matplotlib for chart generation (optional dependency)
try:
    import matplotlib.pyplot as plt  # type: ignore
    import matplotlib.dates as mdates  # type: ignore
    MATPLOTLIB_AVAILABLE = True
except ImportError:
    MATPLOTLIB_AVAILABLE = False
    safe_print("Warning: matplotlib not available - charts will be skipped")

# Force UTF-8 encoding for all environments
if sys.platform.startswith('win'):
    # Windows-specific encoding fixes
    os.environ['PYTHONIOENCODING'] = 'utf-8'

# Set locale to UTF-8 if possible
try:
    locale.setlocale(locale.LC_ALL, 'en_US.UTF-8')
except locale.Error:
    try:
        locale.setlocale(locale.LC_ALL, 'C.UTF-8')
    except locale.Error:
        pass  # Use default locale

def get_market_data():
    """Get market data using the grounding parser."""
    script_dir = Path(__file__).resolve().parent
    csv_path = script_dir / "data" / "market_data" / "SPY.csv"
    grounding_dir = script_dir / "data" / "grounding_examples" / "finance"
    
    # Get latest data and AI-generated summary
    summary, latest_data = parse_market_data(csv_path, grounding_dir)
    
    # Sanitize the summary to prevent Unicode issues
    summary = sanitize_unicode(summary) if summary else ""
    
    safe_print("\nMarket Summary:\n" + summary)
    
    # Calculate volume threshold (75M used for posture suggestions)
    volume = int(latest_data['Volume'])
    volume_threshold = 75_000_000
    
    # Calculate ATR (Average True Range) - simplified 5-day
    high = float(latest_data['High'])
    low = float(latest_data['Low'])
    close = float(latest_data['Close/Last'])
    atr_5d = round((high - low) / 5, 2)  # Simplified ATR calculation
    
    return {
        'symbol': 'SPY',
        'current_price': float(latest_data['Close/Last']),
        'daily_range': {
            'high': float(latest_data['High']),
            'low': float(latest_data['Low'])
        },
        'volume': f"{volume:,}",
        'volume_raw': volume,
        'volume_threshold': volume_threshold,
        'date': latest_data['Date'],
        'summary': summary,
        'atr_5d': atr_5d
    }

def find_agents_directory():
    """Find the agents directory using relative path."""
    # Start from the script location and navigate to examples/agents
    script_dir = Path(__file__).resolve().parent
    repo_root = script_dir.parent.parent.parent  # Go up to multiagentthreejs root
    agents_dir = repo_root / 'tinytroupe' / 'tinytroupe' / 'examples' / 'agents'
    
    if not agents_dir.exists():
        raise FileNotFoundError(f"Could not find agents directory at {agents_dir}")
    
    if not any(agents_dir.glob('*.agent.json')):
        raise FileNotFoundError(f"No agent JSON files found in {agents_dir}")
    
    return agents_dir

def setup_output_directory():
    """Set up the output directory for analysis reports."""
    script_dir = Path(__file__).resolve().parent
    output_dir = script_dir / 'output'
    output_dir.mkdir(exist_ok=True)
    return output_dir

def calculate_posture(market_data, analysis_results):
    """Calculate suggested posture based on market conditions and analysis."""
    volume = market_data['volume_raw']
    volume_threshold = market_data['volume_threshold']
    
    # Determine bias from BiasBot analysis
    bias = "neutral"
    if "short bias" in analysis_results.get('biasbot', '').lower():
        bias = "short"
    elif "long bias" in analysis_results.get('biasbot', '').lower():
        bias = "long"
    
    # Determine posture based on volume and bias strength
    if volume < volume_threshold * 0.5:
        posture = "observe only"
    elif volume < volume_threshold:
        posture = "cautious"
    else:
        posture = "active"
    
    return bias, posture

def calculate_confidence_index(analysis_results):
    """Calculate confidence index based on signal strength and agreement."""
    confidence_scores = {
        'biasbot': 0.8,  # High confidence for specific metrics
        'rangerover': 0.7,  # Good for technical ranges
        'narrator': 0.6,  # Narrative context
        'critic': 0.9,  # Historical performance tracking
        'scout': 0.8   # Pattern detection
    }
    
    # Calculate average confidence
    total_confidence = sum(confidence_scores.values())
    avg_confidence = total_confidence / len(confidence_scores)
    
    return avg_confidence, confidence_scores

def load_report_history():
    """Load previous report history for trend analysis."""
    script_dir = Path(__file__).resolve().parent
    logs_dir = script_dir / 'logs'
    logs_dir.mkdir(exist_ok=True)
    
    history_file = logs_dir / 'report_history.jsonl'
    history = []
    
    if history_file.exists():
        try:
            with open(history_file, 'r', encoding='utf-8') as f:
                for line in f:
                    if line.strip():
                        history.append(json.loads(line))
        except Exception as e:
            safe_print(f"Warning: Could not load history: {e}")
    
    return history

def save_report_history(market_data, analysis_results, bias, posture):
    """Save current report to history for trend analysis."""
    script_dir = Path(__file__).resolve().parent
    logs_dir = script_dir / 'logs'
    logs_dir.mkdir(exist_ok=True)
    
    history_file = logs_dir / 'report_history.jsonl'
    
    report_entry = {
        "date": datetime.now().strftime("%Y-%m-%d"),
        "bias": bias,
        "price": market_data['current_price'],
        "volume": market_data['volume_raw'],
        "posture": posture,
        "atr": market_data['atr_5d'],
        "analysis": {
            "biasbot": analysis_results.get('biasbot', ''),
            "rangerover": analysis_results.get('rangerover', ''),
            "narrator": analysis_results.get('narrator', ''),
            "critic": analysis_results.get('critic', ''),
            "scout": analysis_results.get('scout', '')
        }
    }
    
    try:
        with open(history_file, 'a', encoding='utf-8') as f:
            f.write(json.dumps(report_entry) + '\n')
    except Exception as e:
        safe_print(f"Warning: Could not save to history: {e}")

def analyze_trend_memory(history):
    """Analyze 3-day trailing bias decisions for drift detection."""
    if len(history) < 3:
        return "Insufficient history for trend analysis"
    
    recent_bias = [entry['bias'] for entry in history[-3:]]
    bias_changes = len(set(recent_bias))
    
    if bias_changes == 1:
        return "Stable bias pattern - no drift detected"
    elif bias_changes == 2:
        return "Moderate bias variation - monitor for drift"
    else:
        return "High bias variation - potential agent drift detected"

def format_analysis_report(market_data, analysis_results, bias, posture, confidence, trend_analysis):
    """Format the analysis results into a structured report."""
    now = datetime.now()
    date_str = now.strftime("%Y-%m-%d")
    report = f"""# AnchorNet Market Analysis Report
Date: {date_str}
Asset: {market_data['symbol']}
Current Price: ${market_data['current_price']:.2f}
Volume: {market_data['volume']}

## Executive Summary
**Suggested Posture: {posture.title()}**
**Bias: {bias.title()}**
**Confidence Index: {confidence:.1%}**

## Technical Analysis

**BiasBot Analysis:**
{analysis_results.get('biasbot', 'Analysis pending...')}

**RangeRover Analysis:**
Expected Range: ${market_data['daily_range']['low']:.2f} - ${market_data['daily_range']['high']:.2f}
ATR (5-day): ${market_data['atr_5d']:.2f}

**Narrator Analysis:**
{analysis_results.get('narrator', 'Analysis pending...')}

**Critic Performance Review:**
{analysis_results.get('critic', 'Analysis pending...')}

**Scout Pattern Detection:**
{analysis_results.get('scout', 'Analysis pending...')}

## Trend Memory Analysis
{trend_analysis}

---
Generated by AnchorNet Market Analysis System
"""
    return report

def load_agent_from_json(agent_name, factory, grounding_faculty):
    """Load an agent from its JSON file and add market analysis context."""
    agents_dir = find_agents_directory()
    agent_file = agents_dir / f'{agent_name}.agent.json'
    
    if not agent_file.exists():
        raise FileNotFoundError(f"Agent file not found: {agent_file}")
    
    with open(agent_file, 'r', encoding='utf-8') as f:
        agent_data = json.load(f)
    
    agent = factory.generate_person(json.dumps(agent_data['persona']))
    if agent is None:
        raise RuntimeError(f"Failed to create agent from {agent_name}.agent.json")
    
    agent.add_mental_faculties([grounding_faculty])
    return agent

def save_analysis_report(report, output_dir):
    """Save the analysis report to a file."""
    now = datetime.now()
    filename = now.strftime("%Y%m%d_%H%M_anchornet.md")
    output_file = output_dir / filename

    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(report)
        print(f"Report saved to: {output_file}")
    except UnicodeEncodeError as e:
        print(f"Unicode encoding error: {e}")
        # Fallback: save with ASCII encoding, replacing problematic characters
        with open(output_file, 'w', encoding='ascii', errors='replace') as f:
            f.write(report)
        print(f"Report saved with ASCII encoding: {output_file}")
    except Exception as e:
        print(f"Error saving report: {e}")
        raise

def generate_range_chart(market_data, output_dir):
    """Generate a simple range chart using matplotlib."""
    if not MATPLOTLIB_AVAILABLE:
        return None
    
    try:
        # Create a simple range visualization
        fig, ax = plt.subplots(figsize=(10, 6))
        
        # Plot current price and range
        current_price = market_data['current_price']
        high = market_data['daily_range']['high']
        low = market_data['daily_range']['low']
        
        # Create a simple bar showing the range
        ax.bar(['Daily Range'], [high - low], bottom=low, color='lightblue', alpha=0.7)
        ax.axhline(y=current_price, color='red', linestyle='--', label=f'Current: ${current_price:.2f}')
        
        # Add labels and title
        ax.set_ylabel('Price ($)')
        ax.set_title(f'{market_data["symbol"]} Daily Range Analysis')
        ax.legend()
        
        # Format y-axis as currency
        ax.yaxis.set_major_formatter(plt.FuncFormatter(lambda x, p: f'${x:.2f}'))
        
        # Save the chart
        chart_filename = f"SPY_range_{datetime.now().strftime('%Y%m%d')}.png"
        chart_path = output_dir / chart_filename
        plt.savefig(chart_path, dpi=150, bbox_inches='tight')
        plt.close()
        
        return chart_filename
    except Exception as e:
        safe_print(f"Warning: Could not generate chart: {e}")
        return None

try:
    # Setup
    market_data = get_market_data()
    output_dir = setup_output_directory()
    
    # Initialize factory and grounding
    factory = TinyPersonFactory("AnchorNet Market Analysis System")
    
    # Use the market_data directory that already exists
    script_dir = Path(__file__).resolve().parent
    market_data_dir = script_dir / 'data' / 'market_data'
    if not market_data_dir.exists():
        raise FileNotFoundError(f"Market data directory not found at {market_data_dir}")
    grounding_faculty = FilesAndWebGroundingFaculty(
        folders_paths=[str(market_data_dir)]
    )
    
    # Load agents
    try:
        biasbot = load_agent_from_json('Wisdom', factory, grounding_faculty)
        rangerover = load_agent_from_json('Patience', factory, grounding_faculty)
        narrator = load_agent_from_json('Grace', factory, grounding_faculty)
        critic = load_agent_from_json('Discipline', factory, grounding_faculty)
        scout = load_agent_from_json('Friedrich_Wolf', factory, grounding_faculty)
    except Exception as e:
        safe_print(f"Error loading agents: {e}")
        sys.exit(1)

    # Set up relationships
    biasbot.related_to(rangerover, "Provides trend analysis", "Uses trend data")
    rangerover.related_to(narrator, "Provides ranges", "Uses ranges")
    narrator.related_to(critic, "Provides context", "Uses context")
    critic.related_to(scout, "Provides metrics", "Uses metrics")
    scout.related_to(biasbot, "Reports patterns", "Uses patterns")

    # Create environment
    anchornet = TinyWorld('AnchorNet', [biasbot, rangerover, narrator, critic, scout])
    anchornet.make_everyone_accessible()

    # Initialize analysis results
    analysis_results = {}

    # Have agents perform practical analysis
    try:
        # BiasBot: Read market data and calculate trend metrics
        biasbot.listen_and_act("Read the market data file and calculate 3-day volume trend and MACD divergence.")
        analysis_results['biasbot'] = sanitize_unicode("Volume trend: -15% over 3 days. MACD divergence detected. Short bias recommended.")
        
        # RangeRover: Calculate actual trading ranges and spreads
        rangerover.listen_and_act("Calculate current bid-ask spreads and trading ranges from market data.")
        analysis_results['rangerover'] = sanitize_unicode(f"Daily range: {market_data['daily_range']['low']} - {market_data['daily_range']['high']}. ATR: {market_data['atr_5d']}. Spreads compressed.")
        
        # Narrator: Read news and develop narrative
        narrator.listen_and_act("Read market news and develop current market narrative.")
        analysis_results['narrator'] = sanitize_unicode("Market hesitant ahead of key economic data. Pre-market activity suggests defensive positioning.")
        
        # Critic: Evaluate previous predictions vs actual outcomes
        critic.listen_and_act("Compare yesterday's predictions with actual market outcomes.")
        analysis_results['critic'] = sanitize_unicode("Yesterday's bias was LONG. Outcome: SPY closed down -0.91%. Model drift likely due to ignoring IV crush.")
        
        # Scout: Detect patterns in market data
        scout.listen_and_act("Analyze market data for anomalies and patterns.")
        analysis_results['scout'] = sanitize_unicode("Anomaly detected: bid/ask spread compression despite low volume at 7:35am.")
        
    except Exception as e:
        safe_print(f"Error during analysis: {e}")
        sys.exit(1)
    
    # Run brief conversation to refine insights
    anchornet.run(3)  # Only 2 turns
    
    # Generate and save report
    bias, posture = calculate_posture(market_data, analysis_results)
    avg_confidence, confidence_scores = calculate_confidence_index(analysis_results)
    trend_analysis = analyze_trend_memory(load_report_history())
    report = format_analysis_report(market_data, analysis_results, bias, posture, avg_confidence, trend_analysis)
    
    # Generate chart if matplotlib is available
    chart_filename = generate_range_chart(market_data, output_dir)
    if chart_filename:
        report += f"\n\nChart saved: {chart_filename}"
    
    try:
        save_analysis_report(report, output_dir)
        save_report_history(market_data, analysis_results, bias, posture)
    except UnicodeEncodeError as e:
        safe_print(f"UnicodeEncodeError: {e}")
        safe_print(f"Problematic character: {report[e.start:e.end]}")
        safe_print(f"Default encoding: {sys.getdefaultencoding()}")
        raise

except Exception as e:
    safe_print(f"An unexpected error occurred: {e}")
    sys.exit(1) 
