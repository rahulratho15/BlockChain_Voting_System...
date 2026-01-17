from flask import Flask, request, jsonify
import face_recognition
import numpy as np
import cv2
from flask_cors import CORS
import logging
from finger import FingerprintController
from io import BytesIO

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("FaceEncodingAPI")

app = Flask(__name__)

CORS(app)  # Enable CORS for all routes

# Global fingerprint controller instance
fingerprint_controller = None

def process_image(image_data):
    """Process image data and extract face encodings"""
    try:
        # Convert bytes to numpy array
        nparr = np.frombuffer(image_data, np.uint8)
        
        # Decode image
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            raise ValueError("Could not decode image")
            
        # Convert BGR to RGB (face_recognition uses RGB)
        rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        
        # Find face locations
        face_locations = face_recognition.face_locations(rgb_img)
        
        if not face_locations:
            raise ValueError("No faces found in the image")
            
        if len(face_locations) > 1:
            raise ValueError("Multiple faces found. Please provide an image with only one face")
            
        # Get face encodings
        face_encodings = face_recognition.face_encodings(rgb_img, face_locations)
        
        if not face_encodings:
            raise ValueError("Could not extract face encodings")
            
        # Return the first face encoding (128-dimensional array)
        return face_encodings[0]
        
    except Exception as e:
        logger.error(f"Error processing image: {str(e)}")
        raise

@app.route('/api/encode_face', methods=['POST'])
def encode_face():
    """Endpoint to receive an image and return face encodings"""
    try:
        # Check if image file is present in the request
        if 'file' not in request.files:
            return jsonify({
                "success": False,
                "message": "No file provided",
                "error": "Please provide an image file with the 'file' key"
            }), 400
            
        file = request.files['file']
        
        # Check if file is empty
        if file.filename == '':
            return jsonify({
                "success": False,
                "message": "No selected file",
                "error": "No file was selected"
            }), 400
            
        # Read the image file
        image_data = file.read()
        
        # Process the image and get face encodings
        face_encoding = process_image(image_data)
        
        # Convert numpy array to list for JSON serialization
        encoding_list = face_encoding.tolist()
        
        return jsonify({
            "success": True,
            "message": "Face encoding generated successfully",
            "data": {
                "encoding": encoding_list,
                "dimensions": len(encoding_list),
                "face_detected": True
            }
        })
        
    except ValueError as ve:
        return jsonify({
            "success": False,
            "message": str(ve),
            "error": "Face processing error",
            "face_detected": False
        }), 400
        
    except Exception as e:
        logger.error(f"Server error: {str(e)}")
        return jsonify({
            "success": False,
            "message": "Internal server error",
            "error": str(e)
        }), 500
        
        
@app.route('/api/face/compare', methods=['POST'])
def compare_faces():
    """
    Compare two face encodings and return similarity score
    Expects JSON with two encodings and optional threshold
    """
    try:
        data = request.json
        if not data:
            return jsonify({"success": False, "message": "No data provided"}), 400

        # Get encodings from request
        encoding1 = data.get('encoding1')
        encoding2 = data.get('encoding2')
        
        if not encoding1 or not encoding2:
            return jsonify({
                "success": False,
                "message": "Both encodings are required"
            }), 400

        # Get threshold (default 0.6 if not provided)
        threshold = float(data.get('threshold', 0.6))

        # Convert lists to numpy arrays
        enc1 = np.array(encoding1)
        enc2 = np.array(encoding2)

        # Verify encoding dimensions
        if len(enc1) != 128 or len(enc2) != 128:
            return jsonify({
                "success": False,
                "message": "Invalid encoding dimensions (expected 128)"
            }), 400

        # Calculate face distance (lower is better match)
        face_distance = face_recognition.face_distance([enc2], enc1)[0]
        
        # Convert distance to similarity score (higher is better match)
        similarity_score = 1 - face_distance

        # Determine if match based on threshold
        is_match = similarity_score >= threshold

        return jsonify({
            "success": True,
            "message": "Face comparison completed",
            "data": {
                "similarity_score": float(similarity_score),
                "is_match": bool(is_match),
                "threshold": float(threshold),
                "face_distance": float(face_distance)
            }
        })

    except Exception as e:
        logger.error(f"Error in face comparison: {str(e)}")
        return jsonify({
            "success": False,
            "message": f"Server error: {str(e)}"
        }), 500
        
        
        
        
@app.route('/api/fingerprint/init', methods=['POST'])
def init_fingerprint():
    """Initialize the fingerprint sensor with the provided port"""
    global fingerprint_controller
    
    try:
        data = request.json
        if not data or 'port' not in data:
            return jsonify({"success": False, "message": "Port is required"}), 400
            
        port = data['port']
        
        # Initialize fingerprint controller
        fingerprint_controller = FingerprintController(port)
        
        if fingerprint_controller.connect():
            return jsonify({
                "success": True,
                "message": f"Fingerprint sensor initialized on port {port}"
            })
        else:
            return jsonify({
                "success": False,
                "message": f"Failed to initialize fingerprint sensor on port {port}"
            }), 500
            
    except Exception as e:
        logger.error(f"Error initializing fingerprint sensor: {str(e)}")
        return jsonify({"success": False, "message": f"Server error: {str(e)}"}), 500

