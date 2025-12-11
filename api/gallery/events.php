<?php
require __DIR__ . '/config.php';

$events = load_events();

json_ok([
  'events' => $events,  // { eventId: { title, date, location, photos: [] }, ... }
]);
