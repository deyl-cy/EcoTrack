<?php

namespace App\Support;

use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

/**
 * One-line audit logging:  Audit::log('created', "Created bin 'Market'", $bin);
 * It never throws: a logging problem must not break the action the user was doing.
 */
class Audit
{
    public static function log(string $action, string $description, ?Model $subject = null, ?User $actor = null, ?string $username = null): void
    {
        try {
            $actor ??= Auth::user();

            ActivityLog::create([
                'user_id' => $actor?->id,
                'username' => $actor?->username ?? $username,
                'action' => $action,
                'description' => Str::limit($description, 480, '...'),
                'subject_type' => $subject ? class_basename($subject) : null,
                'subject_id' => $subject?->getKey(),
                'ip_address' => request()->ip(),
            ]);
        } catch (\Throwable $e) {
            report($e);
        }
    }

    /** Copy of the attributes BEFORE an update, to compare with diff() afterwards. */
    public static function snapshot(Model $model): array
    {
        return $model->getAttributes();
    }

    /** "level: High → Low, area: A → B" for the fields that changed. Passwords are never shown. */
    public static function diff(array $before, Model $after, array $skip = ['password', 'remember_token', 'updated_at']): string
    {
        // "100.00" vs "100" and "2026-10-06" vs "2026-10-06 00:00:00" are not real changes.
        $norm = fn ($v) => preg_replace('/ 00:00:00$/', '', (string) $v);
        $show = fn ($v) => ($v === null || $v === '') ? '—' : $norm($v);

        $parts = [];
        foreach ($after->getAttributes() as $key => $value) {
            if (in_array($key, $skip, true) || ! array_key_exists($key, $before)) {
                continue;
            }
            $old = $before[$key];
            $same = (is_numeric($old) && is_numeric($value)) ? (float) $old === (float) $value : $norm($old) === $norm($value);
            if (! $same) {
                $parts[] = str_replace('_', ' ', $key).': '.$show($old).' → '.$show($value);
            }
        }

        return $parts ? implode(', ', $parts) : 'no visible changes';
    }
}
