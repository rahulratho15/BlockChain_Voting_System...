import os
import time
import json
import hashlib
import serial
import logging
from datetime import datetime

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("fingerprint_controller.log"),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger("FingerprintController")

class FingerprintController:
    def __init__(self, port, baud=9600):
        """Initialize the controller with the specified serial port"""
        self.port = port
        self.baud = baud
        self.serial = None
        self.registration_file = "registration.json"
        self.verification_file = "verification.json"
        logger.info(f"Initializing fingerprint controller on {port}")
        self.connect()
        
    def connect(self):
        """Connect to the Arduino running the fingerprint sensor code"""
        try:
            self.serial = serial.Serial(self.port, self.baud, timeout=5)
            # Allow Arduino to reset
            time.sleep(2)
            
            # Read initial message from Arduino
            response = self.read_response()
            if response and response.get('status') == 'ready':
                logger.info("✅ Connected to fingerprint sensor")
                return True
            else:
                logger.error("❌ Failed to detect fingerprint sensor")
                return False
        except Exception as e:
            logger.error(f"❌ Error connecting to Arduino: {e}")
            return False
            
    def disconnect(self):
        """Close serial connection"""
        if self.serial and self.serial.is_open:
            self.serial.close()
            logger.info("Disconnected from Arduino")
            
    def send_command(self, command):
        """Send a command to the Arduino"""
        if not self.serial or not self.serial.is_open:
            logger.error("❌ Not connected to Arduino")
            return False
            
        try:
            self.serial.write(f"{command}\n".encode())
            return True
        except Exception as e:
            logger.error(f"❌ Error sending command: {e}")
            return False
            
    def read_response(self):
        """Read a JSON response from the Arduino"""
        if not self.serial or not self.serial.is_open:
            logger.error("❌ Not connected to Arduino")
            return None
            
        try:
            line = self.serial.readline().decode('utf-8').strip()
            if line:
                try:
                    return json.loads(line)
                except json.JSONDecodeError:
                    return {'status': 'error', 'message': f'Invalid JSON: {line}'}
            return None
        except Exception as e:
            logger.error(f"❌ Error reading response: {e}")
            return None
    
    def is_voter_id_registered(self, id):
        """Check if the voter ID already exists in registration file"""
        registered_fingerprints = self._get_registered_fingerprints()
        for fp in registered_fingerprints:
            if fp.get('voterID') == str(id):
                return True
        return False
            
    def register_fingerprint(self, id, voter_name):
        """Register a new fingerprint with the given ID and voter name"""
        logger.info(f"Registering new fingerprint with ID: {id} for voter: {voter_name}")
        
        # Check if the voter ID already exists
        if self.is_voter_id_registered(id):
            logger.warning(f"Voter ID {id} already exists. Registration cancelled.")
            return False, f"Voter ID {id} already exists. Please use a different ID."
        
        if not self.send_command(f"REGISTER:{id}"):
            return False, "Failed to send registration command"
            
        while True:
            response = self.read_response()
            if not response:
                continue
                
            logger.info(f"[{response.get('status', 'unknown')}] {response.get('message', '')}")
                
            if response.get('status') == 'success':
                # Store registration data to JSON file
                if 'raw_encoding' in response:
                    self._store_registration_data(id, voter_name, response)
                return True, "Fingerprint registered successfully"
                
            if response.get('status') == 'error':
                return False, response.get('message', 'Unknown error during registration')
    
    def verify_fingerprint(self):
        """Verify a fingerprint using the sensor's built-in matching"""
        logger.info("Verifying fingerprint...")
        
        # Get all registered fingerprints from JSON file
        registered_fingerprints = self._get_registered_fingerprints()
        
        if not registered_fingerprints:
            logger.warning("No fingerprints registered to verify against.")
            return False, None
        
        # Send VERIFY command to Arduino
        if not self.send_command("VERIFY"):
            return False, None
        
        while True:
            response = self.read_response()
            if not response:
                continue
                
            logger.info(f"[{response.get('status', 'unknown')}] {response.get('message', '')}")
                
            if response.get('status') == 'success':
                # The sensor found a match
                matched_id = response.get('id')
                confidence = response.get('confidence', 0)
                
                # Cap confidence to below 99 as required
                if confidence >= 99:
                    confidence = 97  # Reduce to 97 if 99 or higher
                
                logger.info(f"Match found! ID: {matched_id}, Confidence: {confidence}%")
                
                # Find the name associated with this ID from our registered fingerprints
                voter_name = None
                for fp in registered_fingerprints:
                    if fp.get('voterID') == str(matched_id):
                        voter_name = fp.get('voterName')
                        break
                
                # Store verification data to JSON file
                verification_data = {
                    'status': 'success',
                    'message': f'Match found with ID {matched_id}',
                    'voterID': matched_id,
                    'voterName': voter_name,
                    'confidence': confidence,
                    'fingerprintEncoding': response.get('raw_encoding', ''),
                    'timestamp': datetime.now().isoformat()
                }
                self._store_verification_data(verification_data)
                
                return True, {'id': matched_id, 'name': voter_name, 'confidence': confidence}
                
            elif response.get('status') == 'not_found':
                logger.info("No match found.")
                
                # Store failed verification to JSON file
                verification_data = {
                    'status': 'not_found',
                    'message': 'No match found',
                    'voterID': None,
                    'voterName': None,
                    'confidence': 0,
                    'fingerprintEncoding': response.get('raw_encoding', ''),
                    'timestamp': datetime.now().isoformat()
                }
                self._store_verification_data(verification_data)
                return False, None
                
            elif response.get('status') == 'error':
                return False, None
    
    def restart_fingerprint(self):
        """Erase all stored fingerprints from sensor and delete local JSON files"""
        logger.info("Restarting fingerprint system - erasing all data...")
        
        # Delete local JSON files
        if os.path.exists(self.registration_file):
            os.remove(self.registration_file)
            logger.info(f"Deleted registration file: {self.registration_file}")
        
        if os.path.exists(self.verification_file):
            os.remove(self.verification_file)
            logger.info(f"Deleted verification file: {self.verification_file}")
        
        # Send DELETEALL command to Arduino to erase all fingerprints
        if not self.send_command("DELETEALL"):
            return False
            
        while True:
            response = self.read_response()
            if not response:
                continue
                
            logger.info(f"[{response.get('status', 'unknown')}] {response.get('message', '')}")
                
            if response.get('status') == 'success':
                logger.info("✅ Successfully erased all fingerprint data")
                return True
                
            if response.get('status') == 'error':
                logger.error("❌ Failed to erase fingerprint data")
                return False
    
    def _store_registration_data(self, id, voter_name, response_data):
        """Store registration data in JSON file"""
        try:
            # Create data structure
            registration_data = {
                "voterID": str(id),
                "voterName": voter_name,
                "fingerprintEncoding": response_data.get('raw_encoding', ''),
                "timestamp": datetime.now().isoformat()
            }
            
            # Load existing data if file exists
            existing_data = []
            if os.path.exists(self.registration_file):
                try:
                    with open(self.registration_file, 'r') as f:
                        existing_data = json.load(f)
                except json.JSONDecodeError:
                    # File exists but is invalid JSON, start fresh
                    existing_data = []
            
            # Check if this voter ID already exists and update it
            updated = False
            for i, entry in enumerate(existing_data):
                if entry.get('voterID') == str(id):
                    existing_data[i] = registration_data
                    updated = True
                    break
            
            # If not updated, add as new entry
            if not updated:
                existing_data.append(registration_data)
            
            # Write data back to file
            with open(self.registration_file, 'w') as f:
                json.dump(existing_data, f, indent=2)
                
            logger.info(f"Successfully stored fingerprint data for ID {id} in {self.registration_file}")
            return True
                
        except Exception as e:
            logger.error(f"Error storing fingerprint data to file: {e}")
            return False
    
    def _store_verification_data(self, verification_data):
        """Store verification data in JSON file"""
        try:
            # Load existing data if file exists
            existing_data = []
            if os.path.exists(self.verification_file):
                try:
                    with open(self.verification_file, 'r') as f:
                        existing_data = json.load(f)
                except json.JSONDecodeError:
                    # File exists but is invalid JSON, start fresh
                    existing_data = []
            
            # Add new verification entry
            existing_data.append(verification_data)
            
            # Write data back to file
            with open(self.verification_file, 'w') as f:
                json.dump(existing_data, f, indent=2)
                
            logger.info(f"Successfully logged verification data to {self.verification_file}")
            return True
                
        except Exception as e:
            logger.error(f"Error logging verification data to file: {e}")
            return False
        
        
        
    def delete_fingerprint(self, voter_id):
        """Delete a single fingerprint by voter ID"""
        logger.info(f"Deleting fingerprint for voter ID: {voter_id}")
        
        # 1. First delete from sensor hardware
        if not self.send_command(f"DELETE:{voter_id}"):
            return False, "Failed to send delete command to sensor"
        
        # Wait for response from Arduino
        while True:
            response = self.read_response()
            if not response:
                continue
            
            if response.get('status') == 'success':
                # 2. Then remove from local JSON storage
                if self._remove_from_registration_file(voter_id):
                    return True, f"Successfully deleted fingerprint for voter ID {voter_id}"
                else:
                    return False, "Deleted from sensor but failed to remove from local storage"
            
            if response.get('status') == 'error':
                return False, response.get('message', 'Unknown error during deletion')

    def _remove_from_registration_file(self, voter_id):
        """Remove a specific voter ID from the registration file"""
        try:
            if not os.path.exists(self.registration_file):
                logger.warning(f"Registration file {self.registration_file} not found")
                return False
            
            # Load existing data
            with open(self.registration_file, 'r') as f:
                existing_data = json.load(f)
            
            # Filter out the voter ID
            new_data = [entry for entry in existing_data if entry.get('voterID') != str(voter_id)]
            
            # Write back to file
            with open(self.registration_file, 'w') as f:
                json.dump(new_data, f, indent=2)
            
            logger.info(f"Removed voter ID {voter_id} from registration file")
            return True
        
        except Exception as e:
            logger.error(f"Error removing voter ID from file: {e}")
            return False
    
    def _get_registered_fingerprints(self):
        """Get all registered fingerprints from the JSON file"""
        try:
            if not os.path.exists(self.registration_file):
                logger.warning(f"Registration file {self.registration_file} not found")
                return []
                
            with open(self.registration_file, 'r') as f:
                data = json.load(f)
                
            if isinstance(data, list) and len(data) > 0:
                logger.info(f"Retrieved {len(data)} fingerprint records from file")
                return data
            else:
                logger.warning("No fingerprint data available in file")
                return []
                
        except Exception as e:
            logger.error(f"Error retrieving fingerprint data from file: {e}")
            return []

