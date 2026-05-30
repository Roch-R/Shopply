<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Review extends Model
{
    use HasFactory;

    protected $fillable = [
        'item_id',
        'user_id',
        'rating',
        'comment',
        'variation',
        'images',
    ];

    protected $casts = [
        'images' => 'array',
    ];

    protected function images(): \Illuminate\Database\Eloquent\Casts\Attribute
    {
        return \Illuminate\Database\Eloquent\Casts\Attribute::make(
            get: function ($value) {
                if (!$value) return [];
                $data = is_string($value) ? json_decode($value, true) : $value;
                if (!is_array($data)) return $data;

                $convertUrl = function (&$item) {
                    if (is_string($item) && str_starts_with($item, 'http://shopply-production.up.railway.app')) {
                        $item = str_replace('http://shopply-production.up.railway.app', 'https://shopply-production.up.railway.app', $item);
                    }
                };

                array_walk_recursive($data, $convertUrl);
                return $data;
            }
        );
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function item()
    {
        return $this->belongsTo(Item::class);
    }
}
