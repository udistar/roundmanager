
import React, { useState, useEffect } from 'react';
import { searchGolfCourseList } from '../services/geminiService';

interface FavoriteSite {
  id: string;
  name: string;
  url: string;
  userId: string;
  userPw: string;
  location?: string;
}

const FavoriteSites: React.FC = () => {
  const [isAdding, setIsAdding] = useState(false);
  // Load from localStorage or use defaults
  const [sites, setSites] = useState<FavoriteSite[]>(() => {
    const saved = localStorage.getItem('favoriteInfo');
    if (saved) return JSON.parse(saved);
    return [
      { id: '1', name: '화성 상록', url: 'https://www.sangnokresort.co.kr/', userId: 'user123', userPw: 'password123', location: '경기 화성시 봉담읍' },
      { id: '2', name: '오렌지듄스', url: 'https://www.orangedunes.com/', userId: 'golfer456', userPw: 'golfking72', location: '인천 연수구' }
    ];
  });

  /* Login Helper State */
  const [loginHelperSite, setLoginHelperSite] = useState<FavoriteSite | null>(null);

  const [newSite, setNewSite] = useState<Partial<FavoriteSite>>({});
  const [searchResults, setSearchResults] = useState<{ title: string, address: string, link: string }[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const handleNameChange = async (val: string) => {
    setNewSite({ ...newSite, name: val });
    if (val.length >= 2) {
      // Simple debounce could be added here if needed
      searchGolfCourseList(val).then(results => {
        setSearchResults(results);
        setShowDropdown(results.length > 0);
      });
    } else {
      setShowDropdown(false);
    }
  };

  const selectCourse = (course: { title: string, address: string, link: string }) => {
    setNewSite({
      ...newSite,
      name: course.title,
      location: course.address,
      url: course.link
    });
    setShowDropdown(false);
  };

  useEffect(() => {
    localStorage.setItem('favoriteInfo', JSON.stringify(sites));
  }, [sites]);

  const handleAdd = () => {
    if (newSite.name && newSite.userId && newSite.userPw) {
      setSites([...sites, { ...newSite, id: Date.now().toString() } as FavoriteSite]);
      setIsAdding(false);
      setNewSite({});
    }
  };

  const handleStartLogin = (site: FavoriteSite) => {
    // 1. Open the site first
    window.open(site.url, '_blank');
    // 2. Show the persistent helper
    setLoginHelperSite(site);
  };

  const copyToClipboard = (text: string, type: '아이디' | '비밀번호') => {
    navigator.clipboard.writeText(text);
    // Optional: simple alert or toast if needed, but the button text change is usually enough feedback
    // Here using a simple alert for clarity as requested by previous flow, or better, no alert, just feedback.
    // Let's use a temporary state for feedback if we wanted, but standard behavior is fine.
    // We will just let the user know via button press effect or small text.
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-700">
      {/* Login Helper Overlay/Modal */}
      {loginHelperSite && (
        <div className="fixed inset-x-0 bottom-8 z-[100] flex justify-center px-4 animate-in slide-in-from-bottom-10 fade-in duration-300">
          <div className="bg-slate-900/95 backdrop-blur-xl border border-amber-400 rounded-2xl p-6 shadow-2xl w-full max-w-md ring-1 ring-amber-400/50">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center">
                  <i className="fa-solid fa-key text-amber-400 mr-2"></i>
                  로그인 도우미
                </h3>
                <p className="text-sm text-slate-400">{loginHelperSite.name} 사이트가 열렸습니다.</p>
              </div>
              <button
                onClick={() => setLoginHelperSite(null)}
                className="text-slate-500 hover:text-white transition-colors"
              >
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-slate-800 rounded-lg flex items-center justify-between group">
                <div>
                  <span className="text-xs text-slate-500 font-bold block mb-0.5">아이디</span>
                  <span className="text-white font-mono font-bold tracking-wide">{loginHelperSite.userId}</span>
                </div>
                <button
                  onClick={() => copyToClipboard(loginHelperSite.userId, '아이디')}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-emerald-600 text-slate-300 hover:text-white rounded text-xs font-bold transition-all active:scale-95"
                >
                  복사하기 <i className="fa-regular fa-copy ml-1"></i>
                </button>
              </div>

              <div className="p-3 bg-slate-800 rounded-lg flex items-center justify-between group">
                <div>
                  <span className="text-xs text-slate-500 font-bold block mb-0.5">비밀번호</span>
                  <span className="text-white font-mono font-bold tracking-wide">
                    {'•'.repeat(loginHelperSite.userPw.length || 8)}
                  </span>
                </div>
                <button
                  onClick={() => copyToClipboard(loginHelperSite.userPw, '비밀번호')}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-emerald-600 text-slate-300 hover:text-white rounded text-xs font-bold transition-all active:scale-95"
                >
                  복사하기 <i className="fa-regular fa-copy ml-1"></i>
                </button>
              </div>
            </div>

            <p className="mt-4 text-xs text-center text-slate-500 bg-slate-950/50 py-2 rounded">
              <i className="fa-solid fa-circle-info mr-1.5 text-amber-500"></i>
              사이트에서 아이디/비밀번호를 붙여넣기(Ctrl+V) 하세요.
            </p>
          </div>
        </div>
      )}

      <button
        onClick={() => setIsAdding(!isAdding)}
        className="w-full py-4 bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold rounded-xl transition-all shadow-lg shadow-amber-400/20 flex items-center justify-center space-x-2">
        <i className={`fa-solid ${isAdding ? 'fa-xmark' : 'fa-plus'}`}></i>
        <span>{isAdding ? '취소' : '새 골프장 추가'}</span>
      </button>

      {isAdding && (
        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 space-y-4 animate-in fade-in zoom-in-95 duration-300 relative z-50">
          <h3 className="text-white font-bold mb-2">새 골프장 정보 입력</h3>

          {/* Golf Course Name Input & Dropdown */}
          <div className="relative">
            <input
              type="text"
              placeholder="골프장 이름 (예: 신라CC)"
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 !text-white placeholder:text-slate-400 focus:border-amber-400 outline-none transition-colors"
              style={{ color: 'white' }}
              value={newSite.name || ''}
              onChange={e => handleNameChange(e.target.value)}
              onFocus={() => { if (searchResults.length > 0) setShowDropdown(true); }}
            />
            {showDropdown && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl max-h-60 overflow-y-auto z-50">
                {searchResults.map((result, idx) => (
                  <button
                    key={idx}
                    onClick={() => selectCourse(result)}
                    className="w-full text-left px-4 py-3 hover:bg-slate-700 border-b border-slate-700/50 last:border-0 transition-colors"
                  >
                    <div className="font-bold text-white text-sm">{result.title}</div>
                    <div className="text-xs text-slate-400 truncate">{result.address}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <input
            type="text"
            placeholder="지역 (예: 경기 여주)"
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 !text-white placeholder:text-slate-400 focus:border-amber-400 outline-none"
            style={{ color: 'white' }}
            value={newSite.location || ''}
            onChange={e => setNewSite({ ...newSite, location: e.target.value })}
          />

          {/* URL Input with Visit Button */}
          <div className="relative">
            <input
              type="text"
              placeholder="공식 홈페이지 URL"
              className="w-full bg-slate-900 border border-slate-600 rounded-lg pl-4 pr-12 py-3 !text-white placeholder:text-slate-400 focus:border-amber-400 outline-none"
              style={{ color: 'white' }}
              value={newSite.url || ''}
              onChange={e => setNewSite({ ...newSite, url: e.target.value })}
            />
            {newSite.url && (
              <a
                href={newSite.url}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-400 hover:text-blue-300 p-1"
                title="홈페이지 방문"
              >
                <i className="fa-solid fa-arrow-up-right-from-square"></i>
              </a>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="아이디"
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 !text-white placeholder:text-slate-400 focus:border-amber-400 outline-none"
              style={{ color: 'white' }}
              value={newSite.userId || ''}
              onChange={e => setNewSite({ ...newSite, userId: e.target.value })}
            />
            <input
              type="password"
              placeholder="비밀번호"
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 !text-white placeholder:text-slate-400 focus:border-amber-400 outline-none"
              style={{ color: 'white' }}
              value={newSite.userPw || ''}
              onChange={e => setNewSite({ ...newSite, userPw: e.target.value })}
            />
          </div>
          <button
            onClick={handleAdd}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-colors shadow-lg shadow-emerald-600/20">
            저장하기
          </button>
        </div>
      )}

      <div className="space-y-4">
        {sites.map(site => (
          <div key={site.id} className="bg-slate-900/80 border border-amber-400/30 rounded-2xl p-6 hover:border-amber-400 transition-all group">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-bold text-white mb-1 group-hover:text-amber-400 transition-colors">{site.name}</h3>
                <p className="text-slate-400 text-sm flex items-center">
                  <i className="fa-solid fa-location-dot mr-1.5 text-slate-500"></i>
                  {site.location || '위치 정보 없음'}
                </p>
              </div>
              <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-1 rounded text-xs font-bold flex items-center">
                <i className="fa-solid fa-lock mr-1"></i> 저장됨
              </span>
            </div>

            <div className="space-y-3 mb-6 bg-slate-950/50 p-4 rounded-xl border border-slate-800">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 font-bold">아이디:</span>
                <span className="text-white font-mono">{site.userId}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 font-bold">비밀번호:</span>
                <div className="flex space-x-1">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="w-2 h-2 rounded-full bg-white"></div>
                  ))}
                </div>
              </div>
            </div>

            {site.url && (
              <a href={site.url} target="_blank" rel="noreferrer" className="flex items-center text-blue-400 text-sm hover:underline mb-6">
                <i className="fa-solid fa-globe mr-2"></i>
                공식 홈페이지 방문
              </a>
            )}

            <div className="grid grid-cols-[1.5fr_1fr_1fr] gap-3">
              <button
                onClick={() => handleStartLogin(site)}
                className="py-3 bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold rounded-xl transition-colors flex items-center justify-center space-x-2">
                <i className="fa-solid fa-arrow-right-to-bracket"></i>
                <span>자동 로그인</span>
              </button>
              <button className="py-3 border border-slate-600 hover:bg-slate-800 text-slate-300 rounded-xl transition-colors flex items-center justify-center space-x-2">
                <i className="fa-solid fa-pen"></i>
                <span>수정</span>
              </button>
              <button
                onClick={() => setSites(sites.filter(s => s.id !== site.id))}
                className="py-3 border border-rose-900/50 hover:bg-rose-900/20 text-rose-500 rounded-xl transition-colors flex items-center justify-center space-x-2">
                <i className="fa-regular fa-trash-can"></i>
                <span>삭제</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FavoriteSites;
