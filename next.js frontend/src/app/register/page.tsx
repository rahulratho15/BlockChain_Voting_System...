"use client";

import { useState, useEffect, useRef, ChangeEvent, FormEvent } from "react";
import {
    createThirdwebClient,
    getContract,
    prepareContractCall,
} from "thirdweb";
import { ConnectButton, useActiveAccount, useSendTransaction } from "thirdweb/react";
import { defineChain } from "thirdweb/chains";
import axios from "axios";
import styles from "@/styles/register.module.css";

export default function VoterRegistration() {
    const [fullName, setFullName] = useState<string>("");
    const [voterID, setVoterID] = useState<string>("");
    const [faceDisabled, setFaceDisabled] = useState<boolean>(false);
    const [fingerDisabled, setFingerDisabled] = useState<boolean>(false);
    const [faceEncoding, setFaceEncoding] = useState<string>("");
    const [isRegistering, setIsRegistering] = useState<boolean>(false);
    const [message, setMessage] = useState<string>("");
    const [faceCaptured, setFaceCaptured] = useState<boolean>(false);
    const [fingerprintScanned, setFingerprintScanned] = useState<boolean>(false);
    const [showVideo, setShowVideo] = useState<boolean>(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    let stream: MediaStream | null = null;

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

    const stopWebcam = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
            tracks.forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
        setShowVideo(false);
    };

    const captureImage = async () => {
        if (!videoRef.current || !canvasRef.current) {
            setMessage("Video stream not available");
            return;
        }

        const canvas = canvasRef.current;
        const video = videoRef.current;
        const context = canvas.getContext("2d");

        if (!context) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        context.drawImage(video, 0, 0, canvas.width, canvas.height);

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

    const initFingerprintScanner = async (): Promise<boolean> => {
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

    const generateUniqueFingerEncoding = (): string => {
        const prefix = "FPR100000000012C0003FFFF0080E100000104DF000C38D8";
        const uniquePart = Array(20).fill(null)
            .map(() => Math.floor(Math.random() * 16).toString(16))
            .join('');
        const suffix = "26313c47";
        return `${prefix}${uniquePart}${suffix}`;
    };

    const [fingerEncoding, setFingerEncoding] = useState<string>(generateUniqueFingerEncoding());

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

    const canRegister = (): boolean => {
        return Boolean(
            fullName &&
            voterID &&
            activeAccount?.address &&
            (faceCaptured || faceDisabled) &&
            (fingerprintScanned || fingerDisabled)
        );
    };

    const handleSubmit = async (e: FormEvent) => {
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

    // Determine alert class based on message content
    const getAlertClass = (): string => {
        if (message.toLowerCase().includes('success') || message.toLowerCase().includes('successful')) {
            return styles.alertSuccess;
        }
        return styles.alertWarning;
    };

    return (
        <div className={styles.pageContainer}>
            <div className={styles.mainCard}>
                <div className={styles.cardHeader}>
                    <h2 className={styles.cardTitle}>📝 Voter Registration</h2>
                </div>

                <div className={styles.cardBody}>
                    <div className={styles.walletConnect}>
                        <ConnectButton client={client} />
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className={styles.formGroup}>
                            <label htmlFor="fullName" className={styles.formLabel}>Full Name</label>
                            <input
                                type="text"
                                id="fullName"
                                className={styles.formInput}
                                placeholder="Enter your full name"
                                value={fullName}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => setFullName(e.target.value)}
                                required
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label htmlFor="voterID" className={styles.formLabel}>
                                Voter ID (e.g., Aadhaar, SSN, National ID)
                            </label>
                            <input
                                type="text"
                                id="voterID"
                                className={styles.formInput}
                                placeholder="Enter your ID number"
                                value={voterID}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => setVoterID(e.target.value)}
                                required
                            />
                        </div>

                        <div className={styles.disabilitySection}>
                            <h5 className={styles.disabilitySectionTitle}>♿ Disability Accommodations</h5>

                            <div className={styles.switchWrapper}>
                                <input
                                    type="checkbox"
                                    className={styles.switchInput}
                                    id="fingerDisabled"
                                    checked={fingerDisabled}
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                        setFingerDisabled(e.target.checked);
                                        if (e.target.checked) {
                                            setFingerprintScanned(true);
                                        } else {
                                            setFingerprintScanned(false);
                                        }
                                    }}
                                />
                                <label className={styles.switch} htmlFor="fingerDisabled"></label>
                                <span className={styles.switchLabel}>Hand/Fingerprint Disability</span>
                            </div>

                            <div className={styles.switchWrapper}>
                                <input
                                    type="checkbox"
                                    className={styles.switchInput}
                                    id="faceDisabled"
                                    checked={faceDisabled}
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                        setFaceDisabled(e.target.checked);
                                        if (e.target.checked) {
                                            setFaceCaptured(true);
                                        } else {
                                            setFaceCaptured(false);
                                        }
                                    }}
                                />
                                <label className={styles.switch} htmlFor="faceDisabled"></label>
                                <span className={styles.switchLabel}>Face Recognition Disability</span>
                            </div>
                        </div>

                        <div className={styles.biometricGrid}>
                            <button
                                type="button"
                                className={`${styles.biometricBtn} ${faceCaptured ? styles.biometricBtnCompleted : faceDisabled ? styles.biometricBtnCompleted : ''}`}
                                onClick={startWebcam}
                                disabled={faceDisabled || isRegistering || faceCaptured}
                            >
                                <span className={styles.biometricIcon}>📸</span>
                                <span className={styles.biometricLabel}>
                                    {faceDisabled ? 'Exempted' : faceCaptured ? 'Captured ✓' : 'Capture Face'}
                                </span>
                            </button>

                            <button
                                type="button"
                                className={`${styles.biometricBtn} ${fingerprintScanned ? styles.biometricBtnCompleted : fingerDisabled ? styles.biometricBtnCompleted : ''}`}
                                onClick={scanFingerprint}
                                disabled={fingerDisabled || isRegistering || fingerprintScanned}
                            >
                                <span className={styles.biometricIcon}>👆</span>
                                <span className={styles.biometricLabel}>
                                    {fingerDisabled ? 'Exempted' : fingerprintScanned ? 'Scanned ✓' : 'Scan Fingerprint'}
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
                                    className={`${styles.btn} ${styles.btnSuccess} ${styles.btnFull} ${styles.captureBtn}`}
                                    onClick={captureImage}
                                >
                                    📷 Capture Now
                                </button>

                                <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
                            </div>
                        )}

                        {message && (
                            <div className={`${styles.alert} ${getAlertClass()}`}>
                                {message}
                            </div>
                        )}

                        <button
                            type="submit"
                            className={styles.registerBtn}
                            disabled={!canRegister() || isRegistering}
                        >
                            {isRegistering ? (
                                <>
                                    <span className={styles.spinner}></span>
                                    Registering...
                                </>
                            ) : (
                                "Register as Voter"
                            )}
                        </button>

                        <div className={styles.statusGrid}>
                            <div className={`${styles.statusItem} ${faceDisabled ? styles.statusDisabled :
                                faceCaptured ? styles.statusComplete :
                                    styles.statusPending
                                }`}>
                                {faceDisabled ? '🔄 Face Recognition Disabled' :
                                    faceCaptured ? '✅ Face Captured' :
                                        '⏳ Face Not Captured'}
                            </div>
                            <div className={`${styles.statusItem} ${fingerDisabled ? styles.statusDisabled :
                                fingerprintScanned ? styles.statusComplete :
                                    styles.statusPending
                                }`}>
                                {fingerDisabled ? '🔄 Fingerprint Disabled' :
                                    fingerprintScanned ? '✅ Fingerprint Scanned' :
                                        '⏳ Fingerprint Not Scanned'}
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
