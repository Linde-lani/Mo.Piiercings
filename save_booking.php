<?php
require 'db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: bookings.html');
    exit;
}

$fullName = trim($_POST['name'] ?? '');
$email    = trim($_POST['email'] ?? '');
$phone    = trim($_POST['phone'] ?? '');
$service  = trim($_POST['service'] ?? '');
$date     = trim($_POST['date'] ?? '');
$time     = trim($_POST['time'] ?? '');
$notes    = trim($_POST['notes'] ?? '');
$cartData = trim($_POST['cart_items'] ?? '[]');

if ($fullName === '' || $email === '' || $service === '') {
    echo '<script>alert("Please fill in your name, email and service."); window.location.href = "bookings.html";</script>';
    exit;
}

try {
    $stmt = $pdo->prepare('INSERT INTO customers (full_name, email, phone) VALUES (?, ?, ?)');
    $stmt->execute([$fullName, $email, $phone]);
    $customerId = $pdo->lastInsertId();

    $cartValue = json_decode(stripslashes($cartData), true);
    if (!is_array($cartValue)) {
        $cartValue = [];
    }

    $bookingStmt = $pdo->prepare(
        'INSERT INTO bookings (customer_id, service, preferred_date, preferred_time, notes, cart_items) VALUES (?, ?, ?, ?, ?, ?)'
    );
    $bookingStmt->execute([
        $customerId,
        $service,
        $date !== '' ? $date : null,
        $time !== '' ? $time : null,
        $notes !== '' ? $notes : null,
        json_encode($cartValue)
    ]);

    echo '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Booking Saved</title><link rel="stylesheet" href="css/styles.css"></head><body>
    <header><h1>Mo\'s Piercings</h1></header>
    <main style="max-width:600px; margin: 3em auto; text-align:center;">
        <h2>Booking received</h2>
        <p>Thank you, ' . htmlspecialchars($fullName) . '. Your booking has been saved successfully.</p>
        <p><a href="products.html" class="btn">Back to Products</a></p>
    </main>
    </body></html>';
} catch (PDOException $e) {
    echo '<script>alert("There was a problem saving your booking. Please try again."); window.location.href = "bookings.html";</script>';
}
?>
