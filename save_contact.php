<?php
require 'db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: contact.html');
    exit;
}

$fullName = trim($_POST['fname'] ?? '');
$email    = trim($_POST['femail'] ?? '');
$phone    = trim($_POST['fphone'] ?? '');
$subject  = trim($_POST['subject'] ?? '');
$message  = trim($_POST['message'] ?? '');

if ($fullName === '' || $email === '' || $subject === '' || $message === '') {
    echo '<script>alert("Please complete all required contact details."); window.location.href = "contact.html";</script>';
    exit;
}

try {
    $stmt = $pdo->prepare('INSERT INTO customers (full_name, email, phone) VALUES (?, ?, ?)');
    $stmt->execute([$fullName, $email, $phone]);
    $customerId = $pdo->lastInsertId();

    $contactStmt = $pdo->prepare('INSERT INTO contacts (customer_id, subject, message) VALUES (?, ?, ?)');
    $contactStmt->execute([$customerId, $subject, $message]);

    echo '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Message Sent</title><link rel="stylesheet" href="css/styles.css"></head><body>
    <header><h1>Mo\'s Piercings</h1></header>
    <main style="max-width:600px; margin: 3em auto; text-align:center;">
        <h2>Message sent</h2>
        <p>Thank you, ' . htmlspecialchars($fullName) . '. We have received your message.</p>
        <p><a href="index.html" class="btn">Back Home</a></p>
    </main>
    </body></html>';
} catch (PDOException $e) {
    echo '<script>alert("There was a problem sending your message. Please try again."); window.location.href = "contact.html";</script>';
}
?>
