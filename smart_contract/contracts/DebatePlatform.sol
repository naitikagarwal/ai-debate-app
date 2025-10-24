// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "hardhat/console.sol";

/**
 * @title DebatePlatform
 * @dev A contract to manage decentralized debates, staking, and AI-judged results.
 * This contract fulfills the hackathon requirement for a decentralized,
 * auditable, and immutable record of debate outcomes[cite: 27].
 */
contract DebatePlatform {
    // The wallet address of the AI Judge.
    // This address is the only one authorized to write results[cite: 26].
    address public immutable aiJudgeAddress;

    // A fee (e.g., 0.001 ETH) for viewers to pay to see results.
    uint256 public viewFee;

    // The percentage of the total stake the AI judge keeps (e.g., 5 for 5%).
    uint256 public aiFeePercentage;

    // A counter to assign a unique ID to each debate[cite: 25].
    uint256 public nextDebateId;

    // Enum to track the state of a debate.
    enum DebateState { Created, Staked, Concluded }

    // A struct to hold all data for a single debate.
    struct Debate {
        uint256 id;
        address participantA;
        address participantB;
        uint256 stakeA;
        uint256 stakeB;
        DebateState state;
        address winner;
        string scores;
        string reasoning;
    }

    // Mapping from a debate ID to the Debate struct.
    mapping(uint256 => Debate) public debates;

    // Mapping to track which users have paid to view which debate.
    // (debateId => userAddress => hasPaid)
    mapping(uint256 => mapping(address => bool)) public hasPaidToView;

    // --- Events ---
    event DebateCreated(uint256 indexed id, address indexed participantA, address indexed participantB, uint256 stake);
    event DebateStaked(uint256 indexed id, uint256 totalStake);
    event DebateConcluded(uint256 indexed id, address indexed winner, string scores, uint256 winnerPayout, uint256 aiFee);
    event ResultViewed(uint256 indexed id, address indexed viewer);

    /**
     * @dev Modifier to restrict a function to only be callable by the AI Judge[cite: 26].
     */
    modifier onlyAI() {
        require(msg.sender == aiJudgeAddress, "Only the AI Judge can perform this action");
        _;
    }

    /**
     * @dev Sets the AI's wallet, view fee, and AI's stake percentage on deployment.
     */
    constructor(uint256 _viewFee, uint256 _aiFeePercentage) {
        aiJudgeAddress = msg.sender; // The deployer is the AI Judge
        viewFee = _viewFee;
        aiFeePercentage = _aiFeePercentage;
    }

    /**
     * @dev Participant A creates a new debate and stakes their Ether.
     */
    function createDebate(address _participantB) external payable {
        require(msg.value > 0, "Stake must be greater than zero");
        require(_participantB != address(0) && _participantB != msg.sender, "Invalid opponent");

        uint256 debateId = nextDebateId;
        debates[debateId] = Debate({
            id: debateId,
            participantA: msg.sender,
            participantB: _participantB,
            stakeA: msg.value,
            stakeB: 0,
            state: DebateState.Created,
            winner: address(0),
            scores: "",
            reasoning: ""
        });

        nextDebateId++;
        emit DebateCreated(debateId, msg.sender, _participantB, msg.value);
    }

    /**
     * @dev Participant B joins an existing debate and matches Participant A's stake.
     */
    function joinDebate(uint256 _debateId) external payable {
        Debate storage debate = debates[_debateId];
        
        require(debate.participantB == msg.sender, "You are not the opponent for this debate");
        require(debate.state == DebateState.Created, "Debate is not awaiting opponent");
        require(msg.value == debate.stakeA, "Stake must match Participant A's stake");

        debate.stakeB = msg.value;
        debate.state = DebateState.Staked;
        
        emit DebateStaked(_debateId, debate.stakeA + debate.stakeB);
    }

    /**
     * @dev The AI Judge's function to write the final debate record[cite: 24].
     * This function is callable ONLY by the AI[cite: 26].
     * It automatically calculates and distributes the winner's payout and the AI's fee.
     */
    function writeDebateRecord(
        uint256 _debateId,
        address _winner,
        string memory _scores,
        string memory _reasoning
    ) external onlyAI {
        Debate storage debate = debates[_debateId];
        require(debate.state == DebateState.Staked, "Debate is not ready for conclusion");
        require(_winner == debate.participantA || _winner == debate.participantB, "Winner must be one of the participants");

        // Update debate results
        debate.state = DebateState.Concluded;
        debate.winner = _winner;
        debate.scores = _scores;
        debate.reasoning = _reasoning;

        // Calculate and distribute funds
        uint256 totalStake = debate.stakeA + debate.stakeB;
        uint256 aiFee = (totalStake * aiFeePercentage) / 100;
        uint256 winnerPayout = totalStake - aiFee;

        // Pay the AI's fee
        (bool success1, ) = aiJudgeAddress.call{value: aiFee}("");
        require(success1, "AI fee transfer failed");

        // Pay the winner
        (bool success2, ) = _winner.call{value: winnerPayout}("");
        require(success2, "Winner payout failed");

        emit DebateConcluded(_debateId, _winner, _scores, winnerPayout, aiFee);
    }

    /**
     * @dev Allows a viewer to pay the 'viewFee' to unlock the results of a debate.
     * The fee is transferred to the AI Judge to cover gas costs.
     */
    function payToView(uint256 _debateId) external payable {
        require(debates[_debateId].state == DebateState.Concluded, "Debate is not yet concluded");
        require(msg.value == viewFee, "Incorrect view fee");

        hasPaidToView[_debateId][msg.sender] = true;
        
        // Transfer the fee to the AI Judge
        (bool success, ) = aiJudgeAddress.call{value: msg.value}("");
        require(success, "Fee transfer to AI failed");

        emit ResultViewed(_debateId, msg.sender);
    }

    /**
     * @dev Allows anyone to read the debate record, *if* they have paid the view fee.
     * This ensures the results are publicly auditable [cite: 27] but not necessarily free.
     */
    function readDebateRecord(uint256 _debateId) external view returns (
        address winner,
        string memory scores,
        string memory reasoning
    ) {
        require(debates[_debateId].state == DebateState.Concluded, "Debate is not yet concluded");
        
        // The AI Judge and participants can always view for free.
        bool isParticipant = (msg.sender == debates[_debateId].participantA || msg.sender == debates[_debateId].participantB);
        bool isAI = (msg.sender == aiJudgeAddress);
        
        require(hasPaidToView[_debateId][msg.sender] || isParticipant || isAI, "You must pay the view fee to see results");
        
        Debate storage debate = debates[_debateId];
        return (debate.winner, debate.scores, debate.reasoning);
    }

    /**
     * @dev A free, public function to get the basic, non-sensitive details of a debate.
     */
    function getDebateDetails(uint256 _debateId) external view returns (
        uint256 id,
        address participantA,
        address participantB,
        uint256 totalStake,
        DebateState state,
        address winner
    ) {
        Debate storage debate = debates[_debateId];
        return (
            debate.id,
            debate.participantA,
            debate.participantB,
            debate.stakeA + debate.stakeB,
            debate.state,
            debate.winner
        );
    }
}