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

# Copy requirements and install other dependencies
COPY requirements.txt .

# Install remaining dependencies (skip dlib since already installed)
RUN pip install --no-cache-dir $(grep -v "^dlib$" requirements.txt | tr '\n' ' ')
RUN pip install --no-cache-dir gunicorn

# Copy application code
COPY . .

# Expose port
EXPOSE 5000

# Run the application
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "1", "--timeout", "120", "app:app"]
