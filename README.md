<p align="center">
  <img src="https://img.shields.io/badge/Blockchain-Ethereum-blue?style=for-the-badge&logo=ethereum" alt="Ethereum"/>
  <img src="https://img.shields.io/badge/Solidity-0.8.19-363636?style=for-the-badge&logo=solidity" alt="Solidity"/>
  <img src="https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js" alt="Next.js"/>
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/Python-3.x-3776AB?style=for-the-badge&logo=python" alt="Python"/>
  <img src="https://img.shields.io/badge/Arduino-C++-00979D?style=for-the-badge&logo=arduino" alt="Arduino"/>
  <img src="https://img.shields.io/badge/ThirdWeb-SDK-F213A4?style=for-the-badge" alt="ThirdWeb"/>
</p>

<h1 align="center">Blockchain Biometric Voting System</h1>

<p align="center">
  <strong>Decentralized voting platform with biometric verification and on-chain auditability</strong>
</p>

<p align="center">
  <em>An end-to-end voting solution that combines Ethereum smart contracts with face and fingerprint authentication.</em>
</p>

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [System Architecture](#system-architecture)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation and Setup](#installation-and-setup)
  - [1. Arduino Fingerprint Sensor Setup](#1-arduino-fingerprint-sensor-setup)
  - [2. Python Backend Setup](#2-python-backend-setup)
  - [3. Blockchain Smart Contract Deployment](#3-blockchain-smart-contract-deployment)
  - [4. Next.js Frontend Setup](#4-nextjs-frontend-setup)
- [Hardware Requirements](#hardware-requirements)
- [API Reference](#api-reference)
- [Smart Contract Functions](#smart-contract-functions)
- [Usage Guide](#usage-guide)
- [Security Considerations](#security-considerations)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [Authors](#authors)
- [Acknowledgments](#acknowledgments)

---

## Overview

The **Blockchain Biometric Voting System** is an electronic voting platform designed for integrity, transparency, and strong voter verification.

Core guarantees:
- **Immutability**: Votes are recorded on Ethereum and cannot be altered retroactively.
- **Transparency**: Vote counts and election state are verifiable on-chain.
- **Security**: Dual biometric verification (face and fingerprint) reduces impersonation risk.
- **Privacy**: Individual choices are not exposed while maintaining verifiable outcomes.
- **Accessibility**: Supports single-biometric flows for voters with disabilities.

The system is suitable for controlled pilots, institutional elections, and scalable production-oriented deployments with additional hardening.

---

## Key Features

### Dual Biometric Authentication
- **Face Recognition**: 128-dimensional face encoding pipeline.
- **Fingerprint Verification**: Sensor-driven fingerprint capture using Arduino with R307/R305.
- **Accessibility Support**: Optional single-biometric onboarding for eligible users.

### Blockchain Integration
- **Smart Contracts**: Election lifecycle and voting logic implemented in Solidity.
- **ThirdWeb SDK**: Frontend contract interactions and transaction flow management.
- **On-Chain State**: Election, voter, and candidate state managed through contract methods.

### Web Application
- **Next.js 14**: Server-rendered React framework.
- **TypeScript**: Safer development with static typing.
- **Bootstrap 5**: Responsive UI components.
- **Chart.js**: Live vote and election visualization.

### Backend Services
- **Flask API**: Endpoints for biometric workflows and hardware orchestration.
- **Face Processing**: OpenCV + `face_recognition` stack.
- **Serial Communication**: Arduino interface through PySerial.

---

## System Architecture

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER INTERFACE                                │
│                         (Next.js + TypeScript)                             │
│                                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌───────────┐ │
│  │   Register   │    │    Admin     │    │ Verification │    │  Results  │ │
│  │    Page      │    │   Panel      │    │    Page      │    │   Page    │ │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘    └─────┬─────┘ │
└─────────┼───────────────────┼───────────────────┼───────────────────┼───────┘
          │                   │                   │                   │
          ▼                   ▼                   ▼                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              THIRDWEB SDK                                  │
│                    (Blockchain Communication Layer)                        │
└─────────────────────────────────────────────────────────────────────────────┘
          │                                       │
          ▼                                       ▼
┌─────────────────────────────┐     ┌─────────────────────────────────────────┐
│      ETHEREUM BLOCKCHAIN    │     │             PYTHON BACKEND             │
│   (BiometricVotingSystem)   │     │                (Flask)                 │
│                             │     │                                         │
│  • Voter Registration       │     │  • Face Recognition API                │
│  • Candidate Registration   │     │  • Fingerprint Controller              │
│  • Vote Casting             │     │  • OpenCV + dlib                       │
│  • Election Management      │     │  • PySerial                            │
│  • Result Declaration       │     │                                         │
└─────────────────────────────┘     └───────────────────────────┬─────────────┘
                                                                │
                                                                ▼
                                    ┌─────────────────────────────────────────┐
                                    │         ARDUINO MICROCONTROLLER         │
                                    │                (C++ Code)               │
                                    │                                         │
                                    │  • Register fingerprint                 │
                                    │  • Verify fingerprint                   │
                                    │  • Delete fingerprint                   │
                                    │                                         │
                                    │     R307/R305 Fingerprint Sensor        │
                                    └─────────────────────────────────────────┘
```

---

## Technology Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 14.2.x | React framework with SSR |
| TypeScript | 5.x | Type-safe JavaScript |
| React | 18.3.x | UI library |
| Bootstrap | 5.3.x | CSS framework |
| ThirdWeb SDK | 5.70.x | Blockchain integration |
| Chart.js | 4.4.x | Vote visualization |
| Axios | 1.7.x | HTTP client |
| pdf-lib | 1.17.x | PDF generation |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Python | 3.8+ | Runtime |
| Flask | Latest | Web framework |
| Flask-CORS | Latest | CORS support |
| face_recognition | Latest | Face encoding and comparison |
| OpenCV (cv2) | Latest | Image processing |
| NumPy | Latest | Numerical operations |
| PySerial | Latest | Arduino communication |

### Blockchain
| Technology | Version | Purpose |
|------------|---------|---------|
| Solidity | 0.8.19 | Smart contract language |
| Ethereum | - | Blockchain network |
| ThirdWeb | - | Deployment and interaction tooling |

### Hardware / Embedded
| Technology | Version | Purpose |
|------------|---------|---------|
| Arduino | C++ | Microcontroller programming |
| Adafruit Fingerprint Library | Latest | Sensor communication |
| SoftwareSerial | - | Serial emulation |
| R307/R305 Sensor | - | Fingerprint capture |

---

## Project Structure

```text
Blockchain-Voting-System/
│
├── Arduino c++/
│   └── c/
│       └── c.ino                    # Arduino fingerprint sensor code
│
├── blockchain solidity/
│   ├── blockchain.sol               # Main smart contract
│   └── artifacts/                   # Compiled contract artifacts
│
├── next.js frontend/
│   ├── src/
│   │   └── app/
│   │       ├── admin/               # Admin panel page
│   │       ├── register/            # Voter registration page
│   │       ├── verification/        # Vote verification page
│   │       └── page.tsx             # Home page
│   ├── package.json                 # Frontend dependencies
│   ├── tsconfig.json                # TypeScript configuration
│   └── next.config.mjs              # Next.js configuration
│
├── python backend/
│   ├── app.py                       # Main Flask application
│   ├── face.py                      # Face recognition utilities
│   ├── finger.py                    # Fingerprint controller
│   └── requirements.txt             # Python dependencies
│
└── README.md
```

---

## Prerequisites

### Software Requirements

| Software | Version | Download Link |
|----------|---------|---------------|
| Node.js | 18.x or higher | [nodejs.org](https://nodejs.org/) |
| Python | 3.8 or higher | [python.org](https://python.org/) |
| Arduino IDE | 2.x | [arduino.cc](https://www.arduino.cc/en/software) |
| Git | Latest | [git-scm.com](https://git-scm.com/) |
| Visual Studio Build Tools | 2019+ | [visualstudio.microsoft.com](https://visualstudio.microsoft.com/visual-cpp-build-tools/) |
| CMake | Latest | [cmake.org](https://cmake.org/) |

### Python Build Prerequisites

> [!IMPORTANT]
> `face_recognition` depends on `dlib`, which requires C++ build tools.

**Windows**
```bash
pip install dlib
pip install face_recognition
```

**Linux**
```bash
sudo apt-get update
sudo apt-get install build-essential cmake libgtk-3-dev libboost-all-dev
pip install dlib face_recognition
```

**macOS**
```bash
brew install cmake boost
pip install dlib face_recognition
```

---

## Installation and Setup

### 1. Arduino Fingerprint Sensor Setup

#### Hardware Connection

Connect the **R307/R305 Fingerprint Sensor** to **Arduino Uno/Nano**:

| Sensor Pin | Arduino Pin | Wire Color (Typical) |
|------------|-------------|----------------------|
| VCC (Red) | 5V | Red |
| GND (Black) | GND | Black |
| TX (Green) | Pin 2 (RX) | Green |
| RX (White) | Pin 3 (TX) | White |

> [!WARNING]
> Sensor logic is typically 3.3V. Use a level shifter for long-term reliability.

#### Arduino IDE Setup

1. Install Arduino IDE.
2. Install `Adafruit Fingerprint Sensor Library`.
3. Open and upload:
   ```bash
   cd "Arduino c++/c"
   ```
4. Verify serial output at 115200 baud:
   `{"status":"ready","message":"Fingerprint sensor connected"}`

#### Arduino Serial Commands

| Command | Description |
|---------|-------------|
| `REGISTER:<id>` | Register fingerprint with ID |
| `VERIFY` | Verify fingerprint and return matched ID |
| `DELETE:<id>` | Delete fingerprint by ID |
| `DELETEALL` | Delete all stored fingerprints |
| `DOWNLOAD` | Download fingerprint template |

---

### 2. Python Backend Setup

```bash
cd "python backend"
python -m venv venv
```

Activate environment:

- Windows:
  ```bash
  venv\Scripts\activate
  ```
- Linux/macOS:
  ```bash
  source venv/bin/activate
  ```

Install dependencies:

```bash
pip install -r requirements.txt
```

`requirements.txt`:
```txt
flask
flask-cors
face_recognition
opencv-python
numpy
pyserial
```

Create `.env` in `python backend/`:

```env
FLASK_APP=app.py
FLASK_ENV=development
FLASK_DEBUG=1
FINGERPRINT_PORT=COM3
```

Run backend:

```bash
python app.py
```

Default backend URL: `http://localhost:5000`

---

### 3. Blockchain Smart Contract Deployment

#### Option A: ThirdWeb Dashboard

1. Create ThirdWeb account and connect wallet.
2. Deploy `blockchain solidity/blockchain.sol`.
3. Set frontend env values in `next.js frontend/.env.local`:

```env
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=your_client_id
NEXT_PUBLIC_CONTRACT_ADDRESS=your_deployed_contract_address
```

#### Option B: Hardhat

```bash
npm install --save-dev hardhat
npx hardhat init
npx hardhat compile
npx hardhat run scripts/deploy.js --network sepolia
```

---

### 4. Next.js Frontend Setup

```bash
cd "next.js frontend"
npm install
npm run dev
```

Create `next.js frontend/.env.local`:

```env
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=your_thirdweb_client_id
NEXT_PUBLIC_CONTRACT_ADDRESS=0x_your_deployed_contract_address
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_CHAIN_ID=11155111
```

Default frontend URL: `http://localhost:3000`

---

## Hardware Requirements

### Fingerprint Sensor Module

| Component | Specification |
|-----------|---------------|
| Model | R307 or R305 Optical Fingerprint Sensor |
| Voltage | 3.3V - 6V DC |
| Current | < 120mA |
| Interface | UART (TTL) |
| Baud Rate | 9600 - 115200 (default: 57600) |
| Storage | 162-500 templates |
| FAR | < 0.001% |
| FRR | < 1.0% |

### Arduino Board

| Component | Specification |
|-----------|---------------|
| Model | Arduino Uno R3 / Nano / Mega |
| Microcontroller | ATmega328P / ATmega2560 |
| Digital I/O | 14-54 pins |
| USB | Type-B / Mini-B |

### Webcam

| Component | Specification |
|-----------|---------------|
| Resolution | Minimum 720p (1080p recommended) |
| Frame Rate | 30 FPS |
| Connection | USB 2.0 or higher |

---

## API Reference

### Face Recognition

#### `POST /api/encode_face`
Encodes face image to a 128-dimensional vector.

```bash
curl -X POST http://localhost:5000/api/encode_face \
  -F "file=@face_image.jpg"
```

#### `POST /api/face/compare`
Compares two face encodings.

Request:
```json
{
  "encoding1": [0.123, -0.456, "..."],
  "encoding2": [0.789, -0.012, "..."],
  "threshold": 0.6
}
```

Response:
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

### Fingerprint

#### `POST /api/fingerprint/init`
Initialize sensor connection.

#### `POST /api/fingerprint/register`
Register fingerprint for a voter.

#### `POST /api/fingerprint/verify`
Verify fingerprint and return voter identity match.

#### `DELETE /api/fingerprint/delete/<voter_id>`
Delete fingerprint template for a voter.

#### `POST /api/fingerprint/delete_all`
Delete all templates.

#### `POST /api/fingerprint/restart`
Restart fingerprint service.

---

## Smart Contract Functions

### Election Management

| Function | Access | Description |
|----------|--------|-------------|
| `startElection()` | Public | Move from registration to voting |
| `endElection()` | Public | End voting and compute result |
| `newElection()` | Public | Reset election cycle |
| `getElectionStatus()` | View | Current election phase |

### Voter Management

| Function | Access | Description |
|----------|--------|-------------|
| `registerVoter(...)` | Registration phase | Register voter with biometric references |
| `removeVoter(voterId)` | Registration phase | Remove voter |
| `getAllVoters()` | View | List all voters |
| `getTotalVoterCount()` | View | Voter count |

### Candidate Management

| Function | Access | Description |
|----------|--------|-------------|
| `registerCandidate(name)` | Registration phase | Register candidate |
| `removeCandidate(candidateId)` | Registration phase | Remove candidate |
| `getAllCandidates()` | View | List all candidates |
| `getTotalCandidateCount()` | View | Candidate count |

### Voting

| Function | Access | Description |
|----------|--------|-------------|
| `castVote(voterId, candidateId)` | Voting phase | Cast vote |
| `getVoteCounts()` | View | Current vote totals |
| `getVoterVotingStatus()` | View | Check voting status |
| `getWinner()` | Post-election | Return winner |

---

## Usage Guide

### Administrators

1. Deploy smart contract.
2. Start backend service.
3. Connect and validate fingerprint sensor.
4. Open admin panel (`/admin`).
5. Register candidates.
6. Start election.
7. End election and publish results.

### Voters

1. During registration:
   - Open `/register`
   - Submit voter details
   - Complete face capture
   - Complete fingerprint capture
2. During voting:
   - Open `/verification`
   - Complete biometric verification
   - Select candidate and cast vote

### Accessibility

Single-biometric registration is supported where required:
- Face only
- Fingerprint only

> [!NOTE]
> At least one biometric credential is required.

---

## Security Considerations

### Biometric Security
- Face data is processed as embeddings, not raw images for identity matching.
- Fingerprint templates remain on sensor hardware.
- On-chain storage should avoid raw biometric material.

### Blockchain Security
- Election actions are auditable through transaction history.
- Contract guards restrict invalid state transitions.
- Double voting is prevented by contract logic.

### Application Security
- Enable strict input validation.
- Restrict CORS to trusted origins in production.
- Protect secrets (wallet keys, API credentials, RPC endpoints).

> [!CAUTION]
> Use HTTPS in production and perform independent security audits before real-world deployment.

---

## Troubleshooting

### Fingerprint Sensor

| Issue | Action |
|-------|--------|
| Sensor not detected | Verify wiring and serial port |
| Communication failure | Validate baud rate and cable quality |
| Poor capture quality | Clean sensor surface |
| Enrollment failure | Retry with correct finger placement |

### Face Recognition

| Issue | Action |
|-------|--------|
| Face not detected | Improve lighting and camera angle |
| Multiple faces detected | Ensure one subject in frame |
| dlib build fails | Install required C++ build toolchain |
| Low similarity score | Retake image in stable lighting |

### Blockchain

| Issue | Action |
|-------|--------|
| Transaction failure | Check wallet funds and gas settings |
| Contract call error | Verify deployed address and chain ID |
| ThirdWeb errors | Validate client ID and network configuration |

### General

| Issue | Action |
|-------|--------|
| CORS errors | Confirm Flask-CORS configuration |
| Port conflicts | Change backend/frontend port |
| Missing modules | Reinstall dependencies in active environment |

---

## Contributing

Contributions are welcome.

1. Fork repository.
2. Create feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. Commit changes.
4. Push branch.
5. Open pull request.

### Code Style
- TypeScript/JavaScript: ESLint + Prettier
- Python: PEP 8
- Solidity: Solidity style guide
- Arduino C++: Arduino conventions

---

## Authors

- Rahul — Initial development — [@rahulratho15](https://github.com/rahulratho15)  
- Contact: rahulrathnavel15@gmail.com

---

## Acknowledgments

- [ThirdWeb](https://thirdweb.com/) — blockchain development platform
- [Adafruit](https://www.adafruit.com/) — fingerprint tooling
- [dlib](http://dlib.net/) — face recognition backend
- [OpenZeppelin](https://openzeppelin.com/) — smart contract security patterns
