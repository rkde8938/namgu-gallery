<?php
// api/gallery/config.php
session_start();

// 기본 JSON 응답
header('Content-Type: application/json; charset=utf-8');

// ▼ 개발 중 Vite dev 서버에서 호출할 때(CORS)
if (isset($_SERVER['HTTP_ORIGIN']) && $_SERVER['HTTP_ORIGIN'] === 'http://localhost:5173') {

  // 🔹 header()는 "이름: 값" 한 줄로!
  header('Access-Control-Allow-Origin: http://localhost:5173');
  header('Access-Control-Allow-Credentials: true');
  header('Access-Control-Allow-Headers: Content-Type');
  header('Access-Control-Allow-Methods: GET, POST, OPTIONS');

  // Preflight(OPTIONS) 요청은 여기서 종료
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
