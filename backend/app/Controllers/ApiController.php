<?php

namespace App\Controllers;

use CodeIgniter\API\ResponseTrait;

class ApiController extends BaseController
{
    use ResponseTrait;

    protected $db;

    public function __construct()
    {
        $this->db = \Config\Database::connect();
    }

    // ==================== COACHES API ====================

    public function getCoaches()
    {
        $coaches = $this->db->table('coaches')->get()->getResultArray();
        
        foreach ($coaches as &$coach) {
            // Get Packages
            $coach['packages'] = $this->db->table('packages')
                ->where('coach_id', $coach['id'])
                ->get()
                ->getResultArray();

            // Get Schedules
            $schedules = $this->db->table('coach_schedules')
                ->where('coach_id', $coach['id'])
                ->get()
                ->getResultArray();

            // Group by day to match frontend structure
            $groupedSchedule = [];
            foreach ($schedules as $sched) {
                $dayName = $sched['day'];
                if (!isset($groupedSchedule[$dayName])) {
                    $groupedSchedule[$dayName] = [
                        'day' => $dayName,
                        'timeSlots' => []
                    ];
                }

                // Count active students registered in this day & time slot
                $studentsInSlot = $this->db->table('members')
                    ->where('coach_id', $coach['id'])
                    ->where('status !=', 'Selesai')
                    ->groupStart()
                        ->groupStart()
                            ->where('schedule_day', $dayName)
                            ->where('schedule_time', $sched['time'])
                        ->groupEnd()
                        ->orGroupStart()
                            ->where('schedule_frequency', '2x Seminggu')
                            ->where('schedule_day2', $dayName)
                            ->where('schedule_time2', $sched['time'])
                        ->groupEnd()
                    ->groupEnd()
                    ->get()
                    ->getResultArray();

                $studentIds = array_column($studentsInSlot, 'id');

                $groupedSchedule[$dayName]['timeSlots'][] = [
                    'time' => $sched['time'],
                    'maxSlots' => (int)$sched['max_slots'],
                    'currentSlots' => count($studentIds),
                    'students' => $studentIds
                ];
            }

            $coach['schedule'] = array_values($groupedSchedule);

            // Compute current overall quota
            $activeStudentsTotal = $this->db->table('members')
                ->where('coach_id', $coach['id'])
                ->where('status !=', 'Selesai')
                ->countAllResults();

            $coach['currentQuota'] = $activeStudentsTotal;
            $coach['status'] = ($activeStudentsTotal >= $coach['max_quota']) ? 'Penuh' : 'Tersedia';
            $coach['referralBonus'] = (int)$coach['referral_bonus'];
            $coach['maxQuota'] = (int)$coach['max_quota'];
        }

        return $this->respond($coaches);
    }

    public function addCoach()
    {
        $json = $this->request->getJSON();
        if (!$json || empty($json->name)) {
            return $this->fail('Nama pelatih harus diisi.');
        }

        $id = 'coach-' . strtolower(str_replace(' ', '-', $json->name)) . '-' . rand(100, 999);
        $referralCode = 'COACH-' . strtoupper(str_replace(' ', '-', $json->name));

        $coachData = [
            'id' => $id,
            'name' => $json->name,
            'photo' => $json->photo ?? 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&q=80',
            'experience' => $json->experience ?? 'Pelatih Renang Profesional',
            'referral_code' => $referralCode,
            'referral_bonus' => 0,
            'max_quota' => (int)($json->maxQuota ?? 6)
        ];

        $this->db->transStart();
        $this->db->table('coaches')->insert($coachData);

        // Add default packages (4x, 8x, 12x)
        $prices = [
            'p4' => $json->price4 ?? 250000,
            'p8' => $json->price8 ?? 450000,
            'p12' => $json->price12 ?? 600000
        ];
        
        $this->db->table('packages')->insert([
            'id' => $id . '-p4',
            'coach_id' => $id,
            'name' => 'Paket 4x latihan',
            'price' => $prices['p4'],
            'sessions' => 4
        ]);
        $this->db->table('packages')->insert([
            'id' => $id . '-p8',
            'coach_id' => $id,
            'name' => 'Paket 8x latihan',
            'price' => $prices['p8'],
            'sessions' => 8
        ]);
        $this->db->table('packages')->insert([
            'id' => $id . '-p12',
            'coach_id' => $id,
            'name' => 'Paket 12x latihan',
            'price' => $prices['p12'],
            'sessions' => 12
        ]);

        // Add default schedule templates (Senin-Selasa for new coach)
        $days = ['Senin', 'Selasa'];
        $times = ['08.00', '09.00', '16.00', '17.00'];
        foreach ($days as $day) {
            foreach ($times as $time) {
                $this->db->table('coach_schedules')->insert([
                    'coach_id' => $id,
                    'day' => $day,
                    'time' => $time,
                    'max_slots' => 6
                ]);
            }
        }

        $this->db->transComplete();

        if ($this->db->transStatus() === false) {
            return $this->fail('Gagal menambahkan pelatih baru.');
        }

        return $this->respondCreated(['status' => 'success', 'id' => $id]);
    }

