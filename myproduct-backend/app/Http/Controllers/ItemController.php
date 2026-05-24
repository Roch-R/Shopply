<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Item;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

class ItemController extends Controller
{
    // Public shop items
    public function index()
    {
        $items = Item::with(['user' => function ($query) {
            $query->select('id', 'name', 'avatar', 'created_at', 'followers_count')
                  ->withCount([
                      'items', 
                      'reviews', 
                      'sellerOrders as total_orders', 
                      'sellerOrders as accepted_orders' => function ($q) {
                          $q->where('status', '!=', 'cancelled')->where('status', '!=', 'rejected');
                      }
                  ]);
        }])
            ->withCount('reviews')
            ->withAvg('reviews', 'rating')
            ->withSum(['orders as sold_count' => function ($q) {
                $q->where('status', '!=', 'cancelled')->where('status', '!=', 'rejected');
            }], 'quantity')
            ->where('is_published', true)
            ->latest()
            ->get();
        return response()->json(['items' => $items]);
    }

    // Authenticated user's items
    public function userItems()
    {
        $items = Auth::user()->items()
            ->withSum(['orders as sold_count' => function ($q) {
                $q->where('status', '!=', 'cancelled')->where('status', '!=', 'rejected');
            }], 'quantity')
            ->latest()
            ->get();
        return response()->json(['items' => $items]);
    }

    // Create a new item
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'price' => 'required|numeric|min:0',
            'stock' => 'required|integer|min:1',
            'category' => 'required|string',
            'images.*' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:20480',
            'variant_images.*' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:20480',
        ]);

        $attributes = $request->input('attributes') ? json_decode($request->input('attributes'), true) : [];

        $totalStock = $request->stock;
        if (isset($attributes['size_stocks']) && is_array($attributes['size_stocks']) && count($attributes['size_stocks']) > 0) {
            $totalStock = array_sum($attributes['size_stocks']);
        }

        // Handle main images
        $existingMain = $attributes['existing_main_images'] ?? [];
        $newMainFiles = $request->file('images') ?? [];
        $finalMainPaths = $existingMain;

        foreach ($newMainFiles as $img) {
            $finalMainPaths[] = $img->store('item-images', 'public');
        }
        $attributes['main_images'] = $finalMainPaths;
        unset($attributes['existing_main_images']);

        $imagePath = count($finalMainPaths) > 0 ? $finalMainPaths[0] : null;

        // Handle variant images
        $existingVariantPaths = $attributes['existing_variant_paths'] ?? [];
        $variantFiles = $request->file('variant_images') ?? [];
        $fileIndex = 0;
        $finalVariantPaths = [];

        foreach ($attributes['colors'] ?? [] as $idx => $color) {
            if (!empty($existingVariantPaths[$idx])) {
                $finalVariantPaths[] = $existingVariantPaths[$idx];
            } else {
                if (isset($variantFiles[$fileIndex])) {
                    $finalVariantPaths[] = $variantFiles[$fileIndex]->store('item-images', 'public');
                    $fileIndex++;
                } else {
                    $finalVariantPaths[] = null;
                }
            }
        }
        $attributes['variant_image_paths'] = $finalVariantPaths;
        unset($attributes['existing_variant_paths']);

        $item = Auth::user()->items()->create([
            'name' => $request->name,
            'description' => $request->description,
            'price' => $request->price,
            'stock' => $totalStock,
            'category' => $request->category,
            'attributes' => $attributes,
            'image' => $imagePath,
            'is_published' => false,
        ]);

        return response()->json(['message' => 'Item created successfully.', 'item' => $item], 201);
    }

    // Toggle publish status
    public function togglePublish($id)
    {
        $item = Auth::user()->items()->find($id);

        if (!$item) {
            return response()->json(['message' => 'Item not found.'], 404);
        }

        $item->is_published = !$item->is_published;
        $item->save();

        return response()->json(['message' => 'Item publish status updated.', 'item' => $item]);
    }

    // Update an item
    public function update(Request $request, $id)
    {
        $item = Auth::user()->items()->find($id);
        if (!$item) return response()->json(['message' => 'Item not found.'], 404);

        $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'price' => 'required|numeric|min:0',
            'stock' => 'required|integer|min:1',
            'category' => 'required|string',
            'images.*' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:20480',
            'variant_images.*' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:20480',
        ]);

        $oldAttributes = $item->attributes ?? [];
        $newAttrs = $request->input('attributes') ? json_decode($request->input('attributes'), true) : [];
        $attributes = array_merge($oldAttributes, $newAttrs);

        $totalStock = $request->stock;
        if (isset($attributes['size_stocks']) && is_array($attributes['size_stocks']) && count($attributes['size_stocks']) > 0) {
            $totalStock = array_sum($attributes['size_stocks']);
        }

        // Handle main images
        $existingMain = $newAttrs['existing_main_images'] ?? [];
        $newMainFiles = $request->file('images') ?? [];
        $finalMainPaths = $existingMain;

        foreach ($newMainFiles as $img) {
            $finalMainPaths[] = $img->store('item-images', 'public');
        }
        $attributes['main_images'] = $finalMainPaths;
        unset($attributes['existing_main_images']);

        $imagePath = count($finalMainPaths) > 0 ? $finalMainPaths[0] : ($item->image ?? null);

        // Handle variant images
        $existingVariantPaths = $newAttrs['existing_variant_paths'] ?? [];
        $variantFiles = $request->file('variant_images') ?? [];
        $fileIndex = 0;
        $finalVariantPaths = [];

        foreach ($attributes['colors'] ?? [] as $idx => $color) {
            if (!empty($existingVariantPaths[$idx])) {
                $finalVariantPaths[] = $existingVariantPaths[$idx];
            } else {
                if (isset($variantFiles[$fileIndex])) {
                    $finalVariantPaths[] = $variantFiles[$fileIndex]->store('item-images', 'public');
                    $fileIndex++;
                } else {
                    $finalVariantPaths[] = null;
                }
            }
        }
        $attributes['variant_image_paths'] = $finalVariantPaths;
        unset($attributes['existing_variant_paths']);

        $item->update([
            'name' => $request->name,
            'description' => $request->description,
            'price' => $request->price,
            'stock' => $totalStock,
            'category' => $request->category,
            'attributes' => $attributes,
            'image' => $imagePath,
        ]);

        return response()->json(['message' => 'Item updated successfully.', 'item' => $item]);
    }

    // Delete an item
    public function destroy($id)
    {
        $item = Auth::user()->items()->find($id);

        if (!$item) {
            return response()->json(['message' => 'Item not found.'], 404);
        }

        // Delete the main image file if it exists
        if ($item->image) {
            Storage::disk('public')->delete($item->image);
        }

        // Delete all main images in attributes
        if (isset($item->attributes['main_images'])) {
            foreach ($item->attributes['main_images'] as $path) {
                Storage::disk('public')->delete($path);
            }
        }

        // Delete all variant images in attributes
        if (isset($item->attributes['variant_image_paths'])) {
            foreach ($item->attributes['variant_image_paths'] as $path) {
                Storage::disk('public')->delete($path);
            }
        }

        $item->delete();

        return response()->json(['message' => 'Item deleted successfully.']);
    }
}
