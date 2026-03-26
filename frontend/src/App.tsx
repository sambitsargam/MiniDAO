import { useState } from 'react';
import { ConnectButton, useCurrentAccount, useSignAndExecuteTransaction } from '@onelabs/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import './App.css';

const PACKAGE_ID = import.meta.env.VITE_PACKAGE_ID;

function App() {
  const account = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  
  const [daoData, setDaoData] = useState({ name: '', description: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const createDAO = async () => {
    if (!daoData.name) {
      setMessage('Please enter DAO name');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const tx = new Transaction();
      tx.moveCall({
        target: `${PACKAGE_ID}::governance::create_dao`,
        arguments: [
          tx.pure.string(daoData.name),
          tx.pure.string(daoData.description),
        ],
      });

      signAndExecute(
        { transaction: tx },
        {
          onSuccess: (result) => {
            console.log('DAO created:', result);
            setMessage('✅ DAO created successfully!');
            setDaoData({ name: '', description: '' });
          },
          onError: (error) => {
            console.error('Error:', error);
            setMessage('❌ Error creating DAO');
          },
        }
      );
    } catch (error) {
      console.error('Transaction error:', error);
      setMessage('❌ Transaction failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="minidao-app">
      <div className="particles-bg">
        {[...Array(20)].map((_, i) => (
          <div key={i} className="particle" style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${5 + Math.random() * 10}s`
          }}></div>
        ))}
      </div>

      <header className="dao-header">
        <div className="dao-logo">
          <span className="dao-icon">🗳️</span>
          <span className="dao-name">MiniDAO</span>
        </div>
        <ConnectButton />
      </header>

      <main className="dao-main">
        <div className="dao-hero">
          <h1>Decentralized <span className="highlight">Governance Platform</span></h1>
          <p>Create proposals, vote transparently, and govern with AI-powered insights</p>
        </div>

        {account ? (
          <div className="dao-content">
            <div className="dao-card">
              <h2>Create Your DAO</h2>
              <p className="card-subtitle">Start a decentralized autonomous organization</p>
              
              <div className="dao-form">
                <input
                  type="text"
                  placeholder="DAO Name *"
                  value={daoData.name}
                  onChange={(e) => setDaoData({ ...daoData, name: e.target.value })}
                  disabled={loading}
                />
                <textarea
                  placeholder="Description"
                  value={daoData.description}
                  onChange={(e) => setDaoData({ ...daoData, description: e.target.value })}
                  disabled={loading}
                  rows={4}
                />
                <button onClick={createDAO} disabled={loading} className="dao-btn">
                  {loading ? 'Creating DAO...' : 'Create DAO'}
                </button>
                {message && <div className={`dao-msg ${message.includes('✅') ? 'success' : 'error'}`}>{message}</div>}
              </div>
            </div>

            <div className="dao-features">
              <div className="dao-feature">
                <div className="feature-icon">📝</div>
                <h3>Smart Proposals</h3>
                <p>AI-generated summaries for better understanding</p>
              </div>
              <div className="dao-feature">
                <div className="feature-icon">🎯</div>
                <h3>Transparent Voting</h3>
                <p>Every vote recorded immutably on-chain</p>
              </div>
              <div className="dao-feature">
                <div className="feature-icon">🛡️</div>
                <h3>Spam Protection</h3>
                <p>AI filters low-quality proposals automatically</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="dao-connect">
            <div className="connect-box">
              <div className="connect-icon">🔐</div>
              <h2>Connect Wallet</h2>
              <p>Join the decentralized governance revolution</p>
            </div>
          </div>
        )}
      </main>

      <footer className="dao-footer">
        <p>MiniDAO • Powered by OneChain & AI</p>
      </footer>
    </div>
  );
}

export default App;
