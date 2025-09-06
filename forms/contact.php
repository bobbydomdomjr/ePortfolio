<?php
// Replace contact@example.com with your real receiving email address
$receiving_email_address = 'bobby.domdomjr1@gmail.com';

// Load the PHP Email Form library
if (file_exists($php_email_form = '../assets/vendor/php-email-form/php-email-form.php')) {
  include($php_email_form);
} else {
  die('Unable to load the "PHP Email Form" Library!');
}

$contact = new PHP_Email_Form;
$contact->ajax = true;

$contact->to = $receiving_email_address; // FIXED: use variable, not invalid syntax
$contact->from_name = $_POST['name'];
$contact->from_email = $_POST['email'];
$contact->subject = $_POST['subject'];

// ✅ Enable SMTP with Gmail
$contact->smtp = array(
  'host' => 'smtp.gmail.com',
  'username' => 'bobby.domdomjt1@gmail.com',        // Replace with your Gmail address
  'password' => 'kfffvgfyrtvsypjs',           // Use App Password, not your Gmail login
  'port' => '587'
);

// Add message fields
$contact->add_message($_POST['name'], 'From');
$contact->add_message($_POST['email'], 'Email');
$contact->add_message($_POST['message'], 'Message', 10);

echo $contact->send();
?>
