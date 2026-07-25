<?php

namespace App\Controllers;

class Home extends BaseController
{
    protected $db;

    public function __construct()
    {
        $this->db = \Config\Database::connect();
    }

    public function index()
    {
        $session = session();
        if ($session->get('admin_logged_in')) {
            return view('docs');
        }
        return view('login');
    }

    public function login()
    {
        $session = session();
        $username = trim($this->request->getPost('username') ?? '');
        $password = trim($this->request->getPost('password') ?? '');

        if (empty($username) || empty($password)) {
            $session->setFlashdata('error', 'Username dan Password harus diisi.');
            return redirect()->to('/');
        }

        $user = $this->db->table('users')
            ->where('username', $username)
            ->where('role', 'admin')
            ->get()
            ->getRowArray();

        if (!$user) {
            $session->setFlashdata('error', 'Username atau Password salah.');
            return redirect()->to('/');
        }

        $isPasswordValid = false;
        if (str_starts_with($user['password'], '$2y$') || str_starts_with($user['password'], '$2a$')) {
            $isPasswordValid = password_verify($password, $user['password']);
        } else {
            $isPasswordValid = ($password === $user['password']);
        }

        if (!$isPasswordValid) {
            $session->setFlashdata('error', 'Username atau Password salah.');
            return redirect()->to('/');
        }

        $session->set([
            'admin_id' => $user['id'],
            'admin_username' => $user['username'],
            'admin_name' => $user['name'],
            'admin_logged_in' => true
        ]);

        return redirect()->to('/');
    }

    public function logout()
    {
        $session = session();
        $session->destroy();
        return redirect()->to('/');
    }
}

