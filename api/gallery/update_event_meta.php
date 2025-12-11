<?php
// api/gallery/update_event_meta.php
require __DIR__ . '/config.php';
require_admin();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  json_fail('POST 메서드만 허용됩니다.', 405);
}

$eventId  = trim($_POST['event_id'] ?? '');
$title    = trim($_POST['title'] ?? '');
$note     = trim($_POST['note'] ?? '');

if ($eventId === '') {
  json_fail('event_id는 필수입니다.');
}

$events = load_events();

if (!isset($events[$eventId])) {
  json_fail('해당 이벤트를 찾을 수 없습니다.', 404);
}

// 제목/날짜/장소는 값이 들어온 것만 갱신
if ($title !== '') {
  $events[$eventId]['title'] = $title;
}

// 메모는 빈 문자열도 허용 (비우기)
$events[$eventId]['note'] = $note;

save_events($events);

json_ok([
  'eventId' => $eventId,
  'event'   => $events[$eventId],
  'events'  => $events,
]);
