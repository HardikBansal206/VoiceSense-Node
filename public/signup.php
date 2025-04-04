<?php
require 'db_connect.php'; // Include your database connection

header('Content-Type: application/json'); // Set response header

$response = ['success' => false, 'message' => 'An error occurred.'];

// Get data from the POST request (sent via fetch)
$data = json_decode(file_get_contents('php://input'), true);

$username = $data['username'] ?? null;
$email = $data['email'] ?? null;
$password = $data['password'] ?? null;

// --- Basic Server-Side Validation ---
if (empty($username) || empty($email) || empty($password)) {
    $response['message'] = 'Please fill in all fields.';
    echo json_encode($response);
    exit;
}

if (strlen($username) < 4 || strlen($username) > 16) {
     $response['message'] = 'Username must be between 4 and 16 characters.';
     echo json_encode($response);
     exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $response['message'] = 'Invalid email format.';
    echo json_encode($response);
    exit;
}
// Add more password complexity checks if needed on the server side as well

// --- Check if username or email already exists ---
$stmt = $conn->prepare("SELECT id FROM users WHERE username = ? OR email = ?");
$stmt->bind_param("ss", $username, $email);
$stmt->execute();
$stmt->store_result();

if ($stmt->num_rows > 0) {
    $response['message'] = 'Username or email already exists.';
    $stmt->close();
    $conn->close();
    echo json_encode($response);
    exit;
}
$stmt->close();

// --- Hash the password ---
$hashed_password = password_hash($password, PASSWORD_DEFAULT);

// --- Insert the new user ---
$stmt = $conn->prepare("INSERT INTO users (username, email, password) VALUES (?, ?, ?)");
$stmt->bind_param("sss", $username, $email, $hashed_password);

if ($stmt->execute()) {
    $response['success'] = true;
    $response['message'] = 'User registered successfully!';
} else {
    // In production, log the specific error: $stmt->error
    $response['message'] = 'Error during registration.';
}

$stmt->close();
$conn->close();

echo json_encode($response);
?>