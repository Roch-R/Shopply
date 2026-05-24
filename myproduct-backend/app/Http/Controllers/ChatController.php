<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Message;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class ChatController extends Controller
{
    // Get list of conversations for authenticated user
    public function getConversations()
    {
        $userId = Auth::id();

        // Find all distinct users the current user has chatted with
        // We can get all messages where sender is auth user OR receiver is auth user
        $messages = Message::where('sender_id', $userId)
            ->orWhere('receiver_id', $userId)
            ->latest()
            ->get();

        $conversations = [];
        $seenUsers = [];

        foreach ($messages as $msg) {
            $otherUserId = $msg->sender_id == $userId ? $msg->receiver_id : $msg->sender_id;

            if (!in_array($otherUserId, $seenUsers)) {
                $seenUsers[] = $otherUserId;

                // Get the other user details
                $otherUser = User::select('id', 'name', 'avatar')->find($otherUserId);

                if ($otherUser) {
                    $conversations[] = [
                        'user' => $otherUser,
                        'last_message' => [
                            'id' => $msg->id,
                            'message' => $msg->message,
                            'image' => $msg->image,
                            'sender_id' => $msg->sender_id,
                            'receiver_id' => $msg->receiver_id,
                            'is_read' => $msg->is_read,
                            'created_at' => $msg->created_at,
                        ],
                        'unread_count' => Message::where('sender_id', $otherUserId)
                            ->where('receiver_id', $userId)
                            ->where('is_read', false)
                            ->count()
                    ];
                }
            }
        }

        return response()->json(['conversations' => $conversations]);
    }

    // Get messages between auth user and specific user
    public function getMessages($userId)
    {
        $authUserId = Auth::id();

        $otherUser = User::select('id', 'name', 'avatar')->find($userId);
        if (!$otherUser) {
            return response()->json(['message' => 'User not found.'], 404);
        }

        // Mark unread messages as read
        Message::where('sender_id', $userId)
            ->where('receiver_id', $authUserId)
            ->where('is_read', false)
            ->update(['is_read' => true]);

        $messages = Message::with(['sender:id,name,avatar', 'receiver:id,name,avatar'])
            ->where(function ($q) use ($authUserId, $userId) {
                $q->where('sender_id', $authUserId)->where('receiver_id', $userId);
            })
            ->orWhere(function ($q) use ($authUserId, $userId) {
                $q->where('sender_id', $userId)->where('receiver_id', $authUserId);
            })
            ->oldest()
            ->get();

        $isTyping = \Illuminate\Support\Facades\Cache::get("typing_{$userId}_{$authUserId}", false);

        return response()->json([
            'user' => $otherUser,
            'messages' => $messages,
            'is_typing' => $isTyping
        ]);
    }

    // Send a message
    public function sendMessage(Request $request, $userId)
    {
        $request->validate([
            'message' => 'nullable|string',
            'image' => 'nullable|image|max:10240',
        ]);

        if (!$request->filled('message') && !$request->hasFile('image')) {
            return response()->json(['message' => 'Message or image is required.'], 422);
        }

        $authUserId = Auth::id();
        $otherUser = User::find($userId);

        if (!$otherUser) {
            return response()->json(['message' => 'User not found.'], 404);
        }

        $imagePath = null;
        if ($request->hasFile('image')) {
            $imagePath = $request->file('image')->store('chat_images', 'public');
        }

        $message = Message::create([
            'sender_id' => $authUserId,
            'receiver_id' => $userId,
            'message' => $request->message,
            'image' => $imagePath,
            'is_read' => false,
        ]);

        \Illuminate\Support\Facades\Cache::forget("typing_{$authUserId}_{$userId}");

        $message->load(['sender:id,name,avatar', 'receiver:id,name,avatar']);

        return response()->json(['message' => $message], 201);
    }

    // Set typing status
    public function typing(Request $request, $userId)
    {
        $authUserId = Auth::id();
        \Illuminate\Support\Facades\Cache::put("typing_{$authUserId}_{$userId}", true, now()->addSeconds(10));
        return response()->json(['status' => 'typing']);
    }
}
