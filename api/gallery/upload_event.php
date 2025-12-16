<?php
require __DIR__ . '/config.php';
require_admin();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  json_fail('POST 메서드만 허용됩니다.', 405);
}

$eventId  = trim($_POST['event_id'] ?? '');
$title    = trim($_POST['title'] ?? '');
$note     = trim($_POST['note'] ?? ''); // 🔹 관리자 비공개 메모 (선택)

if ($eventId === '' || $title === '') {
  json_fail('event_id, title는 필수입니다.');
}

if (!preg_match('/^[a-z0-9_\-]+$/', $eventId)) {
  json_fail('event_id는 소문자/숫자/언더스코어/하이픈만 사용할 수 있습니다.');
}

// 파일 체크
if (empty($_FILES['photos']) || empty($_FILES['photos']['name'])) {
  json_fail('이미지 파일을 한 개 이상 업로드해 주세요.');
}

$allowed = ['image/jpeg', 'image/png', 'image/webp'];

// 업로드 폴더: /gallery-images/{eventId}/
$eventDir = GALLERY_IMAGE_DIR . '/' . $eventId;
if (!is_dir($eventDir)) {
  @mkdir($eventDir, 0775, true);
}

// 리사이즈 설정 
$FULL_MAX_WIDTH  = 1600; // 본문용
$THUMB_MAX_WIDTH = 600; // 썸네일용

function make_image_resource($path, $mime)
{
  switch ($mime) {
    case 'image/jpeg':
      return imagecreatefromjpeg($path);
    case 'image/png':
      return imagecreatefrompng($path);
    case 'image/webp':
      return function_exists('imagecreatefromwebp') ? imagecreatefromwebp($path) : null;
    default:
      return null;
  }
}

function save_resized($srcPath, $destPath, $mime, $maxWidth)
{
  [$width, $height] = getimagesize($srcPath);
  if ($width <= 0 || $height <= 0) return false;

  $ratio = $height / $width;

  if ($width > $maxWidth) {
    $newWidth  = $maxWidth;
    $newHeight = (int) round($newWidth * $ratio);
  } else {
    $newWidth  = $width;
    $newHeight = $height;
  }

  $srcImg = make_image_resource($srcPath, $mime);
  if (!$srcImg) return false;

  $dstImg = imagecreatetruecolor($newWidth, $newHeight);

  // PNG 투명도
  if ($mime === 'image/png') {
    imagealphablending($dstImg, false);
    imagesavealpha($dstImg, true);
    $transparent = imagecolorallocatealpha($dstImg, 0, 0, 0, 127);
    imagefill($dstImg, 0, 0, $transparent);
  }

  imagecopyresampled(
    $dstImg,
    $srcImg,
    0,
    0,
    0,
    0,
    $newWidth,
    $newHeight,
    $width,
    $height
  );

  $ext = strtolower(pathinfo($destPath, PATHINFO_EXTENSION));

  $ok = false;
  if ($ext === 'webp' && function_exists('imagewebp')) {
    $ok = imagewebp($dstImg, $destPath, 80);
  } elseif ($ext === 'png') {
    $ok = imagepng($dstImg, $destPath);
  } else {
    $ok = imagejpeg($dstImg, $destPath, 85);
  }

  return $ok;
}

$events = load_events();
$photos = [];

$names    = $_FILES['photos']['name'];
$tmpNames = $_FILES['photos']['tmp_name'];
$types    = $_FILES['photos']['type'];
$errors   = $_FILES['photos']['error'];

$count = is_array($names) ? count($names) : 0;

for ($i = 0; $i < $count; $i++) {
  if ($errors[$i] !== UPLOAD_ERR_OK) continue;

  $name = $names[$i];
  $tmp  = $tmpNames[$i];
  $mime = $types[$i];

  if (!in_array($mime, $allowed, true)) {
    continue;
  }

  $base     = pathinfo($name, PATHINFO_FILENAME); // 확장자 제거
  $safeBase = preg_replace('/[^a-zA-Z0-9_\-]+/', '_', $base);

  $fullFileName  = $safeBase . '_full.webp';
  $thumbFileName = $safeBase . '_thumb.webp';

  $fullPath  = $eventDir . '/' . $fullFileName;
  $thumbPath = $eventDir . '/' . $thumbFileName;

  // 임시 파일 기준 리사이즈
  save_resized($tmp, $fullPath, $mime, $FULL_MAX_WIDTH);
  save_resized($tmp, $thumbPath, $mime, $THUMB_MAX_WIDTH);

  $photos[] = [
    'full'  => GALLERY_IMAGE_URL_BASE . '/' . $eventId . '/' . $fullFileName,
    'thumb' => GALLERY_IMAGE_URL_BASE . '/' . $eventId . '/' . $thumbFileName,
    'alt'   => $title . ' - 이미지',
  ];
}

if (empty($photos)) {
  json_fail('유효한 이미지가 없습니다.');
}

// 기존 이벤트에 이어 붙이기 or 신규 생성
if (!isset($events[$eventId])) {
  $events[$eventId] = [
    'title'    => $title,
    'note'     => $note,  // 🔹 비공개 메모
    'photos'   => [],
    'views'    => 0,  // ✅ 조회수 기본값
  ];
} else {
  // 이미 있는 이벤트에 note를 수정하고 싶으면:
  if ($note !== '') {
    $events[$eventId]['note'] = $note;
  }
}

$events[$eventId]['photos'] = array_merge($events[$eventId]['photos'], $photos);

save_events($events);

json_ok([
  'eventId' => $eventId,
  'event'   => $events[$eventId],
  'events'  => $events,
]);
