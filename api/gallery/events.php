<?php
require __DIR__ . '/config.php';

$events = load_events();
$isAdmin = !empty($_SESSION['gallery_admin']['email']);

if (!$isAdmin) {
  foreach ($events as &$ev) {
    unset($ev['note']);   // ✅ 비공개 메모 제거
    unset($ev['stats']);  // (원하면) 방문자 통계도 숨김
  }
  unset($ev);
}

json_ok(['events' => $events]);
