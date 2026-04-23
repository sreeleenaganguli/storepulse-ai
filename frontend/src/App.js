
import { useState } from 'react';

function App() {
  const [output, setOutput] = useState(null);

  async function runTriage() {
    const res = await fetch('http://localhost:8000/triage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service: 'sco-ui',
        severity: 'Sev2',
        symptoms: 'Payment retries failing across SCOs'
      })
    });
    setOutput(await res.json());
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>StorePulse AI</h1>
      <button onClick={runTriage}>Run Triage</button>
      {output && <pre>{JSON.stringify(output, null, 2)}</pre>}
    </div>
  );
}

export default App;