    public function updateCoach()
    {
        $json = $this->request->getJSON();
        if (!$json || empty($json->id)) {
            return $this->fail('ID Pelatih harus dilampirkan.');
        }

        $id = $json->id;
        $coachData = [
            'name' => $json->name,
            'experience' => $json->experience,
            'photo' => $json->photo,
            'max_quota' => (int)$json->maxQuota
        ];

        $this->db->transStart();
        $this->db->table('coaches')->where('id', $id)->update($coachData);

        // Update package prices
        if (isset($json->price4)) {
            $this->db->table('packages')
                ->where('coach_id', $id)
                ->where('sessions', 4)
                ->update(['price' => $json->price4]);
        }
        if (isset($json->price8)) {
            $this->db->table('packages')
                ->where('coach_id', $id)
                ->where('sessions', 8)
                ->update(['price' => $json->price8]);
        }
        if (isset($json->price12)) {
            $this->db->table('packages')
                ->where('coach_id', $id)
                ->where('sessions', 12)
                ->update(['price' => $json->price12]);
        }

        $this->db->transComplete();

        if ($this->db->transStatus() === false) {
            return $this->fail('Gagal memperbarui data pelatih.');
        }

        return $this->respond(['status' => 'success']);
    }

    public function deleteCoach($id)
    {
        $exists = $this->db->table('coaches')->where('id', $id)->countAllResults();
        if (!$exists) {
            return $this->failNotFound('Pelatih tidak ditemukan.');
        }

        $this->db->table('coaches')->where('id', $id)->delete();
        return $this->respondDeleted(['status' => 'success']);
    }

    // ==================== MEMBERS API ====================

    public function getMembers()
    {
        $members = $this->db->table('members')->get()->getResultArray();
        
        $formattedMembers = [];
        foreach ($members as $m) {
            // Get Payment record
            $payment = $this->db->table('payments')
                ->where('member_id', $m['id'])
                ->get()
                ->getRowArray();

            $formattedPayment = $payment ? [
                'amount' => (int)$payment['amount'],
                'method' => $payment['method'],
                'proofUrl' => $payment['proof_url'],
                'status' => $payment['status'],
                'date' => $payment['date']
            ] : null;

            // Get Progress log
            $progress = $this->db->table('training_progress')
                ->where('member_id', $m['id'])
                ->orderBy('date', 'DESC')
                ->get()
                ->getResultArray();

            // Get Reschedule requests
            $reschedules = $this->db->table('reschedule_requests')
                ->where('member_id', $m['id'])
                ->get()
                ->getResultArray();

            $formattedReschedules = [];
            foreach ($reschedules as $r) {
                $formattedReschedules[] = [
                    'id' => $r['id'],
                    'originalDay' => $r['original_day'],
                    'originalTime' => $r['original_time'],
                    'requestedDay' => $r['requested_day'],
                    'requestedTime' => $r['requested_time'],
                    'status' => $r['status'],
                    'reason' => $r['reason']
                ];
            }

            $formattedMembers[] = [
                'id' => $m['id'],
                'parent' => [
                    'fatherMotherName' => $m['parent_name'],
                    'whatsapp' => $m['parent_whatsapp']
                ],
                'student' => [
                    'fullName' => $m['student_name'],
                    'gender' => $m['student_gender'],
                    'dob' => $m['student_dob'],
                    'age' => (int)$m['student_age'],
                    'illnessHistory' => $m['student_illness'],
                    'hasSwumBefore' => (bool)$m['student_has_swum']
                ],
                'coachId' => $m['coach_id'],
                'packageId' => $m['package_id'],
                'scheduleFrequency' => $m['schedule_frequency'],
                'scheduleDay' => $m['schedule_day'],
                'scheduleTime' => $m['schedule_time'],
                'scheduleDay2' => $m['schedule_day2'],
                'scheduleTime2' => $m['schedule_time2'],
                'coachType' => $m['coach_type'],
                'status' => $m['status'],
                'sessionsLeft' => (int)$m['sessions_left'],
                'sessionsTotal' => (int)$m['sessions_total'],
                'payment' => $formattedPayment,
                'progress' => $progress,
                'registeredAt' => $m['registered_at'],
                'referralCodeUsed' => $m['referral_code_used'],
                'referralCount' => (int)$m['referral_count'],
                'referralBonus' => (int)$m['referral_bonus'],
                'rescheduleRequests' => $formattedReschedules
            ];
        }

        return $this->respond($formattedMembers);
    }

