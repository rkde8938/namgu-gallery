<?php
// api/gallery/config.php

// 🔹 0) 에러 출력은 브라우저로 보내지 말고, 로그로만
error_reporting(E_ALL & ~E_DEPRECATED & ~E_NOTICE & ~E_WARNING);
ini_set('display_errors', '0');
ini_set('display_startup_errors', '0');

// 🔹 1) 세션 시작
session_start();

// 🔹 2) 혹시 이미 출력된 게 있다면 버퍼 비우기 (BOM/공백 등)
if (function_exists('ob_get_level')) {
  while (ob_get_level()) {
    ob_end_clean();
  }
}

// 🔹 3) 기본 JSON 응답 헤더
header('Content-Type: application/json; charset=utf-8');

// 🔹 4) 개발 중 Vite dev 서버에서 호출할 때(CORS)
if (isset($_SERVER['HTTP_ORIGIN']) && $_SERVER['HTTP_ORIGIN'] === 'http://localhost:5173') {
  header('Access-Control-Allow-Origin: http://localhost:5173');
  header('Access-Control-Allow-Credentials: true');
  header('Access-Control-Allow-Headers: Content-Type');
  header('Access-Control-Allow-Methods: GET, POST, OPTIONS');

  if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
  }
}

// ★ 반드시 바꿔서 쓸 관리자 계정
const GALLERY_ADMIN_EMAIL    = 'kim@takemdesign.com';
const GALLERY_ADMIN_PASSWORD = 'Uxeon7735!@';

// JSON 저장 경로
define('GALLERY_DATA_DIR', __DIR__ . '/data');
define('GALLERY_EVENTS_FILE', GALLERY_DATA_DIR . '/events.json');

// 이미지 저장 경로 & URL
define('GALLERY_IMAGE_DIR', __DIR__ . '/../../gallery-images');
define('GALLERY_IMAGE_URL_BASE', '/gallery-images');

if (!is_dir(GALLERY_DATA_DIR)) {
  @mkdir(GALLERY_DATA_DIR, 0775, true);
}
if (!is_dir(GALLERY_IMAGE_DIR)) {
  @mkdir(GALLERY_IMAGE_DIR, 0775, true);
}

function json_fail($msg, $code = 400, $extra = [])
{
  http_response_code($code);
  echo json_encode(array_merge([
    'ok'    => false,
    'error' => $msg,
  ], $extra), JSON_UNESCAPED_UNICODE);
  exit;
}

function json_ok($data = [])
{
  echo json_encode(array_merge([
    'ok' => true,
  ], $data), JSON_UNESCAPED_UNICODE);
  exit;
}

function require_admin()
{
  if (empty($_SESSION['gallery_admin']['email'])) {
    json_fail('로그인이 필요합니다.', 401);
  }
}

function load_events()
{
  if (!file_exists(GALLERY_EVENTS_FILE)) {
    return [];
  }
  $json = file_get_contents(GALLERY_EVENTS_FILE);
  $data = json_decode($json, true);
  return is_array($data) ? $data : [];
}

function save_events(array $events)
{
  file_put_contents(
    GALLERY_EVENTS_FILE,
    json_encode($events, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
  );
}
