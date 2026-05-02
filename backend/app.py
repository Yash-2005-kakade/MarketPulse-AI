from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI
import pickle
import pandas as pd
import yfinance as yf

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model
with open("../model/artifacts/xgb_pipeline.pkl", "rb") as f:
    model = pickle.load(f)




@app.get("/history")
def history(ticker: str):
    try:
        df = yf.download(ticker, period="3mo")

        if df.empty:
            return {"dates": [], "prices": []}

        # 🔥 HANDLE ALL CASES
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = [col[0] for col in df.columns]

        # Reset index
        df = df.reset_index()

        # Ensure Close exists
        if "Close" not in df.columns:
            return {"dates": [], "prices": []}

        # Clean values
        df["Close"] = pd.to_numeric(df["Close"], errors="coerce")
        df = df.dropna(subset=["Close"])

        return {
            "dates": df["Date"].astype(str).tolist(),
            "prices": df["Close"].tolist()
        }

    except Exception as e:
        print("ERROR:", e)
        return {"dates": [], "prices": []}


@app.get("/")
def home():
    return {"message": "MarketPulse AI is running 🚀"}


@app.get("/predict")
def predict(ticker: str):

    # Load latest data
    df = yf.download(ticker, period="3mo")
    
    # Feature engineering (same as notebook)
    df['MA7'] = df['Close'].rolling(7).mean()
    df['MA21'] = df['Close'].rolling(21).mean()

    delta = df['Close'].diff()
    gain = (delta.where(delta > 0, 0)).rolling(14).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(14).mean()
    rs = gain / loss
    df['RSI'] = 100 - (100 / (1 + rs))

    ema12 = df['Close'].ewm(span=12).mean()
    ema26 = df['Close'].ewm(span=26).mean()
    df['MACD'] = ema12 - ema26

    df['Lag1'] = df['Close'].shift(1)
    df['Lag2'] = df['Close'].shift(2)

    df.dropna(inplace=True)

    # Take latest row
    latest = df.iloc[-1][['MA7','MA21','RSI','MACD','Lag1','Lag2','Volume']]
    latest = pd.DataFrame([latest])

    # Prediction
    prediction = model.predict(latest)[0]
    confidence = model.predict_proba(latest).max()

    return {
        "ticker": ticker,
        "prediction": "UP 📈" if prediction == 1 else "DOWN 📉",
        "confidence": float(confidence)
    }