    public function registerMember()
    {
        $json = $this->request->getJSON();
        if (!$json) {
            return $this->fail('Data pendaftaran tidak valid.');
        }

        $id = 'TB-' . rand(100000, 999999);
        $this->db->transStart();

        $referralBonus = 0;
        $referralCode = isset($json->referralCodeUsed) ? trim(strtoupper($json->referralCodeUsed)) : null;

        // Apply referral logic
        if ($referralCode) {
            // Is it a coach code?
            $coachRef = $this->db->table('coaches')->where('referral_code', $referralCode)->getRowArray();
            if ($coachRef) {
                // Coach gets Rp 50.000 bonus
                $newBonus = ($coachRef['referral_bonus'] ?? 0) + 50000;
                $this->db->table('coaches')->where('id', $coachRef['id'])->update(['referral_bonus' => $newBonus]);
            } else {
                // Is it a member ID?
                // Strip TB- or MEMBER- to test match
                $cleanCode = str_replace(['MEMBER-', 'TB-'], '', $referralCode);
                $memberRef = $this->db->table('members')
                    ->where('id', 'member-' . strtolower($cleanCode))
                    ->orWhere('id', 'TB-' . $cleanCode)
                    ->orWhere('id', $referralCode)
                    ->getRowArray();

                if ($memberRef) {
                    // Member gets Rp 25.000 credit/bonus, referral count increases
                    $newCount = ($memberRef['referral_count'] ?? 0) + 1;
                    $newMemberBonus = ($memberRef['referral_bonus'] ?? 0) + 25000;
                    $this->db->table('members')->where('id', $memberRef['id'])->update([
                        'referral_count' => $newCount,
                        'referral_bonus' => $newMemberBonus
                    ]);
                }
            }
        }

        // Insert Member
        $memberData = [
            'id' => $id,
            'parent_name' => $json->parent->fatherMotherName,
            'parent_whatsapp' => $json->parent->whatsapp,
            'student_name' => $json->student->fullName,
            'student_gender' => $json->student->gender,
            'student_dob' => $json->student->dob,
            'student_age' => (int)$json->student->age,
            'student_illness' => $json->student->illnessHistory ?? '',
            'student_has_swum' => $json->student->hasSwumBefore ? 1 : 0,
            'coach_id' => $json->coachId,
            'package_id' => $json->packageId,
            'schedule_frequency' => $json->scheduleFrequency,
            'schedule_day' => $json->scheduleDay,
            'schedule_time' => $json->scheduleTime,
            'schedule_day2' => $json->scheduleDay2 ?? null,
            'schedule_time2' => $json->scheduleTime2 ?? null,
            'coach_type' => $json->coachType,
            'status' => 'Menunggu Verifikasi',
            'sessions_left' => (int)$json->sessionsLeft,
            'sessions_total' => (int)$json->sessionsTotal,
            'registered_at' => date('Y-m-d H:i:s'),
            'referral_code_used' => $referralCode
        ];

        $this->db->table('members')->insert($memberData);

        // Insert Payment
        $paymentData = [
            'member_id' => $id,
            'amount' => (int)$json->payment->amount,
            'method' => $json->payment->method,
            'proof_url' => $json->payment->proofUrl ?? null,
            'status' => 'Menunggu Verifikasi',
            'date' => date('Y-m-d H:i:s')
        ];

        $this->db->table('payments')->insert($paymentData);

        $this->db->transComplete();

        if ($this->db->transStatus() === false) {
            return $this->fail('Gagal melakukan pendaftaran.');
        }

        return $this->respondCreated(['status' => 'success', 'id' => $id]);
    }

    public function verifyPayment()
    {
        $json = $this->request->getJSON();
        if (!$json || empty($json->id)) {
            return $this->fail('ID Siswa harus dilampirkan.');
        }

        $this->db->transStart();
        $this->db->table('payments')->where('member_id', $json->id)->update([
            'status' => 'Pembayaran Berhasil',
            'date' => date('Y-m-d H:i:s')
        ]);
        $this->db->table('members')->where('id', $json->id)->update([
            'status' => 'Aktif'
        ]);
        $this->db->transComplete();

        if ($this->db->transStatus() === false) {
            return $this->fail('Gagal memverifikasi pembayaran.');
        }

        return $this->respond(['status' => 'success']);
    }

