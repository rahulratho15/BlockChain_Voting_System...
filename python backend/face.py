import cv2
import numpy as np
import json
import os
import time
from datetime import datetime
import logging
import face_recognition

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("face_recognition.log"),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger("FaceRecognitionSystem")

class FaceRecognitionSystem:
    def __init__(self):
        """Initialize the face recognition system with local storage"""
        self.registrations_file = "voter_registrations.json"
        self.verification_log_file = "verification_log.json"
        
        # Ensure storage files exist
        self._initialize_storage()
    
    def _initialize_storage(self):
        """Initialize local storage files if they don't exist"""
        try:
            # Create registrations file if it doesn't exist
            if not os.path.exists(self.registrations_file):
                with open(self.registrations_file, 'w') as f:
                    json.dump([], f)
                logger.info(f"Created new registrations file: {self.registrations_file}")
            
            # Create verification log file if it doesn't exist
            if not os.path.exists(self.verification_log_file):
                with open(self.verification_log_file, 'w') as f:
                    json.dump([], f)
                logger.info(f"Created new verification log file: {self.verification_log_file}")
                
        except Exception as e:
            logger.error(f"Error initializing storage: {e}")
    
    def _encode_face_features(self, face_features):
        """Convert numpy array to string for JSON serialization"""
        if isinstance(face_features, np.ndarray):
            # Convert numpy array to list then to JSON string
            return json.dumps(face_features.tolist())
        return face_features  # Return as is if already a string
    
    def _decode_face_features(self, face_features_str):
        """Convert string representation back to numpy array"""
        if isinstance(face_features_str, str):
            try:
                # Parse JSON string and convert to numpy array
                features_list = json.loads(face_features_str)
                return np.array(features_list)
            except json.JSONDecodeError:
                logger.error("Error decoding face features string")
                return None
        return face_features_str  # Return as is if already a numpy array
    
    def load_registrations(self):
        """Load registrations from local JSON file"""
        try:
            with open(self.registrations_file, 'r') as f:
                registrations = json.load(f)
            
            logger.info(f"Loaded {len(registrations)} face registrations from file")
            return registrations
        except Exception as e:
            logger.error(f"Error loading registrations: {e}")
            return []
    
    def save_registration(self, registration_data):
        """Save registration to local JSON file"""
        try:
            # Load existing registrations
            registrations = self.load_registrations()
            
            # Convert numpy array to string for JSON serialization
            if "face_features" in registration_data and isinstance(registration_data["face_features"], np.ndarray):
                registration_data["face_features"] = self._encode_face_features(registration_data["face_features"])
            
            # Add new registration
            registrations.append(registration_data)
            
            # Save back to file
            with open(self.registrations_file, 'w') as f:
                json.dump(registrations, f, indent=2)
            
            logger.info(f"Successfully registered voter: {registration_data['voter_name']} (ID: {registration_data['voter_id']})")
            return True
        except Exception as e:
            logger.error(f"Error saving registration: {e}")
            return False
    
    def log_verification(self, verification_data):
        """Log verification attempt to local JSON file"""
        try:
            # Load existing verification logs
            try:
                with open(self.verification_log_file, 'r') as f:
                    verification_logs = json.load(f)
            except (FileNotFoundError, json.JSONDecodeError):
                verification_logs = []
            
            # Add timestamp if not provided
            if 'verification_time' not in verification_data:
                verification_data['verification_time'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            
            # Add new verification log
            verification_logs.append(verification_data)
            
            # Save back to file
            with open(self.verification_log_file, 'w') as f:
                json.dump(verification_logs, f, indent=2)
            
            logger.info(f"Verification logged for voter: {verification_data.get('voter_name', 'unknown')}")
            return True
        except Exception as e:
            logger.error(f"Error logging verification: {e}")
            return False
    
    def _prepare_image_for_face_recognition(self, image):
        """Prepare the image for face_recognition processing"""
        if image is None:
            return None
            
        # Convert BGR to RGB (face_recognition requires RGB)
        if len(image.shape) == 3 and image.shape[2] == 3:
            rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            return rgb_image
        return image
    
    def extract_face_features(self, frame):
        """Extract 128-dimensional face encoding features using face_recognition library"""
        try:
            # Prepare the frame for face_recognition
            rgb_frame = self._prepare_image_for_face_recognition(frame)
            if rgb_frame is None:
                raise ValueError("Invalid input image")
            
            # Detect face locations using face_recognition
            face_locations = face_recognition.face_locations(rgb_frame)
            
            # Check if a face is detected
            if len(face_locations) == 0:
                raise ValueError("No face detected in the image")
            
            if len(face_locations) > 1:
                raise ValueError("Multiple faces detected. Please ensure only one person is in the frame")
            
            # Get face encodings (128-dimensional feature vector)
            face_encodings = face_recognition.face_encodings(rgb_frame, face_locations, num_jitters=3)
            
            if not face_encodings:
                raise ValueError("Failed to extract face encodings")
                
            # Get the first face encoding as numpy array
            encoding = face_encodings[0]  # This is a numpy array of 128 dimensions
            
            # Verify we have exactly 128 dimensions
            if len(encoding) != 128:
                raise ValueError(f"Unexpected encoding length: {len(encoding)}, expected 128")
                
            return encoding
            
        except Exception as e:
            logger.error(f"Error in extract_face_features: {str(e)}")
            raise
    
    def compare_features(self, features1, features2, threshold=0.6):
        """Compare two face encodings using face_recognition's face_distance"""
        try:
            # Ensure features are numpy arrays
            if not isinstance(features1, np.ndarray):
                features1 = self._decode_face_features(features1)
                
            if not isinstance(features2, np.ndarray):
                features2 = self._decode_face_features(features2)
            
            # Safety check in case decoding failed
            if features1 is None or features2 is None:
                return False, 0.0
                
            # Calculate face distance (lower is better match)
            face_distance = face_recognition.face_distance([features2], features1)[0]
            
            # Convert distance to similarity score (1 - distance)
            similarity = 1 - face_distance
            
            return similarity > threshold, similarity
            
        except Exception as e:
            logger.error(f"Error comparing features: {str(e)}")
            return False, 0.0
    
    def registration_mode(self):
        """Register a new voter with face biometrics"""
        logger.info("=== REGISTRATION MODE ===")
        voter_name = input("Enter voter name: ")
        voter_id = input("Enter voter ID: ")
        
        # Check if voter ID already exists
        registrations = self.load_registrations()
        for reg in registrations:
            if reg["voter_id"] == voter_id:
                logger.error(f"Error: Voter ID {voter_id} already exists!")
                print(f"Error: Voter ID {voter_id} already exists!")
                return
        
        # Initialize camera
        cap = cv2.VideoCapture(0)
        
        if not cap.isOpened():
            logger.error("Error: Could not open camera.")
            print("Error: Could not open camera.")
            return
        
        # Set camera properties for better quality
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        
        logger.info("Preparing to capture face... Please look at the camera.")
        print("Press 'c' to capture or 'q' to quit.")
        
        # Allow camera time to warm up
        for i in range(5):
            cap.read()
            time.sleep(0.1)
        
        while True:
            ret, frame = cap.read()
            
            if not ret or frame is None:
                logger.error("Failed to grab valid frame")
                time.sleep(0.5)
                continue
            
            # Make a copy of the frame for display
            display_frame = frame.copy()
            
            # Use face_recognition to find faces in the frame
            rgb_frame = self._prepare_image_for_face_recognition(frame)
            face_locations = face_recognition.face_locations(rgb_frame)
            
            # Draw rectangle around detected faces
            for (top, right, bottom, left) in face_locations:
                cv2.rectangle(display_frame, (left, top), (right, bottom), (0, 255, 0), 2)
            
            # Display the frame
            cv2.imshow('Registration - Press c to capture, q to quit', display_frame)
            
            key = cv2.waitKey(1) & 0xFF
            if key == ord('q'):
                logger.info("Registration cancelled.")
                print("Registration cancelled.")
                break
            elif key == ord('c'):
                try:
                    # Process the frame using face_recognition
                    rgb_frame = self._prepare_image_for_face_recognition(frame)
                    face_locations = face_recognition.face_locations(rgb_frame)
                    
                    # Check if a face is detected
                    if len(face_locations) == 0:
                        logger.warning("No face detected! Please try again.")
                        print("No face detected! Please try again.")
                        continue
                    
                    if len(face_locations) > 1:
                        logger.warning("Multiple faces detected! Please ensure only one person is in the frame.")
                        print("Multiple faces detected! Please ensure only one person is in the frame.")
                        continue
                    
                    # Extract the 128-dimensional face encoding
                    face_encoding = face_recognition.face_encodings(rgb_frame, face_locations, num_jitters=3)[0]
                    
                    # Verify we have exactly 128 values
                    if len(face_encoding) != 128:
                        logger.error(f"Error: Expected 128 features but got {len(face_encoding)}")
                        print(f"Error: Expected 128 features but got {len(face_encoding)}")
                        continue
                    
                    # Log a sample of the encoding (just for debugging)
                    logger.info(f"Generated face encoding with {len(face_encoding)} features")
                    
                    # Create registration data with the numpy array
                    registration_data = {
                        "voter_name": voter_name,
                        "voter_id": voter_id,
                        "face_features": face_encoding,  # Will be converted to string in save_registration
                        "registration_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    }
                    
                    # Save to local storage (encoding will be converted to string)
                    if self.save_registration(registration_data):
                        logger.info(f"Registration successful for {voter_name} (ID: {voter_id})!")
                        print(f"Registration successful for {voter_name} (ID: {voter_id})!")
                    else:
                        logger.error(f"Failed to register {voter_name} (ID: {voter_id})!")
                        print(f"Failed to register {voter_name} (ID: {voter_id})!")
                    break
                except Exception as e:
                    logger.error(f"Error extracting face features: {e}")
                    print(f"Error extracting face features: {e}")
                    continue
        
        # Release camera and close windows
        cap.release()
        cv2.destroyAllWindows()
    
    def voting_process(self):
        """Verify voters using face recognition for voting"""
        logger.info("=== VOTING PROCESS ===")
        registrations = self.load_registrations()
        
        if not registrations:
            logger.warning("No registered voters found! Please register voters first.")
            print("No registered voters found! Please register voters first.")
            return
        
        # Initialize camera
        cap = cv2.VideoCapture(0)
        
        if not cap.isOpened():
            logger.error("Error: Could not open camera.")
            print("Error: Could not open camera.")
            return
        
        # Set camera properties
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        
        # Allow camera time to warm up
        for i in range(5):
            cap.read()
            time.sleep(0.1)
        
        logger.info("Initiating face verification... Press 'q' to quit.")
        print("Initiating face verification... Press 'q' to quit.")
        
        voting_active = True
        last_verified_time = 0  # To prevent multiple verifications in quick succession
        last_verified_id = None  # To track the last verified voter ID
        
        while voting_active:
            ret, frame = cap.read()
            
            if not ret or frame is None:
                logger.error("Failed to grab valid frame")
                time.sleep(0.5)
                continue
            
            try:
                # Convert frame to RGB for face_recognition
                rgb_frame = self._prepare_image_for_face_recognition(frame)
                display_frame = frame.copy()
                
                # Detect faces with face_recognition
                face_locations = face_recognition.face_locations(rgb_frame)
                
                if face_locations:
                    # Get face encodings
                    face_encodings = face_recognition.face_encodings(rgb_frame, face_locations)
                    
                    current_time = datetime.now().timestamp()
                    
                    # Process each detected face
                    for i, (top, right, bottom, left) in enumerate(face_locations):
                        if i < len(face_encodings):
                            face_encoding = face_encodings[i]
                            
                            # Check against all registered faces
                            matches = []
                            voter_names = []
                            voter_ids = []
                            similarity_scores = []
                            
                            for reg in registrations:
                                try:
                                    # Get stored face features and decode if needed
                                    stored_features = reg["face_features"]
                                    
                                    # Compare features using face_recognition's face_distance
                                    is_match, similarity = self.compare_features(face_encoding, stored_features, threshold=0.6)
                                    
                                    if is_match:
                                        matches.append(reg)
                                        voter_names.append(reg["voter_name"])
                                        voter_ids.append(reg["voter_id"])
                                        similarity_scores.append(similarity)
                                except Exception as e:
                                    logger.error(f"Error comparing with registered voter: {str(e)}")
                            
                            # Draw rectangle around face - always draw in red initially
                            cv2.rectangle(display_frame, (left, top), (right, bottom), (0, 0, 255), 2)
                            
                            # If we have a match
                            if matches:
                                # Find the best match (highest similarity)
                                best_match_index = similarity_scores.index(max(similarity_scores))
                                voter_name = voter_names[best_match_index]
                                voter_id = voter_ids[best_match_index]
                                
                                # Update rectangle to green for a recognized face
                                cv2.rectangle(display_frame, (left, top), (right, bottom), (0, 255, 0), 2)
                                
                                # Display name and ID above the box
                                label = f"{voter_name} (ID: {voter_id})"
                                y_pos = max(top - 10, 20)  # Ensure text stays within frame
                                cv2.putText(display_frame, label, (left, y_pos), 
                                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
                                
                                # Only log verification if enough time has passed and not the same voter
                                if (current_time - last_verified_time > 3) and voter_id != last_verified_id:
                                    # Log the verification
                                    verification_data = {
                                        "voter_name": voter_name,
                                        "voter_id": voter_id,
                                        "similarity_score": float(similarity_scores[best_match_index]),
                                        "verification_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                                        "verified": True
                                    }
                                    
                                    self.log_verification(verification_data)
                                    
                                    # Print verification message to console
                                    print(f"✓ Voter verified: {voter_name} (ID: {voter_id})")
                                    logger.info(f"Voter verified: {voter_name} (ID: {voter_id})")
                                    
                                    # Update last verified time and ID
                                    last_verified_time = current_time
                                    last_verified_id = voter_id
                            else:
                                # If no match, display "Unknown"
                                cv2.putText(display_frame, "Unknown Person", 
                                            (left, max(top - 10, 20)), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)
                
                # Display the resulting frame
                cv2.imshow('Voting Process - Press q to quit', display_frame)
                
                # Break the loop if 'q' is pressed
                if cv2.waitKey(1) & 0xFF == ord('q'):
                    voting_active = False
                    
            except Exception as e:
                logger.error(f"Error in voting process: {str(e)}")
                continue
        
        # Release camera and close windows
        cap.release()
        cv2.destroyAllWindows()
    
    def run(self):
        """Main application loop"""
        while True:
            print("\n========= FACE RECOGNITION VOTING SYSTEM =========")
            print("1. Registration Mode")
            print("2. Voting Process")
            print("3. Exit")
            
            choice = input("\nEnter your choice (1-3): ")
            
            if choice == '1':
                self.registration_mode()
            elif choice == '2':
                self.voting_process()
            elif choice == '3':
                logger.info("Exiting system. Goodbye!")
                print("Exiting system. Goodbye!")
                break
            else:
                logger.warning("Invalid choice. Please try again.")
                print("Invalid choice. Please try again.")


if __name__ == "__main__":
    try:
        # Create and run the face recognition system
        system = FaceRecognitionSystem()
        system.run()
    except Exception as e:
        logger.error(f"An error occurred: {str(e)}")
        print(f"An error occurred: {str(e)}")
        import traceback
        traceback.print_exc()