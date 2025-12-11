<?php
require __DIR__ . '/config.php';

if (!empty($_SESSION['gallery_admin']['email'])) {
  json_ok([
    'admin' => [
      'email' => $_SESSION['gallery_admin']['email'],
    ],
  ]);
} else {
  json_fail('로그인되지 않음', 401);
}
