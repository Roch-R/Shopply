<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Validator;
use App\Models\User;

class AuthController extends Controller
{
    private function formatUser(User $user): array
    {
        $user->loadCount('reviews')->loadAvg('reviews', 'rating');
        return [
            'id'                => $user->id,
            'name'              => $user->name,
            'username'          => $user->username,
            'email'             => $user->username,
            'phone'             => $user->phone,
            'avatar'            => $user->avatar,
            'followers_count'   => $user->followers_count ?? 0,
            'following_count'   => $user->following_count ?? 0,
            'reviews_count'     => $user->reviews_count ?? 0,
            'reviews_avg_rating'=> $user->reviews_avg_rating ? round($user->reviews_avg_rating, 1) : 0.0,
            'email_verified_at' => $user->email_verified_at,
            'created_at'        => $user->created_at,
            'updated_at'        => $user->updated_at,
        ];
    }

    private function sendOtp(User $user): void
    {
        $otp = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $user->update([
            'otp_code'       => $otp,
            'otp_expires_at' => now()->addMinutes(10),
        ]);
        $this->sendOtpSms($user->phone ?? '', $otp);
    }

    private function sendOtpSms(string $phone, string $otp): void
    {
        $message = "Your Shopply verification code is: $otp. Expires in 10 minutes.";

        // 1. Semaphore SMS API (Philippine SMS gateway)
        $semaphoreApiKey = env('SEMAPHORE_API_KEY');
        if ($semaphoreApiKey && $phone) {
            try {
                $response = \Illuminate\Support\Facades\Http::post('https://api.semaphore.co/api/v4/messages', [
                    'apikey'  => $semaphoreApiKey,
                    'number'  => $phone,
                    'message' => $message,
                ]);
                if ($response->successful()) {
                    error_log("[Shopply] SMS sent to $phone via Semaphore.");
                    return;
                }
                error_log("[Shopply] Semaphore failed: " . $response->body());
            } catch (\Exception $e) {
                error_log("[Shopply] Semaphore error: " . $e->getMessage());
            }
        }

        // 2. Twilio SMS API
        $twilioSid    = env('TWILIO_SID');
        $twilioToken  = env('TWILIO_AUTH_TOKEN');
        $twilioNumber = env('TWILIO_NUMBER');
        if ($twilioSid && $twilioToken && $twilioNumber && $phone) {
            try {
                // Twilio requires E.164 format (e.g. +639XXXXXXXXX)
                $twilioTo = $phone;
                if (str_starts_with($twilioTo, '09') && strlen($twilioTo) === 11) {
                    $twilioTo = '+63' . substr($twilioTo, 1);
                } elseif (str_starts_with($twilioTo, '9') && strlen($twilioTo) === 10) {
                    $twilioTo = '+63' . $twilioTo;
                }

                $response = \Illuminate\Support\Facades\Http::withBasicAuth($twilioSid, $twilioToken)
                    ->post("https://api.twilio.com/2010-04-01/Accounts/$twilioSid/Messages.json", [
                        'To'   => $twilioTo,
                        'From' => $twilioNumber,
                        'Body' => $message,
                    ]);
                if ($response->successful()) {
                    error_log("[Shopply] SMS sent to $twilioTo via Twilio.");
                    return;
                }
                error_log("[Shopply] Twilio failed for $twilioTo: " . $response->body());
            } catch (\Exception $e) {
                error_log("[Shopply] Twilio error: " . $e->getMessage());
            }
        }

        // 3. Fallback: print to stderr (safe on Railway — no filesystem writes)
        // In production, configure SEMAPHORE_API_KEY or Twilio env vars above.
        error_log("----- [SMS OTP MOCK] -----");
        error_log("To: " . ($phone ?: 'N/A'));
        error_log("OTP: $otp");
        error_log("Body: $message");
        error_log("--------------------------");
    }

    private function verifyFirebaseToken(string $idToken): ?string
    {
        $apiKey = env('FIREBASE_API_KEY', 'AIzaSyDesMBn0S2_mKQwT-dcHP6oSanntLrlsn8');
        try {
            $response = \Illuminate\Support\Facades\Http::post("https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=$apiKey", [
                'idToken' => $idToken,
            ]);

            if ($response->successful()) {
                $users = $response->json('users');
                if (!empty($users) && isset($users[0]['phoneNumber'])) {
                    $phoneNumber = $users[0]['phoneNumber'];
                    
                    // Normalize to 09XXXXXXXXX
                    if (str_starts_with($phoneNumber, '+639') && strlen($phoneNumber) === 13) {
                        return '09' . substr($phoneNumber, 4);
                    }
                    if (str_starts_with($phoneNumber, '639') && strlen($phoneNumber) === 12) {
                        return '09' . substr($phoneNumber, 3);
                    }
                    return $phoneNumber;
                }
            } else {
                error_log("[Shopply] Firebase token verification failed: " . $response->body());
            }
        } catch (\Exception $e) {
            error_log("[Shopply] Firebase token verification exception: " . $e->getMessage());
        }

        return null;
    }