@app.route('/api/fingerprint/register', methods=['POST'])
def register_fingerprint():
    """Register a new fingerprint"""
    global fingerprint_controller
    
    try:
        # Check if fingerprint controller is initialized
        if not fingerprint_controller:
            return jsonify({
                "success": False,
                "message": "Fingerprint sensor not initialized"
            }), 400
            
        # Get data from request
        data = request.json
        if not data:
            return jsonify({
                "success": False,
                "message": "No data provided"
            }), 400
            
        voter_id = data.get('voter_id')
        voter_name = data.get('voter_name')
        
        if not voter_id or not voter_name:
            return jsonify({
                "success": False,
                "message": "Voter ID and name are required"
            }), 400
            
        # Register fingerprint
        success, message = fingerprint_controller.register_fingerprint(voter_id, voter_name)
        
        if success:
            return jsonify({
                "success": True,
                "message": message,
                "data": {
                    "voter_id": voter_id,
                    "voter_name": voter_name
                }
            })
        else:
            return jsonify({
                "success": False,
                "message": message
            }), 400
            
    except Exception as e:
        logger.error(f"Error in fingerprint registration: {str(e)}")
        return jsonify({
            "success": False,
            "message": f"Server error: {str(e)}"
        }), 500


@app.route('/api/fingerprint/delete_all', methods=['POST'])
def delete_all_fingerprint_data():
    """Delete all fingerprint data from the sensor and local files"""
    global fingerprint_controller
    
    try:
        if not fingerprint_controller:
            return jsonify({
                "success": False,
                "message": "Fingerprint sensor not initialized"
            }), 400
            
        # Use the existing restart_fingerprint method which already handles complete data wipe
        if fingerprint_controller.restart_fingerprint():
            return jsonify({
                "success": True,
                "message": "All fingerprint data successfully deleted"
            })
        else:
            return jsonify({
                "success": False,
                "message": "Failed to delete fingerprint data"
            }), 500
            
    except Exception as e:
        logger.error(f"Error deleting all fingerprint data: {str(e)}")
        return jsonify({
            "success": False,
            "message": f"Server error: {str(e)}"
        }), 500
        
@app.route('/api/fingerprint/verify', methods=['POST'])
def verify_fingerprint():
    """Verify a fingerprint and return the matched ID or default (1000)"""
    global fingerprint_controller
    
    try:
        # Check if fingerprint controller is initialized
        if not fingerprint_controller:
            return jsonify({
                "success": False,
                "message": "Fingerprint sensor not initialized"
            }), 400
            
        # Verify fingerprint
        success, match_data = fingerprint_controller.verify_fingerprint()
        
        if success and match_data:
            return jsonify({
                "success": True,
                "message": "Fingerprint verified successfully",
                "data": {
                    "voter_id": match_data['id'],
                    "voter_name": match_data['name'],
                    "confidence": match_data['confidence'],
                    "is_match": True
                }
            })
        else:
            # Return default ID (1000) when no match is found
            return jsonify({
                "success": True,
                "message": "No match found - returning default ID",
                "data": {
                    "voter_id": 1000,  # Default ID when no match
                    "voter_name": "Unknown",
                    "confidence": 0,
                    "is_match": False
                }
            })
            
    except Exception as e:
        logger.error(f"Error in fingerprint verification: {str(e)}")
        return jsonify({
            "success": False,
            "message": f"Server error: {str(e)}"
        }), 500
@app.route('/api/fingerprint/delete/<int:voter_id>', methods=['DELETE'])
def delete_voter_fingerprint(voter_id):
    """Delete a specific voter's fingerprint by ID"""
    global fingerprint_controller
    
    try:
        if not fingerprint_controller:
            return jsonify({
                "success": False,
                "message": "Fingerprint sensor not initialized"
            }), 400
            
        # Call the FingerprintController method to delete the specific ID
        success, message = fingerprint_controller.delete_fingerprint(voter_id)
        
        if success:
            return jsonify({
                "success": True,
                "message": f"Successfully deleted fingerprint for voter ID {voter_id}"
            })
        else:
            return jsonify({
                "success": False,
                "message": message
            }), 400
            
    except Exception as e:
        logger.error(f"Error deleting fingerprint for voter ID {voter_id}: {str(e)}")
        return jsonify({
            "success": False,
            "message": f"Server error: {str(e)}"
        }), 500
        
@app.route('/api/fingerprint/restart', methods=['POST'])
def restart_fingerprint_system():
    """Erase all fingerprint data and restart the system"""
    global fingerprint_controller
    
    try:
        if not fingerprint_controller:
            return jsonify({
                "success": False,
                "message": "Fingerprint sensor not initialized"
            }), 400
            
        if fingerprint_controller.restart_fingerprint():
            return jsonify({
                "success": True,
                "message": "Fingerprint system restarted successfully"
            })
        else:
            return jsonify({
                "success": False,
                "message": "Failed to restart fingerprint system"
            }), 500
            
    except Exception as e:
        logger.error(f"Error restarting fingerprint system: {str(e)}")
        return jsonify({
            "success": False,
            "message": f"Server error: {str(e)}"
        }), 500        
        
        
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)