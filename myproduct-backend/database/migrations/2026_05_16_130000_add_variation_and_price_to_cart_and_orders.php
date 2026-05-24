<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('cart_items', function (Blueprint $table) {
            $table->decimal('price', 10, 2)->nullable()->after('quantity');
            $table->string('variation')->nullable()->after('price');
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->string('variation')->nullable()->after('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('cart_items', function (Blueprint $table) {
            $table->dropColumn(['price', 'variation']);
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn('variation');
        });
    }
};
