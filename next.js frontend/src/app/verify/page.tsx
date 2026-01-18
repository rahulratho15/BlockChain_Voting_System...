"use client";

import { useState, useEffect, useRef } from "react";
import {
    createThirdwebClient,
    getContract,
    readContract,
    prepareContractCall,
} from "thirdweb";
import { ConnectButton, useActiveAccount, useSendTransaction } from "thirdweb/react";
import { defineChain } from "thirdweb/chains";
import axios from "axios";

export default function VoteCasting() {
    // State variables
    const [voterId, setVoterId] = useState("");
    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const [message, setMessage] = useState("");
    const [step, setStep] = useState("login");
    const [voterData, setVoterData] = useState<any>(null);
    const [candidates, setCandidates] = useState<any[]>([]);
    const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
    const [faceDisabled, setFaceDisabled] = useState(false);
    const [fingerDisabled, setFingerDisabled] = useState(false);
    const [faceCaptured, setFaceCaptured] = useState(false);
    const [fingerprintScanned, setFingerprintScanned] = useState(false);
    const [isSubmittingVote, setIsSubmittingVote] = useState(false);
    const [allVoters, setAllVoters] = useState<any[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [isWebcamActive, setIsWebcamActive] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    let stream = null;

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
                setAllVoters([...votersResponse]);
                console.log("All voters:", votersResponse);
            }

            if (candidatesResponse) {
                setCandidates([...candidatesResponse]);
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
    const authenticateVoter = async (e: React.FormEvent) => {
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
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: false
            });

            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
                setIsWebcamActive(true);
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
        setIsWebcamActive(false);
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

        // Set canvas dimensions to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw video frame to canvas
        context!.drawImage(video, 0, 0, canvas.width, canvas.height);

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

    const getFaceEncodingFromImage = async (imageFile: File) => {
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
        } catch (error) {
            console.error("Error verifying face:", error);
            setMessage("Failed to verify face");
        }
    };

    // Initialize fingerprint scanner
    const initFingerprintScanner = async () => {
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
    const isVerificationComplete = () => {
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
    const selectCandidate = (candidate: any) => {
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

    const onClickB = () => {
        const transaction = prepareContractCall({
            contract,
            method:
                "function castVote(uint256 voterID, uint256 candidateID)",
            params: [BigInt(15), BigInt(1)],
        });
        sendTransaction(transaction);
    };

    // Render login step
    const renderLoginStep = () => (
        <div>
            <h3 className="mb-4">Voter Authentication</h3>
            <form onSubmit={authenticateVoter}>
                <div className="mb-3">
                    <label htmlFor="voterId" className="form-label">
                        Voter ID (e.g., Aadhaar, SSN, National ID)
                    </label>
                    <input
                        type="text"
                        className="form-control"
                        id="voterId"
                        value={voterId}
                        onChange={(e) => setVoterId(e.target.value)}
                        required
                    />
                </div>
                <button
                    type="submit"
                    className="btn btn-primary w-100"
                    disabled={isAuthenticating}
                >
                    {isAuthenticating ? "Authenticating..." : "Authenticate"}
                </button>
            </form>
        </div>
    );

    // Render verification step
    const renderVerificationStep = () => (
        <div>
            <h3 className="mb-4">Identity Verification</h3>
            <div className="alert alert-info mb-4">
                <strong>Voter ID:</strong> {voterId}
            </div>

            <div className="row mb-4">
                <div className="col-md-6 mb-3">
                    <button
                        type="button"
                        className={`btn w-100 ${faceDisabled || faceCaptured ? 'btn-secondary' : 'btn-primary'}`}
                        onClick={startWebcam}
                        disabled={faceDisabled || faceCaptured}
                    >
                        {faceDisabled ? "Face Exempted" : (faceCaptured ? "Face Verified ✓" : "Verify Face")}
                    </button>
                </div>
                <div className="col-md-6 mb-3">
                    <button
                        type="button"
                        className={`btn w-100 ${fingerDisabled || fingerprintScanned ? 'btn-secondary' : 'btn-primary'}`}
                        onClick={verifyFingerprint}
                        disabled={fingerDisabled || fingerprintScanned}
                    >
                        {fingerDisabled ? "Fingerprint Exempted" : (fingerprintScanned ? "Fingerprint Verified ✓" : "Verify Fingerprint")}
                    </button>
                </div>
            </div>

            <div className="mb-4">
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-100 rounded"
                    style={{ display: isWebcamActive ? 'block' : 'none' }}
                ></video>
                <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>

                {isWebcamActive && (
                    <button
                        type="button"
                        className="btn btn-success w-100 mt-2"
                        onClick={captureImage}
                    >
                        Capture Now
                    </button>
                )}
            </div>

            <div className="row mb-4">
                <div className="col-md-6">
                    <div className={`alert ${faceCaptured || faceDisabled ? 'alert-success' : 'alert-secondary'} py-2`}>
                        <small>Face: {faceDisabled ? "Disability Exemption" : (faceCaptured ? "Verified ✓" : "Not Verified")}</small>
                    </div>
                </div>
                <div className="col-md-6">
                    <div className={`alert ${fingerprintScanned || fingerDisabled ? 'alert-success' : 'alert-secondary'} py-2`}>
                        <small>Fingerprint: {fingerDisabled ? "Disability Exemption" : (fingerprintScanned ? "Verified ✓" : "Not Verified")}</small>
                    </div>
                </div>
            </div>

            <div className="row">
                <div className="col-md-6 mb-2">
                    <button
                        type="button"
                        className="btn btn-secondary w-100"
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
                </div>
                <div className="col-md-6 mb-2">
                    <button
                        type="button"
                        className={`btn w-100 ${isVerificationComplete() ? 'btn-success' : 'btn-secondary'}`}
                        onClick={proceedToVoting}
                        disabled={!isVerificationComplete()}
                    >
                        Proceed to Voting
                    </button>
                </div>
            </div>
        </div>
    );

    // Render voting step
    const renderVotingStep = () => (
        <div>
            <h3 className="mb-4">Cast Your Vote</h3>
            <div className="alert alert-info mb-4">
                <strong>Voter ID:</strong> {voterId}
            </div>

            <h5 className="mb-3">Select a Candidate:</h5>
            <div className="list-group mb-4">
                {candidates.map((candidate) => (
                    <button
                        key={candidate.id.toString()}
                        type="button"
                        className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center ${selectedCandidate && selectedCandidate.id === candidate.id ? 'active' : ''
                            }`}
                        onClick={() => selectCandidate(candidate)}
                    >
                        <div>
                            <strong>{candidate.name}</strong>
                            <br />
                            <small>ID: {candidate.id.toString()}</small>
                        </div>
                        {selectedCandidate && selectedCandidate.id === candidate.id && (
                            <span className="badge bg-white text-primary">Selected</span>
                        )}
                    </button>
                ))}
            </div>

            <div className="row">
                <div className="col-md-4 mb-2">
                    <button
                        type="button"
                        className="btn btn-secondary w-100"
                        onClick={() => {
                            setStep("verification");
                            setSelectedCandidate(null);
                        }}
                    >
                        Back
                    </button>
                </div>
                {selectedCandidate && (
                    <div className="col-md-4 mb-2">
                        <button
                            type="button"
                            className="btn btn-warning w-100"
                            onClick={resetSelection}
                        >
                            Reset Choice
                        </button>
                    </div>
                )}
                <div className={selectedCandidate ? "col-md-4 mb-2" : "col-md-8 mb-2"}>
                    <button
                        type="button"
                        className={`btn w-100 ${selectedCandidate && !isSubmittingVote ? 'btn-success' : 'btn-secondary'}`}
                        onClick={castVote}
                        disabled={!selectedCandidate || isSubmittingVote}
                    >
                        {isSubmittingVote ? "Submitting..." : "Cast Vote"}
                    </button>
                </div>
            </div>
        </div>
    );

    // Render success step
    const renderSuccessStep = () => (
        <div className="text-center">
            <div className="mb-4">
                <i className="bi bi-check-circle text-success" style={{ fontSize: '5rem' }}></i>
            </div>
            <h2 className="text-success mb-3">Vote Cast Successfully!</h2>
            <p className="mb-4">Thank you for participating in this election. Your vote has been recorded on the blockchain.</p>

            {selectedCandidate && (
                <div className="alert alert-success">
                    <strong>You voted for:</strong> {selectedCandidate.name}
                </div>
            )}

            <button
                type="button"
                className="btn btn-primary"
                onClick={() => window.location.reload()}
            >
                Return to Start
            </button>
        </div>
    );

    return (
        <div className="container mt-5">
            <div className="row justify-content-center">
                <div className="col-md-8">
                    <div className="card shadow">
                        <div className="card-header bg-primary text-white">
                            <h2 className="mb-0">Secure Voting</h2>
                        </div>
                        <div className="card-body">
                            <div className="mb-4 text-center">
                                <ConnectButton client={client} />
                            </div>

                            {message && (
                                <div className={`alert ${message.includes("success") || message.includes("successful")
                                    ? "alert-success"
                                    : "alert-warning"
                                    } mb-4`}>
                                    {message}
                                </div>
                            )}

                            {isLoadingData ? (
                                <div className="text-center py-5">
                                    <div className="spinner-border text-primary" role="status">
                                        <span className="visually-hidden">Loading...</span>
                                    </div>
                                    <p className="mt-3">Loading blockchain data...</p>
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
            </div>
        </div>
    );
}
