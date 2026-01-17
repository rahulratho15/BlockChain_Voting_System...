// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title BiometricVotingSystem
 * @dev A decentralized blockchain-based biometric voting system with no admin privileges
 */
contract BiometricVotingSystem {
    // Election status enum
    enum ElectionState { Registration, Voting, Ended }

    // Current election state
    ElectionState public electionState;

    // Counter for auto-increment IDs
    uint256 private candidateIdCounter = 1;

    // Structs
    struct Candidate {
        uint256 id;
        string name;
        uint256 voteCount;
        bool exists;
    }

    struct Voter {
        uint256 id;
        string name;
        string faceEncoding;
        string fingerEncoding;
        bool faceDisabled;
        bool fingerDisabled;
        bool hasVoted;
        bool exists;
    }

    // Winner information
    struct Winner {
        uint256 id;
        string name;
        string partyName;
    }
    Winner[] private winners;

    // State variables
    mapping(uint256 => Candidate) private candidates;
    mapping(uint256 => Voter) private voters;
    
    uint256[] private candidateIds;
    uint256[] private voterIds;

    // Constructor
    constructor() {
        electionState = ElectionState.Registration;
    }

    // Modifiers
    modifier duringRegistration() {
        require(electionState == ElectionState.Registration, "Registration closed");
        _;
    }

    modifier duringVoting() {
        require(electionState == ElectionState.Voting, "Voting not allowed now");
        _;
    }

    modifier electionEnded() {
        require(electionState == ElectionState.Ended, "Election not ended");
        _;
    }

    // Core Functions
    function castVote(uint256 voterID, uint256 candidateID) public duringVoting {
        require(voters[voterID].exists, "Voter not registered");
        require(!voters[voterID].hasVoted, "Already voted");
        require(candidates[candidateID].exists, "Invalid candidate");

        voters[voterID].hasVoted = true;
        candidates[candidateID].voteCount++;
    }

    function startElection() public {
        require(electionState == ElectionState.Registration, "Not in registration phase");
        require(candidateIds.length > 0, "No candidates registered");
        electionState = ElectionState.Voting;
    }

    function endElection() public {
        require(electionState == ElectionState.Voting, "Voting not in progress");
        electionState = ElectionState.Ended;
        
        uint256 highestVoteCount = 0;
        for (uint256 i = 0; i < candidateIds.length; i++) {
            uint256 candidateID = candidateIds[i];
            if (candidates[candidateID].voteCount > highestVoteCount) {
                highestVoteCount = candidates[candidateID].voteCount;
            }
        }

        delete winners;

        for (uint256 i = 0; i < candidateIds.length; i++) {
            uint256 candidateID = candidateIds[i];
            if (candidates[candidateID].voteCount == highestVoteCount) {
                winners.push(Winner({
                    id: candidateID,
                    name: candidates[candidateID].name,
                    partyName: ""
                }));
            }
        }
    }

    function newElection() public {
        require(electionState == ElectionState.Ended, "Current election not ended");
        
        // Clear candidates
        for (uint256 i = 0; i < candidateIds.length; i++) {
            delete candidates[candidateIds[i]];
        }
        delete candidateIds;

        // Clear voters' voting status but keep their registration
        for (uint256 i = 0; i < voterIds.length; i++) {
            uint256 voterID = voterIds[i];
            voters[voterID].hasVoted = false;
        }
        
        // Clear winners
        delete winners;
        
        // Reset election state
        electionState = ElectionState.Registration;
        candidateIdCounter = 1;
    }

    function registerCandidate(string memory name) public duringRegistration returns (uint256) {
        uint256 candidateID = candidateIdCounter++;

        candidates[candidateID] = Candidate({
            id: candidateID,
            name: name,
            voteCount: 0,
            exists: true
        });

        candidateIds.push(candidateID);
        return candidateID;
    }

    function removeCandidate(uint256 candidateID) public duringRegistration {
        require(candidates[candidateID].exists, "Invalid candidate");
        
        delete candidates[candidateID];
        
        for (uint256 i = 0; i < candidateIds.length; i++) {
            if (candidateIds[i] == candidateID) {
                candidateIds[i] = candidateIds[candidateIds.length - 1];
                candidateIds.pop();
                break;
            }
        }
    }

    function registerVoter(
        string memory name, 
        uint256 voterID, 
        string memory faceEncoding, 
        string memory fingerEncoding, 
        bool faceDisabled, 
        bool fingerDisabled
    ) public duringRegistration {
        require(!(faceDisabled && fingerDisabled), "Need at least one biometric");
        require(!voters[voterID].exists, "Voter already registered");
        
        voters[voterID] = Voter({
            id: voterID,
            name: name,
            faceEncoding: faceDisabled ? "" : faceEncoding,
            fingerEncoding: fingerDisabled ? "" : fingerEncoding,
            faceDisabled: faceDisabled,
            fingerDisabled: fingerDisabled,
            hasVoted: false,
            exists: true
        });
        
        voterIds.push(voterID);
    }

    function removeVoter(uint256 voterID) public duringRegistration {
        require(voters[voterID].exists, "Voter not found");
        
        delete voters[voterID];
        
        for (uint256 i = 0; i < voterIds.length; i++) {
            if (voterIds[i] == voterID) {
                voterIds[i] = voterIds[voterIds.length - 1];
                voterIds.pop();
                break;
            }
        }
    }

    // Getter Functions
    struct VoterInfo {
        uint256 id;
        string name;
        string faceEncoding;
        string fingerEncoding;
        bool faceDisabled;
        bool fingerDisabled;
        bool hasVoted;
    }

    function getAllVoters() public view returns (VoterInfo[] memory) {
        VoterInfo[] memory result = new VoterInfo[](voterIds.length);
        
        for (uint256 i = 0; i < voterIds.length; i++) {
            uint256 voterID = voterIds[i];
            result[i] = VoterInfo({
                id: voters[voterID].id,
                name: voters[voterID].name,
                faceEncoding: voters[voterID].faceEncoding,
                fingerEncoding: voters[voterID].fingerEncoding,
                faceDisabled: voters[voterID].faceDisabled,
                fingerDisabled: voters[voterID].fingerDisabled,
                hasVoted: voters[voterID].hasVoted
            });
        }
        
        return result;
    }

    struct CandidateInfo {
        uint256 id;
        string name;
        uint256 voteCount;
    }

    function getAllCandidates() public view returns (CandidateInfo[] memory) {
        CandidateInfo[] memory result = new CandidateInfo[](candidateIds.length);
        
        for (uint256 i = 0; i < candidateIds.length; i++) {
            uint256 candidateID = candidateIds[i];
            result[i] = CandidateInfo({
                id: candidates[candidateID].id,
                name: candidates[candidateID].name,
                voteCount: candidates[candidateID].voteCount
            });
        }
        
        return result;
    }

    function getTotalVoterCount() public view returns (uint256) {
        return voterIds.length;
    }

    function getTotalCandidateCount() public view returns (uint256) {
        return candidateIds.length;
    }

    function getElectionStatus() public view returns (string memory) {
        if (electionState == ElectionState.Registration) return "Registration Phase";
        if (electionState == ElectionState.Voting) return "Voting Phase";
        return "Election Ended";
    }

    function getVoteCounts() public view returns (CandidateInfo[] memory) {
        return getAllCandidates();
    }

    function getWinner() public view electionEnded returns (Winner[] memory) {
        require(winners.length > 0, "No winners yet");
        return winners;
    }

    struct VotingStatus {
        uint256 voterID;
        string name;
        bool hasVoted;
    }

    function getVoterVotingStatus() public view returns (VotingStatus[] memory) {
        VotingStatus[] memory result = new VotingStatus[](voterIds.length);
        
        for (uint256 i = 0; i < voterIds.length; i++) {
            uint256 voterID = voterIds[i];
            result[i] = VotingStatus({
                voterID: voterID,
                name: voters[voterID].name,
                hasVoted: voters[voterID].hasVoted
            });
        }
        
        return result;
    }
}