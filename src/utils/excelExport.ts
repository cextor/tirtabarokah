/**
 * Utility to export teaching schedule recaps for coaches with Date Range filter in Excel (.csv) format.
 * Format: Nama Pelatih, Hari & Tanggal, Jam Latihan, Nama Siswa, Status
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

  const rows: { 
    coachName: string; 
    dayAndDate: string; 
    scheduleTime: string; 
    studentName: string; 
    status: string;
    rawDate: string;
  }[] = [];

  selectedCoaches.forEach(coach => {
    const coachName = coach.name;
    const coachMembers = members.filter(m => m.coachId === coach.id);

    coachMembers.forEach(m => {
      if (m.progress && Array.isArray(m.progress) && m.progress.length > 0) {
        m.progress.forEach(p => {
          if (!p.date) return;

          // Filter by date range if provided
          if (startDateStr && p.date < startDateStr) return;
          if (endDateStr && p.date > endDateStr) return;

          // Format Date & Day Name from student attendance record
          const d = new Date(p.date + 'T00:00:00');
          const dayName = DAYS_INDO[d.getDay()] || 'Senin';
          const dateParts = p.date.split('-');
          const displayDate = dateParts.length === 3 
            ? `${dayName}, ${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`
            : `${dayName}, ${p.date}`;

          // Determine Jam Latihan (Session Time) for student on this day
          let sessionTime = m.scheduleTime || '08.00';
          if (m.scheduleDay === dayName && m.scheduleTime) {
            sessionTime = m.scheduleTime;
          } else if (m.scheduleDay2 === dayName && m.scheduleTime2) {
            sessionTime = m.scheduleTime2;
          } else if (m.schedules && Array.isArray(m.schedules)) {
            const matchedSlot = m.schedules.find((s: any) => s.day === dayName);
            if (matchedSlot && matchedSlot.time) {
              sessionTime = matchedSlot.time;
            }
          }

          rows.push({
            coachName,
            dayAndDate: displayDate,
            scheduleTime: sessionTime,
            studentName: m.student.fullName,
            status: p.attendance || 'Hadir',
            rawDate: p.date
          });
        });
      }
    });
  });

  // Sort rows by Date (ascending), then Time, then Student Name
  rows.sort((a, b) => {
    if (a.rawDate !== b.rawDate) return a.rawDate.localeCompare(b.rawDate);
    if (a.scheduleTime !== b.scheduleTime) return a.scheduleTime.localeCompare(b.scheduleTime);
    return a.studentName.localeCompare(b.studentName);
  });

  // Create CSV with UTF-8 BOM for Excel compatibility
  const headers = ['Nama Pelatih', 'Hari & Tanggal', 'Jam Latihan', 'Nama Siswa', 'Status'];
  const csvLines = [
    headers.join(','),
    ...rows.map(r => [
      `"${r.coachName.replace(/"/g, '""')}"`,
      `"${r.dayAndDate.replace(/"/g, '""')}"`,
      `"${r.scheduleTime.replace(/"/g, '""')}"`,
      `"${r.studentName.replace(/"/g, '""')}"`,
      `"${r.status.replace(/"/g, '""')}"`
    ].join(','))
  ];

  const csvString = '\uFEFF' + csvLines.join('\r\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  const dateSuffix = startDateStr && endDateStr ? `_${startDateStr}_sd_${endDateStr}` : '_Absensi';
  const fileName = (targetCoachId && selectedCoaches[0])
    ? `Laporan_Absen_${selectedCoaches[0].name.replace(/[^a-zA-Z0-9]/g, '_')}${dateSuffix}.csv`
    : `Laporan_Absen_Semua_Pelatih${dateSuffix}.csv`;

  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
