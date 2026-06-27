import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { motion } from 'motion/react';
import { GraduationCap, Save, Printer, User, Filter, AlertCircle, FileSpreadsheet } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function Marks() {
  const { schoolId, role } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [marks, setMarks] = useState<Record<string, any>>({});
  const [schoolSettings, setSchoolSettings] = useState<any>(null);
  
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [term, setTerm] = useState('Term 1');
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (schoolId) fetchInitialData();
  }, [schoolId]);

  const fetchInitialData = async () => {
    try {
      const schDoc = await getDoc(doc(db, 'schools', schoolId!));
      if (schDoc.exists()) setSchoolSettings(schDoc.data());

      const clsSnap = await getDocs(query(collection(db, 'classes'), where('schoolId', '==', schoolId)));
      setClasses(clsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      
      const subSnap = await getDocs(query(collection(db, 'subjects'), where('schoolId', '==', schoolId)));
      setSubjects(subSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (selectedClass) {
      fetchStudentsAndMarks();
    }
  }, [selectedClass, selectedSubject, term]);

  const fetchStudentsAndMarks = async () => {
    setLoading(true);
    try {
      // Fetch students for the class
      const stuSnap = await getDocs(query(collection(db, 'users'), where('schoolId', '==', schoolId), where('role', '==', 'student')));
      // Ideally users have classId, but we might have subscriptions instead. 
      // Let's fetch subscriptions for this class
      const subSnap = await getDocs(query(collection(db, 'subscriptions'), where('classId', '==', selectedClass)));
      const studentIdsInClass = subSnap.docs.map(d => d.data().studentId);
      
      const classStudents = stuSnap.docs
         .map(d => ({ id: d.id, ...d.data() }))
         .filter(s => studentIdsInClass.includes(s.id));
         
      setStudents(classStudents);

      if (selectedSubject) {
        // Fetch marks
        const marksSnap = await getDocs(query(collection(db, 'marks'), 
           where('classId', '==', selectedClass),
           where('subjectId', '==', selectedSubject),
           where('term', '==', term)
        ));
        
        const marksData: Record<string, any> = {};
        marksSnap.forEach(d => {
          const data = d.data();
          marksData[data.studentId] = { 
            id: d.id, 
            hw1: data.hw1 ?? '', 
            hw2: data.hw2 ?? '', 
            hw3: data.hw3 ?? '', 
            exam: data.exam ?? '', 
            observations: data.observations ?? '' 
          };
        });
        setMarks(marksData);
      } else {
        setMarks({});
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkChange = (studentId: string, field: string, value: string | number) => {
    setMarks(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value
      }
    }));
  };

  const handleSaveMarks = async () => {
    if (!selectedClass || !selectedSubject) return alert("Select class and subject");
    setSaving(true);
    try {
      for (const student of students) {
        const studentMark = marks[student.id];
        if (studentMark && (studentMark.hw1 !== '' || studentMark.hw2 !== '' || studentMark.hw3 !== '' || studentMark.exam !== '')) {
           const markId = studentMark.id || `${selectedClass}_${selectedSubject}_${student.id}_${term}`;
           await setDoc(doc(db, 'marks', markId), {
              schoolId,
              classId: selectedClass,
              subjectId: selectedSubject,
              studentId: student.id,
              term,
              hw1: studentMark.hw1 === '' ? null : Number(studentMark.hw1),
              hw2: studentMark.hw2 === '' ? null : Number(studentMark.hw2),
              hw3: studentMark.hw3 === '' ? null : Number(studentMark.hw3),
              exam: studentMark.exam === '' ? null : Number(studentMark.exam),
              observations: studentMark.observations || '',
              updatedAt: serverTimestamp()
           });
        }
      }
      alert('Marks saved successfully!');
      fetchStudentsAndMarks();
    } catch (e) {
      console.error(e);
      alert('Error saving marks');
    } finally {
      setSaving(false);
    }
  };

  const calculateSubjectAverage = (m: any) => {
     let hwSum = 0;
     let hwCount = 0;
     if (m.hw1 != null) { hwSum += m.hw1; hwCount++; }
     if (m.hw2 != null) { hwSum += m.hw2; hwCount++; }
     if (m.hw3 != null) { hwSum += m.hw3; hwCount++; }
     
     const hwAvg = hwCount > 0 ? hwSum / hwCount : 0;
     const exam = m.exam != null ? m.exam : 0;
     
     const hwCoeff = schoolSettings?.hwCoefficient || 1;
     const examCoeff = schoolSettings?.examCoefficient || 2;
     
     if (hwCount === 0 && m.exam == null) return 0;
     if (hwCount === 0) return exam;
     if (m.exam == null) return hwAvg;

     return ((hwAvg * hwCoeff) + (exam * examCoeff)) / (hwCoeff + examCoeff);
  };

  const generatePDF = (student: any) => {
    getDocs(query(collection(db, 'marks'), where('studentId', '==', student.id), where('term', '==', term)))
      .then(snap => {
         const studentMarks = snap.docs.map(d => d.data());
         
         const docPdf = new jsPDF();
         const schoolName = schoolSettings?.name || 'School Name';
         const schoolPhone = schoolSettings?.phone || '';
         const schoolAddress = schoolSettings?.address || '';
         
         // Header
         docPdf.setFontSize(22);
         docPdf.text(schoolName, 14, 20);
         
         docPdf.setFontSize(10);
         docPdf.text(`Phone: ${schoolPhone}`, 14, 28);
         docPdf.text(`Address: ${schoolAddress}`, 14, 33);
         
         docPdf.setFontSize(16);
         docPdf.text('ACADEMIC BULLETIN', 105, 45, { align: 'center' });
         
         docPdf.setFontSize(12);
         docPdf.text(`Student: ${student.name}`, 14, 60);
         docPdf.text(`Term: ${term}`, 14, 67);

         const tableData = subjects.map(sub => {
             const m = studentMarks.find(sm => sm.subjectId === sub.id) || {};
             const avg = calculateSubjectAverage(m);
             return [
               sub.name,
               m.hw1 ?? '-',
               m.hw2 ?? '-',
               m.hw3 ?? '-',
               m.exam ?? '-',
               avg ? avg.toFixed(2) : '-',
               m.observations || '-'
             ];
         });

         let totalAvgSum = 0;
         let validSubjectsCount = 0;
         studentMarks.forEach(m => {
            const avg = calculateSubjectAverage(m);
            if (avg > 0) {
               totalAvgSum += avg;
               validSubjectsCount++;
            }
         });
         
         const overallAvg = validSubjectsCount > 0 ? (totalAvgSum / validSubjectsCount).toFixed(2) : '0.00';

         autoTable(docPdf, {
           startY: 75,
           head: [['Subject', 'HW 1', 'HW 2', 'HW 3', 'Exam', 'Average', 'Observations']],
           body: tableData,
           foot: [['', '', '', '', 'Term Average:', overallAvg, '']],
           theme: 'grid',
           headStyles: { fillColor: [79, 70, 229] },
           footStyles: { fillColor: [243, 244, 246], textColor: [0, 0, 0] }
         });

         docPdf.save(`Bulletin_${student.name.replace(/\s+/g, '_')}_${term}.pdf`);
      });
  };

  const generateExcel = (student: any) => {
    getDocs(query(collection(db, 'marks'), where('studentId', '==', student.id), where('term', '==', term)))
      .then(snap => {
         const studentMarks = snap.docs.map(d => d.data());
         const data = subjects.map(sub => {
             const m = studentMarks.find(sm => sm.subjectId === sub.id) || {};
             const avg = calculateSubjectAverage(m);
             return {
               'Subject': sub.name,
               'HW 1': m.hw1 ?? '',
               'HW 2': m.hw2 ?? '',
               'HW 3': m.hw3 ?? '',
               'Exam': m.exam ?? '',
               'Average (/20)': avg ? Number(avg.toFixed(2)) : '',
               'Observations': m.observations || ''
             };
         });

         const ws = XLSX.utils.json_to_sheet(data);
         const wb = XLSX.utils.book_new();
         XLSX.utils.book_append_sheet(wb, ws, "Bulletin");
         XLSX.writeFile(wb, `Bulletin_${student.name.replace(/\s+/g, '_')}_${term}.xlsx`);
      });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
        <div>
          <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">Marks & Bulletins</h2>
          <p className="text-gray-500">Manage student grades and generate PDF reports.</p>
        </div>
        {(role === 'admin' || role === 'teacher' || role === 'superadmin') && (
          <button onClick={handleSaveMarks} disabled={saving} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-sm shadow-indigo-200 dark:shadow-none">
            <Save className="w-5 h-5" /> {saving ? 'Saving...' : 'Save Marks'}
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 flex gap-4 flex-wrap">
         <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="px-4 py-3 rounded-xl border bg-gray-50 dark:bg-gray-800 min-w-[200px] outline-none focus:ring-2 ring-indigo-500/20">
            <option value="">Select Class...</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
         </select>
         <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} className="px-4 py-3 rounded-xl border bg-gray-50 dark:bg-gray-800 min-w-[200px] outline-none focus:ring-2 ring-indigo-500/20">
            <option value="">Select Subject...</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
         </select>
         <select value={term} onChange={e => setTerm(e.target.value)} className="px-4 py-3 rounded-xl border bg-gray-50 dark:bg-gray-800 min-w-[150px] outline-none focus:ring-2 ring-indigo-500/20">
            <option value="Term 1">Term 1</option>
            <option value="Term 2">Term 2</option>
            <option value="Term 3">Term 3</option>
         </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : !selectedClass ? (
        <div className="text-center py-12 text-gray-500 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 flex flex-col items-center">
           <Filter className="w-12 h-12 text-gray-300 mb-4" />
           <p>Please select a class to view students.</p>
        </div>
      ) : students.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 flex flex-col items-center">
           <User className="w-12 h-12 text-gray-300 mb-4" />
           <p>No students found in this class.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 text-sm">
                <tr>
                  <th className="px-6 py-4 font-medium min-w-[200px]">Student Name</th>
                  {selectedSubject && <th className="px-3 py-4 font-medium w-24">HW 1</th>}
                  {selectedSubject && <th className="px-3 py-4 font-medium w-24">HW 2</th>}
                  {selectedSubject && <th className="px-3 py-4 font-medium w-24">HW 3</th>}
                  {selectedSubject && <th className="px-3 py-4 font-medium w-24">Exam</th>}
                  {selectedSubject && <th className="px-6 py-4 font-medium min-w-[200px]">Observations</th>}
                  <th className="px-6 py-4 font-medium text-right w-32">Bulletin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {students.map((student) => (
                  <motion.tr key={student.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                    <td className="px-6 py-4 font-medium flex items-center gap-3">
                       <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0">
                          {student.name.charAt(0).toUpperCase()}
                       </div>
                       <span className="truncate">{student.name}</span>
                    </td>
                    {selectedSubject && (
                      <td className="px-3 py-4">
                        <input type="number" max="20" min="0" step="0.25" value={marks[student.id]?.hw1 ?? ''} onChange={(e) => handleMarkChange(student.id, 'hw1', e.target.value)} className="w-full px-2 py-2 rounded-lg border bg-gray-50 dark:bg-gray-800 outline-none focus:ring-2 ring-indigo-500/20 text-center" placeholder="-" />
                      </td>
                    )}
                    {selectedSubject && (
                      <td className="px-3 py-4">
                        <input type="number" max="20" min="0" step="0.25" value={marks[student.id]?.hw2 ?? ''} onChange={(e) => handleMarkChange(student.id, 'hw2', e.target.value)} className="w-full px-2 py-2 rounded-lg border bg-gray-50 dark:bg-gray-800 outline-none focus:ring-2 ring-indigo-500/20 text-center" placeholder="-" />
                      </td>
                    )}
                    {selectedSubject && (
                      <td className="px-3 py-4">
                        <input type="number" max="20" min="0" step="0.25" value={marks[student.id]?.hw3 ?? ''} onChange={(e) => handleMarkChange(student.id, 'hw3', e.target.value)} className="w-full px-2 py-2 rounded-lg border bg-gray-50 dark:bg-gray-800 outline-none focus:ring-2 ring-indigo-500/20 text-center" placeholder="-" />
                      </td>
                    )}
                    {selectedSubject && (
                      <td className="px-3 py-4">
                        <input type="number" max="20" min="0" step="0.25" value={marks[student.id]?.exam ?? ''} onChange={(e) => handleMarkChange(student.id, 'exam', e.target.value)} className="w-full px-2 py-2 rounded-lg border border-indigo-200 bg-indigo-50 dark:bg-indigo-900/10 dark:border-indigo-800 outline-none focus:ring-2 ring-indigo-500/20 text-center font-bold text-indigo-700 dark:text-indigo-300" placeholder="-" />
                      </td>
                    )}
                    {selectedSubject && (
                      <td className="px-6 py-4">
                        <input type="text" value={marks[student.id]?.observations ?? ''} onChange={(e) => handleMarkChange(student.id, 'observations', e.target.value)} className="w-full px-3 py-2 rounded-lg border bg-gray-50 dark:bg-gray-800 outline-none focus:ring-2 ring-indigo-500/20" placeholder="Optional remarks..." />
                      </td>
                    )}
                    <td className="px-6 py-4 text-right">
                       <div className="flex gap-2 justify-end">
                         <button onClick={() => generatePDF(student)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors" title="Download PDF Bulletin">
                            <Printer className="w-5 h-5" />
                         </button>
                         <button onClick={() => generateExcel(student)} className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors" title="Download Excel Bulletin">
                            <FileSpreadsheet className="w-5 h-5" />
                         </button>
                       </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
