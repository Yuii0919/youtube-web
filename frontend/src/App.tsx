import { useState } from "react";

function App() {
  const [input, setInput] = useState<string>("");
  const [result, setResult] = useState<string>("請輸入文字");

  const handleTranslate = async (): Promise<void> => {
    const trimmed = input.trim();
    if (!trimmed) {
      setResult("請輸入文字");
      return;
    }

    try {
      const res = await fetch(
        "https://youtube-web-vfc6.onrender.com/translate",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: trimmed }),
        },
      );

      if (!res.ok) {
        setResult("錯誤");
        return;
      }

      const json: unknown = await res.json();
      if (
        typeof json !== "object" ||
        json === null ||
        !("result" in json) ||
        typeof (json as { result: unknown }).result !== "string"
      ) {
        setResult("錯誤");
        return;
      }

      setResult((json as { result: string }).result);
    } catch {
      setResult("錯誤");
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: 480 }}>
      <h1 style={{ fontSize: "1.25rem", marginBottom: 16 }}>翻譯</h1>
      <label htmlFor="text-input" style={{ display: "block", marginBottom: 8 }}>
        輸入文字
      </label>
      <input
        id="text-input"
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        style={{
          width: "100%",
          padding: "8px 10px",
          marginBottom: 12,
          boxSizing: "border-box",
        }}
        placeholder="例如：Hello"
      />
      <div>
        <button type="button" onClick={handleTranslate}>
          翻譯
        </button>
      </div>
      <p style={{ marginTop: 16, whiteSpace: "pre-wrap" }}>
        <strong>結果：</strong>
        {result}
      </p>
    </div>
  );
}

export default App;
