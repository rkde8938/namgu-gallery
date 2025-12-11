<?php
// api/gallery/delete_photo.php
require __DIR__ . '/config.php';
require_admin();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  json_fail('POST 메서드만 허용됩니다.', 405);
}

$eventId = trim($_POST['event_id'] ?? '');
$index   = isset($_POST['photo_index']) ? intval($_POST['photo_index']) : -1;

if ($eventId === '' || $index < 0) {
  json_fail('event_id 및 photo_index가 필요합니다.');
}

$events = load_events();

if (!isset($events[$eventId])) {
  json_fail('해당 이벤트를 찾을 수 없습니다.', 404);
}

$photos = $events[$eventId]['photos'] ?? [];
if (!isset($photos[$index])) {
  json_fail('해당 인덱스의 이미지가 없습니다.', 404);
}

$photo    = $photos[$index];
$eventDir = GALLERY_IMAGE_DIR . '/' . $eventId;

// 실제 파일 삭제 (full / thumb 둘 다)
foreach (['full', 'thumb'] as $key) {
  if (!empty($photo[$key])) {
    $basename = basename($photo[$key]); // 혹시 몰라서 basename
    $path     = $eventDir . '/' . $basename;
    if (is_file($path)) {
      @unlink($path);
    }
  }
}

// 배열에서 해당 사진 제거
array_splice($photos, $index, 1);
$events[$eventId]['photos'] = $photos;

save_events($events);

json_ok([
  'eventId' => $eventId,
  'event'   => $events[$eventId],
  'events'  => $events,
]);
