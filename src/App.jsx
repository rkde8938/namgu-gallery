import { useEffect, useMemo, useRef, useState } from 'react';
import Lightbox from 'yet-another-react-lightbox';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import 'yet-another-react-lightbox/styles.css';
import Fullscreen from 'yet-another-react-lightbox/plugins/fullscreen';
import './index.css';

const API_ORIGIN = import.meta.env.DEV
	? 'http://localhost:8000' // dev에서는 PHP 서버로 직접
	: ''; // 배포 후엔 같은 도메인(ulsan-namgu.com)

async function fetchJson(path, options = {}) {
	// path는 "/api/gallery/events.php" 처럼 넘길 거야
	const url = `${API_ORIGIN}${path}`;

	const res = await fetch(url, {
		credentials: 'include',
		...options,
	});

	const text = await res.text();

	try {
		return JSON.parse(text);
	} catch (err) {
		console.error('❌ JSON parse 실패:', url);
		console.error('응답 원본:', text);
		throw new Error(`JSON 응답 파싱 실패 (${url})`);
	}
}

function getEventIdFromUrl() {
	const params = new URLSearchParams(window.location.search);
	return params.get('event');
}

export default function App() {
	const [events, setEvents] = useState({});
	const [eventsLoading, setEventsLoading] = useState(true);
	const [eventsError, setEventsError] = useState(null);

	const [admin, setAdmin] = useState(null);
	const [checkingAdmin, setCheckingAdmin] = useState(true);

	const [openIndex, setOpenIndex] = useState(-1);

	const eventId = useMemo(() => getEventIdFromUrl(), []);
	const eventEntries = Object.entries(events || {});
	const eventData = eventId ? events[eventId] : null;

	const viewSentRef = useRef(false);

	useEffect(() => {
		if (!eventId || !eventData) return;
		if (viewSentRef.current) return;
		viewSentRef.current = true;

		(async () => {
			try {
				await fetchJson('/api/gallery/view_event.php', {
					method: 'POST',
					body: new URLSearchParams({ event_id: eventId }),
				});
			} catch (e) {
				console.warn('view_event 실패(무시 가능):', e);
			}
		})();
	}, [eventId, eventData]);

	// 🔹 /admin 또는 /gallery/admin 같은 경로인지 체크
	const isAdminRoute = window.location.pathname.includes('admin');

	// 🔹 관리자 페이지에서 "새 행사 추가" 모달 열기 여부
	const [showNewEventModal, setShowNewEventModal] = useState(false);

	// 이벤트 목록 불러오기
	useEffect(() => {
		async function loadEvents() {
			try {
				const data = await fetchJson('/api/gallery/events.php');
				if (!data.ok) throw new Error(data.error || '이벤트 로드 실패');
				setEvents(data.events || {});
			} catch (err) {
				setEventsError(err.message);
			} finally {
				setEventsLoading(false);
			}
		}
		loadEvents();
	}, []);

	// 관리자 로그인 상태 확인
	useEffect(() => {
		async function checkAdmin() {
			try {
				const data = await fetchJson('/api/gallery/me.php');
				if (data.ok && data.admin) {
					setAdmin(data.admin);
				} else {
					setAdmin(null);
				}
			} catch (err) {
				setAdmin(null);
			} finally {
				setCheckingAdmin(false);
			}
		}
		checkAdmin();
	}, []);

	const slides = eventData
		? eventData.photos.map((p) => ({
				src: p.full || p.thumb,
				alt: p.alt,
		  }))
		: [];

	// 🔹 1) 이벤트 로딩 중
	if (eventsLoading) {
		return (
			<div className="page">
				<header className="header">
					<h1 className="title">공업탑 행사 갤러리</h1>
					<p className="meta text-sm text-slate-300">행사 정보를 불러오는 중입니다…</p>
				</header>

				<main className="flex-1 flex items-center justify-center">
					<div className="rounded-lg border border-slate-700/60 bg-slate-900/40 px-4 py-3 text-sm text-slate-200">
						로딩 중…
					</div>
				</main>
			</div>
		);
	}

	// 🔹 2) 이벤트 로딩 오류
	if (eventsError) {
		return (
			<div className="page">
				<header className="header">
					<h1 className="title">공업탑 행사 갤러리</h1>
					<p className="meta text-sm text-red-300">목록을 불러오는 중 오류가 발생했습니다.</p>
				</header>

				<main className="mt-4">
					<div className="rounded-lg border border-red-700/70 bg-red-900/30 px-4 py-3 text-sm text-red-100">
						{eventsError}
					</div>
				</main>
			</div>
		);
	}

	// 🔹 3) 관리자 페이지 (/admin 경로)
	if (isAdminRoute) {
		return (
			<div className="page">
				<header className="header">
					<div className="flex items-start justify-between gap-3">
						<div>
							<h1 className="title">공업탑 행사 갤러리 · 관리자</h1>
							<p className="meta text-xs md:text-sm">
								행사를 업로드하고, 이미지 / 메모 / QR 링크를 관리할 수 있습니다.
							</p>
						</div>

						<p className="notice text-xs md:text-sm">
							<a href="/" className="link-back">
								← 일반 갤러리로 돌아가기
							</a>
						</p>
					</div>
				</header>

				<main className="admin-main mt-4 space-y-4">
					{/* 상단: 로그인 카드 */}
					<LoginPanel admin={admin} setAdmin={setAdmin} />

					{/* 하단: 이벤트 관리 리스트 + 새 행사 모달 */}
					{admin && (
						<>
							<AdminEventManager
								events={events}
								setEvents={setEvents}
								onClickNewEvent={() => setShowNewEventModal(true)}
							/>

							{showNewEventModal && (
								<AdminNewEventModal
									onClose={() => setShowNewEventModal(false)}
									onUploaded={(newEvents) => {
										setEvents(newEvents);
										setShowNewEventModal(false);
									}}
								/>
							)}
						</>
					)}
				</main>
			</div>
		);
	}

	// 🔹 4) 메인 목록 화면 (event 파라미터 없음 + 일반 경로)
	if (!eventId && !isAdminRoute) {
		return (
			<div className="page">
				<header className="header">
					<div className="header-text flex items-start justify-between gap-3">
						<div>
							<h1 className="title">공업탑 행사 갤러리</h1>
							<p className="meta text-xs md:text-sm text-slate-300">아래에서 행사를 선택해서 사진을 볼 수 있습니다.</p>
						</div>

						<p className="notice text-xs md:text-sm text-right">
							{/* 상대 경로 "admin" → /gallery/ 기준 /gallery/admin, dev에선 /admin */}
							<a href="admin" className="link-back">
								관리자 페이지로 이동
							</a>
						</p>
					</div>
				</header>

				<main className="event-list mt-3">
					{eventEntries.map(([id, ev]) => {
						const firstPhoto = ev.photos?.[0];
						const thumbSrc = firstPhoto ? firstPhoto.thumb || firstPhoto.full : null;

						return (
							<a key={id} href={`?event=${id}`} className="event-card">
								<div className="event-card-thumb">
									{thumbSrc ? (
										<img
											src={thumbSrc}
											alt={firstPhoto?.alt || ev.title}
											loading="lazy"
											decoding="async"
											className="w-full h-full object-cover"
										/>
									) : (
										<div className="event-card-thumb-fallback">No Image</div>
									)}
								</div>

								<div className="event-card-body">
									<h2 className="event-card-title">{ev.title}</h2>
								</div>
							</a>
						);
					})}
				</main>
			</div>
		);
	}

	/* 2) event 파라미터는 있는데, 매칭되는 행사가 없는 경우 */
	if (eventId && !eventData) {
		return (
			<div className="page">
				<header className="header">
					<h1 className="title">공업탑 행사 갤러리</h1>
					<p className="meta">해당 행사 정보를 찾을 수 없습니다.</p>
				</header>
				<main style={{ marginTop: '32px' }}>
					<p className="notice">
						<a href="/" className="link-back">
							행사 목록으로 돌아가기
						</a>
					</p>
				</main>
			</div>
		);
	}

	/* 3) 정상 event → 갤러리 */
	return (
		<div className="page">
			<header className="header">
				<div className="header-text flex justify-between gap-3">
					<div>
						<h1 className="title">{eventData.title}</h1>
						{/* <span className="text-xs text-slate-400">조회수 {Number(eventData.views || 0)}회</span> */}
						<p className="meta text-xs md:text-sm text-slate-300">사진 {eventData.photos?.length ?? 0}장</p>
					</div>

					{/* <a href="/" className="link-back text-xs md:text-sm">
						← 행사 목록으로
					</a> */}
				</div>
			</header>

			<main className="grid mt-3">
				{eventData.photos.map((photo, idx) => (
					<button key={photo.full || photo.thumb || idx} className="thumb" onClick={() => setOpenIndex(idx)}>
						{/* 썸네일 안쪽 래퍼 + 오버레이 (다른 곳이랑 통일) */}
						<div className="thumb-inner">
							<img
								src={photo.thumb || photo.full}
								alt={photo.alt}
								loading="lazy"
								decoding="async"
								className="thumb-img w-full h-full object-cover"
							/>
							{/* hover 시 살짝 하얀 오버레이 */}
							<div className="thumb-hover" />
						</div>
					</button>
				))}
			</main>

			<Lightbox
				open={openIndex >= 0}
				index={openIndex}
				close={() => setOpenIndex(-1)}
				slides={slides}
				plugins={[Fullscreen, Zoom]}
				controller={{
					closeOnBackdropClick: true,
					closeOnPullDown: true,
				}}
				zoom={
					{
						// 옵션은 필요할 때만(기본값으로도 핀치줌 됨)
						// maxZoomPixelRatio: 2,
						// scrollToZoom: true, // 트랙패드/마우스 스크롤로 줌
					}
				}
			/>
		</div>
	);
}

