<?php
$servername = "localhost"; // Or your database host
$username = "voicesenseAdmin";
$password = "voicesensePass";
$dbname = "voicesense";

// Create connection
$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
  // In production, log this error instead of echoing
  die("Connection failed: " . $conn->connect_error);
}
?>