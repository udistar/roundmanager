import axios from 'axios';
import { useEffect, useState } from 'react';

// 네이버 검색 API 응답 타입 정의
interface SearchItem {
    title: string;       // 업체명 (HTML 태그 포함됨)
    category: string;    // 카테고리
    address: string;     // 주소
    roadAddress: string; // 도로명 주소
    mapx: string;        // 지도 좌표 X (KATECH 좌표계라 변환 필요할 수 있음)
    mapy: string;        // 지도 좌표 Y
}

const RestaurantSection = () => {
    const [restaurants, setRestaurants] = useState<SearchItem[]>([]);

    // 1. 맛집 데이터 가져오기 함수
    const fetchRestaurants = async (query: string) => {
        try {
            // 프록시 경로(/naver-search)를 통해 호출
            const response = await axios.get('/naver-search/v1/search/local.json', {
                params: {
                    query: query,   // 예: '춘천 베어크리크 맛집'
                    display: 5,     // 5개만 표시
                    sort: 'comment' // 리뷰 많은 순 (혹은 random)
                },
                headers: {
                    // 주의: 실제 서비스에서는 백엔드에서 호출하거나 프록시 설정을 통해 키를 숨겨야 합니다.
                    'X-Naver-Client-Id': '여기에_새로받은_검색API_ID',
                    'X-Naver-Client-Secret': '여기에_새로받은_검색API_SECRET'
                }
            });

            // 2. 데이터 정제 (제목에 <b> 태그가 섞여서 옴 -> 제거 필요)
            const cleanData = response.data.items.map((item: any) => ({
                ...item,
                title: item.title.replace(/<[^>]*>?/gm, ''), // HTML 태그 제거 정규식
            }));

            setRestaurants(cleanData);

        } catch (error) {
            console.error('맛집 로딩 실패:', error);
        }
    };

    // 3. 컴포넌트 로드 시 실행 (예: 춘천 베어크리크 주변)
    useEffect(() => {
        fetchRestaurants('춘천 베어크리크 맛집');
    }, []);

    return (
        <div className="restaurant-list p-4 bg-slate-900 text-white rounded-xl mt-4">
            <h2 className="text-xl font-bold mb-4">네이버 검색 API 테스트</h2>
            {restaurants.length === 0 && <p className="text-slate-400 italic">API 키를 설정하면 맛집 목록이 표시됩니다.</p>}
            {restaurants.map((place, index) => (
                <div key={index} className="card bg-slate-800 p-4 rounded-lg mb-2 border border-slate-700">
                    <h3 className="text-lg font-bold text-emerald-400">{place.title}</h3>
                    <p className="text-sm text-slate-300">{place.category}</p>
                    <p className="text-xs text-slate-400">{place.roadAddress || place.address}</p>
                </div>
            ))}
        </div>
    );
};

export default RestaurantSection;
