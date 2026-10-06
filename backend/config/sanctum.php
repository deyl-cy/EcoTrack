<?php

// Only the settings we change; Sanctum fills in the rest of its defaults.
return [
    // Minutes until an API token stops working (default 8 hours). The frontend also signs
    // users out after a period of inactivity; this is the hard limit enforced by the server.
    'expiration' => env('SANCTUM_EXPIRATION', 480),
];
