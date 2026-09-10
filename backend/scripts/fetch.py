import urllib.request
import json
import os
import csv
import ssl

ssl._create_default_https_context = ssl._create_unverified_context

us_symbols = []
india_symbols = []

try:
    print("Fetching Nasdaq FTP list...")
    url = "ftp://ftp.nasdaqtrader.com/symboldirectory/nasdaqtraded.txt"
    lines = urllib.request.urlopen(url).read().decode('utf-8').splitlines()
    for line in lines[1:-1]:
        parts = line.split('|')
        sym = parts[1]
        # Ignore test issues
        if parts[3] == 'Y': continue
        if '$' in sym or '.' in sym: continue
        us_symbols.append(sym)
    print(f"Found {len(us_symbols)} valid US symbols.")
except Exception as e:
    print(f"Failed US: {e}")

try:
    print("Fetching NSE master equity list...")
    url_nse = "https://archives.nseindia.com/content/equities/EQUITY_L.csv"
    req = urllib.request.Request(url_nse, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'})
    nse_lines = urllib.request.urlopen(req).read().decode('utf-8').splitlines()
    reader = csv.reader(nse_lines)
    next(reader)
    for row in reader:
        if row and len(row) > 0:
            sym = row[0].strip()
            india_symbols.append(f"{sym}.NS")
    print(f"Found {len(india_symbols)} valid Indian symbols.")
except Exception as e:
    print(f"Failed India: {e}")

if not us_symbols:
    us_symbols = ["AAPL", "MSFT", "TSLA", "NVDA", "SPY", "AMZN", "META", "GOOGL"]
if not india_symbols:
    india_symbols = ["RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "ICICIBANK.NS", "INFY.NS"]

data = { "US": us_symbols, "INDIA": india_symbols }
path = os.path.join(os.path.dirname(__file__), '..', 'app', 'core', 'symbols.json')
with open(path, 'w') as f:
    json.dump(data, f)
print(f"Saved database to {path}")