    public function updateMember()
    {
        $json = $this->request->getJSON();
        if (!$json || empty($json->id)) {
            return $this->fail('ID Siswa harus dilampirkan.');
        }

        $id = $json->id;
        $this->db->transStart();

        $memberData = [
            'parent_name' => $json->parent->fatherMotherName,
            'parent_whatsapp' => $json->parent->whatsapp,
            'student_name' => $json->student->fullName,
            'student_gender' => $json->student->gender,
            'student_dob' => $json->student->dob,
            'student_age' => (int)$json->student->age,
            'student_illness' => $json->student->illnessHistory ?? '',
            'student_has_swum' => $json->student->hasSwumBefore ? 1 : 0,
            'coach_id' => $json->coachId,
            'package_id' => $json->packageId,
            'schedule_frequency' => $json->scheduleFrequency,
            'schedule_day' => $json->scheduleDay,
            'schedule_time' => $json->scheduleTime,
            'schedule_day2' => $json->scheduleDay2 ?? null,
            'schedule_time2' => $json->scheduleTime2 ?? null,
            'coach_type' => $json->coachType,
            'status' => $json->status,
            'sessions_left' => (int)$json->sessionsLeft,
            'sessions_total' => (int)$json->sessionsTotal
        ];

        $this->db->table('members')->where('id', $id)->update($memberData);

        // Update payment info if exists
        $paymentExists = $this->db->table('payments')->where('member_id', $id)->countAllResults();
        if ($paymentExists) {
            $this->db->table('payments')->where('member_id', $id)->update([
                'amount' => (int)$json->payment->amount,
                'method' => $json->payment->method,
                'status' => $json->payment->status
            ]);
        } else {
            $this->db->table('payments')->insert([
                'member_id' => $id,
                'amount' => (int)$json->payment->amount,
                'method' => $json->payment->method,
                'status' => $json->payment->status,
                'date' => date('Y-m-d H:i:s')
            ]);
        }

        $this->db->transComplete();

        if ($this->db->transStatus() === false) {
            return $this->fail('Gagal memperbarui data siswa.');
        }

        return $this->respond(['status' => 'success']);
    }

    public function deleteMember($id)
    {
        $exists = $this->db->table('members')->where('id', $id)->countAllResults();
        if (!$exists) {
            return $this->failNotFound('Siswa tidak ditemukan.');
        }

        $this->db->table('members')->where('id', $id)->delete();
        return $this->respondDeleted(['status' => 'success']);
    }

    // ==================== EVENTS API ====================

    public function getEvents()
    {
        $events = $this->db->table('events')->orderBy('date', 'ASC')->get()->getResultArray();
        return $this->respond($events);
    }

    public function addEvent()
    {
        $json = $this->request->getJSON();
        if (!$json || empty($json->title)) {
            return $this->fail('Judul kegiatan harus diisi.');
        }

        $id = 'event-' . rand(1000, 9999);
        $eventData = [
            'id' => $id,
            'title' => $json->title,
            'category' => $json->category,
            'date' => $json->date,
            'description' => $json->description ?? '',
            'image_url' => $json->imageUrl ?? 'https://images.unsplash.com/photo-1519074002996-a69e7ac46a42?w=600&h=400&fit=crop&q=80'
        ];

        $this->db->table('events')->insert($eventData);
        return $this->respondCreated(['status' => 'success', 'id' => $id]);
    }

    public function updateEvent()
    {
        $json = $this->request->getJSON();
        if (!$json || empty($json->id)) {
            return $this->fail('ID Kegiatan harus dilampirkan.');
        }

        $eventData = [
            'title' => $json->title,
            'category' => $json->category,
            'date' => $json->date,
            'description' => $json->description,
            'image_url' => $json->imageUrl
        ];

        $this->db->table('events')->where('id', $json->id)->update($eventData);
        return $this->respond(['status' => 'success']);
    }

    public function deleteEvent($id)
    {
        $exists = $this->db->table('events')->where('id', $id)->countAllResults();
        if (!$exists) {
            return $this->failNotFound('Kegiatan tidak ditemukan.');
        }

        $this->db->table('events')->where('id', $id)->delete();
        return $this->respondDeleted(['status' => 'success']);
    }

    // ==================== TRAINING PROGRESS API ====================

