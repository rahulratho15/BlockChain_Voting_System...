"use client";

import { useState, useEffect, useRef } from "react";
import {
    createThirdwebClient,
    getContract,
    prepareContractCall,
    readContract
} from "thirdweb";
import { ConnectButton, useActiveAccount, useSendTransaction } from "thirdweb/react";
import { defineChain } from "thirdweb/chains";
import axios from "axios";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);
import 'bootstrap/dist/css/bootstrap.min.css';

// Election states enum
const ElectionState = {
    NOT_STARTED: 0,
    ONGOING: 1,
    ENDED: 2
};

// Translated election state messages
const ElectionStateMessages: { [key: number]: string } = {
    0: "Not Started",
    1: "Election Ongoing",
    2: "Election Ended"
};

const Admin = () => {
    // Initialize ThirdWeb client
    const client = createThirdwebClient({
        clientId: "f6ba07193b19ed9857c4871a303bb536",
    });

    const contract = getContract({
        client,
        chain: defineChain(11155111),
        address: "0x088013a8169938F5440B1148434035176f472A8E",
    });
    const activeAccount = useActiveAccount();
    const { mutate: sendTransaction, isPending } = useSendTransaction();

    // Election state data
    const [electionState, setElectionState] = useState(0);
    const [electionStatus, setElectionStatus] = useState("Not Started");
    const [totalVoterCount, setTotalVoterCount] = useState(0);
    const [totalCandidateCount, setTotalCandidateCount] = useState(0);
    const [candidates, setCandidates] = useState<any[]>([]);
    const [voters, setVoters] = useState<any[]>([]);
    const [winners, setWinners] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [message, setMessage] = useState("");
    const [messageType, setMessageType] = useState("info");

    // Form data
    const [newCandidateName, setNewCandidateName] = useState("");
    const [newPartyName, setNewPartyName] = useState("");
    const [selectedVoterToRemove, setSelectedVoterToRemove] = useState("");
    const [selectedCandidateToRemove, setSelectedCandidateToRemove] = useState("");

    // UI state
    const [activeTab, setActiveTab] = useState("dashboard");
    const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState<(() => Promise<void>) | null>(null);
    const [confirmMessage, setConfirmMessage] = useState("");

    // Refs
    const votingChartRef = useRef<HTMLCanvasElement>(null);
    const votingChartInstance = useRef<Chart | null>(null);

    // Initial data load
    useEffect(() => {
        if (activeAccount?.address) {
            refreshDashboardData();
        }
    }, [activeAccount]);

    // Update connection status when activeAccount changes
    useEffect(() => {
        if (activeAccount?.address) {
            console.log("Connected address:", activeAccount.address);
        }
    }, [activeAccount]);

    // Refresh all dashboard data
    const refreshDashboardData = async () => {
        if (!contract || !activeAccount) return;

        setIsLoading(true);
        setMessage("Fetching latest blockchain data...");
        setMessageType("info");

        try {
            // Fetch election state
            await fetchElectionState();

            // Fetch counts
            await fetchVoterCount();
            await fetchCandidateCount();

            // Fetch detailed data
            await fetchCandidates();
            await fetchVoters();

            // If election ended, fetch winners
            if (electionState === ElectionState.ENDED) {
                await fetchWinners();
            }

            setMessage("Data refreshed successfully");
            setMessageType("success");

            // Update voting chart if in ongoing or ended state
            if (electionState === ElectionState.ONGOING || electionState === ElectionState.ENDED) {
                updateVotingChart();
            }
        } catch (error: any) {
            console.error("Error refreshing dashboard data:", error);
            setMessage(`Error: ${error.message}`);
            setMessageType("error");
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch election state from contract
    const fetchElectionState = async () => {
        try {
            const state = await readContract({
                contract,
                method: "function electionState() view returns (uint8)",
                params: [],
            });

            setElectionState(Number(state));

            const statusText = await readContract({
                contract,
                method: "function getElectionStatus() view returns (string)",
                params: [],
            });

            setElectionStatus(statusText || ElectionStateMessages[Number(state)]);

            return Number(state);
        } catch (error) {
            console.error("Error fetching election state:", error);
            throw error;
        }
    };

    // Fetch total voter count from contract
    const fetchVoterCount = async () => {
        try {
            const count = await readContract({
                contract,
                method: "function getTotalVoterCount() view returns (uint256)",
                params: [],
            });

            setTotalVoterCount(Number(count));
            return Number(count);
        } catch (error) {
            console.error("Error fetching voter count:", error);
            throw error;
        }
    };

    // Fetch total candidate count from contract
    const fetchCandidateCount = async () => {
        try {
            const count = await readContract({
                contract,
                method: "function getTotalCandidateCount() view returns (uint256)",
                params: [],
            });

            setTotalCandidateCount(Number(count));
            return Number(count);
        } catch (error) {
            console.error("Error fetching candidate count:", error);
            throw error;
        }
    };

    // Fetch candidates with vote counts
    const fetchCandidates = async () => {
        try {
            const candidateData = await readContract({
                contract,
                method: "function getVoteCounts() view returns ((uint256 id, string name, uint256 voteCount)[])",
                params: [],
            });

            setCandidates(candidateData ? [...candidateData] : []);
            return candidateData;
        } catch (error) {
            console.error("Error fetching candidates:", error);
            throw error;
        }
    };

    // Fetch voters with voting status
    const fetchVoters = async () => {
        try {
            const voterData = await readContract({
                contract,
                method: "function getVoterVotingStatus() view returns ((uint256 voterID, string name, bool hasVoted)[])",
                params: [],
            });

            setVoters(voterData ? [...voterData] : []);
            return voterData;
        } catch (error) {
            console.error("Error fetching voters:", error);
            throw error;
        }
    };

    // Fetch election winners
    const fetchWinners = async () => {
        try {
            const winnerData = await readContract({
                contract,
                method: "function getWinner() view returns ((uint256 id, string name, string partyName)[])",
                params: [],
            });

            setWinners(winnerData ? [...winnerData] : []);
            return winnerData;
        } catch (error) {
            console.error("Error fetching winners:", error);
            throw error;
        }
    };

    // Update the voting chart with latest candidate data
    const updateVotingChart = () => {
        if (!votingChartRef.current) return;

        // Destroy existing chart if it exists
        if (votingChartInstance.current) {
            votingChartInstance.current.destroy();
        }

        const ctx = votingChartRef.current.getContext('2d');

        // Format the data for the chart
        const labels = candidates.map(c => c.name);
        const data = candidates.map(c => Number(c.voteCount));

        // Create a new chart
        votingChartInstance.current = new Chart(ctx!, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Votes',
                    data: data,
                    backgroundColor: 'rgba(75, 192, 192, 0.6)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Number of Votes'
                        },
                        ticks: {
                            precision: 0
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Candidates'
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Election Results',
                        font: {
                            size: 16
                        }
                    },
                    legend: {
                        display: false
                    }
                },
                responsive: true,
                maintainAspectRatio: false
            }
        });
    };

    // Handle starting the election
    const handleStartElection = async () => {
        if (!contract || !activeAccount) {
            setMessage("Please connect your wallet first");
            setMessageType("error");
            return;
        }

        try {
            setIsLoading(true);
            setMessage("Starting election process...");
            setMessageType("info");

            const transaction = prepareContractCall({
                contract,
                method: "function startElection()",
                params: [],
            });

            sendTransaction(transaction);

            setMessage("Election start transaction submitted. Please wait for confirmation.");
            setMessageType("success");

            setTimeout(refreshDashboardData, 5000);
        } catch (error: any) {
            console.error("Error starting election:", error);
            setMessage(`Error starting election: ${error.message}`);
            setMessageType("error");
        } finally {
            setIsLoading(false);
        }
    };

    // Handle ending the election
    const handleEndElection = async () => {
        if (!contract || !activeAccount) {
            setMessage("Please connect your wallet first");
            setMessageType("error");
            return;
        }

        try {
            setIsLoading(true);
            setMessage("Ending election process...");
            setMessageType("info");

            const transaction = prepareContractCall({
                contract,
                method: "function endElection()",
                params: [],
            });

            sendTransaction(transaction);

            setMessage("Election end transaction submitted. Please wait for confirmation.");
            setMessageType("success");

            setTimeout(refreshDashboardData, 5000);
        } catch (error: any) {
            console.error("Error ending election:", error);
            setMessage(`Error ending election: ${error.message}`);
            setMessageType("error");
        } finally {
            setIsLoading(false);
        }
    };

    // Handle creating a new election (resets all data)
    const handleNewElection = async () => {
        if (!contract || !activeAccount) {
            setMessage("Please connect your wallet first");
            setMessageType("error");
            return;
        }

        try {
            setIsLoading(true);
            setMessage("Creating new election...");
            setMessageType("info");

            const transaction = prepareContractCall({
                contract,
                method: "function newElection()",
                params: [],
            });

            sendTransaction(transaction);

            setMessage("New election setup transaction submitted. Please wait for confirmation.");
            setMessageType("success");

            setWinners([]);

            setTimeout(refreshDashboardData, 5000);
        } catch (error: any) {
            console.error("Error creating new election:", error);
            setMessage(`Error creating new election: ${error.message}`);
            setMessageType("error");
        } finally {
            setIsLoading(false);
        }
    };

    // Handle candidate registration
    const handleRegisterCandidate = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!contract || !activeAccount) {
            setMessage("Please connect your wallet first");
            setMessageType("error");
            return;
        }

        if (!newCandidateName.trim()) {
            setMessage("Please enter a candidate name");
            setMessageType("error");
            return;
        }

        try {
            setIsLoading(true);
            setMessage(`Registering candidate: ${newCandidateName}...`);
            setMessageType("info");

            const transaction = prepareContractCall({
                contract,
                method: "function registerCandidate(string name) returns (uint256)",
                params: [newCandidateName],
            });

            sendTransaction(transaction);

            setMessage(`Candidate registration submitted for: ${newCandidateName}`);
            setMessageType("success");

            setNewCandidateName("");
            setNewPartyName("");

            setTimeout(refreshDashboardData, 5000);
        } catch (error: any) {
            console.error("Error registering candidate:", error);
            setMessage(`Error registering candidate: ${error.message}`);
            setMessageType("error");
        } finally {
            setIsLoading(false);
        }
    };

    // Handle removing a candidate
    const handleRemoveCandidate = async (candidateID: any) => {
        if (!contract || !activeAccount) {
            setMessage("Please connect your wallet first");
            setMessageType("error");
            return;
        }

        try {
            setIsLoading(true);
            setMessage(`Removing candidate ID: ${candidateID}...`);
            setMessageType("info");

            const transaction = prepareContractCall({
                contract,
                method: "function removeCandidate(uint256 candidateID)",
                params: [candidateID],
            });

            sendTransaction(transaction);

            setMessage(`Candidate removal submitted for ID: ${candidateID}`);
            setMessageType("success");

            setTimeout(refreshDashboardData, 5000);
        } catch (error: any) {
            console.error("Error removing candidate:", error);
            setMessage(`Error removing candidate: ${error.message}`);
            setMessageType("error");
        } finally {
            setIsLoading(false);
        }
    };

    // Handle removing a voter
    const handleRemoveVoter = async (voterID: any) => {
        if (!contract || !activeAccount) {
            setMessage("Please connect your wallet first");
            setMessageType("error");
            return;
        }

        try {
            setIsLoading(true);
            setMessage(`Removing voter ID: ${voterID}...`);
            setMessageType("info");

            const transaction = prepareContractCall({
                contract,
                method: "function removeVoter(uint256 voterID)",
                params: [voterID],
            });

            await sendTransaction(transaction);

            try {
                const response = await fetch(`http://localhost:5000/api/fingerprint/delete/${voterID}`, {
                    method: 'DELETE'
                });

                const result = await response.json();

                if (result.success) {
                    setMessage(`Voter ID ${voterID} removed from both blockchain and fingerprint system`);
                    setMessageType("success");
                } else {
                    setMessage(`Blockchain removal succeeded but fingerprint removal failed: ${result.message}`);
                    setMessageType("warning");
                }
            } catch (apiError: any) {
                console.error("Error removing from fingerprint sensor:", apiError);
                setMessage(`Blockchain removal succeeded but fingerprint removal failed: ${apiError.message}`);
                setMessageType("warning");
            }

            setTimeout(refreshDashboardData, 5000);
        } catch (error: any) {
            console.error("Error removing voter:", error);
            setMessage(`Error removing voter: ${error.message}`);
            setMessageType("error");
        } finally {
            setIsLoading(false);
        }
    };

    // Handle opening confirm dialog
    const openConfirmDialog = (action: () => Promise<void>, message: string) => {
        setConfirmAction(() => action);
        setConfirmMessage(message);
        setIsConfirmDialogOpen(true);
    };

    // Handle confirm dialog result
    const handleConfirmAction = async () => {
        setIsConfirmDialogOpen(false);
        if (confirmAction) {
            await confirmAction();
        }
    };

    // Generate and download election results PDF
    const generateElectionResultsPDF = async () => {
        try {
            setMessage("Generating election results PDF...");
            setMessageType("info");

            const pdfDoc = await PDFDocument.create();
            const page = pdfDoc.addPage([595.28, 841.89]);
            const { width, height } = page.getSize();

            const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
            const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

            page.drawText('Election Results Report', {
                x: 50,
                y: height - 50,
                size: 24,
                font: boldFont,
                color: rgb(0, 0, 0),
            });

            page.drawText(`Election Status: ${electionStatus}`, {
                x: 50,
                y: height - 100,
                size: 12,
                font: font,
                color: rgb(0, 0, 0),
            });

            page.drawText(`Total Registered Voters: ${totalVoterCount}`, {
                x: 50,
                y: height - 130,
                size: 12,
                font: font,
                color: rgb(0, 0, 0),
            });

            page.drawText(`Total Candidates: ${totalCandidateCount}`, {
                x: 50,
                y: height - 150,
                size: 12,
                font: font,
                color: rgb(0, 0, 0),
            });

            const votedCount = voters.filter(v => v.hasVoted).length;

            page.drawText(`Total Votes Cast: ${votedCount}`, {
                x: 50,
                y: height - 170,
                size: 12,
                font: font,
                color: rgb(0, 0, 0),
            });

            const participationRate = totalVoterCount > 0 ? ((votedCount / totalVoterCount) * 100).toFixed(2) : '0';

            page.drawText(`Voter Participation: ${participationRate}%`, {
                x: 50,
                y: height - 190,
                size: 12,
                font: font,
                color: rgb(0, 0, 0),
            });

            page.drawText('Candidate Results', {
                x: 50,
                y: height - 230,
                size: 16,
                font: boldFont,
                color: rgb(0, 0, 0),
            });

            let yPos = height - 260;
            page.drawText('ID', { x: 50, y: yPos, size: 12, font: boldFont });
            page.drawText('Name', { x: 100, y: yPos, size: 12, font: boldFont });
            page.drawText('Votes', { x: 300, y: yPos, size: 12, font: boldFont });
            page.drawText('Percentage', { x: 400, y: yPos, size: 12, font: boldFont });

            yPos -= 20;

            const totalVotes = candidates.reduce((sum, candidate) => sum + Number(candidate.voteCount), 0);

            candidates.forEach((candidate) => {
                const votePercentage = totalVotes > 0
                    ? ((Number(candidate.voteCount) / totalVotes) * 100).toFixed(2)
                    : '0.00';

                page.drawText(`${candidate.id.toString()}`, { x: 50, y: yPos, size: 12, font: font });
                page.drawText(candidate.name, { x: 100, y: yPos, size: 12, font: font });
                page.drawText(candidate.voteCount.toString(), { x: 300, y: yPos, size: 12, font: font });
                page.drawText(`${votePercentage}%`, { x: 400, y: yPos, size: 12, font: font });

                yPos -= 20;
            });

            if (electionState === ElectionState.ENDED && winners.length > 0) {
                yPos -= 20;

                page.drawText('Election Winners', {
                    x: 50,
                    y: yPos,
                    size: 16,
                    font: boldFont,
                    color: rgb(0, 0, 0),
                });

                yPos -= 30;

                winners.forEach((winner, index) => {
                    page.drawText(`Winner ${index + 1}: ${winner.name} (ID: ${winner.id})`, {
                        x: 50,
                        y: yPos,
                        size: 12,
                        font: boldFont,
                        color: rgb(0, 0.5, 0)
                    });

                    yPos -= 20;
                });
            }

            const now = new Date();
            page.drawText(`Report generated: ${now.toLocaleString()}`, {
                x: 50,
                y: 50,
                size: 10,
                font: font,
                color: rgb(0.5, 0.5, 0.5),
            });

            const pdfBytes = await pdfDoc.save();

            const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });

            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `election-results-${Date.now()}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            setMessage("Election results PDF downloaded successfully");
            setMessageType("success");
        } catch (error: any) {
            console.error("Error generating PDF:", error);
            setMessage(`Error generating PDF: ${error.message}`);
            setMessageType("error");
        }
    };

    // Calculate election statistics
    const calculateStats = () => {
        const votedCount = voters.filter(v => v.hasVoted).length;
        const notVotedCount = voters.length - votedCount;
        const participationRate = voters.length > 0 ? ((votedCount / voters.length) * 100).toFixed(2) : '0';

        return {
            votedCount,
            notVotedCount,
            participationRate
        };
    };

    const stats = calculateStats();

    // Render confirmation dialog
    const renderConfirmDialog = () => {
        if (!isConfirmDialogOpen) return null;

        return (
            <div className="modal d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">Confirm Action</h5>
                            <button type="button" className="btn-close" onClick={() => setIsConfirmDialogOpen(false)}></button>
                        </div>
                        <div className="modal-body">
                            <p>{confirmMessage}</p>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={() => setIsConfirmDialogOpen(false)}>
                                Cancel
                            </button>
                            <button type="button" className="btn btn-danger" onClick={handleConfirmAction}>
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Render the dashboard tab
    const renderDashboard = () => {
        return (
            <div className="row">
                <div className="col-md-4 mb-4">
                    <div className="card bg-primary text-white h-100">
                        <div className="card-header">
                            <h5 className="mb-0">Election Status</h5>
                        </div>
                        <div className="card-body">
                            <h2 className="display-6">{electionStatus}</h2>
                            <div className="mt-4">
                                <button
                                    onClick={() => openConfirmDialog(handleStartElection, "Are you sure you want to start the election?")}
                                    disabled={electionState !== ElectionState.NOT_STARTED || isLoading}
                                    className="btn btn-light w-100 mb-2"
                                >
                                    Start Election
                                </button>
                                <button
                                    onClick={() => openConfirmDialog(handleEndElection, "Are you sure you want to end the election?")}
                                    disabled={electionState !== ElectionState.ONGOING || isLoading}
                                    className="btn btn-warning w-100 mb-2"
                                >
                                    End Election
                                </button>
                                <button
                                    onClick={() => openConfirmDialog(handleNewElection, "WARNING: This will delete ALL election data. Continue?")}
                                    disabled={electionState !== ElectionState.ENDED || isLoading}
                                    className="btn btn-danger w-100"
                                >
                                    Start New Election
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-md-4 mb-4">
                    <div className="card bg-success text-white h-100">
                        <div className="card-header">
                            <h5 className="mb-0">Voter Statistics</h5>
                        </div>
                        <div className="card-body">
                            <h2 className="display-6">{totalVoterCount}</h2>
                            <p>Total Registered Voters</p>
                            {electionState !== ElectionState.NOT_STARTED && (
                                <>
                                    <div className="row mt-3">
                                        <div className="col-6">
                                            <h4>{stats.votedCount}</h4>
                                            <small>Voted</small>
                                        </div>
                                        <div className="col-6">
                                            <h4>{stats.notVotedCount}</h4>
                                            <small>Not Voted</small>
                                        </div>
                                    </div>
                                    <div className="mt-3">
                                        <h4>{stats.participationRate}%</h4>
                                        <small>Participation Rate</small>
                                        <div className="progress mt-2">
                                            <div
                                                className="progress-bar bg-light"
                                                style={{ width: `${stats.participationRate}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="col-md-4 mb-4">
                    <div className="card bg-info text-white h-100">
                        <div className="card-header">
                            <h5 className="mb-0">Candidate Statistics</h5>
                        </div>
                        <div className="card-body">
                            <h2 className="display-6">{totalCandidateCount}</h2>
                            <p>Total Candidates</p>
                            {electionState === ElectionState.ENDED && winners.length > 0 && (
                                <div className="mt-3">
                                    <h6>Winner(s):</h6>
                                    {winners.map((winner, index) => (
                                        <div key={index} className="badge bg-light text-dark me-2 mb-2">
                                            {winner.name}
                                        </div>
                                    ))}
                                </div>
                            )}
                            {electionState !== ElectionState.NOT_STARTED && (
                                <button
                                    onClick={generateElectionResultsPDF}
                                    disabled={isLoading}
                                    className="btn btn-light w-100 mt-3"
                                >
                                    Download Report
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="col-12 mb-4">
                    <div className="card">
                        <div className="card-body">
                            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                                <div className="btn-group">
                                    <button
                                        onClick={() => setActiveTab("dashboard")}
                                        className={`btn ${activeTab === "dashboard" ? "btn-primary" : "btn-outline-primary"}`}
                                    >
                                        Dashboard
                                    </button>
                                    <button
                                        onClick={() => setActiveTab("candidates")}
                                        className={`btn ${activeTab === "candidates" ? "btn-primary" : "btn-outline-primary"}`}
                                    >
                                        Candidates
                                    </button>
                                    <button
                                        onClick={() => setActiveTab("voters")}
                                        className={`btn ${activeTab === "voters" ? "btn-primary" : "btn-outline-primary"}`}
                                    >
                                        Voters
                                    </button>
                                </div>

                                <button
                                    onClick={refreshDashboardData}
                                    disabled={isLoading}
                                    className="btn btn-success"
                                >
                                    {isLoading ? "Refreshing..." : "Refresh Data"}
                                </button>
                            </div>

                            {message && (
                                <div className={`alert mt-3 ${messageType === "success" ? "alert-success" :
                                    messageType === "error" ? "alert-danger" : "alert-info"
                                    }`}>
                                    {message}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {(electionState === ElectionState.ONGOING || electionState === ElectionState.ENDED) && (
                    <div className="col-12 mb-4">
                        <div className="card">
                            <div className="card-header">
                                <h5 className="mb-0">Live Voting Results</h5>
                            </div>
                            <div className="card-body">
                                <div style={{ height: '400px' }}>
                                    <canvas ref={votingChartRef}></canvas>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // Render the candidates tab
    const renderCandidates = () => {
        return (
            <div className="row">
                <div className="col-md-6 mb-4">
                    <div className="card">
                        <div className="card-header bg-primary text-white">
                            <h5 className="mb-0">Register New Candidate</h5>
                        </div>
                        <div className="card-body">
                            <form onSubmit={handleRegisterCandidate}>
                                <div className="mb-3">
                                    <label htmlFor="candidateName" className="form-label">
                                        Candidate Name <span className="text-danger">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        id="candidateName"
                                        value={newCandidateName}
                                        onChange={(e) => setNewCandidateName(e.target.value)}
                                        placeholder="Enter candidate full name"
                                        required
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading || !newCandidateName.trim() || electionState !== ElectionState.NOT_STARTED}
                                    className="btn btn-primary w-100"
                                >
                                    Register Candidate
                                </button>

                                {electionState !== ElectionState.NOT_STARTED && (
                                    <div className="alert alert-warning mt-3">
                                        Candidates can only be registered before the election starts.
                                    </div>
                                )}
                            </form>
                        </div>
                    </div>
                </div>

                <div className="col-md-6 mb-4">
                    <div className="card">
                        <div className="card-header bg-info text-white d-flex justify-content-between">
                            <h5 className="mb-0">Candidates List</h5>
                            <span className="badge bg-light text-dark">Total: {candidates.length}</span>
                        </div>
                        <div className="card-body">
                            {candidates.length === 0 ? (
                                <p className="text-muted text-center">No candidates registered yet.</p>
                            ) : (
                                <div className="table-responsive">
                                    <table className="table table-hover">
                                        <thead>
                                            <tr>
                                                <th>ID</th>
                                                <th>Name</th>
                                                {electionState !== ElectionState.NOT_STARTED && <th>Votes</th>}
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {candidates.map((candidate) => (
                                                <tr key={candidate.id.toString()}>
                                                    <td>{candidate.id.toString()}</td>
                                                    <td>{candidate.name}</td>
                                                    {electionState !== ElectionState.NOT_STARTED && (
                                                        <td>{candidate.voteCount.toString()}</td>
                                                    )}
                                                    <td>
                                                        <button
                                                            onClick={() => openConfirmDialog(
                                                                () => handleRemoveCandidate(candidate.id),
                                                                `Remove candidate ${candidate.name}?`
                                                            )}
                                                            disabled={electionState !== ElectionState.NOT_STARTED}
                                                            className="btn btn-sm btn-danger"
                                                            title="Remove candidate"
                                                        >
                                                            Remove
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Render the voters tab
    const renderVoters = () => {
        return (
            <div className="card">
                <div className="card-header bg-success text-white d-flex justify-content-between">
                    <h5 className="mb-0">Registered Voters</h5>
                    <span className="badge bg-light text-dark">Total: {voters.length}</span>
                </div>
                <div className="card-body">
                    {voters.length === 0 ? (
                        <p className="text-muted text-center">No voters registered yet.</p>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-hover">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Name</th>
                                        <th>Voting Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {voters.map((voter) => (
                                        <tr key={voter.voterID.toString()}>
                                            <td>{voter.voterID.toString()}</td>
                                            <td>{voter.name}</td>
                                            <td>
                                                <span className={`badge ${voter.hasVoted ? 'bg-success' : 'bg-warning'}`}>
                                                    {voter.hasVoted ? "Voted" : "Not Voted"}
                                                </span>
                                            </td>
                                            <td>
                                                <button
                                                    onClick={() => openConfirmDialog(
                                                        () => handleRemoveVoter(voter.voterID),
                                                        `Remove voter ${voter.name}?`
                                                    )}
                                                    disabled={electionState !== ElectionState.NOT_STARTED}
                                                    className="btn btn-sm btn-danger"
                                                    title="Remove voter"
                                                >
                                                    Remove
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="container mt-4">
            <div className="card shadow mb-4">
                <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                    <div>
                        <h1 className="mb-0">Election Admin Dashboard</h1>
                        <small>Manage election process and view results</small>
                    </div>
                    <ConnectButton client={client} />
                </div>
            </div>

            {!activeAccount ? (
                <div className="card">
                    <div className="card-body text-center py-5">
                        <h2>Admin Authentication Required</h2>
                        <p className="text-muted">Please connect your wallet to access the admin dashboard.</p>
                    </div>
                </div>
            ) : (
                <>
                    {activeTab === "dashboard" && renderDashboard()}
                    {activeTab === "candidates" && renderCandidates()}
                    {activeTab === "voters" && renderVoters()}
                </>
            )}

            {renderConfirmDialog()}
        </div>
    );
}

export default Admin;
