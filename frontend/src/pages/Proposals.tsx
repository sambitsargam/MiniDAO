import { useNavigate } from 'react-router-dom';
import { ConnectButton, useCurrentAccount, useSuiClientQuery } from '@onelabs/dapp-kit';
import { motion } from 'framer-motion';

const PACKAGE_ID = import.meta.env.VITE_PACKAGE_ID;

function Proposals() {
  const navigate = useNavigate();
  const account = useCurrentAccount();

  const { data: proposalEvents, isLoading: loadingProposals } = useSuiClientQuery('queryEvents', {
    query: { MoveEventType: `${PACKAGE_ID}::governance::ProposalCreated` }, limit: 100,
  });
  const { data: voteEvents, isLoading: loadingVotes } = useSuiClientQuery('queryEvents', {
    query: { MoveEventType: `${PACKAGE_ID}::governance::VoteCast` }, limit: 500,
  });

  const proposals = proposalEvents?.data || [];
  const votes = voteEvents?.data || [];
  const isLoading = loadingProposals || loadingVotes;

  const getVotes = (proposalId: string) => {
    const pVotes = votes.filter((v: any) => v.parsedJson?.proposal_id === proposalId);
    const forVotes = pVotes.filter((v: any) => v.parsedJson?.vote_for === true).length;
    const againstVotes = pVotes.filter((v: any) => v.parsedJson?.vote_for === false).length;
    const total = pVotes.length;
    const forPct = total > 0 ? Math.round((forVotes / total) * 100) : 0;
    return { forVotes, againstVotes, total, forPct };
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <nav className="fixed top-0 left-0 right-0 z-[100] glass border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <motion.div className="flex items-center gap-2 cursor-pointer" whileHover={{ scale: 1.05 }} onClick={() => navigate('/')}>
            <span className="text-2xl">🗳️</span>
            <span className="text-lg font-bold text-gradient-dao">MiniDAO</span>
          </motion.div>
          <div className="flex items-center gap-4">
            {account && <button onClick={() => navigate('/app')} className="text-sm text-gray-300 hover:text-white transition-colors">Dashboard</button>}
            <ConnectButton />
          </div>
        </div>
      </nav>

      <div className="pt-24 px-6 pb-12 max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-4xl font-bold mb-2">All <span className="text-gradient-dao">Proposals</span></h1>
          <p className="text-gray-400">Live on-chain governance proposals with real vote counts</p>
        </motion.div>

        {isLoading ? (
          <div className="text-center py-20 text-gray-400">Loading proposals...</div>
        ) : proposals.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <div className="text-5xl mb-4">📝</div>
            <p className="text-gray-400 mb-4">No proposals yet. Create the first one!</p>
            <button onClick={() => navigate('/app')} className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl font-semibold">Create Proposal</button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-5">
            {proposals.map((e: any, i: number) => {
              const { forVotes, againstVotes, total, forPct } = getVotes(e.parsedJson?.proposal_id);
              return (
                <motion.div key={i} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  whileHover={{ scale: 1.02, y: -3 }} className="glass rounded-2xl p-6">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-bold">{e.parsedJson?.title}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full ${forPct >= 50 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {forPct >= 50 ? '✅ Passing' : '❌ Failing'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 font-mono break-all mb-4">Proposer: {e.parsedJson?.proposer}</p>

                  {/* Vote bar */}
                  <div className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-green-400 font-semibold">✅ {forVotes} For ({forPct}%)</span>
                      <span className="text-red-400 font-semibold">❌ {againstVotes} Against ({100 - forPct}%)</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                      <div className="h-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all duration-700" style={{ width: `${forPct}%` }} />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{total} total votes</p>
                  </div>

                  <button onClick={() => navigate('/app')}
                    className="w-full py-2 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 rounded-lg text-sm font-medium hover:from-indigo-500/30 hover:to-purple-500/30 transition-all">
                    Vote Now
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default Proposals;