    public function register(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name'     => 'required|string|max:255',
            'username' => 'required|string|max:255|unique:users',
            'phone'    => ['required', 'string', 'regex:/^09\d{9}$/', 'unique:users'],
            'password' => 'required|string|min:6',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => $validator->errors()->first(),
                'errors'  => $validator->errors(),
            ], 422);
        }

        $otp = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        // Store pending registration in cache (NOT in the database)
        // Expires in 15 minutes
        Cache::put('pending_reg_' . $request->phone, [
            'name'     => $request->name,
            'username' => $request->username,
            'phone'    => $request->phone,
            'password' => Hash::make($request->password),
            'otp'      => $otp,
        ], now()->addMinutes(15));

        // Send OTP SMS (bypassed since client-side Firebase handles this)
        // try {
        //     $this->sendOtpSms($request->phone, $otp);
        // } catch (\Exception $e) {
        //     return response()->json([
        //         'message' => 'Failed to send SMS: ' . $e->getMessage()
        //     ], 500);
        // }

        return response()->json([
            'message'         => 'OTP sent to your phone number. Please verify to complete registration.',
            'requires_verify' => true,
            'pending_email'   => $request->phone,
        ], 201);
    }

    /**
     * Verify registration OTP — creates the user in DB only after OTP is confirmed.
     * This is a PUBLIC route (no auth required).
     */
    public function verifyRegistration(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email'          => 'required|string',
            'otp'            => 'nullable|string',
            'firebase_token' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => $validator->errors()->first()], 422);
        }

        $phone = $request->email;
        $cacheKey = 'pending_reg_' . $phone;
        $pending = Cache::get($cacheKey);

        if (!$pending) {
            return response()->json(['message' => 'Registration expired or not found. Please register again.'], 422);
        }

        if ($request->filled('firebase_token')) {
            $verifiedPhone = $this->verifyFirebaseToken($request->firebase_token);
            if (!$verifiedPhone) {
                return response()->json(['message' => 'Invalid or expired Firebase verification token.'], 422);
            }
            if ($verifiedPhone !== $phone) {
                return response()->json(['message' => 'Firebase verified number (' . $verifiedPhone . ') does not match registration phone number (' . $phone . ').'], 422);
            }
        } else {
            if ($pending['otp'] !== $request->otp) {
                return response()->json(['message' => 'Invalid OTP code. Please try again.'], 422);
            }
        }

        // OTP is correct — NOW create the user in the database
        $user = User::create([
            'name'              => $pending['name'],
            'username'          => $pending['username'],
            'phone'             => $pending['phone'],
            'password'          => $pending['password'],
            'email_verified_at' => now(),
        ]);

        // Remove from cache
        Cache::forget($cacheKey);

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Phone number verified successfully!',
            'token'   => $token,
            'user'    => $this->formatUser($user),
        ]);
    }

    /**
     * Resend registration OTP — PUBLIC route (no auth required).
     */
    public function resendRegistrationOtp(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => $validator->errors()->first()], 422);
        }

        $phone = $request->email;
        $cacheKey = 'pending_reg_' . $phone;
        $pending = Cache::get($cacheKey);

        if (!$pending) {
            return response()->json(['message' => 'Registration expired. Please register again.'], 422);
        }

        // Generate new OTP
        $otp = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $pending['otp'] = $otp;
        Cache::put($cacheKey, $pending, now()->addMinutes(15));

        // Resend SMS OTP (bypassed since client-side Firebase handles this)
        // try {
        //     $this->sendOtpSms($phone, $otp);
        // } catch (\Exception $e) {
        //     return response()->json([
        //         'message' => 'Failed to send SMS: ' . $e->getMessage()
        //     ], 500);
        // }

        return response()->json(['message' => 'New OTP sent to your phone number.']);
    }

    public function login(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'username' => 'required|string',
            'password' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => $validator->errors()->first(),
                'errors'  => $validator->errors(),
            ], 422);
        }

        $user = User::where('username', $request->username)->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            return response()->json([
                'message' => 'Invalid username or password.',
            ], 401);
        }

        if (! $user->email_verified_at) {
            // ✅ Do NOT delete all tokens here — that kills the browser session.
            // Just issue a fresh token for this login attempt only.
            $token = $user->createToken('auth_token')->plainTextToken;

            // Only send a new OTP if there isn't a valid one already
            $otpMissing = ! $user->otp_code;
            $otpExpired = $user->otp_expires_at && now()->isAfter($user->otp_expires_at);

            // Bypassed since client-side Firebase handles this
            // if ($otpMissing || $otpExpired) {
            //     $this->sendOtp($user);
            // }

            return response()->json([
                'message'         => 'Please verify your account first.',
                'requires_verify' => true,
                'token'           => $token,
                'user'            => $this->formatUser($user),
            ], 403);
        }

        // ✅ Only delete tokens on a successful verified login
        $user->tokens()->delete();
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Login successful.',
            'token'   => $token,
            'user'    => $this->formatUser($user),
        ], 200);
    }

    public function handleGoogleCallback(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'code' => 'nullable|string',
            'simulated_email' => 'nullable|email',
            'simulated_name' => 'nullable|string',
            'simulated_avatar' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors(),
            ], 422);
        }

        $email = null;
        $name = null;
        $avatar = null;

        if ($request->filled('code')) {
            $clientId = config('services.google.client_id');
            $clientSecret = config('services.google.client_secret');
            $redirectUri = config('services.google.redirect_uri') ?: ($request->header('origin') . '/auth/google/callback');

            if (!$clientId || !$clientSecret) {
                return response()->json(['message' => 'Google OAuth credentials are not configured on the backend.'], 500);
            }

            $tokenResponse = \Illuminate\Support\Facades\Http::asForm()->post('https://oauth2.googleapis.com/token', [
                'client_id' => $clientId,
                'client_secret' => $clientSecret,
                'redirect_uri' => $redirectUri,
                'grant_type' => 'authorization_code',
                'code' => $request->code,
            ]);

            if ($tokenResponse->failed()) {
                $errBody = json_encode($tokenResponse->json() ?? $tokenResponse->body());
                return response()->json([
                    'message' => 'Failed to exchange Google authorization code. Details: ' . $errBody,
                ], 400);
            }

            $accessToken = $tokenResponse->json('access_token');
            $userResponse = \Illuminate\Support\Facades\Http::withToken($accessToken)->get('https://www.googleapis.com/oauth2/v3/userinfo');

            if ($userResponse->failed()) {
                return response()->json(['message' => 'Failed to fetch user info from Google.'], 400);
            }

            $googleUser = $userResponse->json();
            $email = $googleUser['email'] ?? null;
            $name = $googleUser['name'] ?? null;
            $avatar = $googleUser['picture'] ?? null;
        } elseif ($request->filled('simulated_email')) {
            $email = $request->simulated_email;
            $name = $request->simulated_name ?? 'Google User';
            $avatar = $request->simulated_avatar ?? null;
        } else {
            return response()->json(['message' => 'No authorization code or simulated user provided.'], 400);
        }

        if (!$email) {
            return response()->json(['message' => 'Unable to retrieve email address from Google.'], 400);
        }

        $user = User::where('username', $email)->first();

        if (!$user) {
            $user = User::create([
                'name' => $name ?? 'Google User',
                'username' => $email,
                'password' => Hash::make(\Illuminate\Support\Str::random(24)),
                'avatar' => $avatar,
                'email_verified_at' => now(),
            ]);
        } else {
            if (!$user->email_verified_at) {
                $user->update(['email_verified_at' => now()]);
            }
            if (!$user->avatar && $avatar) {
                $user->update(['avatar' => $avatar]);
            }
        }

        $user->tokens()->delete();
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Google login successful.',
            'token' => $token,
            'user' => $this->formatUser($user->fresh()),
        ], 200);
    }


   public function verifyEmail(Request $request)
{
    $validator = Validator::make($request->all(), [
        'otp'            => 'nullable|string',
        'firebase_token' => 'nullable|string',
    ]);

    if ($validator->fails()) {
        return response()->json(['message' => $validator->errors()->first()], 422);
    }

    $user = $request->user();

    if ($user->email_verified_at) {
        return response()->json([
            'message' => 'Phone number already verified.',
            'user'    => $this->formatUser($user),
        ], 200);
    }

    if ($request->filled('firebase_token')) {
        $verifiedPhone = $this->verifyFirebaseToken($request->firebase_token);
        if (!$verifiedPhone) {
            return response()->json(['message' => 'Invalid or expired Firebase verification token.'], 422);
        }
        if ($verifiedPhone !== $user->phone) {
            return response()->json(['message' => 'Firebase verified number (' . $verifiedPhone . ') does not match account phone number (' . $user->phone . ').'], 422);
        }
    } else {
        if ($user->otp_code !== $request->otp) {
            return response()->json(['message' => 'Invalid OTP code. Please try again.'], 422);
        }
        if (now()->isAfter($user->otp_expires_at)) {
            return response()->json(['message' => 'OTP has expired. Please request a new one.'], 422);
        }
    }

    $user->update([
        'email_verified_at' => now(),
        'otp_code'          => null,
        'otp_expires_at'    => null,
    ]);

    // ✅ Clear ALL old tokens, issue ONE clean verified token
    $user->tokens()->delete();
    $freshToken = $user->createToken('auth_token')->plainTextToken;

    return response()->json([
        'message' => 'Phone number verified successfully!',
        'token'   => $freshToken,
        'user'    => $this->formatUser($user->fresh()),
    ]);
}

    public function resendOtp(Request $request)
    {
        $user = $request->user();

        if ($user->email_verified_at) {
            return response()->json(['message' => 'Phone number already verified.'], 200);
        }

        // Bypassed since client-side Firebase handles this
        // $this->sendOtp($user);

        return response()->json(['message' => 'New OTP sent to your phone number.']);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Logged out successfully.']);
    }

    public function me(Request $request)
    {
        return response()->json(['user' => $this->formatUser($request->user())]);
    }

    public function users()
    {
        $users = User::whereNotNull('email_verified_at')
                     ->get(['id', 'name', 'username', 'email_verified_at', 'created_at']);
        return response()->json(['users' => $users]);
    }

    public function deleteUser(int $id)
    {
        $user = User::findOrFail($id);
        $user->tokens()->delete();
        $user->delete();
        return response()->json(['message' => 'User deleted.']);
    }

    public function deleteAccount(Request $request)
    {
        $user = $request->user();
        if ($user->email_verified_at) {
            return response()->json(['message' => 'Verified accounts cannot be self-deleted.'], 403);
        }
        $user->tokens()->delete();
        $user->delete();
        return response()->json(['message' => 'Account removed.']);
    }

    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $validator = Validator::make($request->all(), [
            'name'   => 'required|string|max:255',
            'avatar' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:20480',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => $validator->errors()->first()], 422);
        }

        $data = ['name' => $request->name];

        if ($request->hasFile('avatar')) {
            $cloudinary = new \App\Services\CloudinaryService();
            if ($user->avatar) {
                if (\App\Services\CloudinaryService::isCloudinaryUrl($user->avatar)) {
                    $cloudinary->delete($user->avatar, 'image');
                } else {
                    \Illuminate\Support\Facades\Storage::disk('public')->delete(str_replace('storage/', '', $user->avatar));
                }
            }
            $data['avatar'] = $cloudinary->uploadImage($request->file('avatar'), 'avatars');
        }

        $user->update($data);

        return response()->json([
            'message' => 'Profile updated successfully!',
            'user'    => $this->formatUser($user->fresh()),
        ]);
    }

    public function toggleFollow(Request $request, int $id)
    {
        $seller = User::findOrFail($id);
        $buyer = $request->user();
        $action = $request->input('action', 'follow');

        if ($buyer && $buyer->id === $seller->id) {
            return response()->json([
                'message' => 'You cannot follow yourself.'
            ], 400);
        }

        if ($action === 'unfollow') {
            if ($seller->followers_count > 0) {
                $seller->followers_count = $seller->followers_count - 1;
            }
            if ($buyer && $buyer->following_count > 0) {
                $buyer->following_count = $buyer->following_count - 1;
                $buyer->save();
            }
            $message = 'Unfollowed ' . $seller->name;
        } else {
            $seller->followers_count = $seller->followers_count + 1;
            if ($buyer) {
                $buyer->following_count = $buyer->following_count + 1;
                $buyer->save();
            }
            $message = 'Successfully followed ' . $seller->name . '!';
        }
        $seller->save();

        return response()->json([
            'message' => $message,
            'followers_count' => $seller->followers_count,
            'user' => $buyer ? $this->formatUser($buyer->fresh()) : null,
        ]);
    }
}