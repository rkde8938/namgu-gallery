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

						// 썸네일 우선, 없으면 full 사용
						const thumbSrc = firstPhoto ? firstPhoto.thumb || firstPhoto.full : null;

						return (
							<a key={id} href={`?event=${id}`} className="event-card">
								<div className="event-card-thumb">
									{thumbSrc ? (
										<img src={thumbSrc} alt={firstPhoto.alt || ev.title} loading="lazy" decoding="async" />
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

				<AdminUploadForm />
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

	const slides = eventData.photos.map((p) => ({
		src: p.full,
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
					<button key={photo.full} className="thumb" onClick={() => setOpenIndex(idx)}>
						<img src={photo.thumb} alt={photo.alt} loading="lazy" decoding="async" className="thumb-img" />
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

// 리스트에서 새 행사(게시글) 정보 입력 → galleryData용 코드 자동 생성용 폼
function AdminUploadForm() {
  const [eventId, setEventId] = useState("");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("울산 남구 공업탑 일대");
  const [files, setFiles] = useState([]);
  const [code, setCode] = useState("");

  const handleFileChange = (e) => {
    const fileList = Array.from(e.target.files || []);
    setFiles(fileList);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!eventId.trim()) {
      alert("event ID를 입력해 주세요. (예: namgu2025_festival)");
      return;
    }
    if (!title.trim()) {
      alert("행사 제목을 입력해 주세요.");
      return;
    }
    if (!date.trim()) {
      alert("행사 날짜를 입력해 주세요. (예: 2025-05-03)");
      return;
    }
    if (!files.length) {
      alert("이미지를 한 장 이상 선택해 주세요.");
      return;
    }

    // 파일 이름 기준으로 full/thumb 경로 생성
    // (sharp 스크립트로 _full.webp / _thumb.webp 만들어 쓴다는 전제)
    const eventKey = eventId.trim();
    const photos = files.map((file) => {
      const originalName = file.name; // 예: candles-8454262.jpg
      const base = originalName.replace(/\.[^.]+$/, ""); // 확장자 제거
      return {
        full: `/gallery-images/${eventKey}/${base}_full.webp`,
        thumb: `/gallery-images/${eventKey}/${base}_thumb.webp`,
        alt: `${title} - 이미지`,
      };
    });

    const snippet = `
  ${eventKey}: {
    title: "${title}",
    date: "${date}",
    location: "${location}",
    photos: ${JSON.stringify(photos, null, 6)}
  },`;

    setCode(snippet.trim());
  };

  return (
    <section className="admin-upload">
      <h2 className="admin-title">[관리자] 새 행사 업로드 도우미</h2>
      <p className="admin-desc">
        event ID, 제목, 날짜, 위치, 이미지 파일을 선택하면
        <br />
        <code>galleryData.js</code>에 붙여 넣을 수 있는 코드가 자동으로 생성됩니다.
        <br />
        (실제 파일 업로드는 현재는 FTP나 서버에서 직접 처리)
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
            날짜
            <input
              type="text"
              placeholder="예: 2025-05-03"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
        </div>

        <div className="admin-row">
          <label>
            장소
            <input
              type="text"
              placeholder="예: 울산 남구 공업탑 일대"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </label>
        </div>

        <div className="admin-row">
          <label>
            이미지 파일 (여러 장 선택 가능)
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
            />
          </label>
          {files.length > 0 && (
            <p className="admin-files">
              선택된 파일:{" "}
              {files.map((f) => f.name).join(", ")}
            </p>
          )}
        </div>

        <button type="submit" className="admin-submit">
          코드 생성하기
        </button>
      </form>

      {code && (
        <div className="admin-code-block">
          <p>아래 코드를 <code>galleryData.js</code>의 EVENTS 안에 붙여 넣으세요.</p>
          <textarea
            readOnly
            value={code}
            onFocus={(e) => e.target.select()}
          />
        </div>
      )}
    </section>
  );
}

export default App;
