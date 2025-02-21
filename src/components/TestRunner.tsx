import { MiniTest } from '@/lib/mini-test';
import { useState, useRef } from 'react';

export function TestRunner() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [results, setResults] = useState<any[]>([]);

  const runTest = async (script: string) => {
    if (!iframeRef.current) return;
    
    const tester = new MiniTest(iframeRef.current);
    const testResults = await tester.run(script);
    setResults(testResults);
  };

  return (
    <div>
      <iframe ref={iframeRef} />
      <div className="results">
        {results.map((result, i) => (
          <div key={i} className={`result ${result.status}`}>
            Step {result.step}: {result.status}
            {result.error && <div className="error">{result.error}</div>}
          </div>
        ))}
      </div>
    </div>
  );
} 