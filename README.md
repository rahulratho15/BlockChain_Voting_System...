<p align="center">
  <img src="https://img.shields.io/badge/Blockchain-Ethereum-blue?style=for-the-badge&logo=ethereum" alt="Ethereum"/>
  <img src="https://img.shields.io/badge/Solidity-0.8.19-363636?style=for-the-badge&logo=solidity" alt="Solidity"/>
  <img src="https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js" alt="Next.js"/>
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/Python-3.x-3776AB?style=for-the-badge&logo=python" alt="Python"/>
  <img src="https://img.shields.io/badge/Arduino-C++-00979D?style=for-the-badge&logo=arduino" alt="Arduino"/>
  <img src="https://img.shields.io/badge/ThirdWeb-SDK-F213A4?style=for-the-badge" alt="ThirdWeb"/>
</p>

<h1 align="center">🗳️ Blockchain Biometric Voting System</h1>

<p align="center">
  <strong>A Decentralized, Secure, and Transparent Voting Platform with Dual Biometric Authentication</strong>
</p>

<p align="center">
  <em>Combining the power of Blockchain technology with Face Recognition and Fingerprint Authentication for tamper-proof, verifiable elections.</em>
</p>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Technology Stack](#-technology-stack)
- [Project Structure](#-project-structure)
- [Prerequisites](#-prerequisites)
- [Installation & Setup](#-installation--setup)
  - [1. Arduino Fingerprint Sensor Setup](#1-arduino-fingerprint-sensor-setup)
  - [2. Python Backend Setup](#2-python-backend-setup)
  - [3. Blockchain Smart Contract Deployment](#3-blockchain-smart-contract-deployment)
  - [4. Next.js Frontend Setup](#4-nextjs-frontend-setup)
- [Hardware Requirements](#-hardware-requirements)
- [API Reference](#-api-reference)
- [Smart Contract Functions](#-smart-contract-functions)
- [Usage Guide](#-usage-guide)
- [Security Considerations](#-security-considerations)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Overview

The **Blockchain Biometric Voting System** is a comprehensive, end-to-end electronic voting solution that ensures:

- **Immutability**: All votes are recorded on the Ethereum blockchain, making them tamper-proof
- **Transparency**: Vote counts and election results are publicly verifiable
- **Security**: Dual biometric authentication (Face + Fingerprint) prevents voter fraud
- **Privacy**: Individual votes remain anonymous while maintaining verifiability
- **Accessibility**: Supports voters with disabilities through flexible biometric options

This system is designed for secure elections at any scale, from small organizational polls to large-scale government elections.

---

## ✨ Key Features

### 🔐 Dual Biometric Authentication
- **Face Recognition**: 128-dimensional face encoding using deep learning
- **Fingerprint Scanning**: Hardware-based fingerprint capture via Arduino + R307/R305 sensor
- **Disability Support**: Option to use single biometric for voters with disabilities

### ⛓️ Blockchain Integration
- **Smart Contracts**: Solidity-based contracts deployed on Ethereum
- **ThirdWeb SDK**: Seamless blockchain interaction from the frontend
- **Decentralized Storage**: All voter and candidate data stored on-chain

### 🖥️ Modern Web Interface
- **Next.js 14**: Server-side rendering for optimal performance
- **TypeScript**: Type-safe development
- **Bootstrap 5**: Responsive, mobile-first design
- **Chart.js**: Real-time vote visualization

### 🔧 Robust Backend
- **Flask API**: RESTful endpoints for biometric processing
- **Face Recognition Library**: dlib-based face detection and encoding
- **Serial Communication**: Direct Arduino interfacing for fingerprint sensor

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER INTERFACE                                  │
│                         (Next.js + TypeScript)                              │
│                                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌───────────┐ │
│  │   Register   │    │    Admin     │    │  Verification │    │  Results  │ │
│  │    Page      │    │   Panel      │    │     Page      │    │   Page    │ │
│  └──────┬───────┘    └──────┬───────┘    └──────┬────────┘    └─────┬─────┘ │
└─────────┼───────────────────┼───────────────────┼───────────────────┼───────┘
          │                   │                   │                   │
          ▼                   ▼                   ▼                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            THIRDWEB SDK                                      │
│                    (Blockchain Communication Layer)                          │
└─────────────────────────────────────────────────────────────────────────────┘
          │                                       │
          ▼                                       ▼
┌─────────────────────────────┐     ┌─────────────────────────────────────────┐
│    ETHEREUM BLOCKCHAIN       │     │           PYTHON BACKEND                │
│  (BiometricVotingSystem.sol) │     │              (Flask)                    │
│                             │     │                                         │
│  • Voter Registration       │     │  ┌─────────────┐   ┌─────────────────┐  │
│  • Candidate Registration   │     │  │    Face     │   │   Fingerprint   │  │
│  • Vote Casting             │     │  │ Recognition │   │   Controller    │  │
│  • Election Management      │     │  │    API      │   │                 │  │
│  • Results Declaration      │     │  └──────┬──────┘   └────────┬────────┘  │
└─────────────────────────────┘     │         │                   │           │
                                    │         ▼                   ▼           │
                                    │  ┌─────────────┐   ┌─────────────────┐  │
                                    │  │   OpenCV    │   │  Serial Comm    │  │
                                    │  │   + dlib    │   │  (PySerial)     │  │
                                    │  └─────────────┘   └────────┬────────┘  │
                                    └─────────────────────────────┼───────────┘
                                                                  │
                                                                  ▼
                                    ┌─────────────────────────────────────────┐
                                    │        ARDUINO MICROCONTROLLER          │
                                    │              (C++ Code)                  │
                                    │                                         │
                                    │  ┌─────────────────────────────────┐    │
                                    │  │   Adafruit Fingerprint Library  │    │
                                    │  │   • Register Fingerprint        │    │
                                    │  │   • Verify Fingerprint          │    │
                                    │  │   • Delete Fingerprint          │    │
                                    │  └─────────────┬───────────────────┘    │
                                    │                │                        │
                                    │                ▼                        │
                                    │  ┌─────────────────────────────────┐    │
                                    │  │   R307/R305 Fingerprint Sensor  │    │
                                    │  │   (Hardware Module)             │    │
                                    │  └─────────────────────────────────┘    │
                                    └─────────────────────────────────────────┘
```

---

## 🛠️ Technology Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 14.2.x | React Framework with SSR |
| TypeScript | 5.x | Type-safe JavaScript |
| React | 18.3.x | UI Component Library |
| Bootstrap | 5.3.x | CSS Framework |
| ThirdWeb SDK | 5.70.x | Blockchain Integration |
| Chart.js | 4.4.x | Vote Visualization |
| Axios | 1.7.x | HTTP Client |
| pdf-lib | 1.17.x | PDF Generation |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Python | 3.8+ | Backend Runtime |
| Flask | Latest | Web Framework |
| Flask-CORS | Latest | Cross-Origin Support |
| face_recognition | Latest | Face Detection & Encoding |
| OpenCV (cv2) | Latest | Image Processing |
| NumPy | Latest | Numerical Operations |
| PySerial | Latest | Arduino Communication |

### Blockchain
| Technology | Version | Purpose |
|------------|---------|---------|
| Solidity | 0.8.19 | Smart Contract Language |
| Ethereum | - | Blockchain Network |
| ThirdWeb | - | Contract Deployment & Interaction |

### Hardware / Embedded
| Technology | Version | Purpose |
|------------|---------|---------|
| Arduino | C++ | Microcontroller Programming |
| Adafruit Fingerprint Library | Latest | Sensor Communication |
| SoftwareSerial | - | Serial Port Emulation |
| R307/R305 Sensor | - | Fingerprint Capture |

---

## 📁 Project Structure

```
Blockchain-Voting-System/
│
├── 📂 Arduino c++/
│   └── 📂 c/
│       └── 📄 c.ino                    # Arduino fingerprint sensor code
│
├── 📂 blockchain solidity/
│   ├── 📄 blockchain.sol               # Main smart contract
│   └── 📂 artifacts/                   # Compiled contract ABIs
│
├── 📂 next.js frontend/
│   ├── 📂 src/
│   │   └── 📂 app/
│   │       ├── 📂 admin/               # Admin panel page
│   │       ├── 📂 register/            # Voter registration page
│   │       ├── 📂 verification/        # Vote verification page
│   │       └── 📄 page.tsx             # Home page
│   ├── 📄 package.json                 # Frontend dependencies
│   ├── 📄 tsconfig.json                # TypeScript configuration
│   └── 📄 next.config.mjs              # Next.js configuration
│
├── 📂 python backend/
│   ├── 📄 app.py                       # Main Flask application
│   ├── 📄 face.py                      # Face recognition utilities
│   ├── 📄 finger.py                    # Fingerprint controller
│   └── 📄 requirements.txt             # Python dependencies
│
└── 📄 README.md                        # This file
```

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

### Software Requirements

| Software | Version | Download Link |
|----------|---------|---------------|
| Node.js | 18.x or higher | [nodejs.org](https://nodejs.org/) |
| Python | 3.8 or higher | [python.org](https://python.org/) |
| Arduino IDE | 2.x | [arduino.cc](https://www.arduino.cc/en/software) |
| Git | Latest | [git-scm.com](https://git-scm.com/) |
| Visual Studio Build Tools | 2019+ | [visualstudio.microsoft.com](https://visualstudio.microsoft.com/visual-cpp-build-tools/) |
| CMake | Latest | [cmake.org](https://cmake.org/) |

### Python Libraries Prerequisites

> [!IMPORTANT]
> The `face_recognition` library requires `dlib`, which needs C++ build tools to compile.

**Windows Setup for dlib:**
```bash
# Install Visual Studio Build Tools with C++ desktop development

# Install CMake and add to PATH

# Then install dlib
pip install dlib

# Finally install face_recognition
pip install face_recognition
```

**Linux Setup for dlib:**
```bash
sudo apt-get update
sudo apt-get install build-essential cmake
sudo apt-get install libgtk-3-dev libboost-all-dev
pip install dlib face_recognition
```

**macOS Setup for dlib:**
```bash
brew install cmake
brew install boost
pip install dlib face_recognition
```

---

## 🚀 Installation & Setup

### 1. Arduino Fingerprint Sensor Setup

#### Hardware Connection

Connect the **R307/R305 Fingerprint Sensor** to the **Arduino Uno/Nano**:

| Sensor Pin | Arduino Pin | Wire Color (typical) |
|------------|-------------|---------------------|
| VCC (Red) | 5V | Red |
| GND (Black) | GND | Black |
| TX (Green) | Pin 2 (RX) | Green |
| RX (White) | Pin 3 (TX) | White |

> [!WARNING]
> The sensor operates at 3.3V logic levels. While most sensors tolerate 5V, using a logic level converter is recommended for long-term use.

#### Arduino IDE Setup

1. **Install Arduino IDE** from [arduino.cc](https://www.arduino.cc/en/software)

2. **Install Required Libraries:**
   - Open Arduino IDE → **Sketch** → **Include Library** → **Manage Libraries**
   - Search and install:
     - `Adafruit Fingerprint Sensor Library`

3. **Upload the Code:**
   ```bash
   # Navigate to Arduino code
   cd "Arduino c++/c"
   
   # Open c.ino in Arduino IDE and upload to your board
   ```

4. **Verify Connection:**
   - Open Serial Monitor (115200 baud)
   - You should see: `{"status":"ready","message":"Fingerprint sensor connected"}`

#### Arduino Serial Commands

| Command | Description |
|---------|-------------|
| `REGISTER:<id>` | Register a new fingerprint with the given ID |
| `VERIFY` | Verify a fingerprint and return matched ID |
| `DELETE:<id>` | Delete a specific fingerprint by ID |
| `DELETEALL` | Delete all stored fingerprints |
| `DOWNLOAD` | Capture and download fingerprint template |

---

### 2. Python Backend Setup

```bash
# Navigate to backend directory
cd "python backend"

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

#### Requirements.txt Content
```
flask
flask-cors
face_recognition
opencv-python
numpy
pyserial
```

#### Environment Configuration

Create a `.env` file in the `python backend` directory:
```env
FLASK_APP=app.py
FLASK_ENV=development
FLASK_DEBUG=1
FINGERPRINT_PORT=COM3  # Change to your Arduino port (e.g., /dev/ttyUSB0 on Linux)
```

#### Start the Backend Server

```bash
# Make sure virtual environment is activated
python app.py
```

The server will start on `http://localhost:5000`

---

### 3. Blockchain Smart Contract Deployment

#### Using ThirdWeb Dashboard

1. **Create a ThirdWeb Account:**
   - Visit [thirdweb.com](https://thirdweb.com/)
   - Connect your wallet (MetaMask recommended)

2. **Deploy the Contract:**
   - Go to **Contracts** → **Deploy**
   - Select **Deploy your own contract**
   - Upload `blockchain solidity/blockchain.sol`
   - Choose your network (Sepolia Testnet for testing, Mainnet for production)
   - Deploy and copy the contract address

3. **Configure Frontend:**
   - Create `.env.local` in `next.js frontend/`:
   ```env
   NEXT_PUBLIC_THIRDWEB_CLIENT_ID=your_client_id
   NEXT_PUBLIC_CONTRACT_ADDRESS=your_deployed_contract_address
   ```

#### Using Hardhat (Alternative)

```bash
# Install Hardhat
npm install --save-dev hardhat

# Initialize Hardhat project
npx hardhat init

# Compile contract
npx hardhat compile

# Deploy to network
npx hardhat run scripts/deploy.js --network sepolia
```

---

### 4. Next.js Frontend Setup

```bash
# Navigate to frontend directory
cd "next.js frontend"

# Install dependencies
npm install

# Create environment file
# Copy .env.example to .env.local and fill in values

# Start development server
npm run dev
```

The frontend will be available at `http://localhost:3000`

#### Environment Variables

Create `.env.local` in the frontend directory:

```env
# ThirdWeb Configuration
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=your_thirdweb_client_id

# Contract Configuration
NEXT_PUBLIC_CONTRACT_ADDRESS=0x_your_deployed_contract_address

# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:5000

# Chain Configuration
NEXT_PUBLIC_CHAIN_ID=11155111  # Sepolia Testnet
```

---

## 🔧 Hardware Requirements

### Fingerprint Sensor Module

| Component | Specification |
|-----------|---------------|
| **Model** | R307 or R305 Optical Fingerprint Sensor |
| **Voltage** | 3.3V - 6V DC |
| **Current** | < 120mA |
| **Interface** | UART (TTL) |
| **Baud Rate** | 9600 - 115200 (default: 57600) |
| **Storage** | 162-500 fingerprint templates |
| **FAR** | < 0.001% |
| **FRR** | < 1.0% |

### Arduino Board

| Component | Specification |
|-----------|---------------|
| **Model** | Arduino Uno R3 / Nano / Mega |
| **Microcontroller** | ATmega328P / ATmega2560 |
| **Digital I/O** | 14-54 pins |
| **USB** | Type-B / Mini-B |

### Webcam (for Face Recognition)

| Component | Specification |
|-----------|---------------|
| **Resolution** | Minimum 720p (1080p recommended) |
| **Frame Rate** | 30 FPS |
| **Connection** | USB 2.0 or higher |

---

## 📡 API Reference

### Face Recognition Endpoints

#### `POST /api/encode_face`
Encode a face image into a 128-dimensional vector.

**Request:**
```bash
curl -X POST http://localhost:5000/api/encode_face \
  -F "file=@face_image.jpg"
```

**Response:**
```json
{
  "success": true,
  "message": "Face encoding generated successfully",
  "data": {
    "encoding": [0.123, -0.456, ...],  // 128 values
    "dimensions": 128,
    "face_detected": true
  }
}
```

#### `POST /api/face/compare`
Compare two face encodings.

**Request:**
```json
{
  "encoding1": [0.123, -0.456, ...],
  "encoding2": [0.789, -0.012, ...],
  "threshold": 0.6
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "similarity_score": 0.85,
    "is_match": true,
    "threshold": 0.6,
    "face_distance": 0.15
  }
}
```

### Fingerprint Endpoints

#### `POST /api/fingerprint/init`
Initialize the fingerprint sensor.

**Request:**
```json
{
  "port": "COM3"
}
```

#### `POST /api/fingerprint/register`
Register a new fingerprint.

**Request:**
```json
{
  "voter_id": 12345,
  "voter_name": "John Doe"
}
```

#### `POST /api/fingerprint/verify`
Verify a fingerprint and get voter ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "voter_id": 12345,
    "voter_name": "John Doe",
    "confidence": 95,
    "is_match": true
  }
}
```

#### `DELETE /api/fingerprint/delete/<voter_id>`
Delete a specific voter's fingerprint.

#### `POST /api/fingerprint/delete_all`
Delete all fingerprint data.

#### `POST /api/fingerprint/restart`
Restart the fingerprint system.

---

## 📜 Smart Contract Functions

### Election Management

| Function | Access | Description |
|----------|--------|-------------|
| `startElection()` | Public | Transition from Registration to Voting phase |
| `endElection()` | Public | End voting and calculate winners |
| `newElection()` | Public | Reset for a new election cycle |
| `getElectionStatus()` | View | Get current election phase |

### Voter Management

| Function | Access | Description |
|----------|--------|-------------|
| `registerVoter(...)` | Registration Phase | Register a new voter with biometrics |
| `removeVoter(voterId)` | Registration Phase | Remove a registered voter |
| `getAllVoters()` | View | Get list of all registered voters |
| `getTotalVoterCount()` | View | Get total number of voters |

### Candidate Management

| Function | Access | Description |
|----------|--------|-------------|
| `registerCandidate(name)` | Registration Phase | Register a new candidate |
| `removeCandidate(candidateId)` | Registration Phase | Remove a candidate |
| `getAllCandidates()` | View | Get list of all candidates |
| `getTotalCandidateCount()` | View | Get total number of candidates |

### Voting

| Function | Access | Description |
|----------|--------|-------------|
| `castVote(voterId, candidateId)` | Voting Phase | Cast a vote |
| `getVoteCounts()` | View | Get current vote counts |
| `getVoterVotingStatus()` | View | Check who has voted |
| `getWinner()` | After Election | Get election results |

---

## 📖 Usage Guide

### For Election Administrators

1. **Deploy the Smart Contract** using ThirdWeb or Hardhat
2. **Start the Backend Server** on the voting machine
3. **Connect the Fingerprint Sensor** via Arduino
4. **Access the Admin Panel** at `/admin`
5. **Register Candidates** during the Registration Phase
6. **Start the Election** when ready
7. **End the Election** to declare results

### For Voters

1. **Registration Phase:**
   - Visit `/register`
   - Enter your details (Name, Voter ID)
   - Complete face capture (webcam)
   - Complete fingerprint capture (sensor)
   - Submit registration

2. **Voting Phase:**
   - Visit `/verification`
   - Verify identity with face recognition
   - Verify identity with fingerprint
   - Select your candidate
   - Cast your vote

### Disability Accommodations

Voters with disabilities can register with:
- **Face only** (if fingerprint is not possible)
- **Fingerprint only** (if face recognition is not possible)

> [!NOTE]
> At least one biometric must be provided for registration.

---

## 🔒 Security Considerations

### Biometric Security

- ✅ Face encodings are 128-dimensional vectors (not images)
- ✅ Fingerprint templates are stored securely on the sensor
- ✅ Only encoding hashes are stored on-chain
- ✅ Threshold-based matching prevents false positives

### Blockchain Security

- ✅ All transactions are immutable and auditable
- ✅ No single point of failure (decentralized)
- ✅ Smart contract modifiers prevent unauthorized actions
- ✅ Each voter can only vote once

### Application Security

- ✅ CORS protection on API endpoints
- ✅ Input validation on all endpoints
- ✅ Error handling prevents information leakage

> [!CAUTION]
> - Always use HTTPS in production
> - Keep API keys and private keys secure
> - Regularly update dependencies
> - Conduct security audits before deployment

---

## 🔧 Troubleshooting

### Fingerprint Sensor Issues

| Issue | Solution |
|-------|----------|
| Sensor not found | Check wiring, ensure correct COM port |
| Communication error | Verify baud rate (57600) |
| Poor image quality | Clean the sensor surface |
| Registration fails | Try different finger, apply firm pressure |

### Face Recognition Issues

| Issue | Solution |
|-------|----------|
| No face detected | Ensure good lighting, face the camera |
| Multiple faces error | Only one person should be in frame |
| dlib installation fails | Install Visual Studio Build Tools + CMake |
| Low similarity score | Retake photo with better lighting |

### Blockchain Issues

| Issue | Solution |
|-------|----------|
| Transaction fails | Check wallet balance for gas fees |
| Contract not found | Verify contract address in .env |
| ThirdWeb error | Check client ID and network configuration |

### General Issues

| Issue | Solution |
|-------|----------|
| CORS error | Ensure Flask-CORS is installed and configured |
| Port in use | Change port in app.py or next.config.mjs |
| Module not found | Reinstall dependencies |

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/AmazingFeature`)
3. **Commit** your changes (`git commit -m 'Add AmazingFeature'`)
4. **Push** to the branch (`git push origin feature/AmazingFeature`)
5. **Open** a Pull Request

### Code Style

- **JavaScript/TypeScript**: ESLint + Prettier
- **Python**: PEP 8
- **Solidity**: Solidity Style Guide
- **Arduino C++**: Arduino Style Guide

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 👥 Authors

- **Rahul** - *Initial Development* - [@rahulratho15](https://github.com/rahulratho15)

---

## 🙏 Acknowledgments

- [ThirdWeb](https://thirdweb.com/) - Blockchain development platform
- [Adafruit](https://www.adafruit.com/) - Fingerprint sensor library
- [dlib](http://dlib.net/) - Face recognition backend
- [OpenZeppelin](https://openzeppelin.com/) - Smart contract best practices

---

<p align="center">
  <strong>⭐ Star this repository if you found it helpful! ⭐</strong>
</p>

<p align="center">
  Made with ❤️ for Secure Elections
</p>
