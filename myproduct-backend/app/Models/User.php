<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

   protected $fillable = [
    'name',
    'username',
    'password',
    'email_verified_at',
    'otp_code',
    'otp_expires_at',
    'avatar',
    'followers_count',
    'following_count',
];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $appends = [
        'email',
    ];

    public function getEmailAttribute()
    {
        return $this->username;
    }

   protected $casts = [
    'email_verified_at' => 'datetime',
    'otp_expires_at'    => 'datetime',
    'password'          => 'hashed',
];

    public function items()
    {
        return $this->hasMany(Item::class);
    }

    public function orders()
    {
        return $this->hasMany(Order::class, 'buyer_id');
    }

    public function sellerOrders()
    {
        return $this->hasMany(Order::class, 'seller_id');
    }

    public function cartItems()
    {
        return $this->hasMany(CartItem::class);
    }

    public function reviews()
    {
        return $this->hasManyThrough(Review::class, Item::class);
    }
}