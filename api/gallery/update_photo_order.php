<?php
// api/gallery/update_photo_order.php
require __DIR__ . '/config.php';
require_admin();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  json_fail('POST 메서드만 허용됩니다.', 405);
}

$eventId = trim($_POST['event_id'] ?? '');
$photosJson = $_POST['photos_json'] ?? '';

if ($eventId === '' || $photosJson === '') {
  json_fail('event_id와 photos_json이 필요합니다.');
}

$photos = json_decode($photosJson, true);
if (!is_array($photos)) {
  json_fail('photos_json 형식이 올바르지 않습니다.');
}

$events = load_events();

if (!isset($events[$eventId])) {
  json_fail('해당 이벤트를 찾을 수 없습니다.', 404);
}

// 그대로 덮어쓰기
$events[$eventId]['photos'] = $photos;

save_events($events);

json_ok([
  'eventId' => $eventId,
  'event'   => $events[$eventId],
  'events'  => $events,
]);
