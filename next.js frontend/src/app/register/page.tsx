"use client";

import { useState, useEffect, useRef } from "react";
import {
    createThirdwebClient,
    getContract,
    prepareContractCall,
} from "thirdweb";
import { ConnectButton, useActiveAccount, useSendTransaction } from "thirdweb/react";
import { defineChain } from "thirdweb/chains";
import axios from "axios";

export default function VoterRegistration() {
    const [fullName, setFullName] = useState("");
    const [voterID, setVoterID] = useState("");
    const [faceDisabled, setFaceDisabled] = useState(false);
    const [fingerDisabled, setFingerDisabled] = useState(false);
    const [faceEncoding, setFaceEncoding] = useState("");
    const [isRegistering, setIsRegistering] = useState(false);
    const [message, setMessage] = useState("");
    const [faceCaptured, setFaceCaptured] = useState(false);
    const [fingerprintScanned, setFingerprintScanned] = useState(false);
    const [isWebcamActive, setIsWebcamActive] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    let stream = null;

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

    useEffect(() => {
        if (activeAccount?.address) {
            //console.log("Connected address:", activeAccount.address);
        }
    }, [activeAccount]);

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

    const stopWebcam = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
            tracks.forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
        setIsWebcamActive(false);
    };

    const captureImage = async () => {
        if (!videoRef.current || !canvasRef.current) {
            setMessage("Video stream not available");
            return;
        }

        const canvas = canvasRef.current;
        const video = videoRef.current;
        const context = canvas.getContext("2d");

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        context!.drawImage(video, 0, 0, canvas.width, canvas.height);

        try {
            const blob = await new Promise<Blob | null>(resolve => {
                canvas.toBlob(resolve, "image/jpeg", 0.95);
            });

            if (!blob) {
                setMessage("Failed to capture image");
                return;
            }

            const imageFile = new File([blob], "face-capture.jpg", { type: "image/jpeg" });

            await sendImageForEncoding(imageFile);

            stopWebcam();
        } catch (error) {
            console.error("Error capturing image:", error);
            setMessage("Failed to capture image");
        }
    };

    const sendImageForEncoding = async (imageFile: File) => {
        try {
            setMessage("Processing face image...");

            const formData = new FormData();
            formData.append("file", imageFile);

            const response = await axios.post("http://localhost:5000/api/encode_face", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });

            setFaceEncoding(response.data.data.encoding.join(", "));
            //console.log("e", faceEncoding);

            if (response.data.success) {
                setFaceEncoding(JSON.stringify(response.data.data.encoding));
                setMessage("Face captured successfully");
                setFaceCaptured(true);
            } else {
                setMessage(`Face capture failed: ${response.data.message}`);
            }
        } catch (error) {
            console.error("Error sending image for encoding:", error);
            setMessage("Failed to process face image");
        }
    };

    const initFingerprintScanner = async () => {
        try {
            setMessage("Initializing fingerprint scanner...");

            const response = await axios.post("http://localhost:5000/api/fingerprint/init", {
                port: "COM11"
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

    const generateUniqueFingerEncoding = () => {
        const prefix = "FPR100000000012C0003FFFF0080E100000104DF000C38D8";
        const uniquePart = Array(20).fill(null)
            .map(() => Math.floor(Math.random() * 16).toString(16))
            .join('');
        const suffix = "26313c47";
        return `${prefix}${uniquePart}${suffix}`;
    };

    const [fingerEncoding, setFingerEncoding] = useState(generateUniqueFingerEncoding());

    const scanFingerprint = async () => {
        try {
            const initialized = await initFingerprintScanner();

            if (!initialized) {
                return;
            }

            setMessage("Please place your finger on the scanner...");

            const response = await axios.post("http://localhost:5000/api/fingerprint/register", {
                voter_id: voterID,
                voter_name: fullName
            });

            if (response.data.success) {
                setFingerEncoding(response.data.fingerprint_encoding || fingerEncoding);
                setMessage("Fingerprint registered successfully");
                setFingerprintScanned(true);
            } else {
                setMessage(`Fingerprint registration failed: ${response.data.message}`);
            }
        } catch (error) {
            console.error("Error registering fingerprint:", error);
            setMessage("Failed to register fingerprint");
        }
    };

    const canRegister = () => {
        return fullName &&
            voterID &&
            activeAccount?.address &&
            (faceCaptured || faceDisabled) &&
            (fingerprintScanned || fingerDisabled);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!canRegister()) {
            setMessage("Please complete all required fields");
            return;
        }

        try {
            setIsRegistering(true);
            setMessage("Preparing to register on blockchain...");

            const transaction = prepareContractCall({
                contract,
                method:
                    "function registerVoter(string name, uint256 voterID, string faceEncoding, string fingerEncoding, bool faceDisabled, bool fingerDisabled)",
                params: [
                    fullName,
                    BigInt(voterID),
                    faceEncoding,
                    fingerEncoding,
                    faceDisabled,
                    fingerDisabled,
                ],
            });
            sendTransaction(transaction);
            //console.log("Registration submitted to blockchain");
            setMessage("Registration submitted to blockchain. Please wait for confirmation.");

            setTimeout(() => {
                setIsRegistering(false);
            }, 3000);

        } catch (error: any) {
            console.error("Error submitting registration:", error);
            setMessage(`Registration failed: ${error.message}`);
            setIsRegistering(false);
        }
    };

    useEffect(() => {
        return () => {
            stopWebcam();
        };
    }, []);

    return (
        <div className="container mt-5">
            <div className="row justify-content-center">
                <div className="col-md-8">
                    <div className="card shadow">
                        <div className="card-header bg-primary text-white">
                            <h2 className="mb-0">Voter Registration</h2>
                        </div>
                        <div className="card-body">
                            <div className="mb-4 text-center">
                                <ConnectButton client={client} />
                            </div>

                            <form onSubmit={handleSubmit}>
                                <div className="mb-3">
                                    <label htmlFor="fullName" className="form-label">Full Name</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        id="fullName"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="mb-3">
                                    <label htmlFor="voterID" className="form-label">Voter ID (e.g., Aadhaar, SSN, National ID)</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        id="voterID"
                                        value={voterID}
                                        onChange={(e) => setVoterID(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="mb-4">
                                    <h5>Disability Accommodations</h5>
                                    <div className="form-check form-switch mb-2">
                                        <input
                                            className="form-check-input"
                                            type="checkbox"
                                            id="fingerDisabled"
                                            checked={fingerDisabled}
                                            onChange={(e) => {
                                                setFingerDisabled(e.target.checked);
                                                if (e.target.checked) {
                                                    setFingerprintScanned(true);
                                                } else {
                                                    setFingerprintScanned(false);
                                                }
                                            }}
                                        />
                                        <label className="form-check-label" htmlFor="fingerDisabled">
                                            Hand/Fingerprint Disability
                                        </label>
                                    </div>
                                    <div className="form-check form-switch">
                                        <input
                                            className="form-check-input"
                                            type="checkbox"
                                            id="faceDisabled"
                                            checked={faceDisabled}
                                            onChange={(e) => {
                                                setFaceDisabled(e.target.checked);
                                                if (e.target.checked) {
                                                    setFaceCaptured(true);
                                                } else {
                                                    setFaceCaptured(false);
                                                }
                                            }}
                                        />
                                        <label className="form-check-label" htmlFor="faceDisabled">
                                            Face Recognition Disability
                                        </label>
                                    </div>
                                </div>

                                <div className="row mb-4">
                                    <div className="col-md-6">
                                        <button
                                            type="button"
                                            className={`btn w-100 ${faceDisabled ? 'btn-secondary' : 'btn-primary'}`}
                                            onClick={startWebcam}
                                            disabled={faceDisabled || isRegistering}
                                        >
                                            <i className="bi bi-camera me-2"></i>
                                            Capture Face
                                        </button>
                                    </div>
                                    <div className="col-md-6">
                                        <button
                                            type="button"
                                            className={`btn w-100 ${fingerDisabled ? 'btn-secondary' : 'btn-primary'}`}
                                            onClick={scanFingerprint}
                                            disabled={fingerDisabled || isRegistering}
                                        >
                                            <i className="bi bi-fingerprint me-2"></i>
                                            Scan Fingerprint
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
                                            <i className="bi bi-camera-fill me-2"></i>
                                            Capture Now
                                        </button>
                                    )}
                                </div>

                                {message && (
                                    <div className={`alert ${message.includes("success") || message.includes("successful")
                                        ? "alert-success"
                                        : "alert-warning"
                                        }`}>
                                        {message}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    className={`btn w-100 ${canRegister() && !isRegistering
                                        ? 'btn-success'
                                        : 'btn-secondary'
                                        }`}
                                    disabled={!canRegister() || isRegistering}
                                >
                                    {isRegistering ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                            Registering...
                                        </>
                                    ) : (
                                        "Register as Voter"
                                    )}
                                </button>

                                <div className="row mt-3">
                                    <div className="col-md-6">
                                        <div className={`alert ${faceCaptured || faceDisabled ? 'alert-success' : 'alert-secondary'} py-2`}>
                                            <small>
                                                {faceDisabled ? "Face Recognition Disabled" : (faceCaptured ? "✓ Face Captured" : "Face Not Captured")}
                                            </small>
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className={`alert ${fingerprintScanned || fingerDisabled ? 'alert-success' : 'alert-secondary'} py-2`}>
                                            <small>
                                                {fingerDisabled ? "Fingerprint Disabled" : (fingerprintScanned ? "✓ Fingerprint Scanned" : "Fingerprint Not Scanned")}
                                            </small>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
