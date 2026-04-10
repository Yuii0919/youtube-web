import { useState } from "react";

function App() {
  const [data, setData] = useState("");

  const callAPI = async () => {
    try {
      const res = await fetch("https://youtube-web-vfc6.onrender.com/health");
      const json = await res.json();
      setData(JSON.stringify(json));
    } catch (err) {
      setData("錯誤：" + err);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>測試 API</h1>
      <button onClick={callAPI}>打 API</button>
      <pre>{data}</pre>
    </div>
  );
}

export default App;