/* ----- 밑은 로그인/업로드 컴포넌트 ----- */

function LoginPanel({ admin, setAdmin }) {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState('');

	async function handleLogin(e) {
		e.preventDefault();
		setBusy(true);
		setError('');

		try {
			const data = await fetchJson('/api/gallery/login.php', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, password }),
			});

			if (!data.ok) {
				throw new Error(data.error || '로그인 실패');
			}

			setAdmin(data.admin);
			setPassword('');
		} catch (err) {
			setError(err.message);
		} finally {
			setBusy(false);
		}
	}

	async function handleLogout() {
		try {
			await fetchJson('/api/gallery/logout.php', {
				method: 'POST',
			});
		} catch (e) {
			// 로그아웃 응답이 실패해도 일단 클라이언트 상태는 비워버리고 싶으면 그냥 무시해도 됨
			console.warn('logout 요청 실패 (무시 가능):', e);
		}
		setAdmin(null);
	}

	return (
		<section className="admin-upload p-4 rounded-lg bg-slate-900/40 border border-slate-700/50">
			<h2 className="admin-title mb-2 text-lg font-semibold text-white">관리자</h2>

			{/* 로그인됨 */}
			{admin ? (
				<div className="space-y-3">
					<p className="admin-desc text-slate-300 text-sm">
						<span className="font-medium text-slate-100">{admin.email}</span> 로 로그인됨
					</p>

					<button className="admin-submit w-full sm:w-auto" type="button" onClick={handleLogout}>
						로그아웃
					</button>
				</div>
			) : (
				/* 로그인 필요 */
				<div className="space-y-4">
					<p className="admin-desc text-sm text-slate-300">행사 업로드를 하려면 관리자 로그인이 필요합니다.</p>

					<form className="admin-form flex flex-col gap-4" onSubmit={handleLogin}>
						{/* 이메일 */}
						<div className="admin-row flex flex-col">
							<label className="flex flex-col gap-1 text-sm text-slate-100">
								<span className="text-slate-200 text-xs font-medium">이메일</span>
								<input
									type="text"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									placeholder="관리자 이메일"
									className="admin-input"
								/>
							</label>
						</div>

						{/* 비밀번호 */}
						<div className="admin-row flex flex-col">
							<label className="flex flex-col gap-1 text-sm text-slate-100">
								<span className="text-slate-200 text-xs font-medium">비밀번호</span>
								<input
									type="password"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									placeholder="비밀번호"
									className="admin-input"
								/>
							</label>
						</div>

						{/* 에러 메시지 */}
						{error && (
							<p className="admin-files text-red-300 text-xs bg-red-900/30 border border-red-700 px-3 py-2 rounded">
								{error}
							</p>
						)}

						{/* 로그인 버튼 */}
						<button className="admin-submit w-full sm:w-auto" type="submit" disabled={busy}>
							{busy ? '로그인 중...' : '로그인'}
						</button>
					</form>
				</div>
			)}
		</section>
	);
}

function AdminUploadForm({ onUploaded }) {
	const [eventId, setEventId] = useState('');
	const [title, setTitle] = useState('');
	const [files, setFiles] = useState([]);
	const [busy, setBusy] = useState(false);
	const [msg, setMsg] = useState('');

	const handleFileChange = (e) => {
		const fileList = Array.from(e.target.files || []);
		setFiles(fileList);
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		setMsg('');

		if (!eventId.trim() || !title.trim()) {
			setMsg('event ID와 제목은 필수입니다.');
			return;
		}
		if (files.length === 0) {
			setMsg('이미지를 한 장 이상 선택해 주세요.');
			return;
		}

		setBusy(true);

		try {
			const formData = new FormData();
			formData.append('event_id', eventId.trim());
			formData.append('title', title.trim());

			files.forEach((file) => {
				formData.append('photos[]', file);
			});

			const data = await fetchJson('/api/gallery/upload_event.php', {
				method: 'POST',
				body: formData,
			});

			if (!data.ok) throw new Error(data.error || '업로드 실패');

			onUploaded && onUploaded(data.events);

			setMsg('업로드 완료! 위 행사 목록에 반영되었습니다.');
			setFiles([]);
		} catch (err) {
			setMsg(err.message);
		} finally {
			setBusy(false);
		}
	};

	return (
		<section className="admin-upload mt-4">
			{/* 헤더 */}
			<div className="flex items-center justify-between mb-3">
				<div>
					<h2 className="admin-title text-base font-semibold text-white">[관리자] 새 행사 업로드</h2>
					<p className="admin-desc text-xs text-slate-300">
						event ID, 행사 정보, 이미지를 선택하면 서버에 저장되고
						<br />
						행사 목록에 즉시 반영됩니다.
					</p>
				</div>
			</div>

			<form className="admin-form space-y-4" onSubmit={handleSubmit}>
				{/* event ID + 제목 두 줄 */}
				<div className="admin-row grid gap-3 sm:grid-cols-2">
					<label className="flex flex-col gap-1 text-sm text-slate-100">
						<span className="text-xs font-medium text-slate-200">event ID</span>
						<input
							type="text"
							placeholder="예: namgu2025_festival"
							value={eventId}
							onChange={(e) => setEventId(e.target.value)}
							className="admin-input"
						/>
						<span className="text-[11px] text-slate-400">
							URL 및 QR 파라미터로 사용됩니다. 소문자/숫자/밑줄/하이픈 권장.
						</span>
					</label>

					<label className="flex flex-col gap-1 text-sm text-slate-100">
						<span className="text-xs font-medium text-slate-200">행사 제목</span>
						<input
							type="text"
							placeholder="예: 공업탑 거리 축제 2025"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							className="admin-input"
						/>
					</label>
				</div>

				{/* 이미지 업로드 + 선택 파일 표시 */}
				<div className="admin-row flex flex-col gap-2">
					<div className="flex flex-col md:flex-row md:items-end gap-2 w-full">
						<label className="flex-1 flex flex-col gap-1 text-sm text-slate-100">
							<span className="text-xs font-medium text-slate-200">이미지 파일 (여러 장 선택 가능)</span>
							<input type="file" accept="image/*" multiple onChange={handleFileChange} className="admin-input" />
						</label>

						<button type="submit" className="admin-submit md:self-stretch md:px-5" disabled={busy}>
							{busy ? '업로드 중...' : '행사 업로드'}
						</button>
					</div>

					{files.length > 0 && (
						<p className="admin-files text-xs text-slate-300">선택된 파일: {files.map((f) => f.name).join(', ')}</p>
					)}
				</div>

				{/* 메시지 */}
				{msg && (
					<p className="admin-files text-xs text-slate-200 bg-slate-800/70 border border-slate-600 rounded px-3 py-2">
						{msg}
					</p>
				)}
			</form>
		</section>
	);
}

