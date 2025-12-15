<?php
require __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  json_fail('POST 메서드만 허용됩니다.', 405);
}

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) $input = $_POST;

$eventId = trim($input['event_id'] ?? '');
if ($eventId === '') {
  json_fail('event_id가 필요합니다.');
}

$events = load_events();

if (!isset($events[$eventId])) {
  json_fail('해당 event_id의 행사가 없습니다.', 404);
}

/* ===== 조회수 ===== */
$events[$eventId]['views'] = (int)($events[$eventId]['views'] ?? 0) + 1;

/* ===== 유니크 방문자 ===== */
$cookieKey = 'uv_' . $eventId;

if (!isset($_COOKIE[$cookieKey])) {
  $events[$eventId]['unique_views'] = (int)($events[$eventId]['unique_views'] ?? 0) + 1;

  // 30일 유지
  setcookie(
    $cookieKey,
    '1',
    time() + 60 * 60 * 24 * 30,
    '/',
    '',
    false,
    true // HttpOnly
  );
}

save_events($events);

json_ok([
  'eventId' => $eventId,
  'event'   => $events[$eventId],
]);
