import { useEffect, useState } from 'react';
import './App.css';
import { databaseSocket } from './api.ts';

function App() {
  const [data, setData] = useState<any>();

  useEffect(() => {
    const { unsubscribe } = databaseSocket.onDocument(
      'UserModel',
      '66e60f6d4fc5b32c2dabe232',
      setData,
      console.error,
    );

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <>
      <h1>Vite + React</h1>
      <pre style={{ textAlign: 'left' }}>{JSON.stringify(data, null, 2)}</pre>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  );
}

export default App;
