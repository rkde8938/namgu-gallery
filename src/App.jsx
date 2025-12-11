import { useEffect, useMemo, useState } from 'react';
import Lightbox from 'yet-another-react-lightbox';
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

	if (eventsLoading) {
		return (
			<div className="page">
				<header className="header">
					<h1 className="title">공업탑 행사 갤러리</h1>
					<p className="meta">행사 정보를 불러오는 중입니다…</p>
				</header>
			</div>
		);
	}

	if (eventsError) {
		return (
			<div className="page">
				<header className="header">
					<h1 className="title">공업탑 행사 갤러리</h1>
					<p className="meta">목록을 불러오는 중 오류가 발생했습니다.</p>
				</header>
				<main>
					<p className="notice">{eventsError}</p>
				</main>
			</div>
		);
	}

	if (isAdminRoute) {
		return (
			<div className="page">
				<header className="header">
					<h1 className="title">공업탑 행사 갤러리 · 관리자</h1>
					<p className="meta">행사를 업로드하고, 이미지/메모/QR 정보를 관리할 수 있습니다.</p>
					<p className="notice">
						<a href="/" className="link-back">
							← 일반 갤러리로 돌아가기
						</a>
					</p>
				</header>

				<main>
					<LoginPanel admin={admin} setAdmin={setAdmin} />

					{admin && (
						<>
							{/* 새 행사 추가 버튼 + 모달 */}
							<section className="admin-upload">
								<div className="admin-event-header">
									<h2 className="admin-title">행사 추가</h2>
									<button type="button" className="admin-submit" onClick={() => setShowNewEventModal(true)}>
										새 행사 추가 모달 열기
									</button>
								</div>
								<p className="admin-desc">새 행사를 만들려면 위 버튼을 눌러 모달에서 정보를 입력하세요.</p>
							</section>

							<AdminEventManager events={events} setEvents={setEvents} />

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

	if (!eventId && !isAdminRoute) {
		return (
			<div className="page">
				<header className="header">
					<h1 className="title">공업탑 행사 갤러리</h1>
					<div className="header-text">
						<p className="meta">아래에서 행사를 선택해서 사진을 볼 수 있습니다.</p>
						<p className="notice">
							{/* 상대 경로 "admin" → /gallery/ 기준으로 /gallery/admin, dev에선 /admin */}
							<a href="admin" className="link-back">
								관리자 페이지로 이동
							</a>
						</p>
					</div>
				</header>

				<main className="event-list">
					{eventEntries.map(([id, ev]) => {
						const firstPhoto = ev.photos?.[0];
						const thumbSrc = firstPhoto ? firstPhoto.thumb || firstPhoto.full : null;

						return (
							<a key={id} href={`?event=${id}`} className="event-card">
								<div className="event-card-thumb">
									{thumbSrc ? (
										<img src={thumbSrc} alt={firstPhoto?.alt || ev.title} loading="lazy" decoding="async" />
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
				<div className="header-text">
					<h1 className="title">{eventData.title}</h1>
				</div>
			</header>

			<main className="grid">
				{eventData.photos.map((photo, idx) => (
					<button key={photo.full || photo.thumb || idx} className="thumb" onClick={() => setOpenIndex(idx)}>
						<img
							src={photo.thumb || photo.full}
							alt={photo.alt}
							loading="lazy"
							decoding="async"
							className="thumb-img"
						/>
					</button>
				))}
			</main>

			<Lightbox
				open={openIndex >= 0}
				index={openIndex}
				close={() => setOpenIndex(-1)}
				slides={slides}
				plugins={[Fullscreen]}
				controller={{
					closeOnBackdropClick: true, // 바깥 클릭 시 닫기
					closeOnPullDown: true, // ⬇️ 끌어내리면 닫기 (이거 추가)
					// 필요하면 closeOnPullUp: true 도 같이 줄 수 있음
				}}
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
		<section className="admin-upload">
			<h2 className="admin-title">관리자</h2>
			{admin ? (
				<>
					<p className="admin-desc">{admin.email} 로 로그인됨.</p>
					<button className="admin-submit" type="button" onClick={handleLogout}>
						로그아웃
					</button>
				</>
			) : (
				<>
					<p className="admin-desc">행사 업로드를 하려면 관리자 로그인이 필요합니다.</p>
					<form className="admin-form" onSubmit={handleLogin}>
						<div className="admin-row">
							<label>
								이메일
								<input
									type="text"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									placeholder="관리자 이메일"
								/>
							</label>
						</div>
						<div className="admin-row">
							<label>
								비밀번호
								<input
									type="password"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									placeholder="비밀번호"
								/>
							</label>
						</div>
						{error && <p className="admin-files">{error}</p>}
						<button className="admin-submit" type="submit" disabled={busy}>
							{busy ? '로그인 중...' : '로그인'}
						</button>
					</form>
				</>
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

		if (!eventId.trim() || !title.trim() || !date.trim()) {
			setMsg('event ID, 제목, 날짜는 필수입니다.');
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
		<section className="admin-upload">
			<h2 className="admin-title">[관리자] 새 행사 업로드</h2>
			<p className="admin-desc">
				event ID, 행사 정보, 이미지를 선택하면
				<br />
				서버에 저장되고, 행사 목록에 즉시 반영됩니다.
			</p>

			<form className="admin-form" onSubmit={handleSubmit}>
				<div className="admin-row">
					<label>
						event ID
						<input
							type="text"
							placeholder="예: namgu2025_festival"
							value={eventId}
							onChange={(e) => setEventId(e.target.value)}
						/>
					</label>
				</div>

				<div className="admin-row">
					<label>
						행사 제목
						<input
							type="text"
							placeholder="예: 공업탑 거리 축제 2025"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
						/>
					</label>
				</div>

				<div className="admin-row">
					<label>
						이미지 파일 (여러 장 선택 가능)
						<input type="file" accept="image/*" multiple onChange={handleFileChange} />
					</label>
					{files.length > 0 && <p className="admin-files">선택된 파일: {files.map((f) => f.name).join(', ')}</p>}
				</div>

				{msg && <p className="admin-files">{msg}</p>}

				<button type="submit" className="admin-submit" disabled={busy}>
					{busy ? '업로드 중...' : '행사 업로드'}
				</button>
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
		<div className="admin-modal-backdrop">
			<div className="admin-modal">
				<h2 className="admin-title">새 행사 추가</h2>
				<p className="admin-desc">event ID와 제목, 이미지를 선택해서 새 행사를 등록합니다.</p>

				<form className="admin-form" onSubmit={handleSubmit}>
					<div className="admin-row">
						<label>
							event ID
							<input
								type="text"
								placeholder="예: namgu2025_festival"
								value={eventId}
								onChange={(e) => setEventId(e.target.value)}
							/>
						</label>
					</div>

					<div className="admin-row">
						<label>
							행사 제목
							<input
								type="text"
								placeholder="예: 공업탑 거리 축제 2025"
								value={title}
								onChange={(e) => setTitle(e.target.value)}
							/>
						</label>
					</div>

					<div className="admin-row">
						<label>
							이미지 파일 (여러 장 선택 가능)
							<input type="file" accept="image/*" multiple onChange={handleFileChange} />
						</label>
						{files.length > 0 && <p className="admin-files">선택된 파일: {files.map((f) => f.name).join(', ')}</p>}
					</div>

					{msg && <p className="admin-files">{msg}</p>}

					<div className="admin-row" style={{ display: 'flex', gap: 8 }}>
						<button type="submit" className="admin-submit" disabled={busy}>
							{busy ? '업로드 중...' : '등록'}
						</button>
						<button type="button" className="admin-submit" onClick={onClose}>
							닫기
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}

function AdminEventManager({ events, setEvents }) {
	const [noteDrafts, setNoteDrafts] = useState({});
	const [uploadFiles, setUploadFiles] = useState({});
	const [activeEventId, setActiveEventId] = useState(null);

	const entries = Object.entries(events || {});

	// 메모 초깃값 동기화
	useEffect(() => {
		const initial = {};
		for (const [id, ev] of entries) {
			initial[id] = ev.note || '';
		}
		setNoteDrafts(initial);
	}, [events]);

	const QR_BASE_PROD = 'https://ulsan-namgu.com/gallery';
	const QR_BASE_DEV = 'http://localhost:5173';
	const qrBaseUrl = import.meta.env.DEV ? QR_BASE_DEV : QR_BASE_PROD;

	function toggleActive(id) {
		setActiveEventId((prev) => (prev === id ? null : id));
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

	async function handleDeletePhoto(eventId, index) {
		if (!window.confirm('이 이미지를 삭제할까요?')) return;

		try {
			const data = await fetchJson('/api/gallery/delete_photo.php', {
				method: 'POST',
				body: new URLSearchParams({
					event_id: eventId,
					photo_index: String(index),
				}),
			});
			if (!data.ok) throw new Error(data.error || '이미지 삭제 실패');
			setEvents(data.events || {});
		} catch (err) {
			alert(err.message);
		}
	}

	async function handleSaveNote(eventId) {
		const note = noteDrafts[eventId] ?? '';

		try {
			const data = await fetchJson('/api/gallery/update_event_meta.php', {
				method: 'POST',
				body: new URLSearchParams({
					event_id: eventId,
					note,
				}),
			});
			if (!data.ok) throw new Error(data.error || '메모 저장 실패');
			setEvents(data.events || {});
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

	async function handleAddPhotos(eventId, ev) {
		const files = uploadFiles[eventId] || [];
		if (files.length === 0) {
			alert('추가할 이미지를 선택해 주세요.');
			return;
		}

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

			setEvents(data.events || {});
			setUploadFiles((prev) => ({
				...prev,
				[eventId]: [],
			}));
			alert('이미지 추가 완료!');
		} catch (err) {
			alert(err.message);
		}
	}

	async function savePhotoOrder(eventId, photos) {
		// 순서 저장 API 호출
		const payload = new URLSearchParams();
		payload.append('event_id', eventId);
		payload.append('photos_json', JSON.stringify(photos));

		const data = await fetchJson('/api/gallery/update_photo_order.php', {
			method: 'POST',
			body: payload,
		});

		if (!data.ok) throw new Error(data.error || '이미지 순서 저장 실패');
		setEvents(data.events || {});
	}

	async function handleMovePhoto(eventId, index, direction) {
		const ev = events[eventId];
		if (!ev || !ev.photos) return;

		const photos = [...ev.photos];
		const newIndex = direction === 'up' ? index - 1 : index + 1;
		if (newIndex < 0 || newIndex >= photos.length) return;

		// 스왑
		const temp = photos[index];
		photos[index] = photos[newIndex];
		photos[newIndex] = temp;

		// 일단 UI에 반영
		setEvents({
			...events,
			[eventId]: {
				...ev,
				photos,
			},
		});

		try {
			await savePhotoOrder(eventId, photos);
		} catch (err) {
			alert(err.message);
		}
	}

	if (entries.length === 0) {
		return (
			<section className="admin-upload" style={{ marginTop: '24px' }}>
				<h2 className="admin-title">이벤트 관리</h2>
				<p className="admin-desc">등록된 행사가 없습니다.</p>
			</section>
		);
	}

	return (
		<section className="admin-upload" style={{ marginTop: '24px' }}>
			<h2 className="admin-title">이벤트 관리</h2>
			<p className="admin-desc">
				행사를 클릭하면 편집 모드로 열립니다. 메모, 이미지 추가/삭제, 순서 변경을 할 수 있습니다.
			</p>

			{entries.map(([id, ev]) => {
				const qrUrl = `${qrBaseUrl}/?event=${encodeURIComponent(id)}`;
				const isActive = activeEventId === id;
				const files = uploadFiles[id] || [];

				return (
					<div key={id} className="admin-event-block">
						<div className="admin-event-header" onClick={() => toggleActive(id)} style={{ cursor: 'pointer' }}>
							<div>
								<strong>{ev.title}</strong> <span className="admin-event-meta">({id})</span>
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

						{isActive && (
							<div className="admin-event-body">
								<p className="admin-desc">
									QR 링크: <code>{qrUrl}</code>
								</p>

								<div className="admin-row">
									<label style={{ width: '100%' }}>
										비공개 메모
										<textarea
											rows={2}
											value={noteDrafts[id] ?? ''}
											onChange={(e) => setNoteDrafts((prev) => ({ ...prev, [id]: e.target.value }))}
										/>
									</label>
								</div>
								<button type="button" className="admin-submit" onClick={() => handleSaveNote(id)}>
									메모 저장
								</button>

								{/* 이미지 추가 업로드 */}
								<div className="admin-row" style={{ marginTop: 12 }}>
									<label style={{ width: '100%' }}>
										추가 이미지 업로드
										<input type="file" accept="image/*" multiple onChange={(e) => handleFileChangeForEvent(id, e)} />
									</label>
									{files.length > 0 && (
										<p className="admin-files">선택된 파일: {files.map((f) => f.name).join(', ')}</p>
									)}
									<button type="button" className="admin-submit" onClick={() => handleAddPhotos(id, ev)}>
										선택 이미지 추가 업로드
									</button>
								</div>

								{/* 이미지 목록 + 순서 조정 + 삭제 */}
								<div className="admin-photo-list" style={{ marginTop: 12 }}>
									{(ev.photos || []).map((photo, index) => (
										<div key={photo.full || photo.thumb || index} className="admin-photo-item">
											<img
												src={photo.thumb || photo.full}
												alt={photo.alt}
												style={{
													width: 80,
													height: 80,
													objectFit: 'cover',
													borderRadius: 6,
													flexShrink: 0,
												}}
											/>
											<div className="admin-photo-controls">
												<button
													type="button"
													className="admin-submit"
													disabled={index === 0}
													onClick={() => handleMovePhoto(id, index, 'up')}
												>
													↑
												</button>
												<button
													type="button"
													className="admin-submit"
													disabled={index === (ev.photos || []).length - 1}
													onClick={() => handleMovePhoto(id, index, 'down')}
												>
													↓
												</button>
												<button type="button" className="admin-submit" onClick={() => handleDeletePhoto(id, index)}>
													삭제
												</button>
											</div>
										</div>
									))}
									{(!ev.photos || ev.photos.length === 0) && <p className="admin-desc">등록된 이미지가 없습니다.</p>}
								</div>
							</div>
						)}
					</div>
				);
			})}
		</section>
	);
}
