import { useMemo, useState } from 'react';
import { EVENTS } from './galleryData';
import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';
import Fullscreen from 'yet-another-react-lightbox/plugins/fullscreen';
import './index.css';

function getEventIdFromUrl() {
	const params = new URLSearchParams(window.location.search);
	return params.get('event'); // 예: ?event=namgu2025_festival
}

function App() {
	const [openIndex, setOpenIndex] = useState(-1);

	const { eventId, eventData, eventEntries } = useMemo(() => {
		const id = getEventIdFromUrl();
		const entries = Object.entries(EVENTS); // [ [id, data], ... ]
		return {
			eventId: id,
			eventData: id ? EVENTS[id] : null,
			eventEntries: entries,
		};
	}, []);

	/* 1) event 파라미터가 없는 경우 → 행사 목록 화면 */
	if (!eventId) {
		return (
			<div className="page">
				<header className="header">
					<h1 className="title">공업탑 행사 갤러리</h1>
					<p className="meta">QR 코드 없이 접속한 경우, 아래에서 보고 싶은 행사를 선택하세요.</p>
				</header>

				<main className="event-list">
					{eventEntries.map(([id, ev]) => {
						const firstPhoto = ev.photos?.[0];
						return (
							<a key={id} href={`?event=${id}`} className="event-card">
								<div className="event-card-thumb">
									{firstPhoto ? (
										<img src={firstPhoto.src} alt={firstPhoto.alt || ev.title} loading="lazy" />
									) : (
										<div className="event-card-thumb-fallback">No Image</div>
									)}
								</div>
								<div className="event-card-body">
									<h2 className="event-card-title">{ev.title}</h2>
									<p className="event-card-meta">
										{ev.date} · {ev.location}
									</p>
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
					<p className="meta">잘못된 행사 코드입니다. 주소를 다시 확인해 주세요.</p>
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

	/* 3) 정상적인 event 파라미터 → 해당 행사 갤러리 화면 */
	const slides = eventData.photos.map((p) => ({
		src: p.src,
		alt: p.alt,
	}));

	return (
		<div className="page">
			<header className="header">
				<div className="header-text">
					<h1 className="title">{eventData.title}</h1>
					<p className="meta">
						{eventData.date} · {eventData.location}
					</p>
				</div>
			</header>

			<main className="grid">
				{eventData.photos.map((photo, idx) => (
					<button key={photo.src} className="thumb" onClick={() => setOpenIndex(idx)}>
						<img src={photo.src} alt={photo.alt} loading="lazy" className="thumb-img" />
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
					closeOnBackdropClick: true,
					closeOnPullDown: true,
					closeOnPullUp: true,
				}}
			/>
		</div>
	);
}

export default App;
