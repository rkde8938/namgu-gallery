<?php
require __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  json_fail('POST 메서드만 허용됩니다.', 405);
}

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
  $input = $_POST;
}

$email    = trim($input['email'] ?? '');
$password = trim($input['password'] ?? '');

if ($email === '' || $password === '') {
  json_fail('이메일과 비밀번호를 입력해 주세요.');
}

if ($email === GALLERY_ADMIN_EMAIL && $password === GALLERY_ADMIN_PASSWORD) {
  $_SESSION['gallery_admin'] = [
    'email'    => $email,
    'login_at' => date('c'),
  ];
  json_ok([
    'admin' => [
      'email' => $email,
    ],
  ]);
} else {
  json_fail('로그인 정보가 올바르지 않습니다.', 401);
}
