import { useState } from "react";

function App() {
  const [text, setText] = useState("");
  const [result, setResult] = useState("請輸入文字");

  const handleTranslate = async () => {
    try {
      const res = await fetch("https://youtube-web-vfc6.onrender.com/translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      const data = await res.json();
      setResult(data.result);
    } catch (err) {
      console.error(err);
      setResult("錯誤");
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>翻譯測試</h1>

      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="輸入文字"
      />

      <br /><br />

      <button onClick={handleTranslate}>翻譯</button>

      <p>結果：{result}</p>
    </div>
  );
}

export default App;