    public function addProgress()
    {
        $json = $this->request->getJSON();
        if (!$json || empty($json->memberId) || empty($json->note)) {
            return $this->fail('ID Siswa dan catatan harus dilampirkan.');
        }

        $this->db->transStart();

        $member = $this->db->table('members')->where('id', $json->memberId)->getRowArray();
        if (!$member) {
            return $this->failNotFound('Siswa tidak ditemukan.');
        }

        // Attendance deduction
        $isHadir = ($json->attendance === 'Hadir');
        $newSessionsLeft = $isHadir ? max(0, $member['sessions_left'] - 1) : $member['sessions_left'];

        $newStatus = $member['status'];
        if ($newSessionsLeft == 0) {
            $newStatus = 'Selesai';
        } elseif ($newSessionsLeft <= 2) {
            $newStatus = 'Paket Hampir Habis';
        }

        $this->db->table('members')->where('id', $json->memberId)->update([
            'sessions_left' => $newSessionsLeft,
            'status' => $newStatus
        ]);

        $progressId = 'prog-' . rand(100000, 999999);
        $this->db->table('training_progress')->insert([
            'id' => $progressId,
            'member_id' => $json->memberId,
            'date' => $json->date ?? date('Y-m-d'),
            'attendance' => $json->attendance,
            'note' => $json->note
        ]);

        $this->db->transComplete();

        if ($this->db->transStatus() === false) {
            return $this->fail('Gagal menyimpan catatan presensi.');
        }

        return $this->respondCreated(['status' => 'success', 'sessionsLeft' => $newSessionsLeft]);
    }

    public function quickAttendance()
    {
        $json = $this->request->getJSON();
        if (!$json || empty($json->memberId) || empty($json->attendance)) {
            return $this->fail('ID Siswa dan status kehadiran harus dilampirkan.');
        }

        $this->db->transStart();

        $member = $this->db->table('members')->where('id', $json->memberId)->getRowArray();
        if (!$member) {
            return $this->failNotFound('Siswa tidak ditemukan.');
        }

        $isHadir = ($json->attendance === 'Hadir');
        $newSessionsLeft = $isHadir ? max(0, $member['sessions_left'] - 1) : $member['sessions_left'];

        $newStatus = $member['status'];
        if ($newSessionsLeft == 0) {
            $newStatus = 'Selesai';
        } elseif ($newSessionsLeft <= 2) {
            $newStatus = 'Paket Hampir Habis';
        }

        $this->db->table('members')->where('id', $json->memberId)->update([
            'sessions_left' => $newSessionsLeft,
            'status' => $newStatus
        ]);

        $defaultNotes = [
            'Hadir' => 'Menyelesaikan sesi latihan rutin dengan baik. Fokus gerakan hari ini tercapai.',
            'Absen' => 'Siswa absen tanpa keterangan pada jadwal latihan rutin.',
            'Izin' => 'Siswa berhalangan hadir dengan izin tertulis / pemberitahuan sebelumnya.'
        ];

        $progressId = 'prog-' . rand(100000, 999999);
        $this->db->table('training_progress')->insert([
            'id' => $progressId,
            'member_id' => $json->memberId,
            'date' => date('Y-m-d'),
            'attendance' => $json->attendance,
            'note' => $defaultNotes[$json->attendance]
        ]);

        $this->db->transComplete();

        if ($this->db->transStatus() === false) {
            return $this->fail('Gagal menyimpan presensi cepat.');
        }

        return $this->respond(['status' => 'success', 'sessionsLeft' => $newSessionsLeft]);
    }

    // ==================== RESCHEDULE API ====================

    public function requestReschedule()
    {
        $json = $this->request->getJSON();
        if (!$json || empty($json->memberId) || empty($json->requestedDay) || empty($json->requestedTime)) {
            return $this->fail('Data reschedule tidak lengkap.');
        }

        $memberId = $json->memberId;
        $this->db->transStart();

        $member = $this->db->table('members')->where('id', $memberId)->getRowArray();
        if (!$member) {
            return $this->failNotFound('Siswa tidak ditemukan.');
        }

        $requestId = 'req-' . rand(100000, 999999);
        
        // Save Reschedule Request log (Auto-approved for simulation)
        $this->db->table('reschedule_requests')->insert([
            'id' => $requestId,
            'member_id' => $memberId,
            'original_day' => $member['schedule_day'],
            'original_time' => $member['schedule_time'],
            'requested_day' => $json->requestedDay,
            'requested_time' => $json->requestedTime,
            'status' => 'Disetujui',
            'reason' => $json->reason ?? 'Keperluan mendesak'
        ]);

        // Directly move schedule
        $this->db->table('members')->where('id', $memberId)->update([
            'schedule_day' => $json->requestedDay,
            'schedule_time' => $json->requestedTime
        ]);

        $this->db->transComplete();

        if ($this->db->transStatus() === false) {
            return $this->fail('Gagal memproses reschedule.');
        }

        return $this->respond(['status' => 'success']);
    }
}
