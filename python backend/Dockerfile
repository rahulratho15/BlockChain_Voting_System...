# Use Python with pre-built dlib to avoid memory issues
FROM python:3.10-slim-bullseye

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    cmake \
    libopenblas-dev \
    liblapack-dev \
    libx11-dev \
    libgtk-3-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set working directory  
WORKDIR /app

# Install dlib from pre-built wheel first (avoids memory-intensive compilation)
RUN pip install --no-cache-dir dlib-bin

# Copy requirements and convert encoding if needed
COPY requirements.txt .

# Install dependencies directly (dlib-bin provides dlib)
RUN pip install --no-cache-dir \
    flask==3.1.0 \
    flask-cors==5.0.1 \
    numpy>=1.26.0 \
    opencv-python==4.11.0.86 \
    pyserial==3.5 \
    requests==2.32.3 \
    python-dotenv==1.1.0 \
    face-recognition \
    gunicorn

# Copy application code
COPY . .

# Expose port
EXPOSE 5000

# Run the application
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "1", "--timeout", "120", "app:app"]
