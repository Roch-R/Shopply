<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Item;
use App\Models\CartItem;
use App\Models\Order;
use App\Models\Review;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use App\Services\CloudinaryService;

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

    public function store(Request $request)
    {
        set_time_limit(300);
        $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'price' => 'required|numeric|min:0',
            'stock' => 'required|integer|min:1',
            'category' => 'required|string',
            'images.*' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:20480',
            'variant_images.*' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:20480',
            'video' => 'nullable|file|mimes:mp4,mov,ogg,qt,webm,avi,mkv|max:204800',
            'description_images.*' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:20480',
        ]);

        $attributes = $request->input('attributes') ? json_decode($request->input('attributes'), true) : [];

        $totalStock = $request->stock;
        if (isset($attributes['size_stocks']) && is_array($attributes['size_stocks']) && count($attributes['size_stocks']) > 0) {
            $totalStock = array_sum($attributes['size_stocks']);
        }

        $cloudinary = new CloudinaryService();

        // Handle main images
        $existingMain = $attributes['existing_main_images'] ?? [];
        $newMainFiles = $request->file('images') ?? [];
        $finalMainPaths = $existingMain;

        foreach ($newMainFiles as $img) {
            $finalMainPaths[] = $cloudinary->uploadImage($img, 'item-images');
        }
        $attributes['main_images'] = $finalMainPaths;
        unset($attributes['existing_main_images']);

        $imagePath = count($finalMainPaths) > 0 ? $finalMainPaths[0] : null;

        // Handle showcase video
        if ($request->hasFile('video')) {
            $attributes['video_path'] = $cloudinary->uploadVideo($request->file('video'), 'item-videos');
        } else {
            $attributes['video_path'] = null;
        }

        // Handle description images
        $existingDesc = $attributes['existing_description_images'] ?? [];
        $newDescFiles = $request->file('description_images') ?? [];
        $finalDescPaths = $existingDesc;

        foreach ($newDescFiles as $img) {
            $finalDescPaths[] = $cloudinary->uploadImage($img, 'item-images');
        }
        $attributes['description_images'] = $finalDescPaths;
        unset($attributes['existing_description_images']);

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
                    $finalVariantPaths[] = $cloudinary->uploadImage($variantFiles[$fileIndex], 'item-images');
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

    public function update(Request $request, $id)
    {
        set_time_limit(300);
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
            'video' => 'nullable|file|mimes:mp4,mov,ogg,qt,webm,avi,mkv|max:204800',
            'description_images.*' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:20480',
        ]);

        $oldAttributes = $item->attributes ?? [];
        $newAttrs = $request->input('attributes') ? json_decode($request->input('attributes'), true) : [];
        $attributes = array_merge($oldAttributes, $newAttrs);

        $totalStock = $request->stock;
        if (isset($attributes['size_stocks']) && is_array($attributes['size_stocks']) && count($attributes['size_stocks']) > 0) {
            $totalStock = array_sum($attributes['size_stocks']);
        }

        $cloudinary = new CloudinaryService();

        $safeDelete = function ($path, $type = 'image') use ($cloudinary) {
            if (!is_string($path) || empty($path)) {
                return;
            }
            if (CloudinaryService::isCloudinaryUrl($path)) {
                $cloudinary->delete($path, $type);
            } else {
                Storage::disk('public')->delete($path);
            }
        };

        // Handle main images
        $existingMain = $newAttrs['existing_main_images'] ?? [];
        $newMainFiles = $request->file('images') ?? [];
        $finalMainPaths = $existingMain;

        // Clean up deleted main images
        $oldMainImages = $oldAttributes['main_images'] ?? [];
        $removedMainImages = array_diff($oldMainImages, $existingMain);
        foreach ($removedMainImages as $removedImg) {
            $safeDelete($removedImg);
        }

        foreach ($newMainFiles as $img) {
            $finalMainPaths[] = $cloudinary->uploadImage($img, 'item-images');
        }
        $attributes['main_images'] = $finalMainPaths;
        unset($attributes['existing_main_images']);

        $imagePath = count($finalMainPaths) > 0 ? $finalMainPaths[0] : null;

        // Handle showcase video
        if ($request->hasFile('video')) {
            // Delete old video if it exists
            if (!empty($oldAttributes['video_path'])) {
                $safeDelete($oldAttributes['video_path'], 'video');
            }
            $attributes['video_path'] = $cloudinary->uploadVideo($request->file('video'), 'item-videos');
        } else {
            // Keep existing video if specified, otherwise delete it
            $existingVideo = $newAttrs['existing_video_path'] ?? null;
            if (!$existingVideo && !empty($oldAttributes['video_path'])) {
                $safeDelete($oldAttributes['video_path'], 'video');
            }
            $attributes['video_path'] = $existingVideo;
        }
        unset($attributes['existing_video_path']);

        // Handle description images
        $existingDesc = $newAttrs['existing_description_images'] ?? [];
        $newDescFiles = $request->file('description_images') ?? [];
        $finalDescPaths = $existingDesc;

        // Clean up deleted description images
        $oldDescImages = $oldAttributes['description_images'] ?? [];
        $removedDescImages = array_diff($oldDescImages, $existingDesc);
        foreach ($removedDescImages as $removedImg) {
            $safeDelete($removedImg);
        }

        foreach ($newDescFiles as $img) {
            $finalDescPaths[] = $cloudinary->uploadImage($img, 'item-images');
        }
        $attributes['description_images'] = $finalDescPaths;
        unset($attributes['existing_description_images']);

        // Handle variant images
        $existingVariantPaths = $newAttrs['existing_variant_paths'] ?? [];
        $variantFiles = $request->file('variant_images') ?? [];
        $fileIndex = 0;
        $finalVariantPaths = [];

        // Clean up deleted variant images
        $oldVariantImages = $oldAttributes['variant_image_paths'] ?? [];
        $removedVariantImages = array_diff(array_filter($oldVariantImages), array_filter($existingVariantPaths));
        foreach ($removedVariantImages as $removedImg) {
            $safeDelete($removedImg);
        }

        foreach ($attributes['colors'] ?? [] as $idx => $color) {
            if (!empty($existingVariantPaths[$idx])) {
                $finalVariantPaths[] = $existingVariantPaths[$idx];
            } else {
                if (isset($variantFiles[$fileIndex])) {
                    $finalVariantPaths[] = $cloudinary->uploadImage($variantFiles[$fileIndex], 'item-images');
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

        $cloudinary = new CloudinaryService();

        $safeDelete = function ($path, $type = 'image') use ($cloudinary) {
            if (!is_string($path) || empty($path)) {
                return;
            }
            if (CloudinaryService::isCloudinaryUrl($path)) {
                $cloudinary->delete($path, $type);
            } else {
                Storage::disk('public')->delete($path);
            }
        };

        // Delete the main image file if it exists
        $safeDelete($item->image);

        // Delete all main images in attributes
        if (isset($item->attributes['main_images']) && is_array($item->attributes['main_images'])) {
            foreach ($item->attributes['main_images'] as $path) {
                $safeDelete($path);
            }
        }

        // Delete all variant images in attributes
        if (isset($item->attributes['variant_image_paths']) && is_array($item->attributes['variant_image_paths'])) {
            foreach ($item->attributes['variant_image_paths'] as $path) {
                $safeDelete($path);
            }
        }

        // Delete all description images in attributes
        if (isset($item->attributes['description_images']) && is_array($item->attributes['description_images'])) {
            foreach ($item->attributes['description_images'] as $path) {
                $safeDelete($path);
            }
        }

        // Delete video path if it exists
        if (isset($item->attributes['video_path'])) {
            $safeDelete($item->attributes['video_path'], 'video');
        }

        // Programmatically delete related cart items, orders, and reviews to prevent orphaned database records and frontend crashes
        CartItem::where('item_id', $item->id)->delete();
        Order::where('item_id', $item->id)->delete();
        Review::where('item_id', $item->id)->delete();

        $item->delete();

        return response()->json(['message' => 'Item deleted successfully.']);
    }
}
