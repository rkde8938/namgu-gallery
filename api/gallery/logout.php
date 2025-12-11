<?php
require __DIR__ . '/config.php';

$_SESSION['gallery_admin'] = null;
unset($_SESSION['gallery_admin']);

json_ok();
