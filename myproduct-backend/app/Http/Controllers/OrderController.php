<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Order;
use App\Models\Item;
use App\Models\CartItem;
use Illuminate\Support\Facades\Auth;

class OrderController extends Controller
{
    private function getSizeFromVariation($attributes, $variationStr) {
        if (!isset($attributes['size_stocks']) || !$variationStr) return null;
        foreach ($attributes['size_stocks'] as $size => $stock) {
            $sizeStr = (string)$size;
            if ($variationStr === $sizeStr || str_ends_with($variationStr, ', ' . $sizeStr)) {
                return $size;
            }
        }
        return null;
    }

    // Buy an item
    public function store(Request $request)
    {
        $request->validate([
            'item_id' => 'required|exists:items,id',
            'quantity' => 'nullable|integer|min:1',
            'price' => 'nullable|numeric|min:0',
            'variation' => 'nullable|string',
        ]);

        $item = Item::where('id', $request->item_id)
            ->where('is_published', true)
            ->first();

        if (!$item) {
            return response()->json(['message' => 'Item not available.'], 404);
        }

        if ($item->user_id === Auth::id()) {
            return response()->json(['message' => 'You cannot buy your own item.'], 422);
        }

        $quantity = $request->quantity ?? 1;

        $size = $this->getSizeFromVariation($item->attributes ?? [], $request->variation);

        if ($size) {
            $attributes = $item->attributes;
            if ($attributes['size_stocks'][$size] < $quantity) {
                return response()->json(['message' => 'Not enough stock available for this variation.'], 422);
            }
        } elseif ($item->stock < $quantity) {
            return response()->json(['message' => 'Not enough stock available.'], 422);
        }

        $order = Order::create([
            'buyer_id'  => Auth::id(),
            'item_id'   => $item->id,
            'seller_id' => $item->user_id,
            'price'     => $request->price ?? $item->price,
            'quantity'  => $quantity,
            'status'    => 'pending',
            'variation' => $request->variation,
        ]);

        $item->decrement('stock', $quantity);

        if ($size) {
            $attributes = $item->attributes;
            $attributes['size_stocks'][$size] -= $quantity;
            $item->update(['attributes' => $attributes]);
        }

        $order->load(['item', 'seller:id,name']);

        return response()->json(['message' => 'Order placed successfully!', 'order' => $order], 201);
    }

    // Get orders for the logged-in buyer
    public function myOrders()
    {
        // FIX: replaced Auth::user()->orders() with a direct query to avoid undefined method
        $orders = Order::where('buyer_id', Auth::id())
            ->with(['item', 'seller:id,name'])
            ->latest()
            ->get();

        return response()->json(['orders' => $orders]);
    }

    public function checkoutCart(Request $request)
    {
        $request->validate([
            'cart_item_ids'   => 'required|array',
            'cart_item_ids.*' => 'exists:cart_items,id',
        ]);

        // FIX: replaced Auth::user()->cartItems() with direct CartItem query
        $cartItems = CartItem::where('user_id', Auth::id())
            ->whereIn('id', $request->cart_item_ids)
            ->with('item')
            ->get();

        if ($cartItems->isEmpty()) {
            return response()->json(['message' => 'No valid items found to checkout.'], 400);
        }

        $orders = [];

        // Check stock first
        foreach ($cartItems as $cartItem) {
            $item = $cartItem->item;
            $attributes = $item->attributes ?? [];
            $size = $this->getSizeFromVariation($attributes, $cartItem->variation);
            
            if ($size) {
                if ($attributes['size_stocks'][$size] < $cartItem->quantity) {
                    return response()->json([
                        'message' => "Not enough stock available for item '{$item->name}' variation '{$cartItem->variation}'."
                    ], 422);
                }
            } elseif ($item->stock < $cartItem->quantity) {
                return response()->json([
                    'message' => "Not enough stock available for item '{$item->name}'."
                ], 422);
            }
        }

        // Process orders
        foreach ($cartItems as $cartItem) {
            $item = $cartItem->item;

            $order = Order::create([
                'buyer_id'  => Auth::id(),
                'item_id'   => $item->id,
                'seller_id' => $item->user_id,
                'price'     => $cartItem->price ?? $item->price,
                'quantity'  => $cartItem->quantity,
                'status'    => 'pending',
                'variation' => $cartItem->variation,
            ]);

            $item->decrement('stock', $cartItem->quantity);

            $size = $this->getSizeFromVariation($attributes, $cartItem->variation);
            if ($size) {
                $attributes['size_stocks'][$size] -= $cartItem->quantity;
                $item->update(['attributes' => $attributes]);
            }

            $cartItem->delete();

            $order->load(['item', 'seller:id,name']);
            $orders[] = $order;
        }

        return response()->json(['message' => 'Checkout successful!', 'orders' => $orders], 201);
    }

    // Get orders for the authenticated seller
    public function sellerOrders()
    {
        $orders = Order::where('seller_id', Auth::id())
            ->with(['item', 'buyer:id,name'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json(['orders' => $orders]);
    }

    // Accept an order
    public function acceptOrder(int $id) // FIX: added int type hint
    {
        $order = Order::where('id', $id)->where('seller_id', Auth::id())->firstOrFail();

        if ($order->status !== 'pending') {
            return response()->json(['message' => 'Only pending orders can be accepted.'], 400);
        }

        $order->update(['status' => 'processing']);

        return response()->json(['message' => 'Order accepted', 'order' => $order]);
    }

    // Reject an order
    public function rejectOrder(int $id) // FIX: added int type hint
    {
        $order = Order::where('id', $id)->where('seller_id', Auth::id())->firstOrFail();

        if ($order->status !== 'pending') {
            return response()->json(['message' => 'Only pending orders can be rejected.'], 400);
        }

        $order->update(['status' => 'cancelled']);

        // Restore stock
        $order->item()->increment('stock', $order->quantity);
        $item = $order->item;
        $attributes = $item->attributes ?? [];
        $size = $this->getSizeFromVariation($attributes, $order->variation);
        if ($size) {
            $attributes['size_stocks'][$size] += $order->quantity;
            $item->update(['attributes' => $attributes]);
        }

        return response()->json(['message' => 'Order rejected and stock restored', 'order' => $order]);
    }

    // Ship an order
    public function shipOrder(int $id) // FIX: added int type hint
    {
        $order = Order::where('id', $id)->where('seller_id', Auth::id())->firstOrFail();

        if ($order->status !== 'processing') {
            return response()->json(['message' => 'Only processing orders can be shipped.'], 400);
        }

        $order->update(['status' => 'shipped']);

        return response()->json(['message' => 'Order shipped', 'order' => $order]);
    }

    // Mark order as received (buyer)
    public function receiveOrder(int $id) // FIX: added int type hint + fixed buyer_id
    {
        $order = Order::where('id', $id)->where('buyer_id', Auth::id())->firstOrFail(); // FIX: was 'user_id'

        if ($order->status !== 'shipped') {
            return response()->json(['message' => 'Only shipped orders can be marked as received.'], 400);
        }

        $order->update(['status' => 'delivered']);

        return response()->json(['message' => 'Order marked as received', 'order' => $order]);
    }
}