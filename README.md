AI-Powered Blockchain Voting System



This project pioneers a secure, transparent, and tamper-proof voting platform by integrating Blockchain technology with Artificial Intelligence (AI) for enhanced biometric authentication. Designed to eliminate credential-based access, this system ensures the integrity of elections through advanced smart contracts and real-time biometric verification.
Features
 * Tamper-Proof Voting: Leverages blockchain to ensure every vote is recorded immutably and cannot be altered or removed.
 * Decentralized Transparency: All transactions (votes) are publicly verifiable on the blockchain, fostering trust and transparency.
 * Biometric Authentication: Integrates AI-powered facial and fingerprint recognition for secure voter identification, eliminating the need for traditional credentials.
 * Real-time Verification: Seamless integration between Arduino and Python backend enables instant authentication of voters.
 * Intuitive User Interfaces: Provides dedicated interfaces for Registration, Verification, and Admin functionalities, ensuring a smooth user experience.
 * Scalable Architecture: Built with modular components, allowing for potential expansion and integration of additional features.
Technologies Used
 * Solidity: For developing secure and transparent smart contracts deployed on the Sepolia testnet.
 * Python:
   * Flask: Powers the backend for handling biometric logic (face and fingerprint processing) and API endpoints.
 * C#:
   * Used with Arduino Uno (via Arduino IDE) for real-time authentication and interfacing with biometric sensors.
   * Potentially used for parts of the UI integration.
 * JavaScript: For frontend development and seamless UI integration.
 * Thirdweb: Potentially used for simplifying blockchain interactions and smart contract deployment (though not explicitly stated how it's used, it's listed in the initial project description).
 * Arduino Uno: The microcontroller responsible for hardware interactions, particularly with biometric sensors.
Architecture Overview
The system operates with a multi-layered architecture:
 * Frontend (JavaScript/C#): Provides the user interfaces for voter registration, verification, and administrative tasks. It communicates with the Flask backend for data processing and with the blockchain via smart contracts.
 * Backend (Python/Flask): Handles the core logic for biometric authentication (face/fingerprint scanning, comparison, and storage). It acts as an intermediary between the Arduino and the smart contracts, sending verification requests and receiving authentication responses.
 * Hardware (Arduino Uno with C#): Interfaces with biometric sensors (e.g., fingerprint scanner, camera for facial recognition) to capture voter biometrics in real-time. It communicates with the Python backend to send biometric data for processing.
 * Blockchain (Solidity/Sepolia Testnet): Stores the immutable records of registered voters and votes cast through smart contracts. It ensures the integrity and transparency of the election process.
Getting Started
To set up and run this project, follow these steps:
Prerequisites
 * Node.js & npm: For JavaScript dependencies.
 * Python 3.x: For the Flask backend.
 * Arduino IDE: For uploading C# code to Arduino Uno.
 * Hardware:

Microcontroller Board: 1 x Arduino Uno
This is the blue board that acts as the brain of the project, running the code to interact with the sensor.
Biometric Sensor: 1 x Optical Fingerprint Scanner Module
This is the black square device that captures the fingerprint image for verification. It's a common module, likely an R307 or a similar model.
Cables and Wires:
1 x USB Type-A to Type-B Cable: The blue cable connecting the Arduino Uno to a computer for power and communication.
4 x Male-to-Female Jumper Wires: These connect the fingerprint sensor's pins to the Arduino's header pins. The colors visible are:
1 x White
1 x Purple
1 x Blue
1 x Black
   
 * MetaMask (or similar wallet): Configured for the Sepolia testnet to interact with smart contracts.
Installation
 * Clone the repository:
   git clone https://github.com/rahulratho15/Blockchain-Voting-System.git
cd your-project-name

 * Smart Contract Deployment (Solidity):
   * Navigate to the smart-contracts directory.
   * Compile and deploy your Solidity smart contracts to the Sepolia testnet. Make sure to note down the contract addresses.
   * If using Thirdweb: Follow Thirdweb's documentation for deploying contracts.
 * Python Backend Setup (Flask):
   * Navigate to the backend directory.
   * Create a virtual environment: python -m venv venv
   * Activate the virtual environment:
     * Windows: venv\Scripts\activate
     * macOS/Linux: source venv/bin/activate
   * Install dependencies: pip install -r requirements.txt
   * Configure your environment variables (e.g., Sepolia RPC URL, private keys for deployment if applicable).
 * Arduino Setup (C#):
   * Open the arduino project file in Arduino IDE.
   * Ensure you have the necessary libraries for your biometric sensors installed (e.g., Adafruit Fingerprint Sensor Library).
   * Upload the code to your Arduino Uno.
   * Connect your biometric sensors to the Arduino as specified in the Arduino code.
 * Frontend Setup (JavaScript/C# UI):
   * Navigate to the frontend directory.
   * Install dependencies: npm install
   * Configure the smart contract addresses and backend API endpoints in the frontend code.
Usage
 * Start the Python Flask backend:
   cd backend
  python app.py

 * Start the Frontend:
   cd frontend
npm run dev # command to run the frontend

 * Registration:(https://localhost:5000/register)
   * Access the Registration interface.
   * Users will register their details and provide their biometric data (face and fingerprint).
   * This data will be processed by the Flask backend and stored securely.
 * Verification/Voting:(https://localhost:5000/verify)
   * During voting, users will interact with the Verification interface.
   * They will provide their biometrics for real-time authentication against the stored data.
   * Upon successful verification, the user will be authorized to cast their vote.
   * Once verified, users can cast their vote.
   * The vote will be recorded as a transaction on the blockchain via smart contracts, ensuring immutability and transparency.
 * Admin:(https://localhost:5000/admin)
   * The Admin interface allows authorized personnel to manage(start,stop,create new election and can see live voting trends)
     elections, view voting results on the blockchain, and potentially register new administrators.
Project Structure
.
├── backend/                  # Python Flask backend for biometric logic and APIs
│   ├── app.py                # Main Flask application
│   ├── face.py
|   |--- finger.py             # Functions for face/fingerprint processing
│   ├── requirements.txt      # Python dependencies
│   └── ...
├── smart-contracts/          # Solidity smart contracts
│   ├── Blockchain.sol         # Smart contract file             # Deployment scripts
│   └── ...
├── arduino/                  # Arduino C# code and configuration
│   ├── c.ino                 # Main Arduino sketch           # Any specific Arduino libraries
│   └── ...
├── frontend/
|___ admin/
       |__page.jsx
|___ register/
       |__page.jsx
|___ verify/
       |__page.jsx
                    # JavaScript/C# for user interfaces
│   ├── public/               # Static assets
│   ├── src/                  # Source code for React/Vue/Angular or C# UI
│   ├── package.json          # Frontend dependencies
│   └── ...
├── README.md                 # This README file
└── ...

Contributing
We welcome contributions to this project! If you'd like to contribute, please follow these steps:
 * Fork the repository.
 * Create a new branch for your feature or bug fix: git checkout -b feature/your-feature-name or bugfix/fix-bug-name.
 * Make your changes and ensure tests pass.
 * Commit your changes: git commit -m "Add new feature"
 * Push to your fork: git push origin feature/your-feature-name
 * Open a Pull Request to the main branch of this repository.
License
This project is licensed under the MIT License.
Contact
For any inquiries or questions, please contact :
rahulrathnavel15@gmail.com
