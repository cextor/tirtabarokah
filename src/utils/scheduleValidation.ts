import { Member } from '../types';

export interface ScheduleConflictResult {
  isConflict: boolean;
  existingType?: 'Reguler' | 'Privat';
  conflictingStudentName?: string;
}

/**
 * Checks if a coach's specific day & time slot is unavailable due to package category conflict
 * (Reguler vs Privat).
 * 
 * Rule: For a given coach, day, and time slot:
 * If there are active students enrolled in this slot under a different coachType (Reguler vs Privat),
 * then this slot is CONFLICTED and cannot be selected for a different coachType.
 */
export const checkScheduleSlotConflict = (
  members: Member[],
  coachId: string,
  dayName: string,
  timeStr: string,
  targetCoachType: 'Reguler' | 'Privat',
  excludeMemberId?: string
): ScheduleConflictResult => {
  if (!members || members.length === 0 || !coachId || !dayName || !timeStr) {
    return { isConflict: false };
  }

  const activeMembersInSlot = members.filter(m => {
    if (m.status === 'Selesai') return false;
    if (excludeMemberId && m.id === excludeMemberId) return false;
    if (m.coachId !== coachId) return false;

    // Check primary schedule
    const match1 = m.scheduleDay === dayName && m.scheduleTime === timeStr;
    // Check secondary schedule (2x seminggu)
    const match2 = m.scheduleFrequency === '2x Seminggu' && m.scheduleDay2 === dayName && m.scheduleTime2 === timeStr;

    return match1 || match2;
  });

  if (activeMembersInSlot.length === 0) {
    return { isConflict: false };
  }

  // Find if any active member in this slot has a DIFFERENT coachType than targetCoachType
  const conflictingMember = activeMembersInSlot.find(m => {
    const mType = m.coachType || 'Reguler';
    return mType !== targetCoachType;
  });

  if (conflictingMember) {
    return {
      isConflict: true,
      existingType: conflictingMember.coachType || 'Reguler',
      conflictingStudentName: conflictingMember.student.fullName
    };
  }

  return { isConflict: false };
};
