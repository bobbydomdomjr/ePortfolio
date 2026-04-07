<?php
declare(strict_types=1);

/**
 * Contact API for Apache / PHP hosting (POST + JSON).
 * Configure forms/mail.config.php (see mail.config.example.php).
 * Run `composer install` at the project root so vendor/ exists.
 */

header('Content-Type: text/plain; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, X-Requested-With, Accept');
    header('Access-Control-Max-Age: ' . (string) 86400);
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST, OPTIONS');
    http_response_code(405);
    echo 'Method Not Allowed';
    exit;
}

$autoload = dirname(__DIR__) . '/vendor/autoload.php';
if (!is_file($autoload)) {
    http_response_code(500);
    echo 'Composer dependencies missing. From the project root run: composer install';
    exit;
}
require $autoload;

$configFile = __DIR__ . '/mail.config.php';
if (!is_file($configFile)) {
    http_response_code(500);
    echo 'Create forms/mail.config.php from forms/mail.config.example.php';
    exit;
}

/** @var array<string, string> $config */
$config = require $configFile;
$gmailUser = trim((string) ($config['gmail_user'] ?? ''));
$gmailPass = str_replace(' ', '', (string) ($config['gmail_app_password'] ?? ''));
if ($gmailUser === '' || $gmailPass === '') {
    http_response_code(500);
    echo 'Invalid mail config (gmail_user / gmail_app_password)';
    exit;
}

$raw = file_get_contents('php://input') ?: '';
$data = json_decode($raw, true);
if (!is_array($data)) {
    http_response_code(400);
    echo 'Invalid JSON';
    exit;
}

$name = trim(substr((string) ($data['name'] ?? ''), 0, 200));
$email = trim(substr((string) ($data['email'] ?? ''), 0, 320));
$subject = trim(substr((string) ($data['subject'] ?? ''), 0, 200));
$message = trim(substr((string) ($data['message'] ?? ''), 0, 10000));

if ($name === '' || $email === '' || $subject === '' || $message === '') {
    http_response_code(400);
    echo 'All fields are required.';
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo 'Invalid email address.';
    exit;
}

$to = trim((string) ($config['contact_to'] ?? ''));
if ($to === '') {
    $to = $gmailUser;
}

$mail = new \PHPMailer\PHPMailer\PHPMailer(true);
try {
    $mail->isSMTP();
    $mail->Host = 'smtp.gmail.com';
    $mail->SMTPAuth = true;
    $mail->Username = $gmailUser;
    $mail->Password = $gmailPass;
    $mail->SMTPSecure = \PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port = 587;
    $mail->CharSet = 'UTF-8';

    $mail->setFrom($gmailUser, 'ePortfolio contact');
    $mail->addAddress($to);
    $mail->addReplyTo($email, $name);
    $mail->Subject = '[ePortfolio] ' . $subject;
    $mail->Body = "Name: {$name}\nEmail: {$email}\n\n{$message}";

    $mail->send();
    echo 'OK';
} catch (\Throwable) {
    http_response_code(502);
    echo 'Could not send email. Check mail.config.php and Gmail app password.';
}
