<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Item extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'image',
        'price',
        'stock',
        'is_published',
        'user_id',
        'category',
        'attributes',
    ];

    protected $casts = [
        'is_published' => 'boolean',
        'price' => 'decimal:2',
        'attributes' => 'array',
    ];

    protected function image(): \Illuminate\Database\Eloquent\Casts\Attribute
    {
        return \Illuminate\Database\Eloquent\Casts\Attribute::make(
            get: function ($value) {
                if (is_string($value) && str_starts_with($value, 'http://shopply-production.up.railway.app')) {
                    return str_replace('http://shopply-production.up.railway.app', 'https://shopply-production.up.railway.app', $value);
                }
                return $value;
            }
        );
    }

    protected function attributes(): \Illuminate\Database\Eloquent\Casts\Attribute
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

    public function reviews()
    {
        return $this->hasMany(Review::class);
    }

    public function orders()
    {
        return $this->hasMany(Order::class);
    }
}
