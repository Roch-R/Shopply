<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Review;
use App\Models\Item;
use Illuminate\Support\Facades\Auth;

class ReviewController extends Controller
{
    // Get reviews for an item
    public function index(int $itemId) // FIX: added int type hint
    {
        $reviews = Review::with('user:id,name')
            ->where('item_id', $itemId)
            ->latest()
            ->get();

        return response()->json(['reviews' => $reviews]);
    }

    // Submit a new review
    public function store(Request $request)
    {
        $request->validate([
            'item_id'          => 'required|exists:items,id',
            'rating'           => 'required|integer|min:1|max:5',
            'comment'          => 'nullable|string',
            'variation'        => 'nullable|string',
            'review_images.*'  => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:20480',
        ]);

        $imagePaths = [];
        if ($request->hasFile('review_images')) {
            foreach ($request->file('review_images') as $img) {
                $imagePaths[] = $img->store('review-images', 'public');
            }
        }

        $review = Review::create([
            'item_id'   => $request->item_id,
            'user_id'   => Auth::id(),
            'rating'    => $request->rating,
            'comment'   => $request->comment,
            'variation' => $request->variation,
            'images'    => $imagePaths,
        ]);

        $review->load('user:id,name');

        return response()->json(['message' => 'Review submitted successfully!', 'review' => $review], 201);
    }
}