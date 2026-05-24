<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\CartItem;
use App\Models\Item;
use Illuminate\Support\Facades\Auth;

class CartItemController extends Controller
{
    public function index()
    {
        $cartItems = Auth::user()->cartItems()
            ->with(['item.user:id,name'])
            ->get();

        return response()->json(['cart_items' => $cartItems]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'item_id' => 'required|exists:items,id',
            'quantity' => 'nullable|integer|min:1',
            'price' => 'nullable|numeric|min:0',
            'variation' => 'nullable|string',
        ]);

        $item = Item::where('id', $request->item_id)->where('is_published', true)->first();

        if (!$item) {
            return response()->json(['message' => 'Item not available.'], 404);
        }

        if ($item->user_id === Auth::id()) {
            return response()->json(['message' => 'You cannot add your own item to the cart.'], 422);
        }

        $quantity = $request->quantity ?? 1;

        // Check if item already in cart with same variation
        $cartItem = Auth::user()->cartItems()
            ->where('item_id', $item->id)
            ->where('variation', $request->variation)
            ->first();

        $attributes = $item->attributes ?? [];
        $hasSpecificStock = $request->variation && isset($attributes['size_stocks']) && isset($attributes['size_stocks'][$request->variation]);

        if ($cartItem) {
            // Check stock before updating
            $newQuantity = $cartItem->quantity + $quantity;
            if ($hasSpecificStock) {
                if ($attributes['size_stocks'][$request->variation] < $newQuantity) {
                    return response()->json(['message' => 'Not enough stock available to add more of this variation.'], 422);
                }
            } elseif ($item->stock < $newQuantity) {
                return response()->json(['message' => 'Not enough stock available to add more.'], 422);
            }
            $cartItem->quantity += $quantity;
            $cartItem->save();
        } else {
            if ($hasSpecificStock) {
                if ($attributes['size_stocks'][$request->variation] < $quantity) {
                    return response()->json(['message' => 'Not enough stock available for this variation.'], 422);
                }
            } elseif ($item->stock < $quantity) {
                return response()->json(['message' => 'Not enough stock available.'], 422);
            }
            $cartItem = Auth::user()->cartItems()->create([
                'item_id' => $item->id,
                'quantity' => $quantity,
                'price' => $request->price ?? $item->price,
                'variation' => $request->variation,
            ]);
        }

        $cartItem->load('item.user:id,name');

        return response()->json(['message' => 'Item added to cart.', 'cart_item' => $cartItem], 201);
    }

    public function update(Request $request, $id)
    {
        $request->validate([
            'quantity' => 'required|integer|min:1',
        ]);

        $cartItem = Auth::user()->cartItems()->find($id);

        if (!$cartItem) {
            return response()->json(['message' => 'Cart item not found.'], 404);
        }

        $item = Item::find($cartItem->item_id);

        $attributes = $item->attributes ?? [];
        $hasSpecificStock = $cartItem->variation && isset($attributes['size_stocks']) && isset($attributes['size_stocks'][$cartItem->variation]);

        if ($hasSpecificStock) {
            if ($attributes['size_stocks'][$cartItem->variation] < $request->quantity) {
                return response()->json(['message' => 'Not enough stock available for this variation.'], 422);
            }
        } elseif ($item->stock < $request->quantity) {
            return response()->json(['message' => 'Not enough stock available.'], 422);
        }

        $cartItem->quantity = $request->quantity;
        $cartItem->save();

        return response()->json(['message' => 'Cart updated.', 'cart_item' => $cartItem]);
    }

    public function destroy($id)
    {
        $cartItem = Auth::user()->cartItems()->find($id);

        if (!$cartItem) {
            return response()->json(['message' => 'Cart item not found.'], 404);
        }

        $cartItem->delete();

        return response()->json(['message' => 'Item removed from cart.']);
    }
}
