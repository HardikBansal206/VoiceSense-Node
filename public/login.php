<?php
require 'db_connect.php'; // Include your database connection
// Consider starting a session here if using PHP sessions: session_start();

header('Content-Type: application/json'); // Set response header

$response = ['success' => false, 'message' => 'Invalid username or password.'];

// Get data from the POST request
$data = json_decode(file_get_contents('php://input'), true);

$username = $data['username'] ?? null;
$password = $data['password'] ?? null;

if (empty($username) || empty($password)) {
    $response['message'] = 'Please provide username and password.';
    echo json_encode($response);
    exit;
}

// --- Find user by username ---
$stmt = $conn->prepare("SELECT id, password FROM users WHERE username = ?");
$stmt->bind_param("s", $username);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 1) {
    $user = $result->fetch_assoc();

    // --- Verify the password ---
    if (password_verify($password, $user['password'])) {
        $response['success'] = true;
        $response['message'] = 'Login successful!';
        // --- Session/Token Logic ---
        // If using sessions:
        // $_SESSION['user_id'] = $user['id'];
        // $_SESSION['username'] = $username;

        // If generating a token (requires a library or custom implementation):
        // $token = generate_jwt_token($user['id']);
        // $response['token'] = $token; // Send token back to client

    } else {
        // Password doesn't match (keep generic error)
        $response['message'] = 'Invalid username or password.';
    }
} else {
    // User not found (keep generic error)
    $response['message'] = 'Invalid username or password.';
}

$stmt->close();
$conn->close();

echo json_encode($response);
?>