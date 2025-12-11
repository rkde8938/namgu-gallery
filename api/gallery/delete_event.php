<?php
// api/gallery/delete_event.php
require __DIR__ . '/config.php';
require_admin();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  json_fail('POST 메서드만 허용됩니다.', 405);
}

$eventId = trim($_POST['event_id'] ?? '');
if ($eventId === '') {
  json_fail('event_id가 필요합니다.');
}

$events = load_events();

if (!isset($events[$eventId])) {
  json_fail('해당 이벤트를 찾을 수 없습니다.', 404);
}

// 이미지 폴더도 같이 삭제
$eventDir = GALLERY_IMAGE_DIR . '/' . $eventId;
if (is_dir($eventDir)) {
  $files = glob($eventDir . '/*');
  if (is_array($files)) {
    foreach ($files as $file) {
      if (is_file($file)) {
        @unlink($file);
      }
    }
  }
  @rmdir($eventDir);
}

// 이벤트 삭제
unset($events[$eventId]);
save_events($events);

json_ok([
  'eventId' => $eventId,
  'events'  => $events,
]);
