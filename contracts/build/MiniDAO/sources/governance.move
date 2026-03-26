module minidao::governance {
    use one::object::UID;
    use one::tx_context::TxContext;
    use one::transfer;
    use one::event;
    use std::string::String;
    use one::table::{Self, Table};

    // Error codes
    const EUnauthorized: u64 = 1;
    const EProposalNotActive: u64 = 2;
    const EAlreadyVoted: u64 = 3;
    const EVotingEnded: u64 = 4;

    // DAO struct
    public struct DAO has key {
        id: UID,
        name: String,
        description: String,
        admin: address,
        total_proposals: u64,
        total_members: u64,
        members: Table<address, bool>,
        created_at: u64,
    }

    // Proposal struct
    public struct Proposal has key {
        id: UID,
        dao_id: address,
        proposer: address,
        title: String,
        description: String,
        ai_summary: String,
        votes_for: u64,
        votes_against: u64,
        voters: Table<address, bool>,
        active: bool,
        created_at: u64,
        end_time: u64,
    }

    // Events
    public struct DAOCreated has copy, drop {
        dao_id: address,
        name: String,
        admin: address,
    }

    public struct ProposalCreated has copy, drop {
        proposal_id: address,
        dao_id: address,
        proposer: address,
        title: String,
    }

    public struct VoteCast has copy, drop {
        proposal_id: address,
        voter: address,
        vote_for: bool,
    }

    // Create DAO
    public entry fun create_dao(
        name: String,
        description: String,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        
        let mut dao = DAO {
            id: object::new(ctx),
            name,
            description,
            admin: sender,
            total_proposals: 0,
            total_members: 1,
            members: table::new(ctx),
            created_at: tx_context::epoch(ctx),
        };

        let dao_addr = object::uid_to_address(&dao.id);
        table::add(&mut dao.members, sender, true);

        event::emit(DAOCreated {
            dao_id: dao_addr,
            name: dao.name,
            admin: sender,
        });

        transfer::share_object(dao);
    }

    // Create proposal
    public entry fun create_proposal(
        dao: &mut DAO,
        title: String,
        description: String,
        ai_summary: String,
        duration: u64,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        assert!(table::contains(&dao.members, sender), EUnauthorized);

        let current_epoch = tx_context::epoch(ctx);
        
        let proposal = Proposal {
            id: object::new(ctx),
            dao_id: object::uid_to_address(&dao.id),
            proposer: sender,
            title,
            description,
            ai_summary,
            votes_for: 0,
            votes_against: 0,
            voters: table::new(ctx),
            active: true,
            created_at: current_epoch,
            end_time: current_epoch + duration,
        };

        let proposal_addr = object::uid_to_address(&proposal.id);
        dao.total_proposals = dao.total_proposals + 1;

        event::emit(ProposalCreated {
            proposal_id: proposal_addr,
            dao_id: object::uid_to_address(&dao.id),
            proposer: sender,
            title: proposal.title,
        });

        transfer::share_object(proposal);
    }

    // Cast vote
    public entry fun vote(
        dao: &DAO,
        proposal: &mut Proposal,
        vote_for: bool,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        assert!(table::contains(&dao.members, sender), EUnauthorized);
        assert!(proposal.active, EProposalNotActive);
        assert!(tx_context::epoch(ctx) <= proposal.end_time, EVotingEnded);
        assert!(!table::contains(&proposal.voters, sender), EAlreadyVoted);

        if (vote_for) {
            proposal.votes_for = proposal.votes_for + 1;
        } else {
            proposal.votes_against = proposal.votes_against + 1;
        };

        table::add(&mut proposal.voters, sender, true);

        event::emit(VoteCast {
            proposal_id: object::uid_to_address(&proposal.id),
            voter: sender,
            vote_for,
        });
    }

    // Join DAO
    public entry fun join_dao(
        dao: &mut DAO,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        if (!table::contains(&dao.members, sender)) {
            table::add(&mut dao.members, sender, true);
            dao.total_members = dao.total_members + 1;
        };
    }

    // View functions
    public fun get_dao_info(dao: &DAO): (String, u64, u64) {
        (dao.name, dao.total_proposals, dao.total_members)
    }

    public fun get_proposal_votes(proposal: &Proposal): (u64, u64) {
        (proposal.votes_for, proposal.votes_against)
    }
}
