<?php

namespace App\Filters;

use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;

class ApiAuthFilter implements FilterInterface
{
    public function before(RequestInterface $request, $arguments = null)
    {
        // Always emit CORS headers for cross-domain API calls (e.g. demo.tirtabarokah.id -> apidemo.tirtabarokah.id)
        $origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '*';
        if (function_exists('header') && !headers_sent()) {
            header("Access-Control-Allow-Origin: {$origin}");
            header("Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Client-Key");
            header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
            header("Access-Control-Allow-Credentials: true");
        }

        // Handle preflight CORS requests automatically (terminate with 200 OK)
        if (strtolower($request->getMethod()) === 'options') {
            if (function_exists('http_response_code')) {
                http_response_code(200);
            }
            exit(0);
        }

        // Get request path relative to index.php (e.g. api/coaches)
        $rawPath = $request->getUri()->getPath();
        $cleanPath = explode('?', $rawPath)[0];
        
        if (preg_match('#api/.*#i', $cleanPath, $matches)) {
            $path = strtolower(trim($matches[0], '/'));
        } else {
            $path = strtolower(trim($cleanPath, '/'));
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
            'api/pricing-packages',
            'api/event-categories',
            'api/swimming-pools',
            'api/debug/log'
        ];

        // If it's a public endpoint, allow access so landing page content is always served
        if (in_array($path, $publicEndpoints)) {
            return;
        }

        // 1. Enforce Client Key for protected API requests
        $clientHeader = $request->header('X-Client-Key') ?? $request->header('x-client-key');
        $clientKey = $clientHeader ? trim($clientHeader->getValue()) : '';
        if (!$clientKey) {
            $clientKey = trim($request->getHeaderLine('X-Client-Key'));
            if (str_starts_with(strtolower($clientKey), 'x-client-key:')) {
                $clientKey = trim(substr($clientKey, 13));
            }
        }
        if (!$clientKey && isset($_SERVER['HTTP_X_CLIENT_KEY'])) {
            $clientKey = trim($_SERVER['HTTP_X_CLIENT_KEY']);
        }
        if (!$clientKey && function_exists('getallheaders')) {
            $headers = getallheaders();
            foreach ($headers as $name => $value) {
                if (strcasecmp($name, 'X-Client-Key') === 0) {
                    $clientKey = trim($value);
                    break;
                }
            }
        }

        $expectedClientKey = 'TirtaBarokahClientSecret2026';

        if (!$clientKey || $clientKey !== $expectedClientKey) {
            $response = service('response');
            $response->setStatusCode(401);
            return $response->setJSON([
                'status' => 'error',
                'message' => 'Akses ditolak: Klien tidak sah.'
            ]);
        }

        // 2. Enforce User Authorization Token for protected endpoints
        $authHeaderObj = $request->header('Authorization') ?? $request->header('authorization');
        $authHeader = $authHeaderObj ? trim($authHeaderObj->getValue()) : trim($request->getHeaderLine('Authorization'));
        if (str_starts_with(strtolower($authHeader), 'authorization:')) {
            $authHeader = trim(substr($authHeader, 14));
        }
        if (!$authHeader && isset($_SERVER['HTTP_AUTHORIZATION'])) {
            $authHeader = trim($_SERVER['HTTP_AUTHORIZATION']);
        }

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

        // Admin/Operator endpoints
        $adminEndpoints = [
            'api/coaches/add',
            'api/coaches/update',
            'api/members/verify-payment',
            'api/members/update',
            'api/members/register',
            'api/events/add',
            'api/events/update',
            'api/absences/process',
        ];

        $isAdminOrOperator = false;
        foreach ($adminEndpoints as $ep) {
            if ($path === $ep) {
                $isAdminOrOperator = true;
                break;
            }
        }
        if (str_starts_with($path, 'api/coaches/delete/') || 
            str_starts_with($path, 'api/members/delete/') || 
            str_starts_with($path, 'api/events/delete/')) {
            $isAdminOrOperator = true;
        }

        if ($isAdminOrOperator && $userRole !== 'admin' && $userRole !== 'operator') {
            $response = service('response');
            $response->setStatusCode(403);
            return $response->setJSON([
                'status' => 'error',
                'message' => 'Akses ditolak: Hanya Admin atau Operator yang dapat melakukan tindakan ini.'
            ]);
        }

        // Super-Admin only endpoints
        $superAdminEndpoints = [
            'api/pricing-packages/add',
            'api/pricing-packages/update',
            'api/swimming-pools/add',
            'api/swimming-pools/update',
            'api/levels/add',
            'api/levels/update',
            'api/settings',
            'api/audit-logs'
        ];
        $isSuperAdminOnly = in_array($path, $superAdminEndpoints) ||
            str_starts_with($path, 'api/pricing-packages/delete/') ||
            str_starts_with($path, 'api/swimming-pools/delete/') ||
            str_starts_with($path, 'api/levels/delete/');

        if ($isSuperAdminOnly && $userRole !== 'admin') {
            $response = service('response');
            $response->setStatusCode(403);
            return $response->setJSON([
                'status' => 'error',
                'message' => 'Akses ditolak: Hanya Admin Utama yang dapat mengakses fitur ini.'
            ]);
        }

        // Coach, Admin & Operator endpoints
        $coachEndpoints = [
            'api/progress/add',
            'api/progress/quick',
            'api/absences/report',
        ];
        $isCoachEndpoint = in_array($path, $coachEndpoints);

        if ($isCoachEndpoint && $userRole !== 'coach' && $userRole !== 'admin' && $userRole !== 'operator') {
            $response = service('response');
            $response->setStatusCode(403);
            return $response->setJSON([
                'status' => 'error',
                'message' => 'Akses ditolak: Hanya Pelatih, Admin, atau Operator yang diizinkan.'
            ]);
        }
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
        // No action needed
    }
}
