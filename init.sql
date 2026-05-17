-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS appliancehub CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create user and grant privileges
CREATE USER IF NOT EXISTS 'appliancehub'@'%' IDENTIFIED BY 'appliancehub123';
GRANT ALL PRIVILEGES ON appliancehub.* TO 'appliancehub'@'%';
FLUSH PRIVILEGES;

-- Also grant to root for local access
GRANT ALL PRIVILEGES ON appliancehub.* TO 'root'@'%' IDENTIFIED BY 'root';
FLUSH PRIVILEGES;
