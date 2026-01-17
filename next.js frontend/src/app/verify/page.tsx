"use client";

import { useState, useEffect, useRef, FormEvent } from "react";
import {
    createThirdwebClient,
    getContract,
    readContract,
    prepareContractCall,
} from "thirdweb";
import { ConnectButton, useActiveAccount, useSendTransaction } from "thirdweb/react";
import { defineChain } from "thirdweb/chains";
import axios from "axios";
import styles from "@/styles/verify.module.css";

// ===== TYPE DEFINITIONS =====
interface VoterData {
    id: bigint;
    name: string;
    faceEncoding: string;
    fingerEncoding: string;
    faceDisabled: boolean;
    fingerDisabled: boolean;
    hasVoted: boolean;
}

interface Candidate {
    id: bigint;
    name: string;
    voteCount: bigint;
}

type StepType = 'login' | 'verification' | 'voting' | 'success';

export default function VoteCasting() {
    // State variables
    const [voterId, setVoterId] = useState<string>("");
    const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
    const [message, setMessage] = useState<string>("");
    const [step, setStep] = useState<StepType>("login");
    const [voterData, setVoterData] = useState<VoterData | null>(null);
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
    const [faceDisabled, setFaceDisabled] = useState<boolean>(false);
    const [fingerDisabled, setFingerDisabled] = useState<boolean>(false);
    const [faceCaptured, setFaceCaptured] = useState<boolean>(false);
    const [fingerprintScanned, setFingerprintScanned] = useState<boolean>(false);
    const [isSubmittingVote, setIsSubmittingVote] = useState<boolean>(false);
    const [allVoters, setAllVoters] = useState<VoterData[]>([]);
    const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
    const [showVideo, setShowVideo] = useState<boolean>(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    let stream: MediaStream | null = null;

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

    // Load voter and candidate data on initial load
    useEffect(() => {
        fetchAllData();
    }, []);

    // Fetch both candidate and voter data from blockchain
    const fetchAllData = async () => {
        try {
            setMessage("Loading data from blockchain...");
            setIsLoadingData(true);

            // Fetch all voters from blockchain
            const votersResponse = await readContract({
                contract,
                method: "function getAllVoters() view returns ((uint256 id, string name, string faceEncoding, string fingerEncoding, bool faceDisabled, bool fingerDisabled, bool hasVoted)[])",
                params: [],
            });

            // Fetch all candidates from blockchain
            const candidatesResponse = await readContract({
                contract,
                method: "function getAllCandidates() view returns ((uint256 id, string name, uint256 voteCount)[])",
                params: [],
            });

            if (votersResponse) {
                setAllVoters(votersResponse as VoterData[]);
                console.log("All voters:", votersResponse);
            }

            if (candidatesResponse) {
                setCandidates(candidatesResponse as Candidate[]);
                console.log("All candidates:", candidatesResponse);
            }

            setMessage("");
        } catch (error) {
            console.error("Error fetching data from blockchain:", error);
            setMessage("Failed to load data from blockchain. Please ensure you are connected to the correct network.");
        } finally {
            setIsLoadingData(false);
        }
    };

    // Authenticate voter by ID
    const authenticateVoter = async (e: FormEvent) => {
        e.preventDefault();

        if (!voterId.trim()) {
            setMessage("Please enter your Voter ID");
            return;
        }

        setIsAuthenticating(true);
        setMessage("Authenticating...");

        try {
            // Find voter in the list by ID number
            const voter = allVoters.find(v => v.id.toString() === voterId);

            if (!voter) {
                setMessage("Voter ID not found. Please check and try again.");
                setIsAuthenticating(false);
                return;
            }

            // Check if voter has already voted
            if (voter.hasVoted) {
                setMessage("You have already cast your vote in this election.");
                setIsAuthenticating(false);
                return;
            }

            // Set voter data and move to verification step
            setVoterData(voter);
            setFaceDisabled(voter.faceDisabled);
            setFingerDisabled(voter.fingerDisabled);
            setStep("verification");
            setMessage("");

        } catch (error) {
            console.error("Authentication error:", error);
            setMessage("Authentication failed. Please try again.");
        } finally {
            setIsAuthenticating(false);
        }
    };

    // Start webcam when capture face button is clicked
    const startWebcam = async () => {
        try {
            setShowVideo(true);
            stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: false
            });

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (error) {
            console.error("Error accessing webcam:", error);
            setMessage("Could not access webcam");
        }
    };

    // Stop webcam
    const stopWebcam = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
            tracks.forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
        setShowVideo(false);
    };

    // Capture image from webcam
    const captureImage = async () => {
        if (!videoRef.current || !canvasRef.current) {
            setMessage("Video stream not available");
            return;
        }

        const canvas = canvasRef.current;
        const video = videoRef.current;
        const context = canvas.getContext("2d");

        if (!context) return;

        // Set canvas dimensions to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw video frame to canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert canvas to blob
        try {
            const blob = await new Promise<Blob | null>(resolve => {
                canvas.toBlob(resolve, "image/jpeg", 0.95);
            });

            if (!blob) {
                setMessage("Failed to capture image");
                return;
            }

            // Create file from blob
            const imageFile = new File([blob], "face-capture.jpg", { type: "image/jpeg" });

            // Send to face verification API
            await verifyFace(imageFile);

            // Stop webcam after capturing
            stopWebcam();
        } catch (error) {
            console.error("Error capturing image:", error);
            setMessage("Failed to capture image");
        }
    };

    const getFaceEncodingFromImage = async (imageFile: File): Promise<number[]> => {
        const formData = new FormData();
        formData.append("file", imageFile);

        const response = await axios.post("http://localhost:5000/api/encode_face", formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });

        if (response.data.success) {
            return response.data.data.encoding;
        } else {
            throw new Error("Failed to encode face");
        }
    };

    // Verify face against stored encoding
    const verifyFace = async (imageFile: File) => {
        try {
            setMessage("Verifying face...");

            if (!voterData) return;

            const response = await axios.post("http://localhost:5000/api/face/compare", {
                encoding1: JSON.parse(voterData.faceEncoding),
                encoding2: await getFaceEncodingFromImage(imageFile),
                threshold: 0.6
            });

            if (response.data.success && response.data.data.is_match) {
                setMessage("Face verification successful");
                setFaceCaptured(true);
            } else {
                setMessage(`Face verification failed: ${response.data.message || "No match found"}`);
            }
        } catch (error: any) {
            console.error("Error verifying face:", error);
            setMessage("Failed to verify face");
        }
    };

    // Initialize fingerprint scanner
    const initFingerprintScanner = async (): Promise<boolean> => {
        try {
            setMessage("Initializing fingerprint scanner...");

            const response = await axios.post("http://localhost:5000/api/fingerprint/init", {
                port: "COM11" // Adjust port as needed
            });

            if (response.data.success) {
                setMessage("Fingerprint scanner initialized");
                return true;
            } else {
                setMessage(`Failed to initialize scanner: ${response.data.message}`);
                return false;
            }
        } catch (error) {
            console.error("Error initializing fingerprint scanner:", error);
            setMessage("Failed to connect to fingerprint scanner");
            return false;
        }
    };

    // Verify fingerprint
    const verifyFingerprint = async () => {
        try {
            // First initialize the scanner
            const initialized = await initFingerprintScanner();

            if (!initialized) {
                return;
            }

            setMessage("Please place your finger on the scanner...");

            // Verify fingerprint
            const response = await axios.post("http://localhost:5000/api/fingerprint/verify");
            console.log(response)

            if (response.data.success &&
                response.data.data.is_match &&
                response.data.data.voter_id.toString() === voterId) {
                setMessage("Fingerprint verification successful");
                setFingerprintScanned(true);
            } else {
                setMessage(`Fingerprint verification failed: ${response.data.message || "No match found"}`);
                setFingerprintScanned(false);
            }
        } catch (error) {
            console.error("Error verifying fingerprint:", error);
            setMessage("Failed to verify fingerprint");
        }
    };

    // Check if verification is complete
    const isVerificationComplete = (): boolean => {
        return (faceCaptured || faceDisabled) && (fingerprintScanned || fingerDisabled);
    };

    // Move to voting step
    const proceedToVoting = () => {
        if (isVerificationComplete()) {
            setStep("voting");
            setMessage("");
        } else {
            setMessage("Please complete all verification steps");
        }
    };

    // Select a candidate
    const selectCandidate = (candidate: Candidate) => {
        setSelectedCandidate(candidate);
    };

    // Reset candidate selection
    const resetSelection = () => {
        setSelectedCandidate(null);
    };

    // Cast vote
    const castVote = async () => {
        if (!selectedCandidate || !voterData || !activeAccount?.address) {
            setMessage("Please select a candidate and ensure you are connected to wallet");
            return;
        }

        try {
            setIsSubmittingVote(true);
            setMessage("Submitting your vote to blockchain...");
            const voterIdBigInt = BigInt(voterId);
            const candidateIdBigInt = BigInt(selectedCandidate.id);

            console.log("Casting vote with:", voterIdBigInt, candidateIdBigInt);

            const transaction = prepareContractCall({
                contract,
                method: "function castVote(uint256 voterID, uint256 candidateID)",
                params: [voterIdBigInt, candidateIdBigInt],
            });

            sendTransaction(transaction);
            console.log("Vote submitted to blockchain");

            // Move to success step
            setStep("success");
            setMessage("Your vote has been submitted successfully!");

        } catch (error: any) {
            console.error("Error casting vote:", error);
            setMessage(`Vote submission failed: ${error.message}`);
        } finally {
            setIsSubmittingVote(false);
        }
    };

    // Clean up on component unmount
    useEffect(() => {
        return () => {
            stopWebcam();
        };
    }, []);

    // Get current step number for indicator
    const getStepNumber = (): number => {
        switch (step) {
            case 'login': return 1;
            case 'verification': return 2;
            case 'voting': return 3;
            case 'success': return 4;
            default: return 1;
        }
    };

    // Determine alert class based on message content
    const getAlertClass = (): string => {
        if (message.toLowerCase().includes('success') || message.toLowerCase().includes('successful')) {
            return styles.alertSuccess;
        }
        if (message.toLowerCase().includes('failed') || message.toLowerCase().includes('error')) {
            return styles.alertError;
        }
        return styles.alertWarning;
    };

    // Render step indicator
    const renderStepIndicator = () => (
        <div className={styles.stepIndicator}>
            {['Login', 'Verify', 'Vote', 'Done'].map((label, index) => {
                const stepNum = index + 1;
                const currentStep = getStepNumber();
                const isActive = stepNum === currentStep;
                const isCompleted = stepNum < currentStep;

                return (
                    <div
                        key={label}
                        className={`${styles.step} ${isActive ? styles.active : ''} ${isCompleted ? styles.completed : ''}`}
                    >
                        <div className={styles.stepCircle}>
                            {isCompleted ? '✓' : stepNum}
                        </div>
                        <span className={styles.stepLabel}>{label}</span>
                    </div>
                );
            })}
        </div>
    );

    // Render login step
    const renderLoginStep = () => (
        <div>
            <h2 className={styles.sectionTitle}>Voter Authentication</h2>
            <p className={styles.sectionSubtitle}>Enter your voter ID to begin the verification process</p>

            <form onSubmit={authenticateVoter}>
                <div className={styles.formGroup}>
                    <label htmlFor="voterId" className={styles.formLabel}>
                        Voter ID (e.g., Aadhaar, SSN, National ID)
                    </label>
                    <input
                        type="text"
                        id="voterId"
                        className={styles.formInput}
                        placeholder="Enter your ID number"
                        value={voterId}
                        onChange={(e) => setVoterId(e.target.value)}
                        required
                    />
                </div>

                <button
                    type="submit"
                    className={`${styles.btn} ${styles.btnPrimary} ${styles.btnFull}`}
                    disabled={isAuthenticating || !voterId.trim()}
                >
                    {isAuthenticating ? (
                        <>
                            <span className={styles.loadingSpinner}></span>
                            Authenticating...
                        </>
                    ) : (
                        "Authenticate"
                    )}
                </button>
            </form>
        </div>
    );

    // Render verification step
    const renderVerificationStep = () => (
        <div>
            <h2 className={styles.sectionTitle}>Identity Verification</h2>

            <div className={styles.voterInfo}>
                <div className={styles.voterInfoTitle}>Voter ID: {voterId}</div>
                {voterData && <div className={styles.voterInfoSubtext}>Please complete the verification steps below</div>}
            </div>

            <div className={styles.verificationGrid}>
                <button
                    type="button"
                    className={`${styles.verifyBtn} ${faceCaptured ? styles.verifyBtnCompleted : faceDisabled ? styles.verifyBtnCompleted : ''}`}
                    onClick={startWebcam}
                    disabled={faceDisabled || faceCaptured}
                >
                    <span className={styles.verifyBtnIcon}>📸</span>
                    <span className={styles.verifyBtnLabel}>
                        {faceDisabled ? 'Exempted' : faceCaptured ? 'Verified ✓' : 'Verify Face'}
                    </span>
                </button>

                <button
                    type="button"
                    className={`${styles.verifyBtn} ${fingerprintScanned ? styles.verifyBtnCompleted : fingerDisabled ? styles.verifyBtnCompleted : ''}`}
                    onClick={verifyFingerprint}
                    disabled={fingerDisabled || fingerprintScanned}
                >
                    <span className={styles.verifyBtnIcon}>👆</span>
                    <span className={styles.verifyBtnLabel}>
                        {fingerDisabled ? 'Exempted' : fingerprintScanned ? 'Verified ✓' : 'Verify Fingerprint'}
                    </span>
                </button>
            </div>

            {/* Video preview for face capture */}
            {showVideo && (
                <div style={{ marginBottom: 'var(--space-6)' }}>
                    <div className={styles.videoContainer}>
                        <video
                            ref={videoRef}
                            autoPlay
                            muted
                            className={styles.video}
                        ></video>
                    </div>

                    <button
                        type="button"
                        className={`${styles.btn} ${styles.btnSuccess} ${styles.btnFull}`}
                        onClick={captureImage}
                    >
                        📷 Capture Now
                    </button>

                    <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
                </div>
            )}

            {/* Status indicators */}
            <div className={styles.statusGrid}>
                <div className={`${styles.statusItem} ${faceCaptured || faceDisabled ? styles.statusVerified : styles.statusPending}`}>
                    {faceDisabled ? '🔄 Face: Disability Exemption' : faceCaptured ? '✅ Face: Verified' : '⏳ Face: Not Verified'}
                </div>
                <div className={`${styles.statusItem} ${fingerprintScanned || fingerDisabled ? styles.statusVerified : styles.statusPending}`}>
                    {fingerDisabled ? '🔄 Fingerprint: Disability Exemption' : fingerprintScanned ? '✅ Fingerprint: Verified' : '⏳ Fingerprint: Not Verified'}
                </div>
            </div>

            <div className={styles.buttonGrid2}>
                <button
                    type="button"
                    className={`${styles.btn} ${styles.btnSecondary}`}
                    onClick={() => {
                        stopWebcam();
                        setStep("login");
                        setVoterData(null);
                        setFaceCaptured(false);
                        setFingerprintScanned(false);
                    }}
                >
                    Back
                </button>
                <button
                    type="button"
                    className={`${styles.btn} ${isVerificationComplete() ? styles.btnSuccess : styles.btnSecondary}`}
                    onClick={proceedToVoting}
                    disabled={!isVerificationComplete()}
                >
                    Proceed to Voting
                </button>
            </div>
        </div>
    );

    // Render voting step
    const renderVotingStep = () => (
        <div>
            <h2 className={styles.sectionTitle}>Cast Your Vote</h2>

            <div className={styles.voterInfo}>
                <div className={styles.voterInfoTitle}>Voter ID: {voterId}</div>
                <div className={styles.voterInfoSubtext}>Please select one candidate to cast your vote</div>
            </div>

            <div className={styles.candidateList}>
                {candidates.map((candidate) => (
                    <div
                        key={candidate.id.toString()}
                        className={`${styles.candidateCard} ${selectedCandidate?.id === candidate.id ? styles.candidateCardSelected : ''}`}
                        onClick={() => selectCandidate(candidate)}
                    >
                        <div className={styles.candidateRadio}></div>
                        <div className={styles.candidateInfo}>
                            <div className={styles.candidateName}>{candidate.name}</div>
                            <div className={styles.candidateId}>ID: {candidate.id.toString()}</div>
                        </div>
                    </div>
                ))}
            </div>

            <div className={styles.buttonGrid}>
                <button
                    type="button"
                    className={`${styles.btn} ${styles.btnSecondary}`}
                    onClick={() => {
                        setStep("verification");
                        setSelectedCandidate(null);
                    }}
                >
                    Back
                </button>

                {selectedCandidate && (
                    <button
                        type="button"
                        className={`${styles.btn} ${styles.btnWarning}`}
                        onClick={resetSelection}
                    >
                        Reset Choice
                    </button>
                )}

                <button
                    type="button"
                    className={`${styles.btn} ${selectedCandidate && !isSubmittingVote ? styles.btnSuccess : styles.btnSecondary}`}
                    onClick={castVote}
                    disabled={!selectedCandidate || isSubmittingVote}
                    style={selectedCandidate ? {} : { gridColumn: 'span 2' }}
                >
                    {isSubmittingVote ? (
                        <>
                            <span className={styles.loadingSpinner}></span>
                            Submitting...
                        </>
                    ) : (
                        "Cast Vote"
                    )}
                </button>
            </div>
        </div>
    );

    // Render success step
    const renderSuccessStep = () => (
        <div className={styles.successContainer}>
            <div className={styles.successIcon}>
                <span className={styles.successIconCheck}>✓</span>
            </div>

            <h2 className={styles.successTitle}>Vote Cast Successfully!</h2>
            <p className={styles.successMessage}>Thank you for participating in this election. Your vote has been recorded on the blockchain.</p>

            {selectedCandidate && (
                <div className={styles.successVoteInfo}>
                    <div className={styles.successVoteLabel}>You voted for:</div>
                    <div className={styles.successVoteName}>{selectedCandidate.name}</div>
                </div>
            )}

            <button
                type="button"
                className={`${styles.btn} ${styles.btnPrimary} ${styles.btnFull}`}
                onClick={() => window.location.reload()}
            >
                Return to Start
            </button>
        </div>
    );

    return (
        <div className={styles.pageContainer}>
            <div className={styles.mainCard}>
                <div className={styles.cardHeader}>
                    <h1 className={styles.cardTitle}>🗳️ Secure Blockchain Voting</h1>
                </div>

                <div className={styles.cardBody}>
                    <div className={styles.walletConnect}>
                        <ConnectButton client={client} />
                    </div>

                    {!isLoadingData && step !== 'success' && renderStepIndicator()}

                    {message && (
                        <div className={`${styles.alert} ${getAlertClass()}`}>
                            {message}
                        </div>
                    )}

                    {isLoadingData ? (
                        <div className={styles.loadingContainer}>
                            <div className={styles.loadingSpinner}></div>
                            <p className={styles.loadingText}>Loading blockchain data...</p>
                        </div>
                    ) : (
                        <>
                            {step === "login" && renderLoginStep()}
                            {step === "verification" && renderVerificationStep()}
                            {step === "voting" && renderVotingStep()}
                            {step === "success" && renderSuccessStep()}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
