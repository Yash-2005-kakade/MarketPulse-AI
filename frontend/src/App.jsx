import { useState } from "react";
import { Line } from "react-chartjs-2";
import "chart.js/auto";

function App() {
  const [ticker, setTicker] = useState("");
  const [results, setResults] = useState([]);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(false);
  const API_BASE = import.meta.env.VITE_API_URL;

  const stockOptions = [
    { name: "Reliance", ticker: "RELIANCE.NS" },
    { name: "TCS", ticker: "TCS.NS" },
    { name: "Infosys", ticker: "INFY.NS" },
    { name: "HDFC Bank", ticker: "HDFCBANK.NS" },
    { name: "ICICI Bank", ticker: "ICICIBANK.NS" },
    { name: "Wipro", ticker: "WIPRO.NS" },
  ];

  const handlePredict = async () => {
    if (!ticker) return;

    setLoading(true);
    setResults([]);
    setChartData(null);

    try {
      const tickers = ticker.split(",").map((t) => t.trim());

      // 🔥 Fetch predictions in parallel (stable)
      const predictionResponses = await Promise.all(
        tickers.map((t) =>
          fetch(`${API_BASE}/predict?ticker=${t}`).then((res) =>
            res.json()
          )
        )
      );

      setResults(predictionResponses);

      // 🔥 Fetch chart ONLY ONCE (first ticker)
      const historyRes = await fetch(
  `${API_BASE}/history?ticker=${tickers[0]}`
);
      const historyData = await historyRes.json();

      if (historyData.prices && historyData.prices.length > 0) {
        setChartData({
          labels: historyData.dates,
          datasets: [
            {
              label: `${tickers[0]} Price`,
              data: historyData.prices,
              borderColor: "#00ffcc",
              backgroundColor: "rgba(0,255,204,0.1)",
              tension: 0.4,
              pointRadius: 0,
            },
          ],
        });
      } else {
        console.warn("No chart data");
      }
    } catch (err) {
      console.error(err);
      alert("Backend error");
    }

    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>📈 MarketPulse AI</h1>

      <div style={styles.card}>
        {/* Dropdown */}
        <select
          onChange={(e) => setTicker(e.target.value)}
          style={styles.input}
        >
          <option value="">Select a stock</option>
          {stockOptions.map((stock, i) => (
            <option key={i} value={stock.ticker}>
              {stock.name} ({stock.ticker})
            </option>
          ))}
        </select>

        {/* Manual input */}
        <input
          type="text"
          placeholder="Or enter manually (e.g. RELIANCE.NS)"
          value={ticker}
          onChange={(e) => setTicker(e.target.value)}
          style={styles.input}
        />

        <button onClick={handlePredict} style={styles.button}>
          {loading ? "🔄 Predicting..." : "Predict"}
        </button>
      </div>

      {/* Results */}
      <div style={styles.resultContainer}>
        {results.map((res, i) => (
          <div key={i} style={styles.resultCard}>
            <h3>{res.ticker}</h3>

            <h2
              style={{
                color: res.prediction.includes("UP")
                  ? "#00c853"
                  : "#ff1744",
              }}
            >
              {res.prediction}
            </h2>

            <p>Confidence: {res.confidence.toFixed(2)}</p>

            {/* Suggestion */}
            <div
              style={{
                marginTop: "10px",
                padding: "8px",
                borderRadius: "6px",
                background:
                  res.confidence > 0.7
                    ? res.prediction.includes("UP")
                      ? "#e8f5e9"
                      : "#ffebee"
                    : "#fff8e1",
                fontWeight: "bold",
              }}
            >
              {res.confidence > 0.7
                ? res.prediction.includes("UP")
                  ? "🟢 Suggestion: BUY"
                  : "🔴 Suggestion: SELL"
                : "🟡 Suggestion: HOLD"}
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      {chartData && (
        <div style={styles.chartBox}>
          <Line
            data={chartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,

              interaction: {
                mode: "index",
                intersect: false,
              },

              plugins: {
                tooltip: {
                  callbacks: {
                    label: function (context) {
                      return `₹ ${context.raw.toFixed(2)}`;
                    },
                  },
                },
              },

              scales: {
                x: {
                  ticks: { color: "#000" },
                  grid: { display: false },
                },
                y: {
                  ticks: {
                    color: "#000",
                    callback: function (value) {
                      return "₹ " + value;
                    },
                  },
                  grid: {
                    color: "#eee",
                  },
                },
              },
            }}
          />
        </div>
      )}

      {/* Fallback */}
      {!chartData && !loading && (
        <p style={{ marginTop: "20px", color: "#fff" }}>
          ⚠️ Chart data not available
        </p>
      )}
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0f2027, #203a43, #2c5364)",
    padding: "20px",
    color: "#fff",
    textAlign: "center",
  },

  title: {
    fontSize: "2.5rem",
    marginBottom: "20px",
    fontWeight: "bold",
  },

  card: {
    background: "#fff",
    padding: "20px",
    borderRadius: "10px",
    maxWidth: "500px",
    margin: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },

  input: {
    width: "100%",
    padding: "12px",
    borderRadius: "6px",
    border: "1px solid #ccc",
  },

  button: {
    padding: "12px",
    background: "#000",
    color: "#fff",
    borderRadius: "6px",
    cursor: "pointer",
  },

  resultContainer: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: "15px",
    marginTop: "20px",
  },

  resultCard: {
    background: "#fff",
    color: "#000",
    padding: "15px",
    borderRadius: "10px",
    minWidth: "200px",
  },

  chartBox: {
    marginTop: "30px",
    width: "90%",
    maxWidth: "900px",
    height: "400px",
    marginInline: "auto",
    background: "#fff",
    padding: "20px",
    borderRadius: "10px",
  },
};

export default App;