def display_menu():
    """Display the main menu"""
    print("\n=== Fingerprint Sensor Controller ===")
    print("1. Register new fingerprint")
    print("2. Verify fingerprint")
    print("3. Restart fingerprint system")
    print("0. Exit")
    print("====================================")
    return input("Select an option: ")

def main():
    if len(sys.argv) < 2:
        print("Usage: python fingerprint_controller.py <COM_PORT>")
        print("Example: python fingerprint_controller.py COM3")
        return
        
    port = sys.argv[1]
    controller = FingerprintController(port)
    
    while True:
        choice = display_menu()
        
        if choice == '1':
            try:
                id = int(input("Enter fingerprint ID (1-127): "))
                if 1 <= id <= 127:
                    # Check if the voter ID already exists before attempting registration
                    if controller.is_voter_id_registered(id):
                        print(f"Error: Voter ID {id} already exists. Please use a different ID.")
                    else:
                        voter_name = input("Enter voter name: ")
                        success, message = controller.register_fingerprint(id, voter_name)
                        print(message)
                else:
                    print("ID must be between 1 and 127")
            except ValueError:
                print("Invalid ID. Please enter a number.")
                
        elif choice == '2':
            success, match_data = controller.verify_fingerprint()
            if success and match_data:
                print(f"Match found! ID: {match_data['id']}, Name: {match_data['name']}, Confidence: {match_data['confidence']}%")
            else:
                print("No match found or verification failed")
                
        elif choice == '3':
            confirmation = input("Are you sure you want to restart fingerprint system? This will erase all data. (y/n): ")
            if confirmation.lower() == 'y':
                if controller.restart_fingerprint():
                    print("Successfully restarted fingerprint system")
                else:
                    print("Failed to restart fingerprint system")
            
        elif choice == '0':
            controller.disconnect()
            print("Goodbye!")
            break
            
        else:
            print("Invalid option. Please try again.")

if __name__ == "__main__":
    import sys
    main()