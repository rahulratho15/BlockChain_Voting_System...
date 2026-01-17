"use client";

import { useState, useEffect, useRef, FormEvent } from "react";
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
import styles from '@/styles/admin.module.css';

// ===== TYPE DEFINITIONS =====
interface Candidate {
    id: bigint;
    name: string;
    voteCount: bigint;
}

interface Voter {
    voterID: bigint;
    name: string;
    hasVoted: boolean;
}

interface Winner {
    id: bigint;
    name: string;
    partyName: string;
}

type MessageType = 'info' | 'success' | 'error' | 'warning';
type TabType = 'dashboard' | 'candidates' | 'voters';

// Election states enum
const ElectionState = {
    NOT_STARTED: 0,
    ONGOING: 1,
    ENDED: 2
} as const;

// Translated election state messages
const ElectionStateMessages: Record<number, string> = {
    0: "Not Started",
    1: "Election Ongoing",
    2: "Election Ended"
};

// ===== ICON COMPONENTS =====
const ClipboardCheckIcon = () => <span className={styles.icon}>📋</span>;
const UserIcon = () => <span className={styles.icon}>👤</span>;
const UserGroupIcon = () => <span className={styles.icon}>👥</span>;
const DocumentDownloadIcon = () => <span className={styles.icon}>📥</span>;
const ArrowPathIcon = ({ spinning }: { spinning?: boolean }) => (
    <span className={`${styles.icon} ${spinning ? styles.iconSpin : ''}`}>🔄</span>
);
const ChartBarIcon = () => <span className={styles.icon}>📊</span>;
const PlusIcon = () => <span className={styles.icon}>➕</span>;
const TrashIcon = () => <span className={styles.icon}>🗑️</span>;
const CheckCircleIcon = () => <span className={styles.icon}>✅</span>;
const XCircleIcon = () => <span className={styles.icon}>❌</span>;

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
    const [electionState, setElectionState] = useState<number>(0);
    const [electionStatus, setElectionStatus] = useState<string>("Not Started");
    const [totalVoterCount, setTotalVoterCount] = useState<number>(0);
    const [totalCandidateCount, setTotalCandidateCount] = useState<number>(0);
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [voters, setVoters] = useState<Voter[]>([]);
    const [winners, setWinners] = useState<Winner[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [message, setMessage] = useState<string>("");
    const [messageType, setMessageType] = useState<MessageType>("info");

    // Form data
    const [newCandidateName, setNewCandidateName] = useState<string>("");
    const [newPartyName, setNewPartyName] = useState<string>("");
    const [selectedVoterToRemove, setSelectedVoterToRemove] = useState<string>("");
    const [selectedCandidateToRemove, setSelectedCandidateToRemove] = useState<string>("");

    // UI state
    const [activeTab, setActiveTab] = useState<TabType>("dashboard");
    const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState<boolean>(false);
    const [confirmAction, setConfirmAction] = useState<(() => Promise<void>) | null>(null);
    const [confirmMessage, setConfirmMessage] = useState<string>("");

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

            setCandidates((candidateData as Candidate[]) || []);
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

            setVoters((voterData as Voter[]) || []);
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

            setWinners((winnerData as Winner[]) || []);
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
        if (!ctx) return;

        // Format the data for the chart
        const labels = candidates.map(c => c.name);
        const data = candidates.map(c => Number(c.voteCount));

        // Create a new chart
        votingChartInstance.current = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Votes',
                    data: data,
                    backgroundColor: 'rgba(99, 102, 241, 0.6)',
                    borderColor: 'rgba(99, 102, 241, 1)',
                    borderWidth: 2,
                    borderRadius: 8,
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

            // Wait a moment before refreshing to allow transaction to process
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

            // Wait a moment before refreshing to allow transaction to process
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

            // Reset local state
            setWinners([]);

            // Wait a moment before refreshing to allow transaction to process
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
    const handleRegisterCandidate = async (e: FormEvent) => {
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

            // Clear form
            setNewCandidateName("");
            setNewPartyName("");

            // Wait a moment before refreshing to allow transaction to process
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
    const handleRemoveCandidate = async (candidateID: bigint) => {
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

            // Wait a moment before refreshing to allow transaction to process
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
    const handleRemoveVoter = async (voterID: bigint) => {
        if (!contract || !activeAccount) {
            setMessage("Please connect your wallet first");
            setMessageType("error");
            return;
        }

        try {
            setIsLoading(true);
            setMessage(`Removing voter ID: ${voterID}...`);
            setMessageType("info");

            // 1. First remove from blockchain
            const transaction = prepareContractCall({
                contract,
                method: "function removeVoter(uint256 voterID)",
                params: [voterID],
            });

            await sendTransaction(transaction);

            // 2. Then remove from fingerprint sensor via API
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

            // Create a new PDF document
            const pdfDoc = await PDFDocument.create();
            const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
            const { width, height } = page.getSize();

            // Get the standard font
            const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
            const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

            // Add title
            page.drawText('Election Results Report', {
                x: 50,
                y: height - 50,
                size: 24,
                font: boldFont,
                color: rgb(0, 0, 0),
            });

            // Add election status
            page.drawText(`Election Status: ${electionStatus}`, {
                x: 50,
                y: height - 100,
                size: 12,
                font: font,
                color: rgb(0, 0, 0),
            });

            // Add statistics
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

            // Count voted and not voted
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

            // Add candidate results header
            page.drawText('Candidate Results', {
                x: 50,
                y: height - 230,
                size: 16,
                font: boldFont,
                color: rgb(0, 0, 0),
            });

            // Add candidate results
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

            // Add winners section if election has ended
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

            // Add timestamp
            const now = new Date();
            page.drawText(`Report generated: ${now.toLocaleString()}`, {
                x: 50,
                y: 50,
                size: 10,
                font: font,
                color: rgb(0.5, 0.5, 0.5),
            });

            // Serialize the PDF to bytes
            const pdfBytes = await pdfDoc.save();

            // Create a blob from the PDF bytes (convert Uint8Array to ArrayBuffer)
            const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });

            // Create a link element and trigger download
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

    // Get status badge class
    const getStatusBadgeClass = () => {
        switch (electionState) {
            case ElectionState.NOT_STARTED:
                return styles.statusNotStarted;
            case ElectionState.ONGOING:
                return styles.statusOngoing;
            case ElectionState.ENDED:
                return styles.statusEnded;
            default:
                return styles.statusNotStarted;
        }
    };

    // Get alert class
    const getAlertClass = () => {
        switch (messageType) {
            case 'success':
                return styles.alertSuccess;
            case 'error':
                return styles.alertError;
            case 'warning':
                return styles.alertWarning;
            default:
                return styles.alertInfo;
        }
    };

    // Render confirmation dialog
    const renderConfirmDialog = () => {
        if (!isConfirmDialogOpen) return null;

        return (
            <div className={styles.dialogOverlay}>
                <div className={styles.dialogContent}>
                    <h3 className={styles.dialogTitle}>Confirm Action</h3>
                    <p className={styles.dialogMessage}>{confirmMessage}</p>
                    <div className={styles.dialogActions}>
                        <button
                            className={`${styles.btn} ${styles.btnSecondary}`}
                            onClick={() => setIsConfirmDialogOpen(false)}
                        >
                            Cancel
                        </button>
                        <button
                            className={`${styles.btn} ${styles.btnDanger}`}
                            onClick={handleConfirmAction}
                        >
                            Confirm
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // Render the dashboard tab
    const renderDashboard = () => {
        return (
            <div className={styles.dashboardGrid}>
                {/* Status Card */}
                <div className={`${styles.statCard} ${styles.statusCard}`}>
                    <div className={styles.cardHeader}>
                        <ClipboardCheckIcon />
                        Election Status
                    </div>
                    <div className={styles.cardBody}>
                        <span className={`${styles.statusBadge} ${getStatusBadgeClass()}`}>
                            {electionStatus}
                        </span>

                        <div className={`${styles.spaceY3} ${styles.mt6}`}>
                            <button
                                onClick={() => openConfirmDialog(handleStartElection, "Are you sure you want to start the election? This action cannot be undone.")}
                                disabled={electionState !== ElectionState.NOT_STARTED || isLoading}
                                className={`${styles.btn} ${styles.btnSuccess} ${styles.btnFull}`}
                            >
                                Start Election
                            </button>

                            <button
                                onClick={() => openConfirmDialog(handleEndElection, "Are you sure you want to end the election? This will finalize results and no more votes can be cast.")}
                                disabled={electionState !== ElectionState.ONGOING || isLoading}
                                className={`${styles.btn} ${styles.btnDanger} ${styles.btnFull}`}
                            >
                                End Election
                            </button>

                            <button
                                onClick={() => openConfirmDialog(handleNewElection, "WARNING: This will delete ALL election data including voters, candidates, and results. This cannot be undone!")}
                                disabled={electionState !== ElectionState.ENDED || isLoading}
                                className={`${styles.btn} ${styles.btnWarning} ${styles.btnFull}`}
                            >
                                Start New Election
                            </button>
                        </div>
                    </div>
                </div>

                {/* Voter Stats Card */}
                <div className={`${styles.statCard} ${styles.voterCard}`}>
                    <div className={styles.cardHeader}>
                        <UserIcon />
                        Voter Statistics
                    </div>
                    <div className={styles.cardBody}>
                        <div className={styles.spaceY4}>
                            <div>
                                <div className={styles.statLabel}>Total Registered Voters</div>
                                <div className={styles.statValue}>{totalVoterCount}</div>
                            </div>

                            {electionState !== ElectionState.NOT_STARTED && (
                                <>
                                    <div className={styles.statsGrid}>
                                        <div>
                                            <div className={styles.statLabel}>Voted</div>
                                            <div className={styles.statValue}>{stats.votedCount}</div>
                                        </div>
                                        <div>
                                            <div className={styles.statLabel}>Not Voted</div>
                                            <div className={styles.statValue}>{stats.notVotedCount}</div>
                                        </div>
                                    </div>

                                    <div>
                                        <div className={styles.statLabel}>Participation Rate</div>
                                        <div className={styles.statValue}>{stats.participationRate}%</div>
                                        <div className={styles.progressBar}>
                                            <div
                                                className={styles.progressFill}
                                                style={{ width: `${stats.participationRate}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Candidate Stats Card */}
                <div className={`${styles.statCard} ${styles.candidateCard}`}>
                    <div className={styles.cardHeader}>
                        <UserGroupIcon />
                        Candidate Statistics
                    </div>
                    <div className={styles.cardBody}>
                        <div className={styles.spaceY4}>
                            <div>
                                <div className={styles.statLabel}>Total Candidates</div>
                                <div className={styles.statValue}>{totalCandidateCount}</div>
                            </div>

                            {electionState === ElectionState.ENDED && winners.length > 0 && (
                                <div>
                                    <div className={styles.statLabel}>Winner(s)</div>
                                    <div className={`${styles.spaceY2} ${styles.mt4}`}>
                                        {winners.map((winner, index) => (
                                            <div key={index} className={styles.winnerBadge}>
                                                <CheckCircleIcon />
                                                {winner.name} (ID: {winner.id.toString()})
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {electionState !== ElectionState.NOT_STARTED && (
                                <button
                                    onClick={generateElectionResultsPDF}
                                    disabled={isLoading}
                                    className={`${styles.btn} ${styles.btnPrimary} ${styles.btnFull} ${styles.mt4}`}
                                >
                                    <DocumentDownloadIcon />
                                    Download Report
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Tab Navigation & Message */}
                <div className={`${styles.statCard} ${styles.fullWidth}`}>
                    <div className={styles.cardBody}>
                        <div className={`${styles.flexBetween} ${styles.flexWrap} ${styles.gap3}`}>
                            <div className={styles.tabContainer}>
                                <button
                                    onClick={() => setActiveTab("dashboard")}
                                    className={`${styles.tabButton} ${activeTab === "dashboard" ? styles.tabButtonActive : ""}`}
                                >
                                    <ChartBarIcon />
                                    Dashboard
                                </button>
                                <button
                                    onClick={() => setActiveTab("candidates")}
                                    className={`${styles.tabButton} ${activeTab === "candidates" ? styles.tabButtonActive : ""}`}
                                >
                                    <UserGroupIcon />
                                    Candidates
                                </button>
                                <button
                                    onClick={() => setActiveTab("voters")}
                                    className={`${styles.tabButton} ${activeTab === "voters" ? styles.tabButtonActive : ""}`}
                                >
                                    <UserIcon />
                                    Voters
                                </button>
                            </div>

                            <button
                                onClick={refreshDashboardData}
                                disabled={isLoading}
                                className={`${styles.btn} ${styles.btnSuccess}`}
                            >
                                <ArrowPathIcon spinning={isLoading} />
                                {isLoading ? "Refreshing..." : "Refresh Data"}
                            </button>
                        </div>

                        {message && (
                            <div className={`${styles.alert} ${getAlertClass()}`}>
                                {message}
                            </div>
                        )}
                    </div>
                </div>

                {/* Voting Results Chart - Only show if election is ongoing or ended */}
                {(electionState === ElectionState.ONGOING || electionState === ElectionState.ENDED) && (
                    <div className={`${styles.statCard} ${styles.chartCard}`}>
                        <div className={styles.cardHeader}>
                            <ChartBarIcon />
                            Live Voting Results
                        </div>
                        <div className={styles.cardBody}>
                            <div className={styles.chartWrapper}>
                                <canvas ref={votingChartRef} />
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
            <div className={styles.spaceY4}>
                {/* Candidate Registration Form */}
                <div className={styles.statCard}>
                    <div className={`${styles.cardHeader} ${styles.statusCard}`}>
                        <PlusIcon />
                        Register New Candidate
                    </div>
                    <div className={styles.cardBody}>
                        <form onSubmit={handleRegisterCandidate} className={styles.spaceY4}>
                            <div className={styles.formGroup}>
                                <label htmlFor="candidateName" className={styles.formLabel}>
                                    Candidate Name <span className={styles.required}>*</span>
                                </label>
                                <input
                                    type="text"
                                    id="candidateName"
                                    className={styles.formInput}
                                    value={newCandidateName}
                                    onChange={(e) => setNewCandidateName(e.target.value)}
                                    placeholder="Enter candidate full name"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading || !newCandidateName.trim() || electionState !== ElectionState.NOT_STARTED}
                                className={`${styles.btn} ${styles.btnPrimary} ${styles.btnFull}`}
                            >
                                <PlusIcon />
                                Register Candidate
                            </button>

                            {electionState !== ElectionState.NOT_STARTED && (
                                <div className={`${styles.alert} ${styles.alertWarning}`}>
                                    Candidates can only be registered before the election starts.
                                </div>
                            )}
                        </form>
                    </div>
                </div>

                {/* Candidate List */}
                <div className={styles.statCard}>
                    <div className={`${styles.cardHeader} ${styles.candidateCard}`}>
                        <UserGroupIcon />
                        Candidates List
                        <span className={styles.statusBadge} style={{ marginLeft: 'auto', background: 'white', color: 'var(--primary-600)' }}>
                            Total: {candidates.length}
                        </span>
                    </div>
                    <div className={styles.cardBody}>
                        {candidates.length === 0 ? (
                            <div className={styles.emptyState}>
                                <div className={styles.emptyStateIcon}>👥</div>
                                No candidates registered yet.
                            </div>
                        ) : (
                            <div className={styles.tableContainer}>
                                <table className={styles.table}>
                                    <thead className={styles.tableHeader}>
                                        <tr>
                                            <th>ID</th>
                                            <th>Name</th>
                                            {electionState !== ElectionState.NOT_STARTED && <th>Votes</th>}
                                            <th style={{ textAlign: 'right' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className={styles.tableBody}>
                                        {candidates.map((candidate) => (
                                            <tr key={candidate.id.toString()}>
                                                <td style={{ fontWeight: 600 }}>{candidate.id.toString()}</td>
                                                <td>{candidate.name}</td>
                                                {electionState !== ElectionState.NOT_STARTED && (
                                                    <td>{candidate.voteCount.toString()}</td>
                                                )}
                                                <td style={{ textAlign: 'right' }}>
                                                    <button
                                                        onClick={() => openConfirmDialog(
                                                            () => handleRemoveCandidate(candidate.id),
                                                            `Are you sure you want to remove candidate ${candidate.name}?`
                                                        )}
                                                        disabled={electionState !== ElectionState.NOT_STARTED}
                                                        className={`${styles.btn} ${styles.btnDanger}`}
                                                        style={{ padding: 'var(--space-2)' }}
                                                        title="Remove candidate"
                                                    >
                                                        <TrashIcon />
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
        );
    };

    // Render the voters tab
    const renderVoters = () => {
        return (
            <div className={styles.statCard}>
                <div className={`${styles.cardHeader} ${styles.voterCard}`}>
                    <UserIcon />
                    Registered Voters
                    <span className={styles.statusBadge} style={{ marginLeft: 'auto', background: 'white', color: 'var(--accent-emerald)' }}>
                        Total: {voters.length}
                    </span>
                </div>
                <div className={styles.cardBody}>
                    {voters.length === 0 ? (
                        <div className={styles.emptyState}>
                            <div className={styles.emptyStateIcon}>👤</div>
                            No voters registered yet.
                        </div>
                    ) : (
                        <div className={styles.tableContainer}>
                            <table className={styles.table}>
                                <thead className={styles.tableHeader}>
                                    <tr>
                                        <th>ID</th>
                                        <th>Name</th>
                                        <th>Voting Status</th>
                                        <th style={{ textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody className={styles.tableBody}>
                                    {voters.map((voter) => (
                                        <tr key={voter.voterID.toString()}>
                                            <td style={{ fontWeight: 600 }}>{voter.voterID.toString()}</td>
                                            <td>{voter.name}</td>
                                            <td>
                                                <span className={`${styles.statusBadge} ${voter.hasVoted ? styles.statusEnded : styles.statusNotStarted}`}>
                                                    {voter.hasVoted ? (
                                                        <><CheckCircleIcon /> Voted</>
                                                    ) : (
                                                        <><XCircleIcon /> Not Voted</>
                                                    )}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                <button
                                                    onClick={() => openConfirmDialog(
                                                        () => handleRemoveVoter(voter.voterID),
                                                        `Are you sure you want to remove voter ${voter.name}?`
                                                    )}
                                                    disabled={electionState !== ElectionState.NOT_STARTED}
                                                    className={`${styles.btn} ${styles.btnDanger}`}
                                                    style={{ padding: 'var(--space-2)' }}
                                                    title="Remove voter"
                                                >
                                                    <TrashIcon />
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
        <div className={styles.pageContainer}>
            <div className={styles.maxWidthContainer}>
                {/* Header with Admin Dashboard title and Wallet Connect button */}
                <div className={styles.headerCard}>
                    <div className={styles.headerContent}>
                        <div>
                            <h1 className={styles.headerTitle}>Election Admin Dashboard</h1>
                            <p className={styles.headerSubtitle}>Manage election process and view results</p>
                        </div>
                        <ConnectButton client={client} />
                    </div>
                </div>

                {/* Main content */}
                {!activeAccount ? (
                    <div className={styles.statCard}>
                        <div className={styles.authRequired}>
                            <div className={styles.authIcon}>🔒</div>
                            <h2 className={styles.authTitle}>Admin Authentication Required</h2>
                            <p className={styles.authMessage}>
                                Please connect your wallet to access the admin dashboard. Only authorized admin wallets can perform election management.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className={styles.spaceY4}>
                        {activeTab === "dashboard" && renderDashboard()}
                        {activeTab === "candidates" && renderCandidates()}
                        {activeTab === "voters" && renderVoters()}
                    </div>
                )}
            </div>

            {/* Confirmation Dialog */}
            {renderConfirmDialog()}
        </div>
    );
}

export default Admin;
