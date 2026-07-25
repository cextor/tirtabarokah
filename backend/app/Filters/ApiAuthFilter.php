<?php

namespace App\Filters;

use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;

class ApiAuthFilter implements FilterInterface
{
    public function before(RequestInterface $request, $arguments = null)
    {
        // Handle preflight CORS requests automatically
        if (strtolower($request->getMethod()) === 'options') {
            return;
        }

        // Get request path relative to index.php (e.g. api/coaches)
        $path = $request->getUri()->getPath();
        
        // Normalize path (remove leading/trailing slashes)
        $path = trim($path, '/');

        // Strip index.php if present
        if (str_starts_with($path, 'index.php/')) {
            $path = substr($path, 10);
        }

        // Define public endpoints
        $publicEndpoints = [
            'api/coaches',
            'api/events',
            'api/members/register',
            'api/reschedule/request',
            'api/auth/login',
            'api/auth/parent-login',
            'api/settings',
            'api/levels',
            'api/debug/log'
        ];

        // 1. Enforce Client Key for ALL API requests
        $clientKey = $request->getHeaderLine('X-Client-Key');
        $expectedClientKey = 'TirtaBarokahClientSecret2026';

        // DEBUG LOG FOR HEADERS
        $headersLog = [];
        foreach ($request->headers() as $name => $h) {
            $headersLog[$name] = $h->getValueLine();
        }
        $msg = '[' . date('Y-m-d H:i:s') . '] Filter debug path: ' . $path . ' ClientKey: "' . $clientKey . '", expected: "' . $expectedClientKey . '", Headers: ' . json_encode($headersLog) . PHP_EOL;
        file_put_contents(WRITEPATH . 'logs/frontend_debug.log', $msg, FILE_APPEND);

        if (!$clientKey || $clientKey !== $expectedClientKey) {
            $response = service('response');
            $response->setStatusCode(401);
            return $response->setJSON([
                'status' => 'error',
                'message' => 'Akses ditolak: Klien tidak sah.'
            ]);
        }

        // If it's a public endpoint, client key check is sufficient
        if (in_array($path, $publicEndpoints)) {
            return;
        }

        // 2. Enforce User Authorization Token for protected endpoints
        $authHeader = $request->getHeaderLine('Authorization');
        if (!$authHeader || !str_starts_with($authHeader, 'Bearer ')) {
            $response = service('response');
            $response->setStatusCode(401);
            return $response->setJSON([
                'status' => 'error',
                'message' => 'Akses ditolak: Token otentikasi diperlukan.'
            ]);
        }

        $token = substr($authHeader, 7); // Strip 'Bearer '

        // Look up token in database
        $db = \Config\Database::connect();
        $tokenRecord = $db->table('user_tokens')
            ->where('token', $token)
            ->get()
            ->getRowArray();

        if (!$tokenRecord) {
            $response = service('response');
            $response->setStatusCode(401);
            return $response->setJSON([
                'status' => 'error',
                'message' => 'Akses ditolak: Token tidak valid.'
            ]);
        }

        // Check expiration
        if (strtotime($tokenRecord['expires_at']) < time()) {
            // Delete expired token
            $db->table('user_tokens')->where('token', $token)->delete();
            
            $response = service('response');
            $response->setStatusCode(401);
            return $response->setJSON([
                'status' => 'error',
                'message' => 'Akses ditolak: Token telah kedaluwarsa.'
            ]);
        }

        // 3. Enforce Role-based Authorization
        $userRole = $tokenRecord['role'];

        // Admin-only endpoints
        $adminEndpoints = [
            'api/coaches/add',
            'api/coaches/update',
            'api/members/verify-payment',
            'api/members/update',
            'api/events/add',
            'api/events/update',
        ];

        $isAdminOnly = false;
        foreach ($adminEndpoints as $ep) {
            if ($path === $ep) {
                $isAdminOnly = true;
                break;
            }
        }
        if (str_starts_with($path, 'api/coaches/delete/') || 
            str_starts_with($path, 'api/members/delete/') || 
            str_starts_with($path, 'api/events/delete/')) {
            $isAdminOnly = true;
        }

        if ($isAdminOnly && $userRole !== 'admin') {
            $response = service('response');
            $response->setStatusCode(403);
            return $response->setJSON([
                'status' => 'error',
                'message' => 'Akses ditolak: Hanya Administrator yang diizinkan.'
            ]);
        }

        // Coach-only endpoints
        $coachEndpoints = [
            'api/progress/add',
            'api/progress/quick',
        ];
        $isCoachOnly = in_array($path, $coachEndpoints);

        if ($isCoachOnly && $userRole !== 'coach' && $userRole !== 'admin') {
            $response = service('response');
            $response->setStatusCode(403);
            return $response->setJSON([
                'status' => 'error',
                'message' => 'Akses ditolak: Hanya Pelatih atau Administrator yang diizinkan.'
            ]);
        }
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
        // No action needed
    }
}