function AdminNewEventModal({ onClose, onUploaded }) {
	const [eventId, setEventId] = useState('');
	const [title, setTitle] = useState('');
	const [files, setFiles] = useState([]);
	const [busy, setBusy] = useState(false);
	const [msg, setMsg] = useState('');

	const handleFileChange = (e) => {
		const fileList = Array.from(e.target.files || []);
		setFiles(fileList);
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		setMsg('');

		if (!eventId.trim() || !title.trim()) {
			setMsg('event ID와 제목은 필수입니다.');
			return;
		}
		if (files.length === 0) {
			setMsg('이미지를 한 장 이상 선택해 주세요.');
			return;
		}

		setBusy(true);

		try {
			const formData = new FormData();
			formData.append('event_id', eventId.trim());
			formData.append('title', title.trim());
			// date/location은 사용 X

			files.forEach((file) => {
				formData.append('photos[]', file);
			});

			const data = await fetchJson('/api/gallery/upload_event.php', {
				method: 'POST',
				body: formData,
			});

			if (!data.ok) throw new Error(data.error || '업로드 실패');

			onUploaded && onUploaded(data.events);
			setMsg('업로드 완료! 행사 목록에 반영되었습니다.');
			setFiles([]);
			setEventId('');
			setTitle('');
		} catch (err) {
			setMsg(err.message);
		} finally {
			setBusy(false);
		}
	};

	return (
		<div className="admin-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
			<div className="admin-modal w-full max-w-lg rounded-xl bg-slate-900 border border-slate-700/70 shadow-2xl p-6">
				{/* 헤더 */}
				<div className="flex items-start justify-between gap-4 mb-4">
					<div>
						<h2 className="admin-title text-lg font-semibold text-white mb-1">새 행사 추가</h2>
						<p className="admin-desc text-xs text-slate-300">
							event ID와 제목, 이미지를 선택해서 새 행사를 등록합니다.
						</p>
					</div>
					<button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-100 text-sm">
						닫기 ✕
					</button>
				</div>

				<form className="admin-form space-y-4" onSubmit={handleSubmit}>
					{/* event ID */}
					<div className="admin-row">
						<label className="flex flex-col gap-1 text-sm text-slate-100 w-full">
							<span className="text-xs font-medium text-slate-200">event ID</span>
							<input
								type="text"
								placeholder="예: namgu2025_festival"
								value={eventId}
								onChange={(e) => setEventId(e.target.value)}
								className="admin-input"
							/>
							<span className="text-[11px] text-slate-400">
								URL 및 QR 파라미터로 사용됩니다. 소문자/숫자/밑줄/하이픈 권장.
							</span>
						</label>
					</div>

					{/* 행사 제목 */}
					<div className="admin-row">
						<label className="flex flex-col gap-1 text-sm text-slate-100 w-full">
							<span className="text-xs font-medium text-slate-200">행사 제목</span>
							<input
								type="text"
								placeholder="예: 공업탑 거리 축제 2025"
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								className="admin-input"
							/>
						</label>
					</div>

					{/* 이미지 업로드 */}
					<div className="admin-row">
						<div className="w-full flex flex-col gap-2">
							<label className="flex flex-col gap-1 text-sm text-slate-100">
								<span className="text-xs font-medium text-slate-200">이미지 파일 (여러 장 선택 가능)</span>
								<input type="file" accept="image/*" multiple onChange={handleFileChange} className="admin-input" />
							</label>

							{files.length > 0 && (
								<p className="admin-files text-xs text-slate-300">선택된 파일: {files.map((f) => f.name).join(', ')}</p>
							)}
						</div>
					</div>

					{/* 메시지 */}
					{msg && (
						<p className="admin-files text-xs text-slate-200 bg-slate-800/70 border border-slate-600 rounded px-3 py-2">
							{msg}
						</p>
					)}

					{/* 버튼 영역 */}
					<div className="flex justify-end gap-2 pt-2">
						<button
							type="button"
							className="admin-submit bg-slate-700/70 hover:bg-slate-600"
							onClick={onClose}
							disabled={busy}
						>
							닫기
						</button>
						<button type="submit" className="admin-submit" disabled={busy}>
							{busy ? '업로드 중...' : '등록'}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}

function FilePicker({
	id,
	multiple = false,
	accept = 'image/*',
	files = [],
	onChange,
	buttonText = '이미지 선택',
	helpText = '여러 장 선택 가능',
}) {
	const inputId = id || `file-${Math.random().toString(36).slice(2)}`;

	return (
		<div className="w-full">
			<div className="flex flex-col sm:flex-row sm:items-center gap-2">
				{/* 실제 input은 숨김 */}
				<input id={inputId} type="file" accept={accept} multiple={multiple} onChange={onChange} className="hidden" />

				{/* 버튼처럼 보이는 라벨 */}
				<label
					htmlFor={inputId}
					className="
            inline-flex items-center justify-center
            rounded-lg border border-slate-700/70
            bg-slate-900/60 hover:bg-slate-900/80
            px-4 py-2 text-sm font-medium text-slate-100
            cursor-pointer select-none
            transition
            focus:outline-none focus:ring-2 focus:ring-slate-400/60
            whitespace-nowrap
          "
				>
					{buttonText}
				</label>

				<div className="text-xs text-slate-400">
					{files?.length ? <span className="text-slate-200">{files.length}개 선택됨</span> : <span>{helpText}</span>}
				</div>
			</div>

			{/* 선택된 파일 목록 */}
			{files?.length > 0 && (
				<div className="mt-2 rounded-lg border border-slate-700/60 bg-slate-950/20 px-3 py-2">
					<ul className="space-y-1 text-xs text-slate-200">
						{files.map((f) => (
							<li key={f.name} className="flex items-center justify-between gap-2">
								<span className="truncate">{f.name}</span>
								<span className="shrink-0 text-slate-400">{(f.size / 1024 / 1024).toFixed(2)}MB</span>
							</li>
						))}
					</ul>
				</div>
			)}
		</div>
	);
}

function AdminEventManager({ events, setEvents, onClickNewEvent }) {
	const [noteDrafts, setNoteDrafts] = useState({});
	const [uploadFiles, setUploadFiles] = useState({});
	const [activeEventId, setActiveEventId] = useState(null);
	const [photoOrderDrafts, setPhotoOrderDrafts] = useState({});
	const [photoRenderLimitByEvent, setPhotoRenderLimitByEvent] = useState({});

	const [dirtyEvents, setDirtyEvents] = useState({});
	// 드래그 상태
	const [dragInfo, setDragInfo] = useState({ eventId: null, index: null });

	// AdminEventManager 내부 (다른 useState들이랑 같은 레벨)
	const [unitByEvent, setUnitByEvent] = useState({}); // day | week | month | year

	const entries = Object.entries(events || {});

	const QR_BASE_PROD = 'https://ulsan-namgu.com/gallery';
	const QR_BASE_DEV = 'http://localhost:5173';
	const qrBaseUrl = import.meta.env.DEV ? QR_BASE_DEV : QR_BASE_PROD;

	const [rangeFromByEvent, setRangeFromByEvent] = useState({});
	const [rangeToByEvent, setRangeToByEvent] = useState({});

	// 편집 모드 진입할 때 draft 초기화
	function openEditor(eventId) {
		const ev = events[eventId];
		if (!ev) return;

		const basePhotos = ev.photos || [];
		const initialOrder = basePhotos.map((_, idx) => idx);

		setNoteDrafts((prev) => ({
			...prev,
			[eventId]: ev.note || '',
		}));

		setPhotoOrderDrafts((prev) => ({
			...prev,
			[eventId]: initialOrder,
		}));

		setDirtyEvents((prev) => ({
			...prev,
			[eventId]: false,
		}));

		setActiveEventId(eventId);

		setUnitByEvent((p) => ({ ...p, [eventId]: p[eventId] || 'day' }));

		const today = isoDate();
		setRangeToByEvent((p) => ({ ...p, [eventId]: p[eventId] || today }));
		setRangeFromByEvent((p) => ({ ...p, [eventId]: p[eventId] || addDays(today, -6) })); // 기본 최근7일
		setPhotoRenderLimitByEvent((p) => ({ ...p, [eventId]: p[eventId] || 60 })); // 처음엔 60장만 렌더
	}

	// 편집 패널 열고 닫기 + 저장 안 된 변경 경고
	function toggleActive(id) {
		if (activeEventId === id) {
			// 닫으려는 경우
			if (dirtyEvents[id]) {
				const ok = window.confirm('저장하지 않은 변경사항이 있습니다. 그래도 닫을까요?');
				if (!ok) return;
			}
			setActiveEventId(null);
			return;
		}

		// 다른 이벤트로 넘어갈 때, 현재 열린 것에 변경사항이 있으면 경고
		if (activeEventId && dirtyEvents[activeEventId]) {
			const ok = window.confirm('현재 편집 중인 내용이 저장되지 않았습니다. 계속할까요?');
			if (!ok) return;
		}

		openEditor(id);
	}

	// 메모 입력 → draft만 변경 + dirty 표시
	function handleNoteChange(eventId, value) {
		setNoteDrafts((prev) => ({
			...prev,
			[eventId]: value,
		}));
		setDirtyEvents((prev) => ({
			...prev,
			[eventId]: true,
		}));
	}

	async function handleDeleteEvent(eventId) {
		if (!window.confirm('정말 이 행사를 모두 삭제할까요? (이미지도 함께 삭제됩니다)')) return;

		try {
			const data = await fetchJson('/api/gallery/delete_event.php', {
				method: 'POST',
				body: new URLSearchParams({ event_id: eventId }),
			});
			if (!data.ok) throw new Error(data.error || '삭제 실패');
			setEvents(data.events || {});
		} catch (err) {
			alert(err.message);
		}
	}

	// 이미지 삭제는 즉시 서버 반영
	async function handleDeletePhoto(eventId, originalIndex) {
		if (!window.confirm('이 이미지를 삭제할까요?')) return;

		try {
			const data = await fetchJson('/api/gallery/delete_photo.php', {
				method: 'POST',
				body: new URLSearchParams({
					event_id: eventId,
					photo_index: String(originalIndex),
				}),
			});
			if (!data.ok) throw new Error(data.error || '이미지 삭제 실패');

			const newEvents = data.events || {};
			setEvents(newEvents);

			// 삭제 후 순서 draft를 현재 사진 개수 기준으로 재초기화
			const newPhotos = newEvents[eventId]?.photos || [];
			const newOrder = newPhotos.map((_, idx) => idx);
			setPhotoOrderDrafts((prev) => ({
				...prev,
				[eventId]: newOrder,
			}));
			setDirtyEvents((prev) => ({
				...prev,
				[eventId]: false,
			}));
		} catch (err) {
			alert(err.message);
		}
	}

	function handleFileChangeForEvent(eventId, e) {
		const files = Array.from(e.target.files || []);
		setUploadFiles((prev) => ({
			...prev,
			[eventId]: files,
		}));
	}

	// 이미지 추가 업로드는 즉시 서버 반영
	async function handleAddPhotos(eventId, ev) {
		const files = uploadFiles[eventId] || [];
		if (files.length === 0) {
			alert('추가할 이미지를 선택해 주세요.');
			return;
		}

		const oldPhotos = events[eventId]?.photos || [];
		const oldLen = oldPhotos.length;

		try {
			const formData = new FormData();
			formData.append('event_id', eventId);
			formData.append('title', ev.title || eventId);

			files.forEach((file) => {
				formData.append('photos[]', file);
			});

			const data = await fetchJson('/api/gallery/upload_event.php', {
				method: 'POST',
				body: formData,
			});

			if (!data.ok) throw new Error(data.error || '이미지 추가 실패');

			const newEvents = data.events || {};
			setEvents(newEvents);
			setUploadFiles((prev) => ({
				...prev,
				[eventId]: [],
			}));

			// 새로 추가된 이미지 인덱스를 순서 draft에 붙여주기
			const newPhotos = newEvents[eventId]?.photos || [];
			const newLen = newPhotos.length;
			if (newLen > oldLen) {
				setPhotoOrderDrafts((prev) => {
					const prevOrder = prev[eventId] || oldPhotos.map((_, idx) => idx);
					const extended = [...prevOrder];
					for (let i = oldLen; i < newLen; i++) {
						extended.push(i);
					}
					return {
						...prev,
						[eventId]: extended,
					};
				});
			}

			alert('이미지 추가 완료!');
		} catch (err) {
			alert(err.message);
		}
	}

	// 드래그 시작
	function handleDragStart(eventId, index) {
		setDragInfo({ eventId, index });
	}

	// 드래그 중(드롭 허용 위해 preventDefault)
	function handleDragOver(e, eventId, index) {
		if (dragInfo.eventId !== eventId) return;
		e.preventDefault();
	}

	// 드래그 종료(밖에 드랍된 경우도 초기화)
	function handleDragEnd() {
		setDragInfo({ eventId: null, index: null });
	}

	// fromIndex → toIndex로 재배열
	function reorderDraft(eventId, fromIndex, toIndex) {
		setPhotoOrderDrafts((prev) => {
			const basePhotos = events[eventId]?.photos || [];
			const current = prev[eventId] || basePhotos.map((_, idx) => idx);

			if (fromIndex < 0 || fromIndex >= current.length || toIndex < 0 || toIndex >= current.length) {
				return prev;
			}

			const arr = [...current];
			const [moved] = arr.splice(fromIndex, 1);
			arr.splice(toIndex, 0, moved);

			return {
				...prev,
				[eventId]: arr,
			};
		});

		setDirtyEvents((prev) => ({
			...prev,
			[eventId]: true,
		}));
	}

	// 드랍 시 순서 변경
	function handleDrop(eventId, toIndex) {
		if (dragInfo.eventId !== eventId || dragInfo.index == null) return;
		if (dragInfo.index === toIndex) return;
		reorderDraft(eventId, dragInfo.index, toIndex);
		setDragInfo({ eventId: null, index: null });
	}

	// draft를 서버에 저장 (순서 + 메모)
	async function handleSave(eventId) {
		const ev = events[eventId];
		if (!ev) return;

		const basePhotos = ev.photos || [];
		const order = photoOrderDrafts[eventId] || basePhotos.map((_, idx) => idx);
		const orderedPhotos = order.map((idx) => basePhotos[idx]).filter(Boolean);
		const note = noteDrafts[eventId] ?? '';

		try {
			// 1) 사진 순서 저장
			const orderPayload = new URLSearchParams();
			orderPayload.append('event_id', eventId);
			orderPayload.append('photos_json', JSON.stringify(orderedPhotos));

			const orderRes = await fetchJson('/api/gallery/update_photo_order.php', {
				method: 'POST',
				body: orderPayload,
			});
			if (!orderRes.ok) throw new Error(orderRes.error || '이미지 순서 저장 실패');

			// 2) 메모 저장
			const metaPayload = new URLSearchParams();
			metaPayload.append('event_id', eventId);
			metaPayload.append('note', note);

			const metaRes = await fetchJson('/api/gallery/update_event_meta.php', {
				method: 'POST',
				body: metaPayload,
			});
			if (!metaRes.ok) throw new Error(metaRes.error || '메모 저장 실패');

			const newEvents = metaRes.events || orderRes.events || events;
			setEvents(newEvents);

			// 저장 후 draft를 현재 상태 기준으로 다시 초기화
			const newPhotos = newEvents[eventId]?.photos || [];
			const newOrder = newPhotos.map((_, idx) => idx);

			setPhotoOrderDrafts((prev) => ({
				...prev,
				[eventId]: newOrder,
			}));
			setNoteDrafts((prev) => ({
				...prev,
				[eventId]: newEvents[eventId]?.note || '',
			}));
			setDirtyEvents((prev) => ({
				...prev,
				[eventId]: false,
			}));

			alert('저장되었습니다.');
		} catch (err) {
			alert(err.message);
		}
	}

	// 변경 취소 → 서버 상태 기준으로 draft 재설정
	function handleReset(eventId) {
		const ev = events[eventId];
		if (!ev) return;

		const basePhotos = ev.photos || [];
		const initialOrder = basePhotos.map((_, idx) => idx);

		setPhotoOrderDrafts((prev) => ({
			...prev,
			[eventId]: initialOrder,
		}));
		setNoteDrafts((prev) => ({
			...prev,
			[eventId]: ev.note || '',
		}));
		setDirtyEvents((prev) => ({
			...prev,
			[eventId]: false,
		}));
	}

	function isoDate(d = new Date()) {
		const y = d.getFullYear();
		const m = String(d.getMonth() + 1).padStart(2, '0');
		const day = String(d.getDate()).padStart(2, '0');
		return `${y}-${m}-${day}`;
	}

	function addDays(dateStr, days) {
		const [y, m, d] = dateStr.split('-').map(Number);
		const dt = new Date(y, m - 1, d); // 로컬 기준 날짜
		dt.setDate(dt.getDate() + days);
		return isoDate(dt);
	}

	function rangeByUnit(today, unit) {
		if (unit === 'day') {
			return { from: addDays(today, -6), to: today };
		}
		if (unit === 'week') {
			return { from: addDays(today, -7 * 7), to: today }; // 8주
		}
		if (unit === 'month') {
			const d = new Date(today + 'T00:00:00');
			d.setMonth(d.getMonth() - 11);
			return { from: isoDate(d), to: today };
		}
		if (unit === 'year') {
			const d = new Date(today + 'T00:00:00');
			d.setFullYear(d.getFullYear() - 4);
			return { from: isoDate(d), to: today };
		}
		return { from: addDays(today, -6), to: today };
	}

function dateRangeArray(from, to, maxDays = 400) {
	if (!from || !to) return [];
	if (from > to) return [];

	const out = [];
	let cur = from;

	for (let guard = 0; guard < maxDays && cur <= to; guard++) {
		out.push(cur);
		const next = addDays(cur, 1);
		if (!next || next === cur) break;
		cur = next;
	}
	return out;
}

	function aggStats(stats, from, to, unit) {
		const days = dateRangeArray(from, to, unit === 'year' ? 2500 : 400);

		const groupKeyOf = (dayKey) => {
			if (unit === 'day') return dayKey;
			if (unit === 'month') return dayKey.slice(0, 7);
			if (unit === 'year') return dayKey.slice(0, 4);

			const d = new Date(dayKey + 'T00:00:00');
			const dow = d.getDay();
			const diffToMon = (dow + 6) % 7;
			d.setDate(d.getDate() - diffToMon);
			return isoDate(d);
		};

		const map = new Map();

		for (const dayKey of days) {
			const gk = groupKeyOf(dayKey);
			const row = stats?.[dayKey] || { views: 0, visitors: 0 };

			const cur = map.get(gk) || { views: 0, visitors: 0 };
			cur.views += Number(row.views || 0);
			cur.visitors += Number(row.visitors || 0);
			map.set(gk, cur);
		}

		const labels = Array.from(map.keys()).sort();

		// ✅ 표에서 쓰기 좋은 rows 추가
		const rows = labels.map((k) => ({
			key: k,
			views: map.get(k)?.views ?? 0,
			visitors: map.get(k)?.visitors ?? 0,
		}));

		return {
			labels,
			views: labels.map((k) => map.get(k)?.views ?? 0),
			visitors: labels.map((k) => map.get(k)?.visitors ?? 0),
			rows, // ✅ 추가
		};
	}

	function StatsLineChart({ labels, series, unit = 'day' }) {
		const [hoverIdx, setHoverIdx] = useState(null); // 마우스 이동으로 잡히는 idx
		const [pinnedIdx, setPinnedIdx] = useState(null); // 모바일/클릭 고정 idx

		const W = 900;
		const H = 240;
		const PAD_L = 44;
		const PAD_R = 14;
		const PAD_T = 16;
		const PAD_B = 32;

		const all = series.flatMap((s) => s.values);
		const maxV = Math.max(1, ...all);
		const minV = 0;

		const x = (i) => {
			const n = Math.max(1, labels.length - 1);
			return PAD_L + (i * (W - PAD_L - PAD_R)) / n;
		};
		const y = (v) => {
			const t = (v - minV) / (maxV - minV || 1);
			return PAD_T + (1 - t) * (H - PAD_T - PAD_B);
		};

		const pathFor = (values) => {
			if (!values.length) return '';
			return values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(2)} ${y(v).toFixed(2)}`).join(' ');
		};

		const formatLabel = (k) => {
			if (!k) return '';
			if (unit === 'day') return k.slice(5); // MM-DD
			if (unit === 'week') return k.slice(5); // MM-DD
			if (unit === 'month') return k.slice(2); // YY-MM
			if (unit === 'year') return k; // YYYY
			return k;
		};

		const tickIdx = useMemo(() => {
			if (labels.length <= 14) return labels.map((_, i) => i);
			const tickCount = 8;
			const idx = Array.from({ length: tickCount }, (_, k) =>
				Math.round((k * (labels.length - 1)) / Math.max(1, tickCount - 1))
			);
			return [...new Set(idx)];
		}, [labels]);

		// ✅ 실제 표시할 idx: 고정이 있으면 pinned가 우선
		const activeIdx = pinnedIdx != null ? pinnedIdx : hoverIdx;

		// ✅ 마우스 X좌표 -> 가장 가까운 인덱스 찾기
		function nearestIndexFromSvgX(svgX) {
			const plotLeft = PAD_L;
			const plotRight = W - PAD_R;
			const clamped = Math.max(plotLeft, Math.min(plotRight, svgX));
			const ratio = (clamped - plotLeft) / Math.max(1, plotRight - plotLeft);
			const idx = Math.round(ratio * Math.max(0, labels.length - 1));
			return Math.max(0, Math.min(labels.length - 1, idx));
		}

		// ✅ 이벤트 좌표를 SVG viewBox 좌표로 변환
		function getSvgPoint(e) {
			const svg = e.currentTarget.ownerSVGElement || e.currentTarget; // rect에서 올 때 ownerSVGElement
			const pt = svg.createSVGPoint();
			pt.x = e.clientX;
			pt.y = e.clientY;
			const ctm = svg.getScreenCTM();
			if (!ctm) return { x: 0, y: 0 };
			const inv = ctm.inverse();
			const p = pt.matrixTransform(inv);
			return { x: p.x, y: p.y };
		}

		function handleMove(e) {
			// pinned 상태면 마우스로 흔들리지 않게 (원하면 유지/갱신 선택 가능)
			if (pinnedIdx != null) return;
			const p = getSvgPoint(e);
			const idx = nearestIndexFromSvgX(p.x);
			setHoverIdx(idx);
		}

		function handleLeave() {
			if (pinnedIdx != null) return;
			setHoverIdx(null);
		}

		// ✅ 모바일 탭/클릭 고정: 같은 지점 다시 누르면 해제
		function handlePointerDown(e) {
			const p = getSvgPoint(e);
			const idx = nearestIndexFromSvgX(p.x);
			setPinnedIdx((prev) => (prev === idx ? null : idx));
		}

		return (
			<div className="w-full overflow-x-auto rounded border border-slate-700/60 bg-slate-950/20">
				<svg viewBox={`0 0 ${W} ${H}`} className="min-w-[680px] w-full block">
					{/* 그리드(가로) */}
					{[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
						const yy = PAD_T + (1 - t) * (H - PAD_T - PAD_B);
						const val = Math.round(minV + t * (maxV - minV));
						return (
							<g key={i}>
								<line x1={PAD_L} y1={yy} x2={W - PAD_R} y2={yy} stroke="currentColor" opacity="0.12" />
								<text x={PAD_L - 8} y={yy + 4} textAnchor="end" fontSize="11" fill="currentColor" opacity="0.6">
									{val}
								</text>
							</g>
						);
					})}

					{/* 축 */}
					<line x1={PAD_L} y1={H - PAD_B} x2={W - PAD_R} y2={H - PAD_B} stroke="currentColor" opacity="0.25" />
					<line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={H - PAD_B} stroke="currentColor" opacity="0.25" />

					{/* 시리즈 선 */}
					{series.map((s, idx) => (
						<path
							key={s.name}
							d={pathFor(s.values)}
							fill="none"
							stroke="currentColor"
							strokeWidth={idx === 0 ? 2.6 : 1.8}
							opacity={idx === 0 ? 0.95 : 0.55}
						/>
					))}

					{/* ✅ 그래프 영역 전체 hover/tap 이벤트 받는 투명 레이어 */}
					<rect
						x={PAD_L}
						y={PAD_T}
						width={W - PAD_L - PAD_R}
						height={H - PAD_T - PAD_B}
						fill="transparent"
						onMouseMove={handleMove}
						onMouseLeave={handleLeave}
						onPointerDown={handlePointerDown} // 모바일 탭 고정 + 데스크탑 클릭도 OK
						style={{ cursor: 'crosshair' }}
					/>

					{/* ✅ vertical guide line */}
					{activeIdx != null && (
						<line
							x1={x(activeIdx)}
							y1={PAD_T}
							x2={x(activeIdx)}
							y2={H - PAD_B}
							stroke="currentColor"
							opacity="0.18"
							strokeDasharray="3 3"
							pointerEvents="none"
						/>
					)}

					{/* ✅ 강조 점 (툴팁/점은 pointer-events none으로 깜빡임 방지) */}
					{activeIdx != null && (
						<g pointerEvents="none">
							{series.map((s, idx) => (
								<circle
									key={s.name}
									cx={x(activeIdx)}
									cy={y(s.values[activeIdx] ?? 0)}
									r={idx === 0 ? 4 : 3}
									fill="currentColor"
									opacity={idx === 0 ? 0.95 : 0.6}
								/>
							))}
						</g>
					)}

					{/* x축 라벨 */}
					{tickIdx.map((i) => (
						<text key={i} x={x(i)} y={H - 10} textAnchor="middle" fontSize="11" fill="currentColor" opacity="0.65">
							{formatLabel(labels[i])}
						</text>
					))}

					{/* ✅ 툴팁 */}
					{activeIdx != null &&
						(() => {
							const label = labels[activeIdx] || '';
							const views = series?.[0]?.values?.[activeIdx] ?? 0;
							const visitors = series?.[1]?.values?.[activeIdx] ?? 0;

							// 화면 밖으로 안 나가게 위치 조절
							const tooltipW = 170;
							const tooltipH = 46;
							const baseX = x(activeIdx) + 12;
							const tooltipX = Math.min(baseX, W - PAD_R - tooltipW);
							const tooltipY = PAD_T + 8;

							return (
								<g pointerEvents="none">
									<rect
										x={tooltipX}
										y={tooltipY}
										width={tooltipW}
										height={tooltipH}
										rx={8}
										fill="black"
										opacity="0.75"
									/>
									<text x={tooltipX + 10} y={tooltipY + 18} fontSize="11" fill="white">
										{label}
										{pinnedIdx != null ? ' (고정됨)' : ''}
									</text>
									<text x={tooltipX + 10} y={tooltipY + 34} fontSize="11" fill="white">
										조회 {views} · 방문 {visitors}
									</text>
								</g>
							);
						})()}
				</svg>

				{/* 범례 */}
				<div className="px-3 py-2 text-xs text-slate-200 flex gap-3 items-center">
					{series.map((s, idx) => (
						<span key={s.name} className="inline-flex items-center gap-2">
							<span
								className="inline-block rounded-sm"
								style={{ width: 10, height: 3, background: 'currentColor', opacity: idx === 0 ? 0.95 : 0.55 }}
							/>
							{s.name}
						</span>
					))}
				</div>

				{/* (선택) 고정 해제 버튼: 모바일에서 유용 */}
				{pinnedIdx != null && (
					<div className="px-3 pb-2">
						<button type="button" className="admin-submit" onClick={() => setPinnedIdx(null)}>
							툴팁 고정 해제
						</button>
					</div>
				)}
			</div>
		);
	}

	function sumStats(stats, keys) {
		let views = 0;
		let visitors = 0;
		for (const k of keys) {
			const row = stats?.[k];
			if (row) {
				views += Number(row.views || 0);
				visitors += Number(row.visitors || 0);
			}
		}
		return { views, visitors };
	}

	function lastNDaysKeys(n) {
		const today = isoDate() || '2025-01-01'; // fallback
		const keys = [];
		for (let i = n - 1; i >= 0; i--) keys.push(addDays(today, -i));
		return keys;
	}

	if (entries.length === 0) {
		return (
			<section className="admin-upload p-6 rounded-lg bg-slate-800/40 border border-slate-700/50 text-center">
				<h2 className="admin-title text-xl font-semibold text-white mb-2">이벤트 관리</h2>

				<p className="admin-desc text-sm text-slate-300">등록된 행사가 없습니다.</p>

				{/* 새 행사 추가 버튼 있을 경우 표시 */}
				{onClickNewEvent && (
					<button type="button" onClick={onClickNewEvent} className="admin-submit mt-4">
						+ 새 행사 추가
					</button>
				)}
			</section>
		);
	}

	return (
		<section className="admin-upload">
			{/* 상단 헤더: 이벤트 관리 제목 + 새 행사 추가 버튼 */}
			<div className="flex items-start justify-between gap-6 mb-6 p-4 rounded-lg bg-slate-800/40 border border-slate-700/50">
				{/* 제목 / 설명 */}
				<div className="flex-1">
					<h2 className="admin-title text-xl font-semibold text-white mb-2">이벤트 관리</h2>

					<p className="admin-desc text-sm text-slate-300 leading-relaxed">
						행사를 클릭하면 편집 모드로 열립니다. 메모, 이미지 추가/삭제, 순서 변경을 할 수 있습니다.
						<br />
						이미지 순서는 드래그 앤 드랍으로 변경하고,
						<code className="px-1 mx-1 bg-slate-700 rounded text-slate-200">변경 사항 저장</code>
						버튼을 눌러야 서버에 반영됩니다.
					</p>
				</div>

				{/* 새 행사 추가 버튼 */}
				{onClickNewEvent && (
					<button type="button" onClick={onClickNewEvent} className="admin-submit whitespace-nowrap self-start">
						+ 새 행사 추가
					</button>
				)}
			</div>

			{entries.map(([id, ev]) => {
				const safeStats = typeof ev.stats === 'object' && ev.stats !== null ? ev.stats : {};
				const qrUrl = `${qrBaseUrl}/?event=${encodeURIComponent(id)}`;
				const isActive = activeEventId === id;
				const files = uploadFiles[id] || [];

				const basePhotos = ev.photos || [];
				const order = photoOrderDrafts[id] || basePhotos.map((_, idx) => idx);
				const orderedPhotos = order.map((idx) => basePhotos[idx]).filter(Boolean);

				const firstPhoto = basePhotos[0];
				const thumbSrc = firstPhoto ? firstPhoto.thumb || firstPhoto.full : null;

				return (
					<div key={id} className="admin-event-block">
						{/* 이벤트 헤더 */}
						<div className="admin-event-header cursor-pointer" onClick={() => toggleActive(id)}>
							<div className="admin-event-header-main">
								<div className="admin-event-thumb">
									{thumbSrc ? (
										<img
											src={thumbSrc}
											alt={firstPhoto?.alt || ev.title}
											loading="lazy"
											decoding="async"
											className="w-full h-full object-cover"
										/>
									) : (
										<span className="admin-event-thumb-fallback">
											No
											<br />
											Image
										</span>
									)}
								</div>

								<div className="admin-event-header-text">
									<div className="flex flex-col gap-1">
										<div className="flex items-center gap-2">
											<strong className="text-sm md:text-base">{ev.title}</strong>
											<span className="admin-event-meta text-xs text-slate-400">({id})</span>
										</div>
										{(() => {
											const stats = safeStats || {};
											const todayKey = isoDate();
											const todaySum = sumStats(stats, [todayKey]);
											const last7Sum = sumStats(stats, lastNDaysKeys(7));

											return (
												<p className="text-[11px] text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-1">
													<span>이미지 {ev.photos?.length ?? 0}장</span>
													<span>·</span>
													<span>총 조회수 {Number(ev.views || 0)}회</span>
													<span>·</span>
													<span>총 방문자 {Number(ev.visitors || 0)}명</span>

													<span className="ml-1 inline-flex items-center gap-1 rounded bg-slate-800/70 border border-slate-700 px-2 py-0.5 text-slate-200">
														오늘 조회 {todaySum.views} · 방문자 {todaySum.visitors}
													</span>

													<span className="inline-flex items-center gap-1 rounded bg-slate-800/70 border border-slate-700 px-2 py-0.5 text-slate-200">
														최근7일 조회 {last7Sum.views} · 방문자 {last7Sum.visitors}
													</span>

													<span className="text-slate-500">· 클릭하면 상세 편집</span>
												</p>
											);
										})()}
									</div>
								</div>
							</div>

							<button
								type="button"
								className="admin-submit"
								onClick={(e) => {
									e.stopPropagation();
									handleDeleteEvent(id);
								}}
							>
								행사 전체 삭제
							</button>
						</div>

						{/* 이벤트 바디 (펼쳐졌을 때) */}
						{isActive && (
							<div className="admin-event-body mt-3 space-y-4">
								{/* QR 링크 */}
								<div className="admin-row">
									<p className="admin-desc text-xs md:text-sm">
										QR 링크:{' '}
										<code className="bg-slate-800/80 px-2 py-1 rounded text-[11px] md:text-xs break-all">{qrUrl}</code>
									</p>
								</div>

								{/* 비공개 메모 */}
								<div className="admin-row">
									<label className="w-full flex flex-col gap-1">
										<span className="text-xs font-medium text-slate-200">비공개 메모</span>
										<textarea
											rows={2}
											className="admin-textarea"
											value={noteDrafts[id] ?? ''}
											onChange={(e) => handleNoteChange(id, e.target.value)}
											placeholder="이 행사를 관리할 때 참고할 메모를 남겨두세요. (지면소식지용 비고 등)"
										/>
									</label>
								</div>

								{/* 통계: 기간 선택 + 합계 + 날짜별 */}
								{(() => {
									if (!rangeFromByEvent[id] || !rangeToByEvent[id]) {
										return <div className="text-xs text-slate-400">통계 데이터를 준비 중입니다…</div>;
									}
									const stats = safeStats || {};
									const today = isoDate();
									const from = rangeFromByEvent[id] || addDays(today, -6);
									const to = rangeToByEvent[id] || today;

									const unit = unitByEvent[id] || 'day';

									const maxDays =
										unit === 'year'
											? 2500 // 5~6년 커버(윤년 포함해도 충분)
											: unit === 'month'
											? 450 // 12개월 정도는 400도 되지만 여유
											: unit === 'week'
											? 700 // 8주면 사실 400도 되지만 여유
											: 400;

									const keys = dateRangeArray(from, to, maxDays);
									const sum = sumStats(stats, keys);

									const tableKeys = lastNDaysKeys(14).slice().reverse(); // 최신이 위로

									const agg = aggStats(stats, from, to, unit); // aggStats 내부도 days 만들면 똑같이 영향받음

									const chartLabels = agg.labels;
									const chartViews = agg.views;
									const chartVisitors = agg.visitors;

									return (
										<div className="rounded-lg border border-slate-700/60 bg-slate-900/50 p-4 space-y-3">
											<div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
												<div>
													<h3 className="text-sm font-semibold text-white">방문 통계</h3>
													<p className="text-xs text-slate-300">
														기간을 선택하면 합계를 보여주고, 아래에서 날짜별 상세를 확인할 수 있어요.
													</p>
												</div>

												{/* 기간 선택 */}
												<div className="flex flex-col sm:flex-row sm:items-end gap-2">
													<label className="flex flex-col gap-1">
														<span className="text-[11px] text-slate-300">시작</span>
														<input
															type="date"
															value={from}
															onChange={(e) => setRangeFromByEvent((p) => ({ ...p, [id]: e.target.value }))}
															className="admin-input"
														/>
													</label>

													<label className="flex flex-col gap-1">
														<span className="text-[11px] text-slate-300">끝</span>
														<input
															type="date"
															value={to}
															onChange={(e) => setRangeToByEvent((p) => ({ ...p, [id]: e.target.value }))}
															className="admin-input"
														/>
													</label>
												</div>
											</div>
											<div className="flex flex-wrap gap-2">
												{['day', 'week', 'month', 'year'].map((u) => (
													<button
														key={u}
														type="button"
														className={
															'admin-submit ' + (unit === u ? 'ring-1 ring-slate-300' : 'opacity-80 hover:opacity-100')
														}
														onClick={() => {
															const today = isoDate();
															const r = rangeByUnit(today, u);

															setUnitByEvent((p) => ({ ...p, [id]: u }));
															setRangeFromByEvent((p) => ({ ...p, [id]: r.from }));
															setRangeToByEvent((p) => ({ ...p, [id]: r.to }));
														}}
													>
														{u === 'day' ? '일별' : u === 'week' ? '주별' : u === 'month' ? '월별' : '년도별'}
													</button>
												))}
											</div>
											{/* 기간 합계 */}
											<div className="flex flex-wrap items-center gap-2 text-xs">
												<span className="rounded bg-slate-800/70 border border-slate-700 px-2 py-1 text-slate-200">
													선택 기간 합계 · 조회수 {sum.views}
												</span>
												<span className="rounded bg-slate-800/70 border border-slate-700 px-2 py-1 text-slate-200">
													선택 기간 합계 · 방문자 {sum.visitors}
												</span>
												<span className="text-slate-400">
													({from} ~ {to} : {unit === 'day' && '최근 7일 기준'}
													{unit === 'week' && '최근 8주 기준'}
													{unit === 'month' && '최근 12개월 기준'}
													{unit === 'year' && '최근 5년 기준'})
												</span>
											</div>

											{/* 그래프 (선택 기간 기반) */}
											<div className="mt-3">
												<div className="text-xs text-slate-300 mb-2">선택 기간 그래프</div>
												<StatsLineChart
													labels={chartLabels}
													unit={unit}
													series={[
														{ name: '조회수', values: chartViews },
														{ name: '방문자', values: chartVisitors },
													]}
												/>
											</div>

											{/* 날짜별/주별/월별/년도별 표 (그래프와 동일 기준) */}
											<div>
												<div className="text-xs text-slate-300 mb-2">
													{unit === 'day'
														? '일별 상세'
														: unit === 'week'
														? '주별 상세'
														: unit === 'month'
														? '월별 상세'
														: '년도별 상세'}
												</div>

												<div className="overflow-x-auto rounded border border-slate-700/60">
													<table className="min-w-full text-xs">
														<thead className="bg-slate-800/60 text-slate-200">
															<tr>
																<th className="px-3 py-2 text-left font-medium">
																	{unit === 'day'
																		? '날짜'
																		: unit === 'week'
																		? '주(시작일)'
																		: unit === 'month'
																		? '월'
																		: '년도'}
																</th>
																<th className="px-3 py-2 text-right font-medium">조회수</th>
																<th className="px-3 py-2 text-right font-medium">방문자</th>
															</tr>
														</thead>

														<tbody>
															{agg.rows
																.slice()
																.reverse()
																.map((r) => (
																	<tr key={r.key} className="border-t border-slate-800/60 text-slate-200">
																		<td className="px-3 py-2 text-slate-300">{r.key}</td>
																		<td className="px-3 py-2 text-right">{Number(r.views || 0)}</td>
																		<td className="px-3 py-2 text-right">{Number(r.visitors || 0)}</td>
																	</tr>
																))}
														</tbody>
													</table>
												</div>
											</div>
										</div>
									);
								})()}

								{/* 추가 이미지 업로드 */}
								<div className="admin-row">
									<div className="w-full flex flex-col gap-2">
										<div className="flex items-end justify-between gap-4">
											<label className="flex flex-col gap-1 flex-1">
												<span className="text-xs font-medium text-slate-200">추가 이미지 업로드</span>
												<input
													type="file"
													accept="image/*"
													multiple
													onChange={(e) => handleFileChangeForEvent(id, e)}
													className="admin-input"
												/>
											</label>

											<button
												type="button"
												className="admin-submit flex-shrink-0"
												onClick={() => handleAddPhotos(id, ev)}
											>
												이미지 추가
											</button>
										</div>

										{files.length > 0 && (
											<p className="admin-files text-xs text-slate-300">
												선택된 파일: {files.map((f) => f.name).join(', ')}
											</p>
										)}
									</div>
								</div>

								{/* 이미지 목록 + 드래그 앤 드랍 순서 조정 + 삭제 */}
								<div className="admin-photo-list mt-3 flex flex-col gap-3">
									{orderedPhotos.map((photo, index) => {
										const originalIndex = order[index]; // 서버 기준 인덱스
										const isDragging = dragInfo.eventId === id && dragInfo.index === index;

										return (
											<div
												key={photo.full || photo.thumb || index}
												className={
													'flex items-start gap-3 rounded-md border border-slate-700 bg-slate-900/80 p-3 shadow-sm transition ' +
													(isDragging ? 'opacity-50 border-indigo-400 shadow-md' : '')
												}
												draggable
												onDragStart={() => handleDragStart(id, index)}
												onDragOver={(e) => handleDragOver(e, id, index)}
												onDrop={() => handleDrop(id, index)}
												onDragEnd={handleDragEnd}
											>
												<div className="admin-photo-thumb-wrap w-20 h-20 rounded-md overflow-hidden flex-shrink-0 border border-slate-700 bg-black/20">
													<img src={photo.thumb || photo.full} alt={photo.alt} className="w-full h-full object-cover" />
												</div>

												<div className="admin-photo-main flex-1 flex flex-col gap-1">
													<div className="admin-photo-row flex items-center justify-between gap-2">
														<span className="admin-photo-handle text-xs text-slate-300 cursor-grab select-none">
															⋮⋮ 드래그로 순서 변경
														</span>
														<button
															type="button"
															className="admin-submit"
															onClick={() => handleDeletePhoto(id, originalIndex)}
														>
															삭제
														</button>
													</div>

													{photo.alt && <p className="admin-photo-alt text-xs text-slate-400">{photo.alt}</p>}
												</div>
											</div>
										);
									})}

									{orderedPhotos.length === 0 && (
										<p className="admin-desc text-sm text-slate-400">등록된 이미지가 없습니다.</p>
									)}
								</div>

								{/* 저장 / 취소 버튼 */}
								<div className="flex justify-end gap-2 mt-3">
									<button
										type="button"
										className="admin-submit"
										disabled={!dirtyEvents[id]}
										onClick={() => handleReset(id)}
									>
										변경 취소
									</button>
									<button
										type="button"
										className="admin-submit"
										disabled={!dirtyEvents[id]}
										onClick={() => handleSave(id)}
									>
										변경 사항 저장
									</button>
								</div>
							</div>
						)}
					</div>
				);
			})}
		</section>
	);
}
