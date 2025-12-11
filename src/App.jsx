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

	const { eventId, eventData } = useMemo(() => {
		const id = getEventIdFromUrl();
		return {
			eventId: id,
			eventData: id ? EVENTS[id] : null,
		};
	}, []);

	if (!eventData) {
		return (
			<div className="page">
				<header className="header">
					<h1 className="title">공업탑 행사 갤러리</h1>
					<p className="meta">
						QR 코드로 접근했는데도 이 화면이 보이면,
						<br />
						잘못된 행사 코드이거나 아직 사진이 등록되지 않은 상태일 수 있어요.
					</p>
				</header>
				<main style={{ marginTop: '32px' }}>
					<p className="notice">
						주소에 <code>?event=namgu2025_festival</code> 와 같은
						<br />
						행사 코드가 포함되어야 합니다.
					</p>
				</main>
			</div>
		);
	}

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
			/>
		</div>
	);
}

export default App;
