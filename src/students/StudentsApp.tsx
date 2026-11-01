import { useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import { copyText } from '../lib/clipboard';
import { formatNaira, toNaira } from '../lib/money';
import { DEFAULT_TIMEZONE, formatDateShort, formatDateTime } from '../lib/datetime';
import { publicClassUrl } from '../classes/model';
import { HostHeader } from '../components/HostHeader';
import {
  cancelBooking,
  fetchClassStudents,
  fetchClassStudentsNext,
  fetchClasses,
  fetchHostPayments,
  fetchHostProfile,
  fetchStudentBookings,
  fetchStudentDetail,
  fetchStudentMessages,
  recordManualPayment,
  saveAttendance,
  sendPaymentReminder,
  toApiPath,
  type ClassStudentBooking,
  type HostClassRecord,
  type HostClassSession,
  type HostPaymentRecord,
  type PaginatedResponse,
} from './api';
import {
  CHIP_STYLES,
  classMetaText,
  firstName,
  formatStudentSince,
  getStudentNotes,
  initials,
  isBookingOverdue,
  isSessionHeld,
  saveStudentNotes,
  statusChip,
  studentStatus,
  whatsappLink,
  type StudentFilter,
  type StudentTab,
} from './model';
import './students.css';

type StudentPages = InfiniteData<PaginatedResponse<ClassStudentBooking>>;

/** Patch one booking inside every loaded page of the class student list. */
function patchBookingPages(
  pages: StudentPages | undefined,
  bookingId: number,
  attendance: ClassStudentBooking['session_attendance'],
): StudentPages | undefined {
  if (!pages) return pages;
  return {
    ...pages,
    pages: pages.pages.map((page) => ({
      ...page,
      results: page.results.map((booking) =>
        booking.id === bookingId ? { ...booking, session_attendance: attendance } : booking,
      ),
    })),
  };
}

export default function StudentsApp() {
  const queryClient = useQueryClient();

  // URL state
  const getUrlParams = () => {
    const params = new URLSearchParams(window.location.search);
    const cls = params.get('class');
    const student = params.get('student');
    return {
      classId: cls ? Number.parseInt(cls, 10) : null,
      studentId: student ? Number.parseInt(student, 10) : null,
    };
  };

  const initialParams = getUrlParams();
  const [selectedClassId, setSelectedClassId] = useState<number | null>(initialParams.classId);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(initialParams.studentId);

  // Filters & Tabs
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<StudentFilter>('all');
  const [activeTab, setActiveTab] = useState<StudentTab>('booking');

  // Flash & UI state
  const [flashMessage, setFlashMessage] = useState<{ text: string; isError?: boolean } | null>(null);
  const [showPaymentPanel, setShowPaymentPanel] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<'Cash' | 'Bank transfer' | 'POS'>('Cash');
  const [payNote, setPayNote] = useState('');
  const [payError, setPayError] = useState<string | null>(null);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [isSendingReminder, setIsSendingReminder] = useState(false);
  const [reminderError, setReminderError] = useState<string | null>(null);
  const [waitlistError, setWaitlistError] = useState<string | null>(null);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  const [savingAttendanceId, setSavingAttendanceId] = useState<number | null>(null);

  // Confirmation dialog state
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [isCancellingBooking, setIsCancellingBooking] = useState(false);

  // Notes state
  const [notes, setNotes] = useState('');
  const [notesSavedIndicator, setNotesSavedIndicator] = useState(false);
  const notesSaveTimer = useRef<number | null>(null);

  // Ref to detail section for mobile scrolling
  const detailColRef = useRef<HTMLDivElement>(null);

  // 1. Fetch host profile
  const hostQuery = useQuery({
    queryKey: ['host-profile'],
    queryFn: fetchHostProfile,
  });
  const host = hostQuery.data;
  const timeZone = host?.timezone || DEFAULT_TIMEZONE;

  // 2. Fetch all classes
  const classesQuery = useQuery({
    queryKey: ['host-classes'],
    queryFn: () => fetchClasses(50),
  });

  // Filter out drafts: live first, then ended (backend already sorts newest first).
  const classes = useMemo(() => {
    const all = (classesQuery.data?.results ?? []).filter((c) => c.is_published);
    const live = all.filter((c) => c.status === 'live');
    const ended = all.filter((c) => c.status === 'ended');
    return [...live, ...ended];
  }, [classesQuery.data]);

  // Determine initial selected class.
  useEffect(() => {
    if (!classes.length) return;
    if (selectedClassId && classes.some((c) => c.id === selectedClassId)) return;

    // The class whose next session starts soonest, else the newest class.
    const withUpcoming = [...classes]
      .filter((c) => c.next_session?.starts_at)
      .sort(
        (a, b) =>
          new Date(a.next_session!.starts_at).getTime() -
          new Date(b.next_session!.starts_at).getTime(),
      )[0];
    const defaultCls = withUpcoming || classes[0];
    if (defaultCls) {
      setSelectedClassId(defaultCls.id);
      setSelectedStudentId(null);
      updateUrl(defaultCls.id, null);
    }
  }, [classes, selectedClassId]);

  const activeClass = useMemo(
    () => classes.find((c) => c.id === selectedClassId) ?? null,
    [classes, selectedClassId],
  );

  // 3. Fetch students in the selected class, one page at a time.
  const studentsQuery = useInfiniteQuery({
    queryKey: ['class-students', selectedClassId],
    queryFn: ({ pageParam }) =>
      pageParam
        ? fetchClassStudentsNext(pageParam)
        : fetchClassStudents(selectedClassId as number, 100),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => toApiPath(lastPage.next),
    enabled: !!selectedClassId,
  });

  const rawBookings = useMemo(
    () =>
      (studentsQuery.data?.pages.flatMap((page) => page.results) ?? []).filter(
        (b) => b.status !== 'cancelled',
      ),
    [studentsQuery.data],
  );

  // Select the first student only when there is no usable selection. Filtering
  // the list afterwards keeps the current student visible even if they are hidden.
  useEffect(() => {
    if (!selectedClassId) {
      if (selectedStudentId !== null) setSelectedStudentId(null);
      return;
    }
    if (!rawBookings.length) {
      if (selectedStudentId !== null) {
        setSelectedStudentId(null);
        updateUrl(selectedClassId, null);
      }
      return;
    }
    if (selectedStudentId) {
      if (rawBookings.some((b) => b.student_id === selectedStudentId)) return;
      // A deep link can point at a student on a later page. Walk the pages
      // before giving up and selecting the first student instead.
      if (
        studentsQuery.hasNextPage &&
        !studentsQuery.isFetchingNextPage &&
        !studentsQuery.isFetchNextPageError
      ) {
        void studentsQuery.fetchNextPage();
        return;
      }
      if (studentsQuery.isFetchingNextPage) return;
    }
    const first =
      rawBookings.find((b) => b.status === 'active' || b.status === 'pending_payment') ??
      rawBookings[0];
    if (first) {
      setSelectedStudentId(first.student_id);
      updateUrl(selectedClassId, first.student_id);
    }
  }, [
    rawBookings,
    selectedStudentId,
    selectedClassId,
    studentsQuery.hasNextPage,
    studentsQuery.isFetchingNextPage,
    studentsQuery.isFetchNextPageError,
    studentsQuery.fetchNextPage,
  ]);

  // Selected booking record
  const selectedBooking = useMemo(
    () => rawBookings.find((b) => b.student_id === selectedStudentId) ?? null,
    [rawBookings, selectedStudentId],
  );

  // 4. Fetch additional student details for the selected student
  const studentDetailQuery = useQuery({
    queryKey: ['student-detail', selectedStudentId],
    queryFn: () => (selectedStudentId ? fetchStudentDetail(selectedStudentId) : Promise.reject('No student')),
    enabled: !!selectedStudentId,
  });

  const studentBookingsQuery = useQuery({
    queryKey: ['student-bookings', selectedStudentId],
    queryFn: () => (selectedStudentId ? fetchStudentBookings(selectedStudentId) : Promise.reject('No student')),
    enabled: !!selectedStudentId,
  });

  const hostPaymentsQuery = useQuery({
    queryKey: ['host-payments'],
    queryFn: fetchHostPayments,
    staleTime: 30_000,
  });

  const studentMessagesQuery = useQuery({
    queryKey: ['student-messages', selectedStudentId],
    queryFn: () => (selectedStudentId ? fetchStudentMessages(selectedStudentId) : Promise.reject('No student')),
    enabled: !!selectedStudentId,
  });

  // Load saved notes when student changes
  useEffect(() => {
    if (selectedStudentId) {
      setNotes(getStudentNotes(selectedStudentId));
      setNotesSavedIndicator(false);
    } else {
      setNotes('');
    }
  }, [selectedStudentId]);

  // Helper to sync URL params
  function updateUrl(classId: number | null, studentId: number | null) {
    const url = new URL(window.location.href);
    if (classId) url.searchParams.set('class', String(classId));
    else url.searchParams.delete('class');

    if (studentId) url.searchParams.set('student', String(studentId));
    else url.searchParams.delete('student');

    window.history.replaceState({}, '', url.toString());
  }

  // Handle class picker change
  function handleClassChange(e: ChangeEvent<HTMLSelectElement>) {
    const id = Number.parseInt(e.target.value, 10);
    if (Number.isNaN(id)) return;
    setSelectedClassId(id);
    setSelectedStudentId(null);
    setSearchQuery('');
    setActiveFilter('all');
    setActiveTab('booking');
    setShowPaymentPanel(false);
    setFlashMessage(null);
    setPayError(null);
    setReminderError(null);
    setWaitlistError(null);
    setAttendanceError(null);
    updateUrl(id, null);
  }

  // Handle picking a student from the list
  function handleSelectStudent(studentId: number) {
    setSelectedStudentId(studentId);
    setActiveTab('booking');
    setShowPaymentPanel(false);
    setFlashMessage(null);
    setPayError(null);
    setReminderError(null);
    setWaitlistError(null);
    setAttendanceError(null);
    updateUrl(selectedClassId, studentId);

    // If mobile, scroll to detail
    if (window.innerWidth <= 768 && detailColRef.current) {
      detailColRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }

  // Switch class from an "Also in:" chip, keeping the same student selected.
  function handleOtherClass(classId: number) {
    setSelectedClassId(classId);
    setSearchQuery('');
    setActiveFilter('all');
    setActiveTab('booking');
    setShowPaymentPanel(false);
    setFlashMessage(null);
    setPayError(null);
    setReminderError(null);
    setWaitlistError(null);
    setAttendanceError(null);
    updateUrl(classId, selectedStudentId);
  }

  // Arrow keys move between tabs, as expected of a tablist.
  function handleTabKeyDown(e: KeyboardEvent<HTMLButtonElement>, tab: StudentTab) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const tabs: StudentTab[] = isFreeClass
      ? ['booking', 'messages']
      : ['booking', 'payments', 'messages'];
    const index = tabs.indexOf(tab);
    if (index === -1) return;
    e.preventDefault();
    const target =
      e.key === 'ArrowRight'
        ? tabs[(index + 1) % tabs.length]
        : tabs[(index - 1 + tabs.length) % tabs.length];
    setActiveTab(target);
    document.getElementById(`student-tab-${target}`)?.focus();
  }

  // Handle notes changes with debounce autosave
  function handleNotesChange(value: string) {
    setNotes(value);
    setNotesSavedIndicator(false);
    if (notesSaveTimer.current) {
      window.clearTimeout(notesSaveTimer.current);
    }
    notesSaveTimer.current = window.setTimeout(() => {
      if (selectedStudentId) {
        saveStudentNotes(selectedStudentId, value);
        setNotesSavedIndicator(true);
      }
    }, 600);
  }

  function handleNotesBlur() {
    if (notesSaveTimer.current) {
      window.clearTimeout(notesSaveTimer.current);
    }
    if (selectedStudentId) {
      saveStudentNotes(selectedStudentId, notes);
      setNotesSavedIndicator(true);
    }
  }

  // Computed Class Info & Summary Stats
  const isFreeClass = toNaira(activeClass?.price) === 0;
  const classPrice = toNaira(activeClass?.price);

  const classSessions = useMemo(
    () =>
      [...(activeClass?.sessions ?? [])].sort(
        (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
      ),
    [activeClass],
  );

  const heldSessions = useMemo(() => classSessions.filter(isSessionHeld), [classSessions]);
  const heldSessionIds = useMemo(() => heldSessions.map((s) => s.id), [heldSessions]);
  const classSessionIds = useMemo(() => new Set(classSessions.map((s) => s.id)), [classSessions]);

  const bookedList = useMemo(
    () => rawBookings.filter((b) => b.status === 'active' || b.status === 'pending_payment'),
    [rawBookings],
  );

  const waitingList = useMemo(
    () => rawBookings.filter((b) => b.status === 'waitlisted'),
    [rawBookings],
  );

  const overdueList = useMemo(
    () => bookedList.filter((b) => isBookingOverdue(b, activeClass!)),
    [bookedList, activeClass],
  );

  const paidUpList = useMemo(
    () => bookedList.filter((b) => toNaira(b.balance) <= 0),
    [bookedList],
  );

  // Class Summary Figures
  const totalCollected = useMemo(
    () => bookedList.reduce((acc, b) => acc + toNaira(b.amount_paid), 0),
    [bookedList],
  );

  const totalOutstanding = useMemo(
    () => bookedList.reduce((acc, b) => acc + toNaira(b.balance), 0),
    [bookedList],
  );

  // Present marks for one held session, ignoring marks for deleted sessions.
  const presentCount = useMemo(() => {
    if (!heldSessionIds.length) return 0;
    let count = 0;
    for (const booking of bookedList) {
      const marks = new Set(
        (booking.session_attendance || [])
          .map((a) => a.session_id)
          .filter((id) => classSessionIds.has(id)),
      );
      for (const id of heldSessionIds) if (marks.has(id)) count += 1;
    }
    return count;
  }, [bookedList, heldSessionIds, classSessionIds]);

  // Overall attendance rate across all held sessions for this class.
  // The API only stores present marks, so zero present marks means nothing has
  // been recorded yet — not necessarily that everyone missed.
  const classAttendanceRate = useMemo(() => {
    if (!heldSessionIds.length || !bookedList.length) return 'None yet';
    const totalMarks = heldSessionIds.length * bookedList.length;
    if (!presentCount || totalMarks === 0) return 'None yet';
    return `${Math.round((presentCount / totalMarks) * 100)}%`;
  }, [heldSessionIds, bookedList, presentCount]);

  // Filter definitions with counts
  const filtersList: Array<{ id: StudentFilter; label: string; count: number }> = useMemo(() => {
    const list: Array<{ id: StudentFilter; label: string; count: number }> = [
      { id: 'all', label: 'Booked', count: bookedList.length },
    ];
    if (!isFreeClass) {
      list.push({ id: 'late', label: 'Overdue', count: overdueList.length });
    }
    list.push({
      id: 'paid',
      label: isFreeClass ? 'All set' : 'Paid up',
      count: paidUpList.length,
    });
    if (!(activeClass?.status === 'ended' && waitingList.length === 0)) {
      list.push({ id: 'wait', label: 'Waiting list', count: waitingList.length });
    }
    return list;
  }, [bookedList, overdueList, paidUpList, waitingList, isFreeClass, activeClass]);

  // Filtered rows
  const visibleBookings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return rawBookings.filter((b) => {
      // Filter category
      if (activeFilter === 'all' && b.status === 'waitlisted') return false;
      if (activeFilter === 'late' && !isBookingOverdue(b, activeClass!)) return false;
      if (activeFilter === 'paid' && (b.status === 'waitlisted' || toNaira(b.balance) > 0)) return false;
      if (activeFilter === 'wait' && b.status !== 'waitlisted') return false;

      // Search match
      if (!q) return true;
      const haystack = `${b.student_name} ${b.student_phone}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [rawBookings, activeFilter, searchQuery, activeClass]);

  // Empty text for list
  const emptyListText = useMemo(() => {
    if (searchQuery.trim()) return 'Nobody in this class matches your search.';
    if (activeFilter === 'late') return 'Nobody is overdue. Nice.';
    if (activeFilter === 'wait') return 'Nobody is on the waiting list.';
    return 'Nobody has booked this class yet.';
  }, [searchQuery, activeFilter]);

  // Attendance breakdown for the selected booking.
  const selectedAttRate = useMemo(() => {
    if (!classSessions.length || !selectedBooking) {
      return { present: 0, absent: 0, upcoming: 0, held: 0 };
    }
    const presentIds = new Set(
      (selectedBooking.session_attendance || [])
        .map((a) => a.session_id)
        .filter((id) => classSessionIds.has(id)),
    );
    let present = 0;
    let absent = 0;
    let upcoming = 0;

    for (const session of classSessions) {
      if (isSessionHeld(session)) {
        if (presentIds.has(session.id)) present++;
        else absent++;
      } else {
        upcoming++;
      }
    }
    return { present, absent, upcoming, held: present + absent };
  }, [classSessions, classSessionIds, selectedBooking]);

  // The selected student's booking summary for this class (for instalment dates).
  const selectedSummary = useMemo(() => {
    const list = studentBookingsQuery.data?.results ?? [];
    if (!selectedBooking) return null;
    return (
      list.find((b) => b.id === selectedBooking.id) ??
      list.find((b) => Number.parseInt(b.class_event?.id ?? '', 10) === selectedClassId) ??
      null
    );
  }, [studentBookingsQuery.data, selectedBooking, selectedClassId]);

  // Other classes the student is enrolled in. Only offer classes that are in the
  // picker, so a chip can never jump to a class this page cannot show.
  const otherClasses = useMemo(() => {
    const allStudentBookings = studentBookingsQuery.data?.results ?? [];
    const available = new Map(classes.map((c) => [c.id, c.title]));
    const seen = new Set<number>();
    return allStudentBookings
      .filter((b) => {
        if (!b.class_event || b.status === 'cancelled') return false;
        const id = Number.parseInt(b.class_event.id, 10);
        return id !== selectedClassId && available.has(id) && !seen.has(id);
      })
      .map((b) => {
        const classId = Number.parseInt(b.class_event!.id, 10);
        seen.add(classId);
        return { classId, title: available.get(classId) ?? b.class_event!.title };
      });
  }, [studentBookingsQuery.data, selectedClassId, classes]);

  // Payments for this booking. Fee fields come straight from the API.
  const classPayments: HostPaymentRecord[] = useMemo(() => {
    const list = hostPaymentsQuery.data ?? [];
    if (!selectedBooking) return [];
    return list.filter((p) => p.booking_id === selectedBooking.id);
  }, [hostPaymentsQuery.data, selectedBooking]);

  // Messages are global per student today; the serializer does not expose the
  // class or a failure reason, so nothing can be filtered or explained here.
  const classMessages = useMemo(() => {
    return studentMessagesQuery.data?.results ?? [];
  }, [studentMessagesQuery.data]);

  // Outstanding for selected student
  const selectedDue = toNaira(selectedBooking?.balance);
  const selectedPaid = toNaira(selectedBooking?.amount_paid);
  const nextPayment = selectedSummary?.next_installment ?? null;
  const nextPaymentAmount = toNaira(nextPayment?.amount) || Math.min(selectedDue, classPrice / 2);
  const nextPaymentDue = nextPayment?.due_at ?? '';
  const nextPaymentOverdue = nextPaymentDue
    ? new Date(nextPaymentDue).getTime() < Date.now()
    : Boolean(selectedBooking && activeClass && isBookingOverdue(selectedBooking, activeClass));

  // Open Payment Panel
  function handleOpenPayPanel() {
    setPayAmount(String(selectedDue));
    setPayMethod('Cash');
    setPayNote('');
    setPayError(null);
    setShowPaymentPanel(true);
    setFlashMessage(null);
  }

  // Save Payment
  async function handleSavePayment() {
    if (!selectedBooking) return;
    const amountNum = Number.parseFloat(payAmount);
    if (!amountNum || amountNum <= 0 || amountNum > selectedDue) {
      setPayError(
        amountNum > selectedDue
          ? `That is more than the ${formatNaira(selectedDue)} outstanding.`
          : 'Enter an amount greater than zero.',
      );
      return;
    }

    setIsSubmittingPayment(true);
    setPayError(null);
    try {
      await recordManualPayment(selectedBooking.id, amountNum);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['class-students', selectedClassId] }),
        queryClient.invalidateQueries({ queryKey: ['student-bookings', selectedStudentId] }),
        queryClient.invalidateQueries({ queryKey: ['host-payments'] }),
        queryClient.invalidateQueries({ queryKey: ['host-classes'] }),
      ]);
      setShowPaymentPanel(false);
      setActiveTab('payments');
      setPayAmount('');
      setPayMethod('Cash');
      setPayNote('');
      setFlashMessage({
        text: `${formatNaira(amountNum)} recorded for ${firstName(selectedBooking.student_name)}.`,
      });
    } catch (err: unknown) {
      setPayError(err instanceof Error ? err.message : 'Could not record payment. Try again.');
    } finally {
      setIsSubmittingPayment(false);
    }
  }

  // Toggle Attendance
  async function handleToggleAttendance(session: HostClassSession, markPresent: boolean) {
    if (!selectedBooking || savingAttendanceId === session.id) return;
    const bookingId = selectedBooking.id;
    const previousAttendance = [...(selectedBooking.session_attendance || [])];
    const nextAttendance = markPresent
      ? [
          ...previousAttendance.filter((a) => a.session_id !== session.id),
          { session_id: session.id, session_number: session.number, class_id: selectedClassId! },
        ]
      : previousAttendance.filter((a) => a.session_id !== session.id);

    const queryKey = ['class-students', selectedClassId] as const;
    setSavingAttendanceId(session.id);
    setAttendanceError(null);

    // Optimistically update every loaded page; the list may span several.
    queryClient.setQueryData<StudentPages>(queryKey, (old) =>
      patchBookingPages(old, bookingId, nextAttendance),
    );

    try {
      await saveAttendance(session.id, [{ booking: bookingId, present: markPresent }]);
      // Pull the authoritative record back in the background. The optimistic
      // mark stays on screen until the refetch lands.
      await queryClient.invalidateQueries({ queryKey });
    } catch (err: unknown) {
      queryClient.setQueryData<StudentPages>(queryKey, (old) =>
        patchBookingPages(old, bookingId, previousAttendance),
      );
      setAttendanceError(
        err instanceof Error
          ? `Could not save attendance. ${err.message}`
          : 'Could not save attendance. Your change was undone.',
      );
    } finally {
      setSavingAttendanceId(null);
    }
  }

  // Send Payment Reminder
  async function handleSendReminder() {
    if (!selectedBooking) return;
    setIsSendingReminder(true);
    setReminderError(null);
    try {
      await sendPaymentReminder(selectedBooking.id);
      setFlashMessage({
        text: `Payment reminder sent to ${firstName(selectedBooking.student_name)} on WhatsApp.`,
      });
    } catch (err: unknown) {
      setReminderError(err instanceof Error ? err.message : 'Could not send reminder. Try again.');
    } finally {
      setIsSendingReminder(false);
    }
  }

  // Remove Waitlist Student
  async function handleRemoveWaitlist() {
    if (!selectedBooking) return;
    const name = firstName(selectedBooking.student_name);
    setWaitlistError(null);
    try {
      await cancelBooking(selectedBooking.id);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['class-students', selectedClassId] }),
        queryClient.invalidateQueries({ queryKey: ['host-classes'] }),
      ]);
      setFlashMessage({ text: `${name} was removed from the waiting list.` });
    } catch (err: unknown) {
      setWaitlistError(err instanceof Error ? err.message : 'Could not remove student.');
    }
  }

  // Cancel Booking (with confirmation)
  async function handleConfirmCancel() {
    if (!selectedBooking) return;
    const name = firstName(selectedBooking.student_name);
    setIsCancellingBooking(true);
    try {
      await cancelBooking(selectedBooking.id);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['class-students', selectedClassId] }),
        queryClient.invalidateQueries({ queryKey: ['host-classes'] }),
      ]);
      setConfirmCancelOpen(false);
      setFlashMessage({ text: `${name}'s booking was cancelled.` });
    } catch (err: unknown) {
      setFlashMessage({
        text: err instanceof Error ? err.message : 'Could not cancel booking.',
        isError: true,
      });
    } finally {
      setIsCancellingBooking(false);
    }
  }

  const parsedPayAmount = Number.parseFloat(payAmount) || 0;
  const payDisabled = !(parsedPayAmount > 0 && parsedPayAmount <= selectedDue) || isSubmittingPayment;
  const payHint = parsedPayAmount > selectedDue ? `That is more than the ${formatNaira(selectedDue)} outstanding.` : '';

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F6F3EE' }}>
      {/* 1. TOP BAR */}
      <HostHeader>
        <a className="tt-student-topbar-link" href="/dashboard/">
          Dashboard
        </a>
      </HostHeader>

      {/* 2. MAIN CONTAINER */}
      <main className="tt-container">
        {/* HEADER + CLASS PICKER */}
        <section className="tt-header-row" aria-labelledby="page-heading">
          <div>
            <h1 id="page-heading" className="tt-page-title">
              Students
            </h1>
            <p className="tt-page-subtitle">Pick a class to see the people in it.</p>
          </div>
          <div className="tt-class-picker">
            <label htmlFor="class-select" style={{ fontSize: '14px', fontWeight: 700 }}>
              Class
            </label>
            <select
              id="class-select"
              className="inp"
              style={{ fontWeight: 700 }}
              value={selectedClassId ?? ''}
              onChange={handleClassChange}
              disabled={classes.length === 0}
            >
              {classes.length === 0 && <option value="">No classes yet</option>}
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                  {c.status === 'ended' ? ' (ended)' : ''}
                </option>
              ))}
            </select>
            {classesQuery.isLoading && (
              <span style={{ fontSize: '13px', color: '#5F5F66' }}>Loading classes…</span>
            )}
            {classesQuery.isError && (
              <span role="alert" style={{ fontSize: '13px', color: '#9B1C1C', fontWeight: 600 }}>
                Could not load classes.{' '}
                <button
                  type="button"
                  onClick={() => classesQuery.refetch()}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    color: '#9B1C1C',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    font: 'inherit',
                  }}
                >
                  Try again
                </button>
              </span>
            )}
          </div>
        </section>

        {/* FLASH MESSAGE */}
        {flashMessage && (
          <div
            role="status"
            className={`tt-flash ${flashMessage.isError ? 'is-error' : ''}`}
            aria-live="polite"
          >
            <span>{flashMessage.text}</span>
            <button
              type="button"
              onClick={() => setFlashMessage(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}
              aria-label="Dismiss message"
            >
              ×
            </button>
          </div>
        )}

        {/* CLASS SUMMARY CARD */}
        {activeClass ? (
          <section className="tt-class-summary" aria-label="Class summary">
            <div className="tt-summary-info">
              <div className="tt-summary-title-row">
                <span className="tt-summary-title">{activeClass.title}</span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    fontSize: '13px',
                    fontWeight: 700,
                    padding: '3px 12px',
                    borderRadius: '999px',
                    backgroundColor:
                      activeClass.status === 'live' ? CHIP_STYLES.green.bg : CHIP_STYLES.grey.bg,
                    borderColor:
                      activeClass.status === 'live' ? CHIP_STYLES.green.border : CHIP_STYLES.grey.border,
                    color:
                      activeClass.status === 'live' ? CHIP_STYLES.green.color : CHIP_STYLES.grey.color,
                    borderWidth: '1px',
                    borderStyle: 'solid',
                  }}
                >
                  {activeClass.status === 'live' ? 'Live' : 'Ended'}
                </span>
              </div>
              <span className="tt-summary-meta">{classMetaText(activeClass)}</span>
              <a
                href={`/classes/detail/?id=${activeClass.id}`}
                className="tt-summary-link"
              >
                Open class page
              </a>
            </div>

            {/* Class Stats */}
            <div className="tt-summary-stat-tile">
              <span className="tt-summary-stat-label">Booked</span>
              <span className="tt-summary-stat-val">
                {activeClass.capacity && activeClass.capacity < 9999
                  ? `${bookedList.length} of ${activeClass.capacity}`
                  : String(bookedList.length)}
              </span>
            </div>

            {isFreeClass ? (
              <>
                <div className="tt-summary-stat-tile">
                  <span className="tt-summary-stat-label">Waiting list</span>
                  <span className="tt-summary-stat-val">{waitingList.length}</span>
                </div>
                <div className="tt-summary-stat-tile">
                  <span className="tt-summary-stat-label">Sessions</span>
                  <span className="tt-summary-stat-val">{activeClass.sessions?.length || 0}</span>
                </div>
              </>
            ) : (
              <>
                <div className="tt-summary-stat-tile">
                  <span className="tt-summary-stat-label">Collected</span>
                  <span className="tt-summary-stat-val">{formatNaira(totalCollected)}</span>
                </div>
                <div className="tt-summary-stat-tile">
                  <span className="tt-summary-stat-label">Outstanding</span>
                  <span className="tt-summary-stat-val">{formatNaira(totalOutstanding)}</span>
                </div>
              </>
            )}

            <div className="tt-summary-stat-tile">
              <span className="tt-summary-stat-label">Attendance</span>
              <span className="tt-summary-stat-val">{classAttendanceRate}</span>
            </div>
          </section>
        ) : (
          <div className="tt-skeleton-box" style={{ height: '120px' }} />
        )}

        {/* MASTER / DETAIL */}
        <section className="tt-split-view">
          {/* LEFT: STUDENT LIST */}
          <div className="tt-list-col">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label htmlFor="sq" style={{ fontSize: '14px', fontWeight: 600 }}>
                Search this class
              </label>
              <input
                id="sq"
                className="inp"
                type="search"
                placeholder="Name or phone"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Filter Pills */}
            <div className="tt-filter-pills" role="group" aria-label="Filter students">
              {filtersList.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  aria-pressed={activeFilter === f.id}
                  onClick={() => setActiveFilter(f.id)}
                  className={`tt-filter-pill ${activeFilter === f.id ? 'is-active' : ''}`}
                >
                  {f.label} <span className="tt-filter-count">{f.count}</span>
                </button>
              ))}
            </div>

            {/* Rows List */}
            <div className="tt-student-list-card">
              {studentsQuery.isLoading ? (
                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div className="tt-skeleton-box" style={{ height: '48px' }} />
                  <div className="tt-skeleton-box" style={{ height: '48px' }} />
                  <div className="tt-skeleton-box" style={{ height: '48px' }} />
                </div>
              ) : visibleBookings.length === 0 ? (
                <div style={{ padding: '28px 22px', textAlign: 'center', color: '#5F5F66' }}>
                  <p style={{ margin: 0 }}>{emptyListText}</p>
                  {rawBookings.length === 0 && activeClass?.slug && (
                    <div
                      style={{
                        marginTop: '12px',
                        display: 'flex',
                        flexWrap: 'wrap',
                        justifyContent: 'center',
                        gap: '12px',
                      }}
                    >
                      <a
                        href={`/class/${activeClass.slug}/`}
                        target="_blank"
                        rel="noopener"
                        style={{
                          color: '#CC4E32',
                          fontWeight: 700,
                          textDecoration: 'underline',
                          fontSize: '14.5px',
                          alignSelf: 'center',
                        }}
                      >
                        Open public booking page
                      </a>
                      <button
                        type="button"
                        className="tt-btn-ink"
                        onClick={async () => {
                          const copied = await copyText(publicClassUrl(activeClass.slug));
                          setFlashMessage({
                            text: copied
                              ? 'Booking link copied. Share it to fill this class.'
                              : 'Could not copy the link. Open the public page and copy the address instead.',
                            isError: !copied,
                          });
                        }}
                      >
                        Copy booking link
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                visibleBookings.map((b) => {
                  const status = studentStatus(b, activeClass!);
                  const chip = statusChip(status, isFreeClass);
                  const isSelected = b.student_id === selectedStudentId;
                  const paid = toNaira(b.amount_paid);
                  const due = toNaira(b.balance);

                  // Attendance for this student in list
                  const heldCount = (activeClass?.sessions || []).filter(isSessionHeld).length;
                  const presentCount = (b.session_attendance || []).filter((a) =>
                    classSessionIds.has(a.session_id),
                  ).length;
                  const attText = heldCount > 0 ? ` · ${presentCount} of ${heldCount} attended` : '';

                  const secondLine =
                    status === 'waiting'
                      ? `Joined ${formatDateShort(b.created_at, timeZone)}`
                      : isFreeClass
                        ? b.student_phone
                        : `${formatNaira(paid)} of ${formatNaira(classPrice)}${attText}`;

                  const hasBar = status !== 'waiting' && !isFreeClass;
                  const percent = Math.min(100, Math.round((paid / (classPrice || 1)) * 100));
                  const barColor =
                    status === 'late' ? '#9B1C1C' : due === 0 ? '#14532D' : '#CC4E32';

                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => handleSelectStudent(b.student_id)}
                      aria-current={isSelected}
                      className={`tt-student-row-btn ${isSelected ? 'is-selected' : ''}`}
                    >
                      <div className="tt-row-avatar">{initials(b.student_name)}</div>
                      <div className="tt-row-content">
                        <div className="tt-row-top">
                          <span className="tt-row-name">{b.student_name}</span>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              fontSize: '13px',
                              fontWeight: 700,
                              padding: '2px 10px',
                              borderRadius: '999px',
                              backgroundColor: CHIP_STYLES[chip.tone].bg,
                              borderColor: CHIP_STYLES[chip.tone].border,
                              color: CHIP_STYLES[chip.tone].color,
                              borderWidth: '1px',
                              borderStyle: 'solid',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {chip.label}
                          </span>
                        </div>
                        <span className="tt-row-line">{secondLine}</span>
                        {hasBar && (
                          <div className="tt-progress-track">
                            <div
                              className="tt-progress-bar"
                              style={{ width: `${percent}%`, backgroundColor: barColor }}
                            />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {studentsQuery.hasNextPage && (
              <button
                type="button"
                onClick={() => studentsQuery.fetchNextPage()}
                disabled={studentsQuery.isFetchingNextPage}
                style={{
                  minHeight: '48px',
                  padding: '0 18px',
                  border: '1px solid #CFC8BB',
                  background: '#FFFFFF',
                  borderRadius: '12px',
                  fontWeight: 700,
                  cursor: studentsQuery.isFetchingNextPage ? 'wait' : 'pointer',
                }}
              >
                {studentsQuery.isFetchingNextPage ? 'Loading…' : 'Show more students'}
              </button>
            )}

            {studentsQuery.isError && (
              <div role="alert" className="tt-inline-error">
                Could not load students for this class.{' '}
                <button
                  type="button"
                  onClick={() => studentsQuery.refetch()}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    fontWeight: 700,
                    color: '#9B1C1C',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    font: 'inherit',
                  }}
                >
                  Try again
                </button>
              </div>
            )}
          </div>

          {/* RIGHT: STUDENT DETAIL */}
          <div className="tt-detail-col" ref={detailColRef}>
            {/* Mobile Back button */}
            <button
              type="button"
              className="tt-mobile-back"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              ↑ Back to student list
            </button>

            {!selectedBooking ? (
              <div className="tt-no-student-placeholder">
                Pick a student on the left to see their details.
              </div>
            ) : (
              <>
                {/* 1. Header Card */}
                {(() => {
                  const sStatus = studentStatus(selectedBooking, activeClass!);
                  const sChip = statusChip(sStatus, isFreeClass);
                  const wa = whatsappLink(selectedBooking.student_phone, selectedBooking.student_name);
                  const isWaiting = selectedBooking.status === 'waitlisted';
                  const isBooked = !isWaiting;
                  const canRecord = isBooked && !isFreeClass && selectedDue > 0 && activeClass?.status === 'live';

                  return (
                    <div className="tt-detail-header-card">
                      <div className="tt-student-main-info">
                        <div className="tt-avatar-large">
                          {initials(selectedBooking.student_name)}
                        </div>
                        <div className="tt-student-titles">
                          <h2 className="tt-student-name-heading">
                            {selectedBooking.student_name}
                          </h2>
                          <div className="tt-student-sub-info">
                            <span>{selectedBooking.student_phone || 'No phone'}</span>
                            <span>{studentDetailQuery.data?.email || 'No email'}</span>
                            <span>
                              {formatStudentSince(
                                studentDetailQuery.data?.first_seen_at || selectedBooking.created_at,
                                selectedBooking.status,
                                timeZone,
                              )}
                            </span>
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                            {wa && (
                              <span
                                style={{
                                  background: '#E8F6EE',
                                  border: '1px solid #BFE0CC',
                                  color: '#14532D',
                                  fontSize: '13px',
                                  fontWeight: 700,
                                  padding: '3px 12px',
                                  borderRadius: '999px',
                                }}
                              >
                                On WhatsApp
                              </span>
                            )}
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                fontSize: '13px',
                                fontWeight: 700,
                                padding: '3px 12px',
                                borderRadius: '999px',
                                backgroundColor: CHIP_STYLES[sChip.tone].bg,
                                borderColor: CHIP_STYLES[sChip.tone].border,
                                color: CHIP_STYLES[sChip.tone].color,
                                borderWidth: '1px',
                                borderStyle: 'solid',
                              }}
                            >
                              {sChip.label}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Header Actions */}
                      <div className="tt-header-actions">
                        {wa ? (
                          <a
                            href={wa}
                            target="_blank"
                            rel="noopener"
                            className="tt-btn-whatsapp"
                          >
                            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                              <path
                                d="M9 2a7 7 0 00-6 10.6L2 16l3.5-.9A7 7 0 109 2z"
                                fill="none"
                                stroke="#0B6B5C"
                                strokeWidth="1.6"
                                strokeLinejoin="round"
                              />
                            </svg>
                            Message on WhatsApp
                          </a>
                        ) : (
                          <button
                            type="button"
                            disabled
                            className="tt-btn-whatsapp"
                            title="Invalid or missing phone number"
                          >
                            No WhatsApp number
                          </button>
                        )}

                        {canRecord && (
                          <button
                            type="button"
                            onClick={handleOpenPayPanel}
                            className="tt-btn-record-pay"
                          >
                            Record payment
                          </button>
                        )}

                        {isWaiting && (
                          <button
                            type="button"
                            disabled
                            title="Seat offers are not available yet. Remove the student from the waiting list or message them on WhatsApp."
                            className="tt-btn-ink"
                          >
                            Offer seat (coming soon)
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* 2. "Also in:" Chips */}
                {otherClasses.length > 0 && (
                  <div className="tt-also-in-row">
                    <span className="tt-also-in-label">Also in:</span>
                    {otherClasses.map((oc) => (
                      <button
                        key={oc.classId}
                        type="button"
                        onClick={() => handleOtherClass(oc.classId)}
                        className="tt-also-in-chip"
                      >
                        {oc.title}
                      </button>
                    ))}
                  </div>
                )}

                {/* 3. Record Payment Panel */}
                {showPaymentPanel && (
                  <div className="tt-record-panel" role="region" aria-label="Record payment">
                    <div>
                      <div className="tt-record-title">Record a payment</div>
                      <div className="tt-record-desc">
                        For cash or transfers you received directly for {activeClass?.title}.
                        TuitEase takes no fee on these. Outstanding: {formatNaira(selectedDue)}.
                      </div>
                    </div>
                    <div className="tt-record-form-row">
                      <div style={{ flex: '1 1 160px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label htmlFor="p-amt" style={{ fontSize: '14px', fontWeight: 600 }}>
                          Amount (₦)
                        </label>
                        <input
                          id="p-amt"
                          className="inp"
                          type="number"
                          min="0"
                          max={selectedDue}
                          value={payAmount}
                          onChange={(e) => {
                            setPayAmount(e.target.value);
                            setPayError(null);
                          }}
                        />
                      </div>
                      <div style={{ flex: '1 1 160px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label htmlFor="p-method" style={{ fontSize: '14px', fontWeight: 600 }}>
                          How was it paid?
                        </label>
                        <select
                          id="p-method"
                          className="inp"
                          value={payMethod}
                          onChange={(e) => setPayMethod(e.target.value as 'Cash' | 'Bank transfer' | 'POS')}
                        >
                          <option value="Cash">Cash</option>
                          <option value="Bank transfer">Bank transfer</option>
                          <option value="POS">POS</option>
                        </select>
                      </div>
                      <div style={{ flex: '2 1 220px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label htmlFor="p-note" style={{ fontSize: '14px', fontWeight: 600 }}>
                          Note (optional)
                        </label>
                        <input
                          id="p-note"
                          className="inp"
                          type="text"
                          placeholder="e.g. Paid at the studio"
                          value={payNote}
                          onChange={(e) => setPayNote(e.target.value)}
                        />
                      </div>
                    </div>
                    <div style={{ color: '#5F5F66', fontSize: '13.5px' }}>
                      Only the amount is saved. The method and note stay on this screen for your
                      reference.
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
                      <button
                        type="button"
                        onClick={handleSavePayment}
                        disabled={payDisabled}
                        className="tt-btn-ink"
                      >
                        {isSubmittingPayment ? 'Saving…' : 'Save payment'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowPaymentPanel(false)}
                        style={{
                          minHeight: '48px',
                          padding: '0 18px',
                          border: '1px solid #CFC8BB',
                          background: '#FFFFFF',
                          borderRadius: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                      {payHint && (
                        <span style={{ color: '#9B1C1C', fontSize: '14px' }}>{payHint}</span>
                      )}
                    </div>
                    {payError && (
                      <div role="alert" className="tt-inline-error">
                        {payError}
                      </div>
                    )}
                  </div>
                )}

                {/* 4. Waiting List Card */}
                {selectedBooking.status === 'waitlisted' ? (
                  <>
                    <div className="tt-wait-card">
                    <div>
                      <div style={{ fontWeight: 800 }}>
                        On the waiting list.{' '}
                        {waitingList.findIndex((b) => b.id === selectedBooking.id) + 1} of{' '}
                        {waitingList.length}
                      </div>
                      <div style={{ fontSize: '14.5px' }}>
                        Seat offers are coming soon. Message them on WhatsApp in the meantime, or remove
                        them if they no longer want the place.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveWaitlist}
                      style={{
                        minHeight: '44px',
                        padding: '0 16px',
                        border: '1px solid #1B4F8A',
                        background: '#FFFFFF',
                        color: '#1B4F8A',
                        borderRadius: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Remove from list
                    </button>
                  </div>
                  {waitlistError && (
                    <div role="alert" className="tt-inline-error">
                      {waitlistError}
                    </div>
                  )}
                  </>
                ) : (
                  <>
                    {/* 5. Booked Student Content */}
                    {/* Stat Tiles */}
                    <div className="tt-stats-grid">
                      <div className="tt-stat-card">
                        <span className="tt-stat-card-label">Paid</span>
                        <span className="tt-stat-card-val">
                          {isFreeClass ? 'Free' : formatNaira(selectedPaid)}
                        </span>
                      </div>
                      <div className="tt-stat-card">
                        <span className="tt-stat-card-label">Outstanding</span>
                        <span className="tt-stat-card-val">
                          {isFreeClass ? 'None' : formatNaira(selectedDue)}
                        </span>
                      </div>
                      <div className="tt-stat-card">
                        <span className="tt-stat-card-label">Attended</span>
                        <span className="tt-stat-card-val">
                          {selectedAttRate.present} of {selectedAttRate.held}
                        </span>
                      </div>
                      <div className="tt-stat-card">
                        <span className="tt-stat-card-label">Missed</span>
                        <span className="tt-stat-card-val">{selectedAttRate.absent}</span>
                      </div>
                    </div>

                    {/* Tab Bar */}
                    <div role="tablist" aria-label="Student records" className="tt-tabs-row">
                      <button
                        type="button"
                        role="tab"
                        id="student-tab-booking"
                        aria-controls="student-panel-booking"
                        aria-selected={activeTab === 'booking'}
                        tabIndex={activeTab === 'booking' ? 0 : -1}
                        onKeyDown={(e) => handleTabKeyDown(e, 'booking')}
                        onClick={() => setActiveTab('booking')}
                        className={`tt-tab-btn ${activeTab === 'booking' ? 'is-active' : ''}`}
                      >
                        This class
                      </button>
                      {!isFreeClass && (
                        <button
                          type="button"
                          role="tab"
                          id="student-tab-payments"
                          aria-controls="student-panel-payments"
                          aria-selected={activeTab === 'payments'}
                          tabIndex={activeTab === 'payments' ? 0 : -1}
                          onKeyDown={(e) => handleTabKeyDown(e, 'payments')}
                          onClick={() => setActiveTab('payments')}
                          className={`tt-tab-btn ${activeTab === 'payments' ? 'is-active' : ''}`}
                        >
                          Payments
                        </button>
                      )}
                      <button
                        type="button"
                        role="tab"
                        id="student-tab-messages"
                        aria-controls="student-panel-messages"
                        aria-selected={activeTab === 'messages'}
                        tabIndex={activeTab === 'messages' ? 0 : -1}
                        onKeyDown={(e) => handleTabKeyDown(e, 'messages')}
                        onClick={() => setActiveTab('messages')}
                        className={`tt-tab-btn ${activeTab === 'messages' ? 'is-active' : ''}`}
                      >
                        Messages
                      </button>
                    </div>

                    {/* TAB 1: THIS CLASS */}
                    {activeTab === 'booking' && (
                      <div
                        className="tt-tab-card"
                        role="tabpanel"
                        id="student-panel-booking"
                        aria-labelledby="student-tab-booking"
                      >
                        {/* Payment section */}
                        {!isFreeClass ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div
                              style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                justifyContent: 'space-between',
                                gap: '8px',
                                fontSize: '14.5px',
                              }}
                            >
                              <span style={{ fontWeight: 700 }}>Payment</span>
                              <span style={{ color: '#4A4A50' }}>
                                {selectedDue === 0
                                  ? `Paid in full · ${formatNaira(classPrice)}`
                                  : `${formatNaira(selectedPaid)} paid of ${formatNaira(classPrice)} · ${formatNaira(selectedDue)} due`}
                              </span>
                            </div>
                            <div className="tt-progress-track" style={{ height: '8px' }}>
                              <div
                                className="tt-progress-bar"
                                style={{
                                  backgroundColor: selectedDue === 0 ? '#14532D' : '#CC4E32',
                                  width: `${Math.min(100, Math.round((selectedPaid / (classPrice || 1)) * 100))}%`,
                                }}
                              />
                            </div>

                            {/* Overdue alert */}
                            {selectedDue > 0 && activeClass?.status === 'live' && (
                              <div className="tt-overdue-box">
                                <div style={{ fontSize: '14.5px' }}>
                                  <strong>
                                    Next payment: {formatNaira(nextPaymentAmount)}
                                    {nextPaymentDue
                                      ? ` due ${formatDateShort(nextPaymentDue, timeZone)}`
                                      : ''}
                                    {nextPaymentOverdue ? ' (overdue)' : ''}
                                  </strong>
                                </div>
                                <button
                                  type="button"
                                  onClick={handleSendReminder}
                                  disabled={isSendingReminder}
                                  className="tt-btn-reminder"
                                >
                                  {isSendingReminder ? 'Sending…' : 'Send payment reminder'}
                                </button>
                              </div>
                            )}
                            {reminderError && (
                              <div role="alert" className="tt-inline-error">
                                {reminderError}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div style={{ color: '#5F5F66', fontSize: '14.5px' }}>
                            Free class. No payment needed.
                          </div>
                        )}

                        {/* Attendance section */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div
                            style={{
                              display: 'flex',
                              flexWrap: 'wrap',
                              justifyContent: 'space-between',
                              gap: '8px',
                              fontSize: '14.5px',
                            }}
                          >
                            <span style={{ fontWeight: 700 }}>Attendance</span>
                            <span style={{ color: '#4A4A50' }}>
                              {selectedAttRate.present} attended · {selectedAttRate.absent} missed ·{' '}
                              {selectedAttRate.upcoming} upcoming
                            </span>
                          </div>
                          <div className="tt-progress-track" style={{ height: '8px' }}>
                            <div
                              className="tt-progress-bar"
                              style={{
                                backgroundColor: '#CC4E32',
                                width: `${
                                  selectedAttRate.held > 0
                                    ? Math.round((selectedAttRate.present / selectedAttRate.held) * 100)
                                    : 0
                                }%`,
                              }}
                            />
                          </div>
                        </div>

                        {/* Sessions List */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <div style={{ fontWeight: 700 }}>Sessions</div>
                          {(classSessions || []).map((sess) => {
                            const held = isSessionHeld(sess);
                            const isPresent = (selectedBooking.session_attendance || []).some(
                              (a) => a.session_id === sess.id,
                            );
                            const isAbsent = held && !isPresent;
                            const statusLabel = held
                              ? isPresent
                                ? 'Present'
                                : 'Absent'
                              : 'Upcoming';
                            const statusTone = held ? (isPresent ? 'green' : 'red') : 'grey';

                            const where =
                              sess.venue || activeClass?.venue || sess.meeting_link || 'Online';

                            return (
                              <div key={sess.id} className="tt-session-row">
                                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                  <span style={{ fontWeight: 600, fontSize: '15px' }}>
                                    {formatDateTime(sess.starts_at, timeZone)}
                                  </span>
                                  <span style={{ color: '#5F5F66', fontSize: '13.5px' }}>{where}</span>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                                  <span
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      fontSize: '13px',
                                      fontWeight: 700,
                                      padding: '2px 10px',
                                      borderRadius: '999px',
                                      backgroundColor: CHIP_STYLES[statusTone].bg,
                                      borderColor: CHIP_STYLES[statusTone].border,
                                      color: CHIP_STYLES[statusTone].color,
                                      borderWidth: '1px',
                                      borderStyle: 'solid',
                                    }}
                                  >
                                    {statusLabel}
                                  </span>
                                  {held && (
                                    <>
                                      <button
                                        type="button"
                                        aria-pressed={isPresent}
                                        onClick={() => handleToggleAttendance(sess, true)}
                                        disabled={savingAttendanceId === sess.id}
                                        className={`tt-btn-attendance ${isPresent ? 'is-present' : ''}`}
                                      >
                                        Present
                                      </button>
                                      <button
                                        type="button"
                                        aria-pressed={isAbsent}
                                        onClick={() => handleToggleAttendance(sess, false)}
                                        disabled={savingAttendanceId === sess.id}
                                        className={`tt-btn-attendance ${isAbsent ? 'is-absent' : ''}`}
                                      >
                                        Absent
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                          {attendanceError && (
                            <div role="alert" className="tt-inline-error">
                              {attendanceError}
                            </div>
                          )}
                        </div>

                        {/* Booking Reference & Cancel Link */}
                        <div
                          style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            alignItems: 'center',
                            gap: '14px',
                            borderTop: '1px solid #EDE8DF',
                            paddingTop: '14px',
                            color: '#5F5F66',
                            fontSize: '14px',
                          }}
                        >
                          <span>Booking ref {selectedBooking.reference.slice(0, 8).toUpperCase()}</span>
                          <button
                            type="button"
                            onClick={() => setConfirmCancelOpen(true)}
                            style={{
                              minHeight: '40px',
                              padding: '0 6px',
                              border: 'none',
                              background: 'none',
                              color: '#9B1C1C',
                              fontWeight: 600,
                              cursor: 'pointer',
                              textDecoration: 'underline',
                            }}
                          >
                            Cancel booking
                          </button>
                        </div>
                      </div>
                    )}

                    {/* TAB 2: PAYMENTS */}
                    {activeTab === 'payments' && !isFreeClass && (
                      <div
                        className="tt-tab-card"
                        role="tabpanel"
                        id="student-panel-payments"
                        aria-labelledby="student-tab-payments"
                        style={{ padding: 0, overflow: 'hidden' }}
                      >
                        {hostPaymentsQuery.isLoading ? (
                          <div style={{ padding: '24px', color: '#5F5F66' }}>Loading payments…</div>
                        ) : hostPaymentsQuery.isError ? (
                          <div style={{ padding: '24px' }} role="alert">
                            <div className="tt-inline-error">
                              Could not load payments.{' '}
                              <button
                                type="button"
                                onClick={() => hostPaymentsQuery.refetch()}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  padding: 0,
                                  fontWeight: 700,
                                  color: '#9B1C1C',
                                  textDecoration: 'underline',
                                  cursor: 'pointer',
                                  font: 'inherit',
                                }}
                              >
                                Try again
                              </button>
                            </div>
                          </div>
                        ) : classPayments.length === 0 ? (
                          <div style={{ padding: '24px', color: '#5F5F66' }}>No payments yet.</div>
                        ) : (
                          classPayments.map((p) => {
                            const isManual = p.method === 'manual';
                            const amt = toNaira(p.amount);
                            const platformFee = toNaira(p.platform_fee);
                            const processingFee = toNaira(p.processing_fee);
                            const hostReceived = toNaira(p.host_receives);

                            const feeLine = isManual
                              ? 'Recorded by you, so no TuitEase fee.'
                              : `Paystack fee ${formatNaira(processingFee)} · TuitEase fee ${formatNaira(platformFee)} · You received ${formatNaira(hostReceived)}`;

                            return (
                              <div
                                key={p.id}
                                style={{
                                  padding: '18px 24px',
                                  borderBottom: '1px solid #EDE8DF',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '8px',
                                }}
                              >
                                <div
                                  style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    justifyContent: 'space-between',
                                    alignItems: 'baseline',
                                    gap: '8px',
                                  }}
                                >
                                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                    <span style={{ fontWeight: 700 }}>{activeClass?.title}</span>
                                    <span style={{ color: '#5F5F66', fontSize: '14px' }}>
                                      {p.paid_at ? formatDateShort(p.paid_at, timeZone) : 'Not paid'} ·{' '}
                                      {isManual ? 'Recorded by you' : 'Paystack'} · {p.reference}
                                    </span>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span
                                      style={{
                                        fontWeight: 800,
                                        fontSize: '20px',
                                        fontVariantNumeric: 'tabular-nums',
                                      }}
                                    >
                                      {formatNaira(amt)}
                                    </span>
                                    <span
                                      style={{
                                        display: 'inline-flex',
                                        fontSize: '13px',
                                        fontWeight: 700,
                                        padding: '3px 12px',
                                        borderRadius: '999px',
                                        background: '#E8F6EE',
                                        border: '1px solid #BFE0CC',
                                        color: '#14532D',
                                      }}
                                    >
                                      Paid
                                    </span>
                                  </div>
                                </div>
                                <div
                                  style={{
                                    color: '#4A4A50',
                                    fontSize: '14px',
                                    background: '#F8F6F2',
                                    borderRadius: '12px',
                                    padding: '8px 14px',
                                  }}
                                >
                                  {feeLine}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}

                    {/* TAB 3: MESSAGES */}
                    {activeTab === 'messages' && (
                      <div
                        className="tt-tab-card"
                        role="tabpanel"
                        id="student-panel-messages"
                        aria-labelledby="student-tab-messages"
                        style={{ padding: 0, overflow: 'hidden' }}
                      >
                        {studentMessagesQuery.isLoading ? (
                          <div style={{ padding: '24px', color: '#5F5F66' }}>Loading messages…</div>
                        ) : studentMessagesQuery.isError ? (
                          <div style={{ padding: '24px' }} role="alert">
                            <div className="tt-inline-error">
                              Could not load messages.{' '}
                              <button
                                type="button"
                                onClick={() => studentMessagesQuery.refetch()}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  padding: 0,
                                  fontWeight: 700,
                                  color: '#9B1C1C',
                                  textDecoration: 'underline',
                                  cursor: 'pointer',
                                  font: 'inherit',
                                }}
                              >
                                Try again
                              </button>
                            </div>
                          </div>
                        ) : classMessages.length === 0 ? (
                          <div style={{ padding: '24px', color: '#5F5F66' }}>
                            No automated messages sent yet.
                          </div>
                        ) : (
                          classMessages.map((m) => (
                            <div
                              key={m.id}
                              style={{
                                padding: '14px 24px',
                                borderBottom: '1px solid #EDE8DF',
                                display: 'flex',
                                flexWrap: 'wrap',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: '8px 16px',
                              }}
                            >
                              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                <span style={{ fontWeight: 700 }}>
                                  {m.kind.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                                </span>
                                <span style={{ color: '#5F5F66', fontSize: '14px' }}>
                                  {m.sent_at ? formatDateTime(m.sent_at, timeZone) : 'Scheduled'} ·{' '}
                                  {m.channel || 'WhatsApp'}
                                </span>
                              </div>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  fontSize: '13px',
                                  fontWeight: 700,
                                  padding: '3px 12px',
                                  borderRadius: '999px',
                                  background: m.status === 'sent' ? '#E8F6EE' : '#F3F0EA',
                                  border: `1px solid ${m.status === 'sent' ? '#BFE0CC' : '#E6E1D8'}`,
                                  color: m.status === 'sent' ? '#14532D' : '#4A4A50',
                                }}
                              >
                                {m.status === 'sent' ? 'Delivered' : m.status}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* 6. Notes Card (Always present for student) */}
                <div className="tt-notes-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label htmlFor="notes-textarea" style={{ fontWeight: 800, fontSize: '17px' }}>
                      Your notes about {firstName(selectedBooking.student_name)}
                    </label>
                    {notesSavedIndicator && (
                      <span style={{ fontSize: '13px', color: '#14532D', fontWeight: 600 }}>
                        Saved
                      </span>
                    )}
                  </div>
                  <textarea
                    id="notes-textarea"
                    className="inp"
                    rows={3}
                    placeholder="Only you can see these."
                    value={notes}
                    onChange={(e) => handleNotesChange(e.target.value)}
                    onBlur={handleNotesBlur}
                    style={{ resize: 'vertical' }}
                  />
                  <div style={{ color: '#5F5F66', fontSize: '13.5px' }}>
                    Private to you. Notes follow the student across all your classes. Students never
                    see them.
                  </div>
                </div>
              </>
            )}
          </div>
        </section>
      </main>

      {/* CONFIRMATION DIALOG: CANCEL BOOKING */}
      {confirmCancelOpen && selectedBooking && (
        <div
          className="tt-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-dialog-title"
        >
          <div className="tt-modal-card">
            <h3 id="cancel-dialog-title" style={{ margin: 0, fontWeight: 800, fontSize: '20px' }}>
              Cancel booking for {selectedBooking.student_name}?
            </h3>
            <p style={{ margin: 0, color: '#5F5F66', fontSize: '15px' }}>
              Are you sure you want to cancel this booking? This will release their seat in{' '}
              <strong>{activeClass?.title}</strong> and stop any upcoming reminders.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => setConfirmCancelOpen(false)}
                disabled={isCancellingBooking}
                style={{
                  minHeight: '44px',
                  padding: '0 16px',
                  border: '1px solid #CFC8BB',
                  background: '#FFFFFF',
                  borderRadius: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Keep booking
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={isCancellingBooking}
                style={{
                  minHeight: '44px',
                  padding: '0 16px',
                  border: 'none',
                  background: '#9B1C1C',
                  color: '#FFFFFF',
                  borderRadius: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {isCancellingBooking ? 'Cancelling…' : 'Yes, cancel booking'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
