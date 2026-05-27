<?php

namespace App\Services;

/**
 * Lightweight Cloudinary service using direct REST API calls.
 * No external package dependency required — uses cURL only.
 */
class CloudinaryService
{
    private string $cloudName;
    private string $apiKey;
    private string $apiSecret;

    public function __construct()
    {
        $url = env('CLOUDINARY_URL');

        if (!$url) {
            throw new \RuntimeException('CLOUDINARY_URL environment variable is not set.');
        }

        // Parse cloudinary://API_KEY:API_SECRET@CLOUD_NAME
        $parsed = parse_url($url);
        $this->apiKey    = $parsed['user'] ?? '';
        $this->apiSecret = $parsed['pass'] ?? '';
        $this->cloudName = $parsed['host'] ?? '';
    }

    /**
     * Upload an image file to Cloudinary.
     *
     * @param \Illuminate\Http\UploadedFile $file  The uploaded file
     * @param string $folder  The folder in Cloudinary (e.g., 'item-images')
     * @return string  The secure URL of the uploaded image
     */
    public function uploadImage($file, string $folder = 'item-images'): string
    {
        return $this->upload($file, $folder, 'image');
    }

    /**
     * Upload a video file to Cloudinary.
     *
     * @param \Illuminate\Http\UploadedFile $file  The uploaded file
     * @param string $folder  The folder in Cloudinary (e.g., 'item-videos')
     * @return string  The secure URL of the uploaded video
     */
    public function uploadVideo($file, string $folder = 'item-videos'): string
    {
        return $this->upload($file, $folder, 'video');
    }

    /**
     * Delete a resource from Cloudinary by its secure URL.
     *
     * @param string $secureUrl  The full Cloudinary URL
     * @param string $resourceType  'image' or 'video'
     */
    public function delete(string $secureUrl, string $resourceType = 'image'): void
    {
        $publicId = $this->extractPublicId($secureUrl);
        if (!$publicId) return;

        $timestamp = time();
        $params = [
            'public_id'  => $publicId,
            'timestamp'  => $timestamp,
        ];

        $signature = $this->generateSignature($params);

        $url = "https://api.cloudinary.com/v1_1/{$this->cloudName}/{$resourceType}/destroy";

        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL            => $url,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => array_merge($params, [
                'api_key'   => $this->apiKey,
                'signature' => $signature,
            ]),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 30,
        ]);
        curl_exec($ch);
        curl_close($ch);
    }

    /**
     * Core upload method.
     */
    private function upload($file, string $folder, string $resourceType): string
    {
        $timestamp = time();
        $params = [
            'folder'    => $folder,
            'timestamp' => $timestamp,
        ];

        $signature = $this->generateSignature($params);

        $url = "https://api.cloudinary.com/v1_1/{$this->cloudName}/{$resourceType}/upload";

        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL            => $url,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => [
                'file'      => new \CURLFile($file->getRealPath(), $file->getMimeType(), $file->getClientOriginalName()),
                'folder'    => $folder,
                'timestamp' => $timestamp,
                'api_key'   => $this->apiKey,
                'signature' => $signature,
            ],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 120,
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($curlError) {
            throw new \RuntimeException("Cloudinary upload failed: {$curlError}");
        }

        $data = json_decode($response, true);

        if ($httpCode !== 200 || !isset($data['secure_url'])) {
            $errorMsg = $data['error']['message'] ?? 'Unknown error';
            throw new \RuntimeException("Cloudinary upload failed ({$httpCode}): {$errorMsg}");
        }

        return $data['secure_url'];
    }

    /**
     * Generate a Cloudinary API signature.
     */
    private function generateSignature(array $params): string
    {
        ksort($params);
        $toSign = implode('&', array_map(
            fn($k, $v) => "{$k}={$v}",
            array_keys($params),
            array_values($params)
        ));
        return sha1($toSign . $this->apiSecret);
    }

    /**
     * Extract the public_id from a Cloudinary secure URL.
     * e.g., https://res.cloudinary.com/demo/image/upload/v1234/item-images/abc.jpg → item-images/abc
     */
    private function extractPublicId(string $url): ?string
    {
        if (!str_contains($url, 'cloudinary.com')) {
            return null;
        }

        // Pattern: .../upload/v{numbers}/public_id.ext
        if (preg_match('#/upload/v\d+/(.+)\.\w+$#', $url, $matches)) {
            return $matches[1];
        }

        // Pattern: .../upload/public_id.ext (without version)
        if (preg_match('#/upload/(.+)\.\w+$#', $url, $matches)) {
            return $matches[1];
        }

        return null;
    }

    /**
     * Check if a path is a Cloudinary URL (vs. a local storage path).
     */
    public static function isCloudinaryUrl(?string $path): bool
    {
        if (!$path) return false;
        return str_contains($path, 'cloudinary.com') || str_starts_with($path, 'https://res.cloudinary.com');
    }
}
