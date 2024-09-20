import { useEffect, useState } from 'react';
import reactLogo from './assets/react.svg';
import viteLogo from '/vite.svg';
import './App.css';
import { databaseRest, databaseSocket } from './api.ts';

function App() {
  const [data, setData] = useState<any>();

  useEffect(() => {
    const { unsubscribe } = databaseSocket.onDocument(
      'AdminUserModel',
      '66ecc25152fc1cb014edc3d5',
      setData,
      console.error,
    );

    void (async () => {
      const results = await databaseRest.findMany('AdminUserModel', {
        filter: {},
      });

      if (!results.length) {
        const newUser = await databaseRest.insertOne('AdminUserModel', {
          data: {
            first_name: 'Admin',
            last_name: 'User',
            display_name: 'Admin Super God',
            age: 12,
            power_level: 100,
          },
        });

        console.log(newUser);
      }
    })();

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <>
      <div>
        <a href="https://vitejs.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <pre style={{ textAlign: 'left' }}>{JSON.stringify(data, null, 2)}</pre>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  );
}

export default App;
