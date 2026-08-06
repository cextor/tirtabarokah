/**
 * Utility to export teaching schedule recaps for coaches with Date Range filter in Excel (.csv) format.
 * Format: Nama Pelatih, Total Mengajar Periode Ini, Tanggal & Hari, Jam Latihan, Nama Siswa
 */

import { Coach, Member } from '../types';

const DAYS_INDO = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export function exportCoachScheduleToExcel(
  coaches: Coach[], 
  members: Member[], 
  targetCoachId?: string,
  startDateStr?: string,
  endDateStr?: string
) {
  const selectedCoaches = targetCoachId && targetCoachId !== 'all'
    ? coaches.filter(c => c.id === targetCoachId)
    : coaches;

  if (!selectedCoaches || selectedCoaches.length === 0) return;

  // Determine date range list
  const dateList: { dateStr: string; dayName: string; displayDate: string }[] = [];

  if (startDateStr && endDateStr) {
    let curr = new Date(startDateStr + 'T00:00:00');
    const end = new Date(endDateStr + 'T00:00:00');

    while (curr <= end) {
      const year = curr.getFullYear();
      const month = String(curr.getMonth() + 1).padStart(2, '0');
      const dayNum = String(curr.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${dayNum}`;
      const dayName = DAYS_INDO[curr.getDay()];
      const displayDate = `${dayNum}/${month}/${year} (${dayName})`;

      dateList.push({ dateStr, dayName, displayDate });
      curr.setDate(curr.getDate() + 1);
    }
  } else {
    // Default 7 days if no date range specified
    const DAYS_ORDER = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
    DAYS_ORDER.forEach(d => {
      dateList.push({ dateStr: '', dayName: d, displayDate: d });
    });
  }

  const rows: { coachName: string; totalTeachingCount: string; dateDisplay: string; scheduleTime: string; studentName: string }[] = [];

  selectedCoaches.forEach(coach => {
    const coachName = coach.name;
    let coachTotalSessionsInRange = 0;
    const coachRows: { dateDisplay: string; scheduleTime: string; studentName: string }[] = [];

    dateList.forEach(dateObj => {
      const dayName = dateObj.dayName;
      const displayDate = dateObj.displayDate;

      // Check configured slots for this dayName
      const daySched = coach.schedule ? coach.schedule.find(d => d.day === dayName) : null;
      const timeSlots = daySched ? daySched.timeSlots || [] : [];

      timeSlots.forEach(slot => {
        coachTotalSessionsInRange++;
        const time = slot.time;

        // Find students assigned to this slot
        const studentsInSlot = (slot.students || [])
          .map(mId => members.find(m => m.id === mId))
          .filter(Boolean) as Member[];

        const studentsFromMembers = members.filter(m => {
          if (m.coachId !== coach.id) return false;
          if (m.isActive === false) return false;
          if (m.status !== 'Aktif' && m.status !== 'Paket Hampir Habis') return false;

          const m1 = m.scheduleDay === dayName && m.scheduleTime === time;
          const m2 = m.scheduleDay2 === dayName && m.scheduleTime2 === time;
          const m3 = m.schedules && Array.isArray(m.schedules) && m.schedules.some(s => s.day === dayName && s.time === time);
          return m1 || m2 || m3;
        });

        const studentMap = new Map<string, Member>();
        studentsInSlot.forEach(s => studentMap.set(s.id, s));
        studentsFromMembers.forEach(s => studentMap.set(s.id, s));

        const allMatched = Array.from(studentMap.values());

        if (allMatched.length > 0) {
          allMatched.forEach(st => {
            coachRows.push({
              dateDisplay: displayDate,
              scheduleTime: time,
              studentName: st.student.fullName
            });
          });
        } else {
          coachRows.push({
            dateDisplay: displayDate,
            scheduleTime: time,
            studentName: '- (Kosong)'
          });
        }
      });
    });

    const totalStr = `${coachTotalSessionsInRange} Sesi`;

    if (coachRows.length === 0) {
      rows.push({
        coachName,
        totalTeachingCount: '0 Sesi',
        dateDisplay: '-',
        scheduleTime: 'Belum Ada Jadwal',
        studentName: '-'
      });
    } else {
      coachRows.forEach(r => {
        rows.push({
          coachName,
          totalTeachingCount: totalStr,
          dateDisplay: r.dateDisplay,
          scheduleTime: r.scheduleTime,
          studentName: r.studentName
        });
      });
    }
  });

  // Create CSV with UTF-8 BOM for Excel compatibility
  const headers = ['Nama Pelatih', 'Total Mengajar Periode Ini', 'Tanggal & Hari', 'Jam Latihan', 'Nama Siswa'];
  const csvLines = [
    headers.join(','),
    ...rows.map(r => [
      `"${r.coachName.replace(/"/g, '""')}"`,
      `"${r.totalTeachingCount.replace(/"/g, '""')}"`,
      `"${r.dateDisplay.replace(/"/g, '""')}"`,
      `"${r.scheduleTime.replace(/"/g, '""')}"`,
      `"${r.studentName.replace(/"/g, '""')}"`
    ].join(','))
  ];

  const csvString = '\uFEFF' + csvLines.join('\r\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  const dateSuffix = startDateStr && endDateStr ? `_${startDateStr}_sd_${endDateStr}` : '_Rekapan';
  const fileName = (targetCoachId && selectedCoaches[0])
    ? `Rekapan_Jadwal_${selectedCoaches[0].name.replace(/[^a-zA-Z0-9]/g, '_')}${dateSuffix}.csv`
    : `Rekapan_Jadwal_Semua_Pelatih${dateSuffix}.csv`;

  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
