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
        $coaches = $this->db->table('coaches')
            ->select('coaches.*, users.username')
            ->join('users', 'users.id = coaches.id')
            ->orderBy('coaches.name', 'ASC')
            ->get()
            ->getResultArray();
        
        foreach ($coaches as &$coach) {
            unset($coach['password']);
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
                $studentsInSlot = $this->db->table('member_schedules')
                    ->join('members', 'members.id = member_schedules.member_id')
                    ->where('member_schedules.coach_id', $coach['id'])
                    ->where('member_schedules.day', $dayName)
                    ->where('member_schedules.time', $sched['time'])
                    ->where('members.status !=', 'Selesai')
                    ->get()
                    ->getResultArray();

                $studentIds = array_column($studentsInSlot, 'member_id');

                $groupedSchedule[$dayName]['timeSlots'][] = [
                    'time' => $sched['time'],
                    'maxSlots' => (int)$sched['max_slots'],
                    'currentSlots' => count($studentIds),
                    'students' => $studentIds
                ];
            }

            $coach['schedule'] = array_values($groupedSchedule);

            // Compute current overall quota
            $activeStudentsTotal = $this->db->table('member_schedules')
                ->join('members', 'members.id = member_schedules.member_id')
                ->where('member_schedules.coach_id', $coach['id'])
                ->where('members.status !=', 'Selesai')
                ->select('member_schedules.member_id')
                ->distinct()
                ->countAllResults();

            $coach['currentQuota'] = $activeStudentsTotal;
            $coach['status'] = ($activeStudentsTotal >= $coach['max_quota']) ? 'Penuh' : 'Tersedia';
            $coach['referralBonus'] = (int)$coach['referral_bonus'];
            $coach['maxQuota'] = (int)$coach['max_quota'];
            $coach['referralCode'] = $coach['referral_code'];
            $coach['isActive'] = isset($coach['is_active']) ? (bool)$coach['is_active'] : true;
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
        $username = (!empty($json->username)) ? trim($json->username) : strtolower(str_replace(' ', '', $json->name)) . rand(10, 99);
        $password = (!empty($json->password)) ? trim($json->password) : 'coach123';

        $userData = [
            'id' => $id,
            'username' => $username,
            'password' => password_hash($password, PASSWORD_DEFAULT),
            'name' => $json->name,
            'role' => 'coach'
        ];

        $coachData = [
            'id' => $id,
            'name' => $json->name,
            'photo' => $json->photo ?? '/images/coach_rian.png',
            'experience' => $json->experience ?? 'Pelatih Renang Profesional',
            'referral_code' => $referralCode,
            'referral_bonus' => 0,
            'max_quota' => (int)($json->maxQuota ?? 6),
            'is_active' => 1,
            'email' => (!empty($json->email)) ? trim($json->email) : null,
            'phone' => (!empty($json->phone)) ? trim($json->phone) : null
        ];

        $this->db->transStart();
        $this->db->table('users')->insert($userData);
        $this->db->table('coaches')->insert($coachData);

        // Add packages
        if (!empty($json->packages) && is_array($json->packages)) {
            foreach ($json->packages as $pkg) {
                $pkgId = isset($pkg->id) && !str_starts_with($pkg->id, 'pkg-') ? $pkg->id : $id . '-pkg-' . rand(100, 999);
                $this->db->table('packages')->insert([
                    'id' => $pkgId,
                    'coach_id' => $id,
                    'name' => $pkg->name,
                    'price' => (int)$pkg->price,
                    'sessions' => (int)$pkg->sessions
                ]);
            }
        } else {
            // Default packages if empty
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
        }

        // Add schedules (Dynamic only)
        if (isset($json->schedule) && is_array($json->schedule)) {
            foreach ($json->schedule as $dayGroup) {
                $dayName = $dayGroup->day;
                if (isset($dayGroup->timeSlots) && is_array($dayGroup->timeSlots)) {
                    foreach ($dayGroup->timeSlots as $slot) {
                        $this->db->table('coach_schedules')->insert([
                            'coach_id' => $id,
                            'day' => $dayName,
                            'time' => $slot->time,
                            'max_slots' => isset($slot->maxSlots) ? (int)$slot->maxSlots : 6
                        ]);
                    }
                }
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
        $userData = [
            'name' => $json->name,
            'username' => trim($json->username)
        ];

        if (!empty($json->password)) {
            $userData['password'] = password_hash(trim($json->password), PASSWORD_DEFAULT);
        }

        $coachData = [
            'name' => $json->name,
            'experience' => $json->experience,
            'photo' => $json->photo,
            'max_quota' => (int)$json->maxQuota,
            'is_active' => isset($json->isActive) ? ($json->isActive ? 1 : 0) : 1,
            'email' => (!empty($json->email)) ? trim($json->email) : null,
            'phone' => (!empty($json->phone)) ? trim($json->phone) : null
        ];

        $this->db->transStart();
        $this->db->table('users')->where('id', $id)->update($userData);
        $this->db->table('coaches')->where('id', $id)->update($coachData);

        // Update packages (Upsert strategy to avoid foreign key failures)
        if (isset($json->packages) && is_array($json->packages)) {
            $existingPackages = $this->db->table('packages')->where('coach_id', $id)->get()->getResultArray();
            $existingIds = array_column($existingPackages, 'id');
            $keepIds = [];

            foreach ($json->packages as $pkg) {
                $isNew = true;
                $pkgId = '';

                if (isset($pkg->id) && !empty($pkg->id) && !str_starts_with($pkg->id, 'pkg-')) {
                    if (in_array($pkg->id, $existingIds)) {
                        $isNew = false;
                        $pkgId = $pkg->id;
                    }
                }

                if ($isNew) {
                    $pkgId = $id . '-pkg-' . rand(1000, 9999);
                    $this->db->table('packages')->insert([
                        'id' => $pkgId,
                        'coach_id' => $id,
                        'name' => $pkg->name,
                        'price' => (int)$pkg->price,
                        'sessions' => (int)$pkg->sessions
                    ]);
                } else {
                    $this->db->table('packages')->where('id', $pkgId)->update([
                        'name' => $pkg->name,
                        'price' => (int)$pkg->price,
                        'sessions' => (int)$pkg->sessions
                    ]);
                    $keepIds[] = $pkgId;
                }
            }

            // Delete packages that are no longer in the payload
            $idsToDelete = array_diff($existingIds, $keepIds);
            foreach ($idsToDelete as $deleteId) {
                try {
                    $this->db->table('packages')->where('id', $deleteId)->delete();
                } catch (\Exception $e) {
                    // Ignore if in use by members
                }
            }
        } else {
            // Fallback to legacy structure if array is not provided
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
        }

        // Sync schedules
        if (isset($json->schedule) && is_array($json->schedule)) {
            $this->db->table('coach_schedules')->where('coach_id', $id)->delete();
            foreach ($json->schedule as $dayGroup) {
                $dayName = $dayGroup->day;
                if (isset($dayGroup->timeSlots) && is_array($dayGroup->timeSlots)) {
                    foreach ($dayGroup->timeSlots as $slot) {
                        $this->db->table('coach_schedules')->insert([
                            'coach_id' => $id,
                            'day' => $dayName,
                            'time' => $slot->time,
                            'max_slots' => isset($slot->maxSlots) ? (int)$slot->maxSlots : 6
                        ]);
                    }
                }
            }
        }

        $this->db->transComplete();

        if ($this->db->transStatus() === false) {
            return $this->fail('Gagal memperbarui data pelatih.');
        }

        return $this->respond(['status' => 'success']);
    }

    public function deleteCoach($id)
    {
        $exists = $this->db->table('users')->where('id', $id)->countAllResults();
        if (!$exists) {
            return $this->failNotFound('Pelatih tidak ditemukan.');
        }

        // Check if there are active schedules for this coach in member_schedules
        $hasSchedules = $this->db->table('member_schedules')->where('coach_id', $id)->countAllResults();
        if ($hasSchedules > 0) {
            return $this->fail('Pelatih tidak bisa dihapus karena masih ada siswa yang terdaftar pada jadwalnya.', 400);
        }

        // Check if there are packages belonging to this coach that are chosen by members
        $packages = $this->db->table('packages')->where('coach_id', $id)->get()->getResultArray();
        $packageIds = array_column($packages, 'id');
        if (!empty($packageIds)) {
            $hasMembers = $this->db->table('members')->whereIn('package_id', $packageIds)->countAllResults();
            if ($hasMembers > 0) {
                return $this->fail('Pelatih tidak bisa dihapus karena paket latihannya masih digunakan oleh siswa.', 400);
            }
        }

        // Clean up dependent tables that reference coaches
        $this->db->table('packages')->where('coach_id', $id)->delete();
        $this->db->table('coach_schedules')->where('coach_id', $id)->delete();
        $this->db->table('coaches')->where('id', $id)->delete();
        $this->db->table('users')->where('id', $id)->delete();

        return $this->respondDeleted(['status' => 'success']);
    }

    private function checkScheduleConflict($studentName, $id, $newSchedules)
    {
        $studentName = trim($studentName);
        if (empty($studentName) || empty($newSchedules) || !is_array($newSchedules)) {
            return null;
        }

        // Check if there are any duplicate slots in the new schedule array itself
        $seenSlots = [];
        foreach ($newSchedules as $ns) {
            $key = $ns['day'] . '|' . $ns['time'];
            if (isset($seenSlots[$key])) {
                return "Jadwal " . $ns['day'] . " pukul " . $ns['time'] . " tidak boleh ditambahkan lebih dari satu kali.";
            }
            $seenSlots[$key] = true;
        }

        // Find other active members with the same student name
        $query = $this->db->table('members')
            ->where('LOWER(TRIM(student_name))', strtolower($studentName))
            ->where('status !=', 'Selesai');

        if ($id) {
            $query->where('id !=', $id);
        }

        $otherMembers = $query->get()->getResultArray();

        foreach ($otherMembers as $other) {
            // Get schedules for this other member
            $otherSchedules = $this->db->table('member_schedules')
                ->where('member_id', $other['id'])
                ->get()
                ->getResultArray();

            foreach ($newSchedules as $ns) {
                foreach ($otherSchedules as $os) {
                    if ($ns['day'] === $os['day'] && $ns['time'] === $os['time']) {
                        $coach = $this->db->table('coaches')->where('id', $os['coach_id'])->get()->getRowArray();
                        $coachName = $coach ? $coach['name'] : 'pelatih lain';
                        return "Siswa bernama \"$studentName\" sudah terdaftar di jadwal " . $ns['day'] . " pukul " . $ns['time'] . " dengan pelatih $coachName.";
                    }
                }
            }
        }

        return null;
    }

    // ==================== MEMBERS API ====================

    public function getMembers()
    {
        $members = $this->db->table('members')
            ->orderBy('student_name', 'ASC')
            ->get()
            ->getResultArray();
        
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

            // Get schedules from member_schedules
            $schedulesList = $this->db->table('member_schedules')
                ->where('member_id', $m['id'])
                ->get()
                ->getResultArray();

            $formattedSchedules = [];
            foreach ($schedulesList as $sched) {
                $formattedSchedules[] = [
                    'coachId' => $sched['coach_id'],
                    'day' => $sched['day'],
                    'time' => $sched['time']
                ];
            }

            // Legacy compatibility fields
            $firstSched = $formattedSchedules[0] ?? null;
            $secondSched = $formattedSchedules[1] ?? null;

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
                'coachId' => $firstSched ? $firstSched['coachId'] : '',
                'packageId' => $m['package_id'],
                'scheduleFrequency' => count($formattedSchedules) > 1 ? '2x Seminggu' : '1x Seminggu',
                'scheduleDay' => $firstSched ? $firstSched['day'] : '',
                'scheduleTime' => $firstSched ? $firstSched['time'] : '',
                'scheduleDay2' => $secondSched ? $secondSched['day'] : null,
                'scheduleTime2' => $secondSched ? $secondSched['time'] : null,
                'schedules' => $formattedSchedules,
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
                'isActive' => isset($m['is_active']) ? (bool)$m['is_active'] : true,
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

        $schedules = [];
        if (isset($json->schedules) && is_array($json->schedules)) {
            foreach ($json->schedules as $s) {
                $schedules[] = [
                    'coach_id' => $s->coachId,
                    'day' => $s->day,
                    'time' => $s->time
                ];
            }
        } else {
            // Fallback to legacy fields
            if (!empty($json->scheduleDay) && !empty($json->scheduleTime) && !empty($json->coachId)) {
                $schedules[] = [
                    'coach_id' => $json->coachId,
                    'day' => $json->scheduleDay,
                    'time' => $json->scheduleTime
                ];
            }
            if (isset($json->scheduleFrequency) && $json->scheduleFrequency === '2x Seminggu' && !empty($json->scheduleDay2) && !empty($json->scheduleTime2) && !empty($json->coachId)) {
                $schedules[] = [
                    'coach_id' => $json->coachId,
                    'day' => $json->scheduleDay2,
                    'time' => $json->scheduleTime2
                ];
            }
        }

        $conflictError = $this->checkScheduleConflict(
            $json->student->fullName ?? '',
            null,
            $schedules
        );
        if ($conflictError) {
            return $this->fail($conflictError);
        }

        $id = 'TB-' . rand(100000, 999999);
        $this->db->transStart();

        $referralBonus = 0;
        $referralCode = isset($json->referralCodeUsed) ? trim(strtoupper($json->referralCodeUsed)) : null;

        // Apply referral logic
        if ($referralCode) {
            // Is it a coach code?
            $coachRef = $this->db->table('coaches')->where('referral_code', $referralCode)->get()->getRowArray();
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
            'package_id' => $json->packageId,
            'coach_type' => $json->coachType,
            'status' => 'Menunggu Verifikasi',
            'sessions_left' => (int)$json->sessionsLeft,
            'sessions_total' => (int)$json->sessionsTotal,
            'registered_at' => date('Y-m-d H:i:s'),
            'referral_code_used' => $referralCode
        ];

        $this->db->table('members')->insert($memberData);

        // Insert schedules to member_schedules table
        foreach ($schedules as $s) {
            $this->db->table('member_schedules')->insert([
                'member_id' => $id,
                'coach_id' => $s['coach_id'],
                'day' => $s['day'],
                'time' => $s['time']
            ]);
        }

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

        $schedules = [];
        if (isset($json->schedules) && is_array($json->schedules)) {
            foreach ($json->schedules as $s) {
                $schedules[] = [
                    'coach_id' => $s->coachId,
                    'day' => $s->day,
                    'time' => $s->time
                ];
            }
        } else {
            // Fallback to legacy fields
            if (!empty($json->scheduleDay) && !empty($json->scheduleTime) && !empty($json->coachId)) {
                $schedules[] = [
                    'coach_id' => $json->coachId,
                    'day' => $json->scheduleDay,
                    'time' => $json->scheduleTime
                ];
            }
            if (isset($json->scheduleFrequency) && $json->scheduleFrequency === '2x Seminggu' && !empty($json->scheduleDay2) && !empty($json->scheduleTime2) && !empty($json->coachId)) {
                $schedules[] = [
                    'coach_id' => $json->coachId,
                    'day' => $json->scheduleDay2,
                    'time' => $json->scheduleTime2
                ];
            }
        }

        $conflictError = $this->checkScheduleConflict(
            $json->student->fullName ?? '',
            $id,
            $schedules
        );
        if ($conflictError) {
            return $this->fail($conflictError);
        }

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
            'package_id' => $json->packageId,
            'coach_type' => $json->coachType,
            'status' => $json->status,
            'sessions_left' => (int)$json->sessionsLeft,
            'sessions_total' => (int)$json->sessionsTotal,
            'is_active' => isset($json->isActive) ? ($json->isActive ? 1 : 0) : 1
        ];

        $this->db->table('members')->where('id', $id)->update($memberData);

        // Sync schedules to member_schedules table
        $this->db->table('member_schedules')->where('member_id', $id)->delete();
        foreach ($schedules as $s) {
            $this->db->table('member_schedules')->insert([
                'member_id' => $id,
                'coach_id' => $s['coach_id'],
                'day' => $s['day'],
                'time' => $s['time']
            ]);
        }

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
        $events = $this->db->table('events')->orderBy('created_at', 'DESC')->get()->getResultArray();
        foreach ($events as &$event) {
            $event['imageUrl'] = $event['image_url'];
        }
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
            'image_url' => $json->imageUrl ?? '/images/event_fun.png'
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

        $member = $this->db->table('members')->where('id', $json->memberId)->get()->getRowArray();
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

        $member = $this->db->table('members')->where('id', $json->memberId)->get()->getRowArray();
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

        $member = $this->db->table('members')->where('id', $memberId)->get()->getRowArray();
        if (!$member) {
            return $this->failNotFound('Siswa tidak ditemukan.');
        }

        // Get their current schedules
        $existingSchedules = $this->db->table('member_schedules')
            ->where('member_id', $memberId)
            ->get()
            ->getResultArray();

        // Target the first schedule for reschedule
        $firstSched = $existingSchedules[0] ?? null;
        $originalDay = $firstSched ? $firstSched['day'] : 'Senin';
        $originalTime = $firstSched ? $firstSched['time'] : '08.00';
        $schedId = $firstSched ? $firstSched['id'] : null;

        // Build the new schedule set for conflict validation
        $newSchedules = [];
        foreach ($existingSchedules as $es) {
            if ($es['id'] === $schedId) {
                // This is the one being rescheduled
                $newSchedules[] = [
                    'coach_id' => $es['coach_id'],
                    'day' => $json->requestedDay,
                    'time' => $json->requestedTime
                ];
            } else {
                $newSchedules[] = [
                    'coach_id' => $es['coach_id'],
                    'day' => $es['day'],
                    'time' => $es['time']
                ];
            }
        }

        $conflictError = $this->checkScheduleConflict(
            $member['student_name'],
            $memberId,
            $newSchedules
        );
        if ($conflictError) {
            return $this->fail($conflictError);
        }

        $requestId = 'req-' . rand(100000, 999999);
        
        // Save Reschedule Request log (Auto-approved for simulation)
        $this->db->table('reschedule_requests')->insert([
            'id' => $requestId,
            'member_id' => $memberId,
            'original_day' => $originalDay,
            'original_time' => $originalTime,
            'requested_day' => $json->requestedDay,
            'requested_time' => $json->requestedTime,
            'status' => 'Disetujui',
            'reason' => $json->reason ?? 'Keperluan mendesak'
        ]);

        // Directly move schedule
        if ($schedId) {
            $this->db->table('member_schedules')->where('id', $schedId)->update([
                'day' => $json->requestedDay,
                'time' => $json->requestedTime
            ]);
        }

        $this->db->transComplete();

        if ($this->db->transStatus() === false) {
            return $this->fail('Gagal memproses reschedule.');
        }

        return $this->respond(['status' => 'success']);
    }

    // ==================== AUTH API ====================

    public function login()
    {
        $json = $this->request->getJSON();
        if (!$json || empty($json->username) || empty($json->password) || empty($json->role)) {
            return $this->fail('Username, password, dan peran harus diisi.');
        }

        $username = trim($json->username);
        $password = trim($json->password);
        $role = trim($json->role);

        $user = $this->db->table('users')
            ->where('username', $username)
            ->get()
            ->getRowArray();

        if (!$user) {
            return $this->failUnauthorized('Username atau Password salah.');
        }

        if ($user['role'] !== $role) {
            return $this->failUnauthorized('Peran pengguna tidak cocok.');
        }

        $isPasswordValid = false;
        if (str_starts_with($user['password'], '$2y$') || str_starts_with($user['password'], '$2a$')) {
            $isPasswordValid = password_verify($password, $user['password']);
        } else {
            $isPasswordValid = ($password === $user['password']);
        }

        if (!$isPasswordValid) {
            return $this->failUnauthorized('Username atau Password salah.');
        }

        // Check if coach profile is active
        if ($user['role'] === 'coach') {
            $coach = $this->db->table('coaches')->where('id', $user['id'])->get()->getRowArray();
            if ($coach && (int)$coach['is_active'] === 0) {
                return $this->failForbidden('Akun pelatih Anda dinonaktifkan.');
            }
        }

        $token = bin2hex(random_bytes(32));
        $expiresAt = date('Y-m-d H:i:s', strtotime('+2 hours'));

        $this->db->table('user_tokens')->insert([
            'user_id' => $user['id'],
            'role' => $role,
            'token' => $token,
            'expires_at' => $expiresAt
        ]);

        return $this->respond([
            'status' => 'success',
            'token' => $token,
            'user' => [
                'id' => $user['id'],
                'username' => $user['username'],
                'name' => $user['name'],
                'role' => $role
            ]
        ]);
    }

    public function logout()
    {
        $authHeader = $this->request->getHeaderLine('Authorization');
        if ($authHeader && str_starts_with($authHeader, 'Bearer ')) {
            $token = substr($authHeader, 7);
            $this->db->table('user_tokens')->where('token', $token)->delete();
        }

        return $this->respond([
            'status' => 'success',
            'message' => 'Berhasil keluar.'
        ]);
    }

    public function parentLogin()
    {
        $json = $this->request->getJSON();
        if (!$json || empty($json->whatsapp)) {
            return $this->fail('Nomor WhatsApp harus diisi.');
        }

        $whatsapp = trim($json->whatsapp);

        $members = $this->db->table('members')
            ->where('parent_whatsapp', $whatsapp)
            ->get()
            ->getResultArray();

        if (empty($members)) {
            return $this->failNotFound('Nomor HP tidak terdaftar sebagai orang tua member.');
        }

        $formattedMembers = [];
        foreach ($members as $m) {
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

            $progress = $this->db->table('training_progress')
                ->where('member_id', $m['id'])
                ->orderBy('date', 'DESC')
                ->get()
                ->getResultArray();

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

            // Get schedules from member_schedules
            $schedulesList = $this->db->table('member_schedules')
                ->where('member_id', $m['id'])
                ->get()
                ->getResultArray();

            $formattedSchedules = [];
            foreach ($schedulesList as $sched) {
                $formattedSchedules[] = [
                    'coachId' => $sched['coach_id'],
                    'day' => $sched['day'],
                    'time' => $sched['time']
                ];
            }

            // Legacy compatibility fields
            $firstSched = $formattedSchedules[0] ?? null;
            $secondSched = $formattedSchedules[1] ?? null;

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
                'coachId' => $firstSched ? $firstSched['coachId'] : '',
                'packageId' => $m['package_id'],
                'scheduleFrequency' => count($formattedSchedules) > 1 ? '2x Seminggu' : '1x Seminggu',
                'scheduleDay' => $firstSched ? $firstSched['day'] : '',
                'scheduleTime' => $firstSched ? $firstSched['time'] : '',
                'scheduleDay2' => $secondSched ? $secondSched['day'] : null,
                'scheduleTime2' => $secondSched ? $secondSched['time'] : null,
                'schedules' => $formattedSchedules,
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
                'isActive' => isset($m['is_active']) ? (bool)$m['is_active'] : true,
                'rescheduleRequests' => $formattedReschedules
            ];
        }

        return $this->respond([
            'status' => 'success',
            'members' => $formattedMembers
        ]);
    }

    public function getSettings()
    {
        $settings = $this->db->table('site_settings')->get()->getResultArray();
        $formatted = [];
        foreach ($settings as $s) {
            $formatted[$s['key_name']] = $s['value_text'];
        }
        return $this->respond([
            'status' => 'success',
            'settings' => $formatted
        ]);
    }

    public function updateSettings()
    {
        $json = $this->request->getJSON();
        if (!$json) {
            return $this->fail('Data tidak valid.');
        }

        $this->db->transStart();
        foreach ($json as $key => $value) {
            $exists = $this->db->table('site_settings')->where('key_name', $key)->countAllResults();
            if ($exists > 0) {
                $this->db->table('site_settings')->where('key_name', $key)->update(['value_text' => $value]);
            } else {
                $this->db->table('site_settings')->insert(['key_name' => $key, 'value_text' => $value]);
            }
        }
        $this->db->transComplete();

        if ($this->db->transStatus() === false) {
            return $this->fail('Gagal menyimpan pengaturan.');
        }

        return $this->respond(['status' => 'success']);
    }

    public function getLevels()
    {
        $levels = $this->db->table('program_levels')->orderBy('level_number', 'ASC')->get()->getResultArray();
        return $this->respond($levels);
    }

    public function addLevel()
    {
        $json = $this->request->getJSON();
        if (!$json || empty($json->name) || !isset($json->level_number)) {
            return $this->fail('Data level tidak lengkap.');
        }

        $data = [
            'level_number' => (int)$json->level_number,
            'name' => $json->name,
            'target_learning' => $json->target_learning ?? '',
            'materials' => $json->materials ?? '',
            'graduation_target' => $json->graduation_target ?? ''
        ];

        $this->db->table('program_levels')->insert($data);
        return $this->respondCreated(['status' => 'success']);
    }

    public function updateLevel()
    {
        $json = $this->request->getJSON();
        if (!$json || empty($json->id)) {
            return $this->fail('ID Level tidak ditemukan.');
        }

        $data = [
            'level_number' => (int)$json->level_number,
            'name' => $json->name,
            'target_learning' => $json->target_learning ?? '',
            'materials' => $json->materials ?? '',
            'graduation_target' => $json->graduation_target ?? ''
        ];

        $this->db->table('program_levels')->where('id', $json->id)->update($data);
        return $this->respond(['status' => 'success']);
    }

    public function deleteLevel($id)
    {
        $this->db->table('program_levels')->where('id', $id)->delete();
        return $this->respond(['status' => 'success']);
    }

    public function debugLog()
    {
        $json = $this->request->getJSON();
        if ($json && !empty($json->message)) {
            $msg = '[' . date('Y-m-d H:i:s') . '] ' . $json->message . PHP_EOL;
            file_put_contents(WRITEPATH . 'logs/frontend_debug.log', $msg, FILE_APPEND);
        }
        return $this->respond(['status' => 'success']);
    }

    // ==================== COACH ABSENCES ====================

    public function getCoachAbsences()
    {
        $builder = $this->db->table('coach_absences')
            ->orderBy('created_at', 'DESC');
        
        $absences = $builder->get()->getResultArray();
        
        $formatted = [];
        foreach ($absences as $a) {
            $formatted[] = [
                'id' => $a['id'],
                'coachId' => $a['coach_id'],
                'day' => $a['day'],
                'time' => $a['time'],
                'date' => $a['date'],
                'reason' => $a['reason'],
                'status' => $a['status'],
                'replacementCoachId' => $a['replacement_coach_id']
            ];
        }
        return $this->respond($formatted);
    }

    public function reportCoachAbsence()
    {
        $json = $this->request->getJSON();
        if (!$json || empty($json->coachId) || empty($json->day) || empty($json->time) || empty($json->date)) {
            return $this->fail('Data laporan absen tidak lengkap.');
        }

        $id = 'abs-' . rand(100000, 999999);
        $data = [
            'id' => $id,
            'coach_id' => $json->coachId,
            'day' => $json->day,
            'time' => $json->time,
            'date' => $json->date,
            'reason' => $json->reason ?? 'Berhalangan hadir',
            'status' => 'Menunggu'
        ];

        $this->db->table('coach_absences')->insert($data);
        return $this->respondCreated(['status' => 'success', 'id' => $id]);
    }

    public function processCoachAbsence()
    {
        $json = $this->request->getJSON();
        if (!$json || empty($json->absenceId) || empty($json->status)) {
            return $this->fail('Data pemrosesan absen tidak lengkap.');
        }

        $absenceId = $json->absenceId;
        $status = $json->status; // 'Transfer' or 'Reschedule'
        $replacementCoachId = $json->replacementCoachId ?? null;

        $absence = $this->db->table('coach_absences')->where('id', $absenceId)->get()->getRowArray();
        if (!$absence) {
            return $this->failNotFound('Laporan ketidakhadiran tidak ditemukan.');
        }

        $this->db->transStart();

        // 1. Update coach_absences status
        $updateData = ['status' => $status];
        if ($status === 'Transfer' && $replacementCoachId) {
            $updateData['replacement_coach_id'] = $replacementCoachId;
        }
        $this->db->table('coach_absences')->where('id', $absenceId)->update($updateData);

        // 2. If action is Reschedule, log an 'Izin' training progress for affected students
        if ($status === 'Reschedule') {
            $affectedSchedules = $this->db->table('member_schedules')
                ->where('coach_id', $absence['coach_id'])
                ->where('day', $absence['day'])
                ->where('time', $absence['time'])
                ->get()
                ->getResultArray();

            foreach ($affectedSchedules as $sched) {
                $progId = 'prog-' . rand(10000000, 99999999);
                $this->db->table('training_progress')->insert([
                    'id' => $progId,
                    'member_id' => $sched['member_id'],
                    'date' => $absence['date'],
                    'attendance' => 'Izin',
                    'note' => 'Sesi Latihan DITIADAKAN karena Coach berhalangan hadir. Sesi diundur ke minggu berikutnya (Sisa paket UTUH).'
                ]);
            }
        }

        $this->db->transComplete();

        if ($this->db->transStatus() === false) {
            return $this->fail('Gagal memproses ketidakhadiran pelatih.');
        }

        return $this->respond(['status' => 'success']);
    }
}
