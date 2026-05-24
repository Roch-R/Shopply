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
        $otp = '123456'; // Hardcoded for Render testing
        $user->update([
            'otp_code'       => $otp,
            'otp_expires_at' => now()->addMinutes(10),
        ]);
        $this->sendOtpEmail($user->email, $user->name, $otp);
    }

    private function sendOtpEmail(string $email, string $name, string $otp): void
    {
        $name = e($name);
        $year = date('Y');

        $otpDisplay = $otp;

        $html = <<<HTML
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f5f3ff;font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f3ff;padding:40px 16px;">
<tr><td align="center">

<!-- Main Card -->
<table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(124,58,237,0.08);">

  <!-- Logo Bar -->
  <tr>
    <td style="padding:32px 40px 0;text-align:center;">
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
        <tr>
          <td style="vertical-align:middle;padding-right:12px;">
            <img src="%%LOGO_CID%%" alt="Shopply" width="32" height="42" style="display:block;border:0;" />
          </td>
          <td style="vertical-align:middle;">
            <span style="font-size:22px;font-weight:700;color:#7c3aed;letter-spacing:-0.3px;font-family:'Segoe UI',Arial,sans-serif;">Shopply</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Greeting -->
  <tr>
    <td style="padding:36px 40px 0;text-align:left;">
      <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#1e1b4b;">Hey {$name}! 👋</h1>
      <p style="margin:0 0 8px;font-size:15px;color:#475569;line-height:1.7;">
        Thanks for signing up — we're excited to have you on board!
      </p>
      <p style="margin:0;font-size:15px;color:#475569;line-height:1.7;">
        To get started, enter this verification code in the app:
      </p>
    </td>
  </tr>

  <!-- OTP Code -->
  <tr>
    <td style="padding:28px 40px;" align="center">
      <div style="font-size:36px;font-weight:700;color:#7c3aed;letter-spacing:14px;font-family:'Segoe UI',Arial,sans-serif;padding:20px 0;">
        {$otpDisplay}
      </div>
    </td>
  </tr>

  <!-- Expiry Note -->
  <tr>
    <td style="padding:0 40px;text-align:center;">
      <p style="margin:0;font-size:13px;color:#a78bfa;font-weight:500;">
        ⏱ This code expires in <strong style="color:#7c3aed;">10 minutes</strong>
      </p>
    </td>
  </tr>

  <!-- Friendly Note -->
  <tr>
    <td style="padding:28px 40px 0;text-align:left;">
      <p style="margin:0;font-size:14px;color:#64748b;line-height:1.7;">
        If you didn't create a Shopply account, no worries — just ignore this email and nothing will happen. 😊
      </p>
    </td>
  </tr>

  <!-- Sign-off -->
  <tr>
    <td style="padding:24px 40px 0;text-align:left;">
      <p style="margin:0 0 4px;font-size:14px;color:#475569;line-height:1.6;">
        Cheers,<br/>
        <strong style="color:#7c3aed;">The Shopply Team</strong>
      </p>
    </td>
  </tr>

  <!-- Divider -->
  <tr>
    <td style="padding:28px 40px 0;">
      <div style="height:1px;background:#f1f0fb;"></div>
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td style="padding:20px 40px 28px;text-align:center;">
      <p style="margin:0 0 4px;font-size:11px;color:#c4b5fd;">🔒 Never share this code with anyone</p>
      <p style="margin:0;font-size:11px;color:#cbd5e1;">© {$year} Shopply · All rights reserved</p>
    </td>
  </tr>

</table>

</td></tr>
</table>
</body>
</html>
HTML;

        $logoPath = storage_path('app/images/shopply-logo.png');
        $html = str_replace('%%LOGO_CID%%', 'cid:shopply-logo', $html);

        dispatch(function () use ($email, $html, $logoPath) {
            Mail::send([], [], function ($m) use ($email, $html, $logoPath) {
                $m->to($email)
                  ->subject('Shopply — Email Verification Code')
                  ->html($html);
                $m->getSymfonyMessage()->embedFromPath($logoPath, 'shopply-logo', 'image/png');
            });
        });
    }

    public function register(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name'     => 'required|string|max:255',
            'username' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:6',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => $validator->errors()->first(),
                'errors'  => $validator->errors(),
            ], 422);
        }

        // Also check if there's already a pending registration for this email
        // (allow re-register to update the pending data)

        $otp = '123456'; // Hardcoded for Render testing

        // Store pending registration in cache (NOT in the database)
        // Expires in 15 minutes
        Cache::put('pending_reg_' . $request->username, [
            'name'     => $request->name,
            'username' => $request->username,
            'password' => Hash::make($request->password),
            'otp'      => $otp,
        ], now()->addMinutes(15));

        // Send OTP email
        $this->sendOtpEmail($request->username, $request->name, $otp);

        return response()->json([
            'message'         => 'OTP sent to your email. Please verify to complete registration.',
            'requires_verify' => true,
            'pending_email'   => $request->username,
        ], 201);
    }

    /**
     * Verify registration OTP — creates the user in DB only after OTP is confirmed.
     * This is a PUBLIC route (no auth required).
     */
    public function verifyRegistration(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|string|email',
            'otp'   => 'required|string|size:6',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => $validator->errors()->first()], 422);
        }

        $cacheKey = 'pending_reg_' . $request->email;
        $pending = Cache::get($cacheKey);

        if (!$pending) {
            return response()->json(['message' => 'Registration expired or not found. Please register again.'], 422);
        }

        if ($pending['otp'] !== $request->otp) {
            return response()->json(['message' => 'Invalid OTP code. Please try again.'], 422);
        }

        // OTP is correct — NOW create the user in the database
        $user = User::create([
            'name'              => $pending['name'],
            'username'          => $pending['username'],
            'password'          => $pending['password'],
            'email_verified_at' => now(),
        ]);

        // Remove from cache
        Cache::forget($cacheKey);

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Email verified successfully!',
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
            'email' => 'required|string|email',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => $validator->errors()->first()], 422);
        }

        $cacheKey = 'pending_reg_' . $request->email;
        $pending = Cache::get($cacheKey);

        if (!$pending) {
            return response()->json(['message' => 'Registration expired. Please register again.'], 422);
        }

        // Generate new OTP
        $otp = '123456'; // Hardcoded for Render testing
        $pending['otp'] = $otp;
        Cache::put($cacheKey, $pending, now()->addMinutes(15));

        // Resend email
        $this->sendOtpEmail($pending['username'], $pending['name'], $otp);

        return response()->json(['message' => 'New OTP sent to your email.']);
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

            if ($otpMissing || $otpExpired) {
                $this->sendOtp($user);
            }

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

            $tokenResponse = \Illuminate\Support\Facades\Http::post('https://oauth2.googleapis.com/token', [
                'client_id' => $clientId,
                'client_secret' => $clientSecret,
                'redirect_uri' => $redirectUri,
                'grant_type' => 'authorization_code',
                'code' => $request->code,
            ]);

            if ($tokenResponse->failed()) {
                return response()->json(['message' => 'Failed to exchange Google authorization code.'], 400);
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
        'otp' => 'required|string|size:6',
    ]);

    if ($validator->fails()) {
        return response()->json(['message' => $validator->errors()->first()], 422);
    }

    $user = $request->user();

    if ($user->email_verified_at) {
        return response()->json([
            'message' => 'Email already verified.',
            'user'    => $this->formatUser($user),
        ], 200);
    }

    if ($user->otp_code !== $request->otp) {
        return response()->json(['message' => 'Invalid OTP code. Please try again.'], 422);
    }

    if (now()->isAfter($user->otp_expires_at)) {
        return response()->json(['message' => 'OTP has expired. Please request a new one.'], 422);
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
        'message' => 'Email verified successfully!',
        'token'   => $freshToken,
        'user'    => $this->formatUser($user->fresh()),
    ]);
}

    public function resendOtp(Request $request)
    {
        $user = $request->user();

        if ($user->email_verified_at) {
            return response()->json(['message' => 'Email already verified.'], 200);
        }

        $this->sendOtp($user);

        return response()->json(['message' => 'New OTP sent to your email.']);
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
            $file = $request->file('avatar');
            $filename = time() . '_' . $file->getClientOriginalName();
            $file->storeAs('avatars', $filename, 'public');
            $data['avatar'] = 'avatars/' . $filename;
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