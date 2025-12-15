<?php
// api/gallery/view_event.php
require __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  json_fail('POST 메서드만 허용됩니다.', 405);
}

// POST 또는 JSON 바디에서 event_id 받기
$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
  $input = $_POST;
}

$eventId = trim($input['event_id'] ?? '');
if ($eventId === '') {
  json_fail('event_id가 필요합니다.');
}

$events = load_events();

if (!isset($events[$eventId])) {
  json_fail('해당 event_id의 행사가 없습니다.', 404);
}

/* ===========================
   🔐 세션 기반 중복 조회 방지
   =========================== */

// 세션에 viewed_events 초기화
if (!isset($_SESSION['viewed_events']) || !is_array($_SESSION['viewed_events'])) {
  $_SESSION['viewed_events'] = [];
}

// 이미 본 이벤트면 증가하지 않음
if (!in_array($eventId, $_SESSION['viewed_events'], true)) {
  $_SESSION['viewed_events'][] = $eventId;

  // views 필드 초기화 후 증가
  if (!isset($events[$eventId]['views'])) {
    $events[$eventId]['views'] = 0;
  }
  $events[$eventId]['views']++;

  // 저장
  save_events($events);
}

// 응답
json_ok([
  'eventId' => $eventId,
  'views'   => $events[$eventId]['views'] ?? 0,
]);
