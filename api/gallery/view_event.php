<?php
require __DIR__ . '/config.php';

// CORS/preflight가 필요한 환경이면 OPTIONS 허용
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(200);
  exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_fail('POST만 허용', 405);

// 입력 파싱 (JSON / form 둘 다)
$raw = file_get_contents('php://input');
$input = json_decode($raw, true);
if (!is_array($input)) $input = $_POST;

$eventId = trim($input['event_id'] ?? '');
if ($eventId === '') json_fail('event_id가 필요합니다.');

$events = load_events();
if (!isset($events[$eventId])) json_fail('해당 event_id의 행사가 없습니다.', 404);

$today = date('Y-m-d');

// 총합 초기화
if (!isset($events[$eventId]['views'])) $events[$eventId]['views'] = 0;
if (!isset($events[$eventId]['visitors'])) $events[$eventId]['visitors'] = 0;

// 날짜별 stats 초기화
if (!isset($events[$eventId]['stats']) || !is_array($events[$eventId]['stats'])) {
  $events[$eventId]['stats'] = [];
}
if (!isset($events[$eventId]['stats'][$today]) || !is_array($events[$eventId]['stats'][$today])) {
  $events[$eventId]['stats'][$today] = ['views' => 0, 'visitors' => 0];
}

// 조회수는 매번 증가
$events[$eventId]['views']++;
$events[$eventId]['stats'][$today]['views']++;

// 방문자(유니크/하루 1회): 쿠키로 중복 방지
$cookieKey = 'v_' . $eventId . '_' . $today; // 날짜 포함
$isNewVisitor = false;

if (!isset($_COOKIE[$cookieKey])) {
  $isNewVisitor = true;

  $events[$eventId]['visitors']++;
  $events[$eventId]['stats'][$today]['visitors']++;

  // HTTPS면 Secure를 켜는 게 안전
  $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
    || (isset($_SERVER['SERVER_PORT']) && (int)$_SERVER['SERVER_PORT'] === 443);

  // PHP 7.3+ 권장 옵션 방식
  setcookie($cookieKey, '1', [
    'expires'  => time() + 60 * 60 * 24 * 35, // 35일
    'path'     => '/',
    'secure'   => $isHttps,   // https에서만 true
    'httponly' => true,
    // 일반적인 케이스엔 Lax가 안전. (만약 외부 도메인 iframe/크로스사이트면 None+secure 필요)
    'samesite' => 'Lax',
  ]);
}

save_events($events);

// ✅ 프론트에서 즉시 반영할 수 있게 필요한 값들을 명확히 내려줌
json_ok([
  'eventId' => $eventId,
  'today'   => $today,
  'is_new_visitor' => $isNewVisitor,
  'totals'  => [
    'views'    => (int)$events[$eventId]['views'],
    'visitors' => (int)$events[$eventId]['visitors'],
  ],
  'todayStats' => [
    'views'    => (int)$events[$eventId]['stats'][$today]['views'],
    'visitors' => (int)$events[$eventId]['stats'][$today]['visitors'],
  ],
  'event' => $events[$eventId],
]);
