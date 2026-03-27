import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConnectButton, useCurrentAccount, useSignAndExecuteTransaction, useSuiClientQuery } from '@onelabs/dapp-kit';
import { Transaction } from '@onelabs/sui/transactions';
import { motion, AnimatePresence } from 'framer-motion';

const PACKAGE_ID = import.meta.env.VITE_PACKAGE_ID;

function Dashboard() {
  const navigate = useNavigate();
  const account = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const [activeTab, setActiveTab] = useState<'create-dao' | 'create-proposal' | 'vote' | 'my-daos'>('create-dao');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [aiScore, setAiScore] = useState<number | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [aiChecking, setAiChecking] = useState(false);
  const [daoData, setDaoData] = useState({ name: '', description: '' });
  const [proposalData, setProposalData] = useState({ daoId: '', title: '', description: '', duration: '7' });
  const [voteData, setVoteData] = useState({ daoId: '', proposalId: '', voteFor: true });
  const [selectedProposal, setSelectedProposal] = useState<any>(null);

  const { data: daoEvents } = useSuiClientQuery('queryEvents', {
    query: { MoveEventType: `${PACKAGE_ID}::governance::DAOCreated` }, limit: 50,
  });
  const { data: proposalEvents } = useSuiClientQuery('queryEvents', {
    query: { MoveEventType: `${PACKAGE_ID}::governance::ProposalCreated` }, limit: 100,
  });
  const { data: voteEvents } = useSuiClientQuery('queryEvents', {
    query: { MoveEventType: `${PACKAGE_ID}::governance::VoteCast` }, limit: 500,
  });

  const allDAOs = daoEvents?.data || [];
  const allProposals = proposalEvents?.data || [];
  const allVotes = voteEvents?.data || [];
  const myDAOs = allDAOs.filter((e: any) => e.parsedJson?.admin === account?.address);

  const getVotes = (proposalId: string) => {
    const votes = allVotes.filter((v: any) => v.parsedJson?.proposal_id === proposalId);
    const forVotes = votes.filter((v: any) => v.parsedJson?.vote_for === true).length;
    const againstVotes = votes.filter((v: any) => v.parsedJson?.vote_for === false).length;
    return { forVotes, againstVotes, total: votes.length };
  };

  const checkProposalWithAI = async () => {
    if (!proposalData.title || !proposalData.description) { setMessage('Fill in title and description first'); return; }
    setAiChecking(true); setAiScore(null); setAiAnalysis(''); setMessage('');
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}` },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [{ role: 'user', content: `You are a DAO governance AI. Analyze this proposal for quality, clarity, and legitimacy. Return ONLY a JSON object: {"score": integer 0-100, "reason": "one sentence"}. Proposal Title: "${proposalData.title}", Description: "${proposalData.description}"` }],
          max_tokens: 150,
        }),
      });
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || '{}';
      const parsed = JSON.parse(content.match(/\{[\s\S]*\}/)?.[0] || '{}');
      setAiScore(parseInt(parsed.score) || 0);
      setAiAnalysis(parsed.reason || '');
    } catch { setAiScore(50); setAiAnalysis('AI analysis unavailable.'); }
    finally { setAiChecking(false); }
  };

  const createDAO = async () => {
    if (!daoData.name) { setMessage('DAO name is required'); return; }
    setLoading(true); setMessage('Creating DAO on-chain...');
    try {
      const tx = new Transaction();
      tx.moveCall({ target: `${PACKAGE_ID}::governance::create_dao`, arguments: [tx.pure.string(daoData.name), tx.pure.string(daoData.description)] });
      signAndExecute({ transaction: tx }, {
        onSuccess: () => { setMessage('✅ DAO created!'); setDaoData({ name: '', description: '' }); },
        onError: () => setMessage('❌ Failed to create DAO'),
      });
    } catch { setMessage('❌ Transaction failed'); }
    finally { setLoading(false); }
  };

  const createProposal = async () => {
    if (aiScore === null) { setMessage('Run AI verification first'); return; }
    if (aiScore < 75) { setMessage(`❌ AI score ${aiScore}/100 — below 75. Proposal blocked.`); return; }
    if (!proposalData.daoId || !proposalData.title) { setMessage('Fill all required fields'); return; }
    setLoading(true); setMessage('Submitting proposal on-chain...');
    try {
      const tx = new Transaction();
      tx.moveCall({
        target: `${PACKAGE_ID}::governance::create_proposal`,
        arguments: [
          tx.object(proposalData.daoId),
          tx.pure.string(proposalData.title),
          tx.pure.string(proposalData.description),
          tx.pure.string(`AI Score: ${aiScore}/100 — ${aiAnalysis}`),
          tx.pure.u64(parseInt(proposalData.duration)),
        ],
      });
      signAndExecute({ transaction: tx }, {
        onSuccess: () => { setMessage('✅ Proposal created!'); setProposalData({ daoId: '', title: '', description: '', duration: '7' }); setAiScore(null); setAiAnalysis(''); },
        onError: () => setMessage('❌ Failed to create proposal'),
      });
    } catch { setMessage('❌ Transaction failed'); }
    finally { setLoading(false); }
  };

  const castVote = async () => {
    if (!voteData.daoId || !voteData.proposalId) { setMessage('Select a proposal to vote on'); return; }
    setLoading(true); setMessage('Casting vote on-chain...');
    try {
      const tx = new Transaction();
      tx.moveCall({
        target: `${PACKAGE_ID}::governance::vote`,
        arguments: [tx.object(voteData.daoId), tx.object(voteData.proposalId), tx.pure.bool(voteData.voteFor)],
      });
      signAndExecute({ transaction: tx }, {
        onSuccess: () => { setMessage('✅ Vote cast successfully!'); setSelectedProposal(null); },
        onError: () => setMessage('❌ Vote failed'),
      });
    } catch { setMessage('❌ Transaction failed'); }
    finally { setLoading(false); }
  };

  const scoreColor = aiScore === null ? '' : aiScore >= 75 ? 'text-indigo-400' : aiScore >= 50 ? 'text-yellow-400' : 'text-red-400';
  const scoreBg = aiScore === null ? '' : aiScore >= 75 ? 'bg-indigo-500/10 border-indigo-500/30' : aiScore >= 50 ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-red-500/10 border-red-500/30';

  if (!account) return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center glass rounded-3xl p-12">
        <div className="text-6xl mb-4">🗳️</div>
        <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
        <p className="text-gray-400 mb-6">Connect to create DAOs and vote on proposals</p>
        <ConnectButton />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white">
      <nav className="fixed top-0 left-0 right-0 z-[100] glass border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <motion.div className="flex items-center gap-2 cursor-pointer" whileHover={{ scale: 1.05 }} onClick={() => navigate('/')}>
            <span className="text-2xl">🗳️</span>
            <span className="text-lg font-bold text-gradient-dao">MiniDAO</span>
          </motion.div>
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/proposals')} className="text-sm text-gray-300 hover:text-white transition-colors">All Proposals</button>
            <ConnectButton />
          </div>
        </div>
      </nav>

      <div className="pt-24 px-6 pb-12 max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold mb-1">DAO Dashboard</h1>
          <p className="text-gray-400 text-sm font-mono">{account.address.slice(0, 24)}...</p>
        </motion.div>

        <div className="flex flex-wrap gap-2 mb-8 glass rounded-xl p-1 w-fit">
          {(['create-dao', 'create-proposal', 'vote', 'my-daos'] as const).map((tab) => (
            <button key={tab} onClick={() => { setActiveTab(tab); setMessage(''); setAiScore(null); setAiAnalysis(''); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${activeTab === tab ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white' : 'text-gray-400 hover:text-white'}`}>
              {tab.replace(/-/g, ' ')}
            </button>
          ))}
        </div>

        {/* CREATE DAO */}
        {activeTab === 'create-dao' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-8 max-w-2xl">
            <h2 className="text-2xl font-bold mb-6">Create New DAO</h2>
            <div className="flex flex-col gap-4">
              <input className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder="DAO Name *" value={daoData.name} onChange={(e) => setDaoData({ ...daoData, name: e.target.value })} disabled={loading} />
              <textarea className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                placeholder="Description" rows={4} value={daoData.description} onChange={(e) => setDaoData({ ...daoData, description: e.target.value })} disabled={loading} />
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={createDAO} disabled={loading}
                className="py-4 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl font-bold text-lg disabled:opacity-50">
                {loading ? '⏳ Creating...' : '🏛️ Create DAO'}
              </motion.button>
              {message && <div className={`p-3 rounded-xl text-sm text-center ${message.includes('✅') ? 'bg-indigo-500/20 text-indigo-300' : 'bg-red-500/20 text-red-300'}`}>{message}</div>}
            </div>
          </motion.div>
        )}

        {/* CREATE PROPOSAL */}
        {activeTab === 'create-proposal' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-8 max-w-2xl">
            <h2 className="text-2xl font-bold mb-2">Create Proposal</h2>
            <p className="text-sm text-gray-400 mb-6">AI must score your proposal ≥ 75/100 before it can go live.</p>
            <AnimatePresence>
              {aiScore !== null && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`mb-6 p-4 rounded-xl border ${scoreBg}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold">🤖 AI Quality Score</span>
                    <span className={`text-2xl font-bold ${scoreColor}`}>{aiScore}/100</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2 mb-2">
                    <div className={`h-2 rounded-full transition-all duration-700 ${aiScore >= 75 ? 'bg-indigo-500' : aiScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${aiScore}%` }} />
                  </div>
                  <p className={`text-xs ${scoreColor}`}>{aiAnalysis}</p>
                  <p className={`text-xs mt-1 font-semibold ${aiScore >= 75 ? 'text-indigo-400' : 'text-red-400'}`}>
                    {aiScore >= 75 ? '✅ Passed — you can submit this proposal' : '❌ Failed — improve your proposal and retry'}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">DAO Object ID *</label>
                <select className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  value={proposalData.daoId} onChange={(e) => setProposalData({ ...proposalData, daoId: e.target.value })}>
                  <option value="">Select a DAO</option>
                  {allDAOs.map((d: any, i: number) => (
                    <option key={i} value={d.parsedJson?.dao_id}>{d.parsedJson?.name} — {d.parsedJson?.dao_id?.slice(0, 16)}...</option>
                  ))}
                </select>
              </div>
              <input className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder="Proposal Title *" value={proposalData.title} onChange={(e) => { setProposalData({ ...proposalData, title: e.target.value }); setAiScore(null); }} disabled={loading} />
              <textarea className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                placeholder="Detailed description *" rows={4} value={proposalData.description} onChange={(e) => { setProposalData({ ...proposalData, description: e.target.value }); setAiScore(null); }} disabled={loading} />
              <input className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder="Voting duration (epochs)" type="number" value={proposalData.duration} onChange={(e) => setProposalData({ ...proposalData, duration: e.target.value })} disabled={loading} />
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={checkProposalWithAI} disabled={aiChecking || loading}
                className="py-3 glass border border-indigo-500/40 rounded-xl font-semibold text-indigo-400 hover:bg-indigo-500/10 transition-all disabled:opacity-50">
                {aiChecking ? '🤖 Analyzing...' : '🤖 Step 1: Run AI Verification'}
              </motion.button>
              <motion.button whileHover={{ scale: aiScore !== null && aiScore >= 75 ? 1.02 : 1 }} whileTap={{ scale: 0.98 }} onClick={createProposal}
                disabled={loading || aiScore === null || aiScore < 75}
                className="py-4 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl font-bold text-lg disabled:opacity-30 disabled:cursor-not-allowed">
                {loading ? '⏳ Submitting...' : aiScore === null ? '🔒 Step 2: Submit (verify first)' : aiScore < 75 ? `🔒 Blocked — Score ${aiScore}/100 < 75` : '📝 Step 2: Submit Proposal'}
              </motion.button>
              {message && <div className={`p-3 rounded-xl text-sm text-center ${message.includes('✅') ? 'bg-indigo-500/20 text-indigo-300' : 'bg-red-500/20 text-red-300'}`}>{message}</div>}
            </div>
          </motion.div>
        )}

        {/* VOTE */}
        {activeTab === 'vote' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl">
            <h2 className="text-2xl font-bold mb-2">Cast Your Vote</h2>
            <p className="text-sm text-gray-400 mb-6">Select a proposal and vote for or against it.</p>

            {/* Proposal list */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Active Proposals</h3>
              {allProposals.length === 0 ? (
                <div className="glass rounded-xl p-6 text-center text-gray-400 text-sm">No proposals found on-chain yet.</div>
              ) : (
                <div className="grid md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
                  {allProposals.map((e: any, i: number) => {
                    const { forVotes, againstVotes, total } = getVotes(e.parsedJson?.proposal_id);
                    const forPct = total > 0 ? Math.round((forVotes / total) * 100) : 0;
                    const isSelected = selectedProposal === e;
                    return (
                      <motion.div key={i} whileHover={{ scale: 1.02 }} onClick={() => { setSelectedProposal(e); setVoteData({ ...voteData, proposalId: e.parsedJson?.proposal_id, daoId: e.parsedJson?.dao_id }); }}
                        className={`rounded-xl p-4 cursor-pointer border transition-all ${isSelected ? 'bg-indigo-500/15 border-indigo-500/60' : 'glass border-white/10 hover:border-indigo-500/30'}`}>
                        <div className="flex items-start justify-between mb-1">
                          <h4 className="font-semibold text-sm">{e.parsedJson?.title}</h4>
                          {isSelected && <span className="text-indigo-400 text-xs font-bold">✓ Selected</span>}
                        </div>
                        <p className="text-xs text-gray-500 font-mono break-all mb-2">{e.parsedJson?.proposer}</p>
                        <div className="flex gap-3 text-xs mb-1">
                          <span className="text-green-400">✅ {forVotes} For</span>
                          <span className="text-red-400">❌ {againstVotes} Against</span>
                          <span className="text-gray-400">{total} total</span>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-1.5">
                          <div className="bg-gradient-to-r from-green-500 to-emerald-500 h-1.5 rounded-full" style={{ width: `${forPct}%` }} />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{forPct}% in favor</p>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Vote form */}
            <div className="glass rounded-2xl p-6">
              {selectedProposal && (
                <div className="mb-4 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-sm">
                  <span className="text-indigo-400 font-semibold">Voting on: </span>
                  <span className="text-white">{selectedProposal.parsedJson?.title}</span>
                </div>
              )}
              <div className="flex gap-3 mb-4">
                <button onClick={() => setVoteData({ ...voteData, voteFor: true })}
                  className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all ${voteData.voteFor ? 'bg-green-500/20 border border-green-500/60 text-green-400' : 'glass text-gray-400 hover:text-white'}`}>
                  ✅ Vote For
                </button>
                <button onClick={() => setVoteData({ ...voteData, voteFor: false })}
                  className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all ${!voteData.voteFor ? 'bg-red-500/20 border border-red-500/60 text-red-400' : 'glass text-gray-400 hover:text-white'}`}>
                  ❌ Vote Against
                </button>
              </div>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={castVote} disabled={loading || !selectedProposal}
                className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl font-bold text-lg disabled:opacity-30 disabled:cursor-not-allowed">
                {loading ? '⏳ Casting Vote...' : !selectedProposal ? '👆 Select a proposal above' : `🗳️ Cast Vote — ${voteData.voteFor ? 'FOR' : 'AGAINST'}`}
              </motion.button>
              {message && <div className={`mt-3 p-3 rounded-xl text-sm text-center ${message.includes('✅') ? 'bg-indigo-500/20 text-indigo-300' : 'bg-red-500/20 text-red-300'}`}>{message}</div>}
            </div>
          </motion.div>
        )}

        {/* MY DAOS */}
        {activeTab === 'my-daos' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="text-2xl font-bold mb-6">My DAOs</h2>
            {myDAOs.length === 0 ? (
              <div className="glass rounded-2xl p-12 text-center">
                <div className="text-5xl mb-4">🏛️</div>
                <p className="text-gray-400 mb-4">No DAOs created yet</p>
                <button onClick={() => setActiveTab('create-dao')} className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl font-semibold">Create Your First DAO</button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-5">
                {myDAOs.map((e: any, i: number) => {
                  const daoProposals = allProposals.filter((p: any) => p.parsedJson?.dao_id === e.parsedJson?.dao_id);
                  return (
                    <motion.div key={i} whileHover={{ scale: 1.02 }} className="glass rounded-2xl p-6">
                      <h3 className="text-lg font-bold mb-1">{e.parsedJson?.name}</h3>
                      <p className="text-xs text-gray-500 font-mono break-all mb-3">{e.parsedJson?.dao_id}</p>
                      <div className="flex gap-4 text-sm text-gray-400">
                        <span>📝 {daoProposals.length} proposals</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
