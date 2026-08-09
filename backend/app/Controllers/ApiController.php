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
        $builder = $this->db->table('coaches')
            ->select('coaches.*, users.username')
            ->join('users', 'users.id = coaches.id', 'left');
            
        if ($this->db->fieldExists('name', 'coaches')) {
            $builder->orderBy('coaches.name', 'ASC');
        }

        $coaches = $builder->get()->getResultArray();
        
        if (empty($coaches)) {
            return $this->respond([]);
        }

        $coachIds = array_column($coaches, 'id');

        // 1. Bulk Fetch Packages for all coaches
        $allPackages = $this->db->table('packages')
            ->whereIn('coach_id', $coachIds)
            ->get()
            ->getResultArray();

        $packagesByCoach = [];
        foreach ($allPackages as $pkg) {
            $packagesByCoach[$pkg['coach_id']][] = $pkg;
        }

        // 2. Bulk Fetch Schedules for all coaches
        $allSchedules = $this->db->table('coach_schedules')
            ->whereIn('coach_id', $coachIds)
            ->get()
            ->getResultArray();

        // 3. Bulk Fetch Active Member Schedules for all coaches
        $allMemberSchedules = [];
        if ($this->db->tableExists('member_schedules') && $this->db->tableExists('members')) {
            $allMemberSchedules = $this->db->table('member_schedules')
                ->select('member_schedules.coach_id, member_schedules.day, member_schedules.time, member_schedules.member_id')
                ->join('members', 'members.id = member_schedules.member_id')
                ->whereIn('member_schedules.coach_id', $coachIds)
                ->where('members.status !=', 'Selesai')
                ->get()
                ->getResultArray();
        }

        // Map member schedules by coach_id -> day -> time -> array of member_ids
        $slotStudents = [];
        $coachActiveStudents = [];

        foreach ($allMemberSchedules as $ms) {
            $cId = $ms['coach_id'];
            $day = $ms['day'];
            $time = $ms['time'];
            $mId = $ms['member_id'];

            $slotStudents[$cId][$day][$time][] = $mId;
            $coachActiveStudents[$cId][$mId] = true;
        }

        // Group schedules by coach
        $schedulesByCoach = [];
        foreach ($allSchedules as $sched) {
            $cId = $sched['coach_id'];
            $dayName = $sched['day'];
            $time = $sched['time'];

            if (!isset($schedulesByCoach[$cId][$dayName])) {
                $schedulesByCoach[$cId][$dayName] = [
                    'day' => $dayName,
                    'timeSlots' => []
                ];
            }

            $studentsInThisSlot = $slotStudents[$cId][$dayName][$time] ?? [];

            $schedulesByCoach[$cId][$dayName]['timeSlots'][] = [
                'time' => $time,
                'maxSlots' => (int)($sched['max_slots'] ?? 6),
                'swimmingPoolId' => $sched['swimming_pool_id'] ?? null,
                'currentSlots' => count($studentsInThisSlot),
                'students' => $studentsInThisSlot
            ];
        }

        foreach ($coaches as &$coach) {
            $cId = $coach['id'];
            unset($coach['password']);

            $coach['packages'] = $packagesByCoach[$cId] ?? [];
            $coach['schedule'] = isset($schedulesByCoach[$cId]) ? array_values($schedulesByCoach[$cId]) : [];

            $activeStudentsTotal = isset($coachActiveStudents[$cId]) ? count($coachActiveStudents[$cId]) : 0;

            $maxQ = (int)($coach['max_quota'] ?? 6);
            $coach['currentQuota'] = $activeStudentsTotal;
            $coach['status'] = ($activeStudentsTotal >= $maxQ) ? 'Penuh' : 'Tersedia';
            $coach['referralBonus'] = (int)($coach['referral_bonus'] ?? 0);
            $coach['maxQuota'] = $maxQ;
            $coach['referralCode'] = $coach['referral_code'] ?? '';
            $coach['isActive'] = isset($coach['is_active']) && $coach['is_active'] !== null ? ((int)$coach['is_active'] === 1 || $coach['is_active'] === true || $coach['is_active'] === '1') : true;
            $coach['certificateUrl'] = $coach['certificate_url'] ?? null;
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
            'photo' => $this->processCoachPhoto($json->photo ?? '', $json->name),
            'experience' => $json->experience ?? 'Pelatih Renang Profesional',
            'referral_code' => $referralCode,
            'referral_bonus' => 0,
            'max_quota' => (int)($json->maxQuota ?? 6),
            'is_active' => 1,
            'email' => (!empty($json->email)) ? trim($json->email) : null,
            'phone' => (!empty($json->phone)) ? trim($json->phone) : null,
            'certificate_url' => $this->processCoachCertificate($json->certificateUrl ?? ($json->certificate_url ?? ''), $json->name)
        ];

        $this->db->transStart();
        $this->db->table('users')->insert($userData);
        $this->db->table('coaches')->insert($coachData);

        // Add packages
        if (!empty($json->packages) && is_array($json->packages)) {
            foreach ($json->packages as $pkg) {
                $pkgId = isset($pkg->id) && !empty($pkg->id) ? $pkg->id : $id . '-pkg-' . rand(100, 999);
                $this->db->table('packages')->insert([
                    'id' => $pkgId,
                    'coach_id' => $id,
                    'name' => $pkg->name,
                    'price' => (int)$pkg->price,
                    'sessions' => (int)$pkg->sessions
                ]);

                // Sync relationship to coach_pricing_packages
                $globalPkg = $this->db->table('pricing_packages')->where('name', $pkg->name)->get()->getRowArray();
                if ($globalPkg) {
                    $this->db->table('coach_pricing_packages')->insert([
                        'coach_id' => $id,
                        'pricing_package_id' => $globalPkg['id']
                    ]);
                }
            }
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
                            'max_slots' => isset($slot->maxSlots) ? (int)$slot->maxSlots : 6,
                            'swimming_pool_id' => $slot->swimmingPoolId ?? null
                        ]);
                    }
                }
            }
        }

        $this->logAction('input', 'coaches', $id, "Menambahkan pelatih baru: {$json->name}");
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
            'name' => $json->name
        ];

        if (!empty($json->username)) {
            $userData['username'] = trim($json->username);
        }

        if (!empty($json->password)) {
            $userData['password'] = password_hash(trim($json->password), PASSWORD_DEFAULT);
        }

        $coachData = [
            'name' => $json->name,
            'experience' => $json->experience,
            'photo' => $this->processCoachPhoto($json->photo ?? '', $json->name),
            'max_quota' => (int)$json->maxQuota,
            'is_active' => isset($json->isActive) ? ($json->isActive ? 1 : 0) : 1,
            'email' => (!empty($json->email)) ? trim($json->email) : null,
            'phone' => (!empty($json->phone)) ? trim($json->phone) : null,
            'certificate_url' => $this->processCoachCertificate($json->certificateUrl ?? ($json->certificate_url ?? ''), $json->name)
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

                if (isset($pkg->id) && !empty($pkg->id)) {
                    if (in_array($pkg->id, $existingIds)) {
                        $isNew = false;
                        $pkgId = $pkg->id;
                    }
                }

                if ($isNew) {
                    $globalPkg = $this->db->table('pricing_packages')->where('name', $pkg->name)->get()->getRowArray();
                    $pricingPkgId = $globalPkg ? $globalPkg['id'] : rand(1000, 9999);
                    $pkgId = 'pkg-' . $id . '-' . $pricingPkgId;
                    
                    if ($this->db->table('packages')->where('id', $pkgId)->countAllResults() === 0) {
                        $this->db->table('packages')->insert([
                            'id' => $pkgId,
                            'coach_id' => $id,
                            'name' => $pkg->name,
                            'price' => (int)$pkg->price,
                            'sessions' => (int)$pkg->sessions
                        ]);
                    }
                    $keepIds[] = $pkgId;
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
                // Clear member foreign key reference if any, then delete package
                $this->db->table('members')->where('package_id', $deleteId)->update(['package_id' => null]);
                $this->db->table('packages')->where('id', $deleteId)->delete();
            }

            // Sync junction table relations for this coach
            $this->db->table('coach_pricing_packages')->where('coach_id', $id)->delete();
            foreach ($json->packages as $pkg) {
                $pkgIdToFind = $pkg->pricing_package_id ?? ($pkg->packageId ?? null);
                $globalPkg = null;
                if ($pkgIdToFind) {
                    $globalPkg = $this->db->table('pricing_packages')->where('id', $pkgIdToFind)->get()->getRowArray();
                }
                if (!$globalPkg && !empty($pkg->id)) {
                    $globalPkg = $this->db->table('pricing_packages')->where('id', $pkg->id)->get()->getRowArray();
                    if (!$globalPkg) {
                        $allGlobal = $this->db->table('pricing_packages')->get()->getResultArray();
                        foreach ($allGlobal as $gp) {
                            if (strpos($pkg->id, $gp['id']) !== false) {
                                $globalPkg = $gp;
                                break;
                            }
                        }
                    }
                }
                if (!$globalPkg && !empty($pkg->name)) {
                    $globalPkg = $this->db->table('pricing_packages')->where('name', $pkg->name)->get()->getRowArray();
                }
                if ($globalPkg) {
                    $this->db->table('coach_pricing_packages')->insert([
                        'coach_id' => $id,
                        'pricing_package_id' => $globalPkg['id']
                    ]);
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
                        $poolId = null;
                        if (isset($slot->swimmingPoolId) && !empty($slot->swimmingPoolId)) {
                            $poolId = $slot->swimmingPoolId;
                        } elseif (isset($slot->swimming_pool_id) && !empty($slot->swimming_pool_id)) {
                            $poolId = $slot->swimming_pool_id;
                        }

                        $this->db->table('coach_schedules')->insert([
                            'coach_id' => $id,
                            'day' => $dayName,
                            'time' => $slot->time,
                            'max_slots' => isset($slot->maxSlots) ? (int)$slot->maxSlots : 6,
                            'swimming_pool_id' => $poolId
                        ]);
                    }
                }
            }
        }

        $this->logAction('edit', 'coaches', $id, "Mengubah profil/paket pelatih: {$json->name}");
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

        $coach = $this->db->table('coaches')->where('id', $id)->get()->getRowArray();
        $coachName = $coach ? $coach['name'] : $id;

        // Clean up dependent tables that reference coaches
        $this->db->table('packages')->where('coach_id', $id)->delete();
        $this->db->table('coach_schedules')->where('coach_id', $id)->delete();
        $this->db->table('coaches')->where('id', $id)->delete();
        $this->db->table('users')->where('id', $id)->delete();

        $this->logAction('hapus', 'coaches', $id, "Menghapus pelatih: {$coachName}");

        return $this->respondDeleted(['status' => 'success']);
    }

    private function checkScheduleConflict($studentName, $id, $newSchedules, $coachType = null)
    {
        $studentName = trim($studentName);
        if (empty($newSchedules) || !is_array($newSchedules)) {
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

        // 1. Check Package Category Conflict (Reguler vs Privat)
        if ($coachType) {
            $targetType = trim($coachType); // 'Reguler' or 'Privat'
            foreach ($newSchedules as $ns) {
                if (empty($ns['coach_id']) || empty($ns['day']) || empty($ns['time'])) continue;

                $builder = $this->db->table('member_schedules')
                    ->join('members', 'members.id = member_schedules.member_id')
                    ->where('member_schedules.coach_id', $ns['coach_id'])
                    ->where('member_schedules.day', $ns['day'])
                    ->where('member_schedules.time', $ns['time'])
                    ->where('members.status !=', 'Selesai')
                    ->where('members.coach_type !=', $targetType);

                if ($id) {
                    $builder->where('members.id !=', $id);
                }

                $conflicting = $builder->get()->getResultArray();
                if (!empty($conflicting)) {
                    $existingType = $conflicting[0]['coach_type'];
                    return "Jadwal pelatih pada hari {$ns['day']} jam {$ns['time']} WIB sudah terisi siswa paket {$existingType}. Paket {$targetType} tidak dapat dipilih pada jam yang sama.";
                }
            }
        }

        // 2. Find other active members with the same student name
        if (!empty($studentName)) {
            $query = $this->db->table('members')
                ->where('LOWER(TRIM(student_name))', strtolower($studentName))
                ->where('status !=', 'Selesai');

            if ($id) {
                $query->where('id !=', $id);
            }

            $otherMembers = $query->get()->getResultArray();

            foreach ($otherMembers as $other) {
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
            $schedules,
            $json->coachType ?? 'Reguler'
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
        $this->logAction('input', 'members', $id, "Pendaftaran siswa baru: {$json->student->fullName} (Orang tua: {$json->parent->fatherMotherName})");
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

        $member = $this->db->table('members')->where('id', $json->id)->get()->getRowArray();
        $studentName = $member ? $member['student_name'] : $json->id;

        $this->db->transStart();
        $this->db->table('payments')->where('member_id', $json->id)->update([
            'status' => 'Pembayaran Berhasil',
            'date' => date('Y-m-d H:i:s')
        ]);
        $this->db->table('members')->where('id', $json->id)->update([
            'status' => 'Aktif'
        ]);
        $this->logAction('verifikasi', 'members', $json->id, "Memverifikasi pendaftaran/pembayaran siswa: {$studentName}");
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
            $schedules,
            $json->coachType ?? 'Reguler'
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

        $this->logAction('edit', 'members', $id, "Mengubah data siswa: {$json->student->fullName}");
        $this->db->transComplete();

        if ($this->db->transStatus() === false) {
            return $this->fail('Gagal memperbarui data siswa.');
        }

        return $this->respond(['status' => 'success']);
    }

    public function deleteMember($id)
    {
        $member = $this->db->table('members')->where('id', $id)->get()->getRowArray();
        if (!$member) {
            return $this->failNotFound('Siswa tidak ditemukan.');
        }
        $studentName = $member['student_name'];

        $this->db->table('members')->where('id', $id)->delete();
        $this->logAction('hapus', 'members', $id, "Menghapus data siswa: {$studentName}");
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
        $imageUrl = $this->saveUploadedFile($json->imageUrl ?? '', 'events', 'event', $json->title) ?? ($json->imageUrl ?? '/images/event_fun.png');

        $eventData = [
            'id' => $id,
            'title' => $json->title,
            'category' => $json->category,
            'date' => $json->date,
            'description' => $json->description ?? '',
            'image_url' => $imageUrl
        ];

        $this->db->table('events')->insert($eventData);
        $this->logAction('input', 'events', $id, "Menambahkan kegiatan baru: {$json->title}");
        return $this->respondCreated(['status' => 'success', 'id' => $id]);
    }

    public function updateEvent()
    {
        $json = $this->request->getJSON();
        if (!$json || empty($json->id)) {
            return $this->fail('ID Kegiatan harus dilampirkan.');
        }

        $imageUrl = $this->saveUploadedFile($json->imageUrl ?? '', 'events', 'event', $json->title) ?? $json->imageUrl;

        $eventData = [
            'title' => $json->title,
            'category' => $json->category,
            'date' => $json->date,
            'description' => $json->description,
            'image_url' => $imageUrl
        ];

        $this->db->table('events')->where('id', $json->id)->update($eventData);
        $this->logAction('edit', 'events', $json->id, "Mengubah kegiatan: {$json->title}");
        return $this->respond(['status' => 'success']);
    }

    public function deleteEvent($id)
    {
        $event = $this->db->table('events')->where('id', $id)->get()->getRowArray();
        if (!$event) {
            return $this->failNotFound('Kegiatan tidak ditemukan.');
        }
        $eventTitle = $event['title'];

        $this->db->table('events')->where('id', $id)->delete();
        $this->logAction('hapus', 'events', $id, "Menghapus kegiatan: {$eventTitle}");
        return $this->respondDeleted(['status' => 'success']);
    }

    // ==================== TRAINING PROGRESS API ====================

    public function addProgress()
    {
        $json = $this->request->getJSON();
        if (!$json || empty($json->memberId) || empty($json->note)) {
            return $this->fail('ID Siswa dan catatan harus dilampirkan.');
        }

        $targetDate = $json->date ?? date('Y-m-d');

        // Check if attendance already recorded for this member on this date
        $existing = $this->db->table('training_progress')
            ->where('member_id', $json->memberId)
            ->where('date', $targetDate)
            ->get()
            ->getRowArray();

        if ($existing) {
            return $this->fail('Siswa ini sudah diabsen pada tanggal ' . $targetDate . '. Presensi hanya dapat diisi 1 kali dalam sehari.', 400);
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
            'date' => $targetDate,
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

        $targetDate = date('Y-m-d');

        // Check if attendance already recorded for this member today
        $existing = $this->db->table('training_progress')
            ->where('member_id', $json->memberId)
            ->where('date', $targetDate)
            ->get()
            ->getRowArray();

        if ($existing) {
            return $this->fail('Siswa ini sudah diabsen pada hari ini (' . $targetDate . '). Presensi hanya dapat diisi 1 kali dalam sehari.', 400);
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
            'date' => $targetDate,
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

        $userRole = $user['role'];
        if ($userRole !== $role) {
            if (($userRole === 'admin' || $userRole === 'operator') && ($role === 'admin' || $role === 'operator')) {
                $role = $userRole;
            } else {
                if ($userRole === 'coach' && ($role === 'admin' || $role === 'operator')) {
                    return $this->failUnauthorized('Pelatih tidak dapat login di dashboard admin.');
                }
                return $this->failUnauthorized('Peran pengguna tidak cocok.');
            }
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
        $expiresAt = date('Y-m-d H:i:s', strtotime('+30 days'));

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

    public function changePassword()
    {
        $authHeader = $this->request->getHeaderLine('Authorization');
        if (!$authHeader || !str_starts_with($authHeader, 'Bearer ')) {
            return $this->failUnauthorized('Token autentikasi tidak ditemukan.');
        }

        $token = substr($authHeader, 7);
        $tokenRecord = $this->db->table('user_tokens')
            ->where('token', $token)
            ->get()
            ->getRowArray();

        if (!$tokenRecord) {
            return $this->failUnauthorized('Sesi login tidak valid atau telah berakhir.');
        }

        $json = $this->request->getJSON();
        if (!$json || empty($json->newPassword)) {
            return $this->fail('Password baru wajib diisi.');
        }

        $targetUsername = !empty($json->targetUsername) ? trim($json->targetUsername) : null;
        $oldPassword = !empty($json->oldPassword) ? trim($json->oldPassword) : '';
        $newPassword = trim($json->newPassword);

        if (strlen($newPassword) < 4) {
            return $this->fail('Password baru minimal 4 karakter.');
        }

        // Determine user to change
        if ($targetUsername && ($tokenRecord['role'] === 'admin')) {
            $user = $this->db->table('users')
                ->where('username', $targetUsername)
                ->get()
                ->getRowArray();
            if (!$user) {
                return $this->failNotFound("Pengguna dengan username '{$targetUsername}' tidak ditemukan.");
            }
        } else {
            // Changing own password
            $user = $this->db->table('users')
                ->where('id', $tokenRecord['user_id'])
                ->get()
                ->getRowArray();

            if (!$user) {
                return $this->failNotFound('Pengguna tidak ditemukan.');
            }

            if (empty($oldPassword)) {
                return $this->fail('Password lama wajib diisi.');
            }

            // Verify old password
            $isOldValid = false;
            if (str_starts_with($user['password'], '$2y$') || str_starts_with($user['password'], '$2a$')) {
                $isOldValid = password_verify($oldPassword, $user['password']);
            } else {
                $isOldValid = ($oldPassword === $user['password']);
            }

            if (!$isOldValid) {
                return $this->fail('Password lama yang Anda masukkan salah.');
            }
        }

        // Hash new password using BCRYPT
        $newHash = password_hash($newPassword, PASSWORD_BCRYPT);
        $this->db->table('users')
            ->where('id', $user['id'])
            ->update([
                'password' => $newHash,
                'updated_at' => date('Y-m-d H:i:s')
            ]);

        $this->logAction('Ubah Password', 'users', $user['id'], "Password untuk pengguna '{$user['username']}' ({$user['role']}) berhasil diperbarui.");

        return $this->respond([
            'status' => 'success',
            'message' => "Password untuk '{$user['username']}' berhasil diperbarui!"
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
        $this->logAction('edit', 'site_settings', 'settings', "Mengubah konfigurasi situs / pengaturan dinamis");
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
        $insertId = $this->db->insertID();
        $this->logAction('input', 'program_levels', $insertId, "Menambahkan tingkatan level baru: {$json->name} (Level {$json->level_number})");
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
        $this->logAction('edit', 'program_levels', $json->id, "Mengubah tingkatan level: {$json->name} (Level {$json->level_number})");
        return $this->respond(['status' => 'success']);
    }

    public function deleteLevel($id)
    {
        $level = $this->db->table('program_levels')->where('id', $id)->get()->getRowArray();
        $levelName = $level ? $level['name'] : $id;

        $this->db->table('program_levels')->where('id', $id)->delete();
        $this->logAction('hapus', 'program_levels', $id, "Menghapus tingkatan level: {$levelName}");
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

    private function getCurrentUser()
    {
        $authHeader = $this->request->getHeaderLine('Authorization');
        if ($authHeader && str_starts_with($authHeader, 'Bearer ')) {
            $token = substr($authHeader, 7);
            $tokenRow = $this->db->table('user_tokens')
                ->where('token', $token)
                ->where('expires_at >', date('Y-m-d H:i:s'))
                ->get()
                ->getRowArray();

            if ($tokenRow) {
                $user = $this->db->table('users')->where('id', $tokenRow['user_id'])->get()->getRowArray();
                if ($user) {
                    return $user;
                }
            }
        }
        return null;
    }

    private function logAction($actionType, $tableName, $recordId, $description)
    {
        $user = $this->getCurrentUser();
        $userId = $user ? $user['id'] : 'system';
        $username = $user ? $user['username'] : 'pendaftar_mandiri';
        $role = $user ? $user['role'] : 'public';

        $this->db->table('audit_logs')->insert([
            'user_id' => $userId,
            'username' => $username,
            'role' => $role,
            'action_type' => $actionType,
            'table_name' => $tableName,
            'record_id' => $recordId,
            'description' => $description
        ]);
    }

    private function logAudit($action, $description)
    {
        $this->logAction($action, 'system', null, $description);
    }

    private function syncCoachLegacyPackages($packageId, $packageName, $packagePrice, $packageSessions, $coachIds)
    {
        // 1. Ensure relations for checked coaches
        foreach ($coachIds as $coachId) {
            $legacyId = "pkg-{$coachId}-{$packageId}";
            
            // Upsert into legacy packages
            $exists = $this->db->table('packages')->where('id', $legacyId)->countAllResults();
            if ($exists > 0) {
                $this->db->table('packages')->where('id', $legacyId)->update([
                    'name' => $packageName,
                    'price' => $packagePrice,
                    'sessions' => $packageSessions
                ]);
            } else {
                $this->db->table('packages')->insert([
                    'id' => $legacyId,
                    'coach_id' => $coachId,
                    'name' => $packageName,
                    'price' => $packagePrice,
                    'sessions' => $packageSessions
                ]);
            }
        }

        // 2. Remove relations for unchecked coaches (if not used by members)
        $allCoaches = $this->db->table('coaches')->get()->getResultArray();
        foreach ($allCoaches as $coach) {
            $coachId = $coach['id'];
            if (!in_array($coachId, $coachIds)) {
                $legacyId = "pkg-{$coachId}-{$packageId}";
                // Check if used by members
                $memberCount = $this->db->table('members')->where('package_id', $legacyId)->countAllResults();
                if ($memberCount === 0) {
                    $this->db->table('packages')->where('id', $legacyId)->delete();
                } else {
                    $this->db->table('packages')->where('id', $legacyId)->update(['coach_id' => 'deleted_' . $coachId]);
                }
            }
        }
    }

    public function getPricingPackages()
    {
        $packages = $this->db->table('pricing_packages')->orderBy('created_at', 'DESC')->get()->getResultArray();
        
        // Load relationships
        $relations = $this->db->table('coach_pricing_packages')->get()->getResultArray();
        $relationsGrouped = [];
        foreach ($relations as $rel) {
            $relationsGrouped[$rel['pricing_package_id']][] = $rel['coach_id'];
        }

        foreach ($packages as &$pkg) {
            $pkg['price'] = (int)$pkg['price'];
            $pkg['sessions'] = (int)$pkg['sessions'];
            $pkg['coachIds'] = $relationsGrouped[$pkg['id']] ?? [];
        }

        return $this->respond($packages);
    }

    public function addPricingPackage()
    {
        $json = $this->request->getJSON();
        if (!$json || empty($json->category) || empty($json->name) || !isset($json->price)) {
            return $this->fail('Data paket tidak lengkap.');
        }

        $id = (!empty($json->id)) ? $json->id : 'pkg-' . rand(100000, 999999);
        $category = $json->category;
        $name = $json->name;
        $price = (int)$json->price;
        $sessions = (int)($json->sessions ?? 5);
        $activePeriod = $json->active_period ?? '';
        $description = $json->description ?? '';
        $coachIds = $json->coachIds ?? [];

        $this->db->transStart();

        // Insert global pricing package
        $this->db->table('pricing_packages')->insert([
            'id' => $id,
            'category' => $category,
            'name' => $name,
            'price' => $price,
            'sessions' => $sessions,
            'active_period' => $activePeriod,
            'description' => $description
        ]);

        // Insert relations
        foreach ($coachIds as $coachId) {
            $this->db->table('coach_pricing_packages')->insert([
                'coach_id' => $coachId,
                'pricing_package_id' => $id
            ]);
        }

        // Sync legacy packages
        $this->syncCoachLegacyPackages($id, $name, $price, $sessions, $coachIds);

        $this->logAction('input', 'pricing_packages', $id, "Menambahkan paket harga global baru: {$name}");
        $this->db->transComplete();

        if ($this->db->transStatus() === false) {
            return $this->fail('Gagal menambah paket harga.');
        }

        return $this->respondCreated(['status' => 'success', 'id' => $id]);
    }

    public function updatePricingPackage()
    {
        $json = $this->request->getJSON();
        if (!$json || empty($json->id)) {
            return $this->fail('ID paket tidak ditemukan.');
        }

        $id = $json->id;
        $category = $json->category;
        $name = $json->name;
        $price = (int)$json->price;
        $sessions = (int)($json->sessions ?? 5);
        $activePeriod = $json->active_period ?? '';
        $description = $json->description ?? '';
        $coachIds = $json->coachIds ?? [];

        $this->db->transStart();

        // Update pricing packages
        $this->db->table('pricing_packages')->where('id', $id)->update([
            'category' => $category,
            'name' => $name,
            'price' => $price,
            'sessions' => $sessions,
            'active_period' => $activePeriod,
            'description' => $description
        ]);

        // Sync junction table relations: Delete old, Insert new
        $this->db->table('coach_pricing_packages')->where('pricing_package_id', $id)->delete();
        foreach ($coachIds as $coachId) {
            $this->db->table('coach_pricing_packages')->insert([
                'coach_id' => $coachId,
                'pricing_package_id' => $id
            ]);
        }

        // Sync legacy packages
        $this->syncCoachLegacyPackages($id, $name, $price, $sessions, $coachIds);

        $this->logAction('edit', 'pricing_packages', $id, "Mengubah paket harga global: {$name}");
        $this->db->transComplete();

        if ($this->db->transStatus() === false) {
            return $this->fail('Gagal memperbarui paket harga.');
        }

        return $this->respond(['status' => 'success']);
    }

    public function deletePricingPackage($id)
    {
        $pkg = $this->db->table('pricing_packages')->where('id', $id)->get()->getRowArray();
        $pkgName = $pkg ? $pkg['name'] : $id;

        $this->db->transStart();

        // Before deleting legacy packages, check if used by members
        // Check legacy package IDs
        $coaches = $this->db->table('coaches')->get()->getResultArray();
        foreach ($coaches as $coach) {
            $legacyId = "pkg-{$coach['id']}-{$id}";
            $memberCount = $this->db->table('members')->where('package_id', $legacyId)->countAllResults();
            if ($memberCount === 0) {
                $this->db->table('packages')->where('id', $legacyId)->delete();
            }
        }

        // Delete from junction and main tables
        $this->db->table('coach_pricing_packages')->where('pricing_package_id', $id)->delete();
        $this->db->table('pricing_packages')->where('id', $id)->delete();

        $this->logAction('hapus', 'pricing_packages', $id, "Menghapus paket harga global: {$pkgName}");
        $this->db->transComplete();

        if ($this->db->transStatus() === false) {
            return $this->fail('Gagal menghapus paket harga.');
        }

        return $this->respond(['status' => 'success']);
    }

    public function getAuditLogs()
    {
        $logs = $this->db->table('audit_logs')
            ->select('audit_logs.*, users.name as user_name')
            ->join('users', 'users.id = audit_logs.user_id', 'left')
            ->orderBy('audit_logs.created_at', 'DESC')
            ->limit(500)
            ->get()
            ->getResultArray();

        return $this->respond($logs);
    }

    // ==================== EVENT CATEGORIES API ====================

    public function getEventCategories()
    {
        $categories = $this->db->table('event_categories')
            ->orderBy('name', 'ASC')
            ->get()
            ->getResultArray();
        return $this->respond($categories);
    }

    public function addEventCategory()
    {
        $json = $this->request->getJSON();
        if (!$json || empty($json->name)) {
            return $this->fail('Nama kategori harus diisi.');
        }

        $name = trim($json->name);
        $exists = $this->db->table('event_categories')->where('name', $name)->countAllResults();
        if ($exists > 0) {
            return $this->fail('Kategori ini sudah ada.');
        }

        $this->db->table('event_categories')->insert([
            'name' => $name
        ]);
        $id = $this->db->insertID();

        $this->logAction('input', 'event_categories', (string)$id, "Menambahkan kategori event baru: {$name}");
        return $this->respondCreated(['status' => 'success', 'id' => $id, 'name' => $name]);
    }

    public function updateEventCategory()
    {
        $json = $this->request->getJSON();
        if (!$json || empty($json->id) || empty($json->name)) {
            return $this->fail('ID dan Nama kategori harus diisi.');
        }

        $id = $json->id;
        $name = trim($json->name);

        $this->db->table('event_categories')->where('id', $id)->update([
            'name' => $name
        ]);

        $this->logAction('edit', 'event_categories', (string)$id, "Mengubah nama kategori event: {$name}");
        return $this->respond(['status' => 'success']);
    }

    public function deleteEventCategory($id)
    {
        $cat = $this->db->table('event_categories')->where('id', $id)->get()->getRowArray();
        $catName = $cat ? $cat['name'] : $id;

        $this->db->table('event_categories')->where('id', $id)->delete();
        $this->logAction('hapus', 'event_categories', (string)$id, "Menghapus kategori event: {$catName}");
        return $this->respondDeleted(['status' => 'success']);
    }

    // ==================== SWIMMING POOLS API ====================

    public function getSwimmingPools()
    {
        $pools = $this->db->table('swimming_pools')
            ->orderBy('name', 'ASC')
            ->get()
            ->getResultArray();

        foreach ($pools as &$pool) {
            $pool['training_days'] = json_decode($pool['training_days'] ?? '[]', true);
            $pool['training_hours'] = json_decode($pool['training_hours'] ?? '[]', true);
        }

        return $this->respond($pools);
    }

    public function addSwimmingPool()
    {
        $json = $this->request->getJSON();
        if (!$json || empty($json->name)) {
            return $this->fail('Nama kolam renang harus diisi.');
        }

        $id = (!empty($json->id)) ? $json->id : 'pool-' . rand(10000, 99999);
        $name = trim($json->name);
        $days = isset($json->training_days) && is_array($json->training_days) ? json_encode($json->training_days) : '[]';
        $hours = isset($json->training_hours) && is_array($json->training_hours) ? json_encode($json->training_hours) : '[]';
        $description = $json->description ?? '';

        $this->db->table('swimming_pools')->insert([
            'id' => $id,
            'name' => $name,
            'training_days' => $days,
            'training_hours' => $hours,
            'description' => $description
        ]);

        $this->logAction('input', 'swimming_pools', $id, "Menambahkan master kolam renang baru: {$name}");
        return $this->respondCreated(['status' => 'success', 'id' => $id]);
    }

    public function updateSwimmingPool()
    {
        $json = $this->request->getJSON();
        if (!$json || empty($json->id) || empty($json->name)) {
            return $this->fail('ID dan Nama kolam renang harus diisi.');
        }

        $id = $json->id;
        $name = trim($json->name);
        $days = isset($json->training_days) && is_array($json->training_days) ? json_encode($json->training_days) : '[]';
        $hours = isset($json->training_hours) && is_array($json->training_hours) ? json_encode($json->training_hours) : '[]';
        $description = $json->description ?? '';

        $this->db->table('swimming_pools')->where('id', $id)->update([
            'name' => $name,
            'training_days' => $days,
            'training_hours' => $hours,
            'description' => $description
        ]);

        $this->logAction('edit', 'swimming_pools', $id, "Mengubah data master kolam renang: {$name}");
        return $this->respond(['status' => 'success']);
    }

    public function deleteSwimmingPool($id)
    {
        $pool = $this->db->table('swimming_pools')->where('id', $id)->get()->getRowArray();
        $poolName = $pool ? $pool['name'] : $id;

        $this->db->table('swimming_pools')->where('id', $id)->delete();
        $this->logAction('hapus', 'swimming_pools', $id, "Menghapus master kolam renang: {$poolName}");
        return $this->respondDeleted(['status' => 'success']);
    }

    private function saveUploadedFile($dataUri, $subfolder, $prefix, $nameSlug = '')
    {
        if (empty($dataUri)) {
            return null;
        }

        // If it's already a saved static/relative path or HTTP URL, return as is
        if (strpos($dataUri, 'data:') !== 0) {
            return $dataUri;
        }

        $ext = 'jpg';
        $data = null;

        if (strpos($dataUri, 'data:application/pdf') === 0) {
            if (preg_match('/^data:application\/pdf;base64,(.*)$/s', $dataUri, $matches)) {
                $ext = 'pdf';
                $data = base64_decode($matches[1]);
            }
        } elseif (strpos($dataUri, 'data:image/') === 0) {
            if (preg_match('/^data:image\/(.*?);base64,(.*)$/s', $dataUri, $matches)) {
                $rawExt = strtolower($matches[1]);
                if (strpos($rawExt, 'png') !== false) $ext = 'png';
                elseif (strpos($rawExt, 'webp') !== false) $ext = 'webp';
                elseif (strpos($rawExt, 'gif') !== false) $ext = 'gif';
                $data = base64_decode($matches[2]);
            }
        }

        if ($data === false || $data === null || strlen($data) === 0) {
            return null;
        }

        $slug = !empty($nameSlug) ? strtolower(preg_replace('/[^a-zA-Z0-9]+/', '_', trim($nameSlug))) : 'file';
        $fileName = "{$prefix}_{$slug}_" . time() . ".{$ext}";

        $dirsToTry = [
            FCPATH . 'images' . DIRECTORY_SEPARATOR . $subfolder . DIRECTORY_SEPARATOR,
            FCPATH . '..' . DIRECTORY_SEPARATOR . 'public' . DIRECTORY_SEPARATOR . 'images' . DIRECTORY_SEPARATOR . $subfolder . DIRECTORY_SEPARATOR,
            FCPATH . '..' . DIRECTORY_SEPARATOR . 'images' . DIRECTORY_SEPARATOR . $subfolder . DIRECTORY_SEPARATOR
        ];

        foreach ($dirsToTry as $dir) {
            if (!is_dir($dir)) {
                @mkdir($dir, 0777, true);
            }
            if (is_dir($dir)) {
                if (@file_put_contents($dir . $fileName, $data) !== false) {
                    return "/images/{$subfolder}/" . $fileName;
                }
            }
        }

        return null;
    }

    private function processCoachPhoto($photo, $coachName)
    {
        $saved = $this->saveUploadedFile($photo, 'coaches', 'coach', $coachName);
        return $saved ?? (!empty($photo) && strpos($photo, 'data:') !== 0 ? $photo : '/images/coach_rian.png');
    }

    private function processCoachCertificate($cert, $coachName)
    {
        $saved = $this->saveUploadedFile($cert, 'certificates', 'cert', $coachName);
        return $saved ?? (!empty($cert) && strpos($cert, 'data:') !== 0 ? $cert : null);
    }
